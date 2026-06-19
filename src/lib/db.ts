import { mkdirSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
import { statSync } from 'fs';

type DuckDbInstance = {
  exec: (sql: string, callback: (err: Error | null) => void) => void;
  all: (sql: string, ...args: unknown[]) => void;
  run: (sql: string, ...args: unknown[]) => void;
};

declare global {
  var __quietTigerDuckDb: DuckDbInstance | undefined;
  var __quietTigerDuckDbInitPromise: Promise<DuckDbInstance> | undefined;
}

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'cache', 'crime.duckdb');
const DEFAULT_DUCKDB_THREADS = '2';

export const isMockDataEnabled = (): boolean => {
  const raw = (process.env.USE_MOCK_DATA ?? process.env.DISABLE_DUCKDB ?? '').trim();
  if (!raw) return true;
  const normalized = raw.toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

/**
 * Get the path to the crime data CSV file.
 * The CSV contains ~8.5M rows from 2001-2026.
 */
export const getDataPath = (): string => {
  return join(process.cwd(), 'data', 'sources', 'Crimes_-_2001_to_Present_20260114.csv');
};

export const getDbPath = (): string => {
  const configuredPath = process.env.DUCKDB_PATH?.trim();
  if (!configuredPath) return DEFAULT_DB_PATH;
  return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
};

const getDuckDbThreads = (): string => {
  return process.env.DUCKDB_THREADS?.trim() || DEFAULT_DUCKDB_THREADS;
};

const configureDatabase = async (database: DuckDbInstance): Promise<void> => {
  const statements = [
    `SET threads=${getDuckDbThreads()}`,
    `SET preserve_insertion_order=false`,
  ];

  for (const statement of statements) {
    await new Promise<void>((resolve, reject) => {
      database.exec(statement, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
};

/**
 * Parse a date string in "MM/DD/YYYY HH:MM:SS A" format (US date format)
 * and return a Date object.
 *
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Parsed Date object
 */
export const parseDate = (dateStr: string): Date => {
  // DuckDB format: '%m/%d/%Y %I:%M:%S %p'
  // This parses "01/05/2026 12:00:00 AM" to a proper Date
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed;
};

/**
 * Parse a date string and return Unix epoch seconds.
 * Handles "MM/DD/YYYY HH:MM:SS A" format.
 *
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Unix epoch seconds
 */
export const epochSeconds = (dateStr: string): number => {
  return Math.floor(parseDate(dateStr).getTime() / 1000);
};

export const getDb = async (): Promise<DuckDbInstance> => {
  if (isMockDataEnabled()) {
    throw new Error('DuckDB disabled via USE_MOCK_DATA/DISABLE_DUCKDB');
  }

  if (globalThis.__quietTigerDuckDb) {
    return globalThis.__quietTigerDuckDb;
  }

  if (!globalThis.__quietTigerDuckDbInitPromise) {
    globalThis.__quietTigerDuckDbInitPromise = (async () => {
      const dbPath = getDbPath();
      mkdirSync(dirname(dbPath), { recursive: true });

      const duckdb = await import('duckdb');
      const database = await new Promise<DuckDbInstance>((resolve, reject) => {
        const instance = new duckdb.default.Database(dbPath, (err?: Error | null) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(instance as unknown as DuckDbInstance);
        });
      });

      await configureDatabase(database);

      globalThis.__quietTigerDuckDb = database;
      console.log(
        `DuckDB initialized at ${dbPath} (threads=${getDuckDbThreads()})`,
      );

      return database;
    })().catch((error) => {
      globalThis.__quietTigerDuckDbInitPromise = undefined;
      throw error;
    });
  }

  return globalThis.__quietTigerDuckDbInitPromise;
};

const escapeSqlString = (value: string): string => value.replace(/'/g, "''");

/**
 * Ensure the sorted crimes table exists for zone map optimization.
 * Creates a sorted copy of the crimes data ordered by Date column,
 * which enables DuckDB to skip irrelevant row groups when querying date ranges.
 *
 * @returns The table name to use for queries ('crimes_sorted')
 */
export const ensureSortedCrimesTable = async (): Promise<string> => {
  const database = await getDb();
  const dataPath = getDataPath();

  return new Promise((resolve, reject) => {
    // First check if table already exists
    database.all("SELECT name FROM sqlite_master WHERE type='table' AND name='crimes_sorted'", (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error checking for crimes_sorted table:', err);
        reject(err);
        return;
      }

      const tables = rows as { name: string }[];
      if (tables.length > 0) {
        // Table exists, use it
        console.log('crimes_sorted table already exists');
        resolve('crimes_sorted');
        return;
      }

      // Table doesn't exist, create it
      console.log('Creating crimes_sorted table (zone map optimized)...');

      const safePath = escapeSqlString(dataPath);
      const createQuery = `
        CREATE TABLE crimes_sorted AS
        SELECT * FROM read_csv_auto('${safePath}')
        WHERE "Date" IS NOT NULL
        ORDER BY "Date"
      `;

      database.run(createQuery, (runErr: Error | null) => {
        if (runErr) {
          console.error('Error creating crimes_sorted table:', runErr);
          reject(runErr);
          return;
        }

        console.log('crimes_sorted table ready with zone map optimization');
        resolve('crimes_sorted');
      });
    });
  });
};

// ---------------------------------------------------------------------------
// Phase 81: persisted analytics tables
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic fingerprint of the source CSV.
 *
 * Uses (mtime_ms:size) for a cheap, low-cost signal. The known limitation is
 * that if a same-size file is replaced, the fingerprint will not change. For
 * the prototype's source-managed dataset, this is acceptable; a content hash
 * can replace it later without changing the rest of the bootstrap contract.
 */
export const computeDatasetFingerprint = (): string => {
  const dataPath = getDataPath();
  const stats = statSync(dataPath);
  return `mtime:${stats.mtimeMs}:size:${stats.size}`;
};

const CRIMES_FACT_TABLE = 'crimes_fact';
const CRIME_DATASET_META_TABLE = 'crime_dataset_meta';
const CRIME_OVERVIEW_BINS_MEDIUM_TABLE = 'crime_overview_bins_medium';
export const CRIMES_FACT_TABLE_NAME = CRIMES_FACT_TABLE;
export const CRIME_DATASET_META_TABLE_NAME = CRIME_DATASET_META_TABLE;
export const CRIME_OVERVIEW_BINS_MEDIUM_TABLE_NAME = CRIME_OVERVIEW_BINS_MEDIUM_TABLE;

/**
 * Fixed medium-resolution overview bin count. Phase 81 locks the overview bin
 * resolution at a single medium default; future phases can introduce multiple
 * presets (low/medium/high) without changing this contract.
 */
export const OVERVIEW_BIN_COUNT_MEDIUM = 200;

const ensureMetaColumn = (db: DuckDbInstance, table: string, column: string, definition: string): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`,
      (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });

const runAll = (db: DuckDbInstance, sql: string, params: unknown[] = []): Promise<unknown[]> => {
  if (params.length === 0) {
    return new Promise((resolve, reject) => {
      db.all(sql, (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: unknown[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

const exec = (db: DuckDbInstance, sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, (err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

/**
 * Ensure the canonical fact table exists. The persisted base table is the
 * foundation that downstream exact-paging (Wave 3) and the persisted metadata
 * (Phase 81) build on. It exposes:
 *   - `id` (BIGINT) sourced from the CSV "ID" column (Chicago's unique incident
 *     identifier). Stable across rebuilds as long as the source CSV is stable.
 *   - `row_id` (BIGINT) synthetic stable row number; deterministic ordering
 *     primitive for `(timestamp_sec, row_id)` keyset paging.
 *   - `timestamp_sec` (BIGINT) normalized epoch seconds so time-range scans do
 *     not pay the timestamp parse cost on every request.
 *   - `lat` / `lon` (DOUBLE) geographic coordinates
 *   - `primary_type` / `district` (VARCHAR) filter dimensions
 *   - `iucr` / `year` (VARCHAR / INTEGER) auxiliary metadata
 *
 * Idempotent: rebuilds only if the dataset fingerprint does not match the
 * stored fingerprint. Returns the table name on success.
 */
export const ensureCrimesFactTable = async (): Promise<string> => {
  const db = await getDb();
  const dataPath = getDataPath();
  const safePath = escapeSqlString(dataPath);
  const fingerprint = computeDatasetFingerprint();

  // Inspect the fingerprint guard table. The meta table records the source
  // fingerprint that the persisted base was last built from.
  const metaExists = (await runAll(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='crimes_fact_meta'"
  )) as { name: string }[];

  if (metaExists.length > 0) {
    const metaRows = (await runAll(
      db,
      'SELECT fingerprint FROM crimes_fact_meta LIMIT 1'
    )) as { fingerprint: string }[];
    if (metaRows[0]?.fingerprint === fingerprint) {
      console.log(`[crimes_fact] fingerprint match (${fingerprint}); reusing existing table.`);
      return CRIMES_FACT_TABLE;
    }
    console.log(
      `[crimes_fact] fingerprint changed (${metaRows[0]?.fingerprint ?? 'none'} -> ${fingerprint}); rebuilding.`
    );
  }

  // Drop the existing meta + derived tables so the rebuild is atomic.
  await exec(
    db,
    `DROP TABLE IF EXISTS crimes_fact_meta; DROP TABLE IF EXISTS ${CRIMES_FACT_TABLE}; DROP TABLE IF EXISTS ${CRIME_DATASET_META_TABLE}; DROP TABLE IF EXISTS ${CRIME_OVERVIEW_BINS_MEDIUM_TABLE};`
  );

  console.log(`[crimes_fact] building canonical fact table (fingerprint=${fingerprint})...`);

  // Canonical persisted fact table. We sort by (timestamp_sec, id) so the
  // table's physical row order supports the locked decision "later exact paging
  // can sort safely by (timestamp, rowId)".
  await exec(
    db,
    `
      CREATE TABLE ${CRIMES_FACT_TABLE} AS
      SELECT
        CAST("ID" AS BIGINT) AS id,
        CAST(row_number() OVER (ORDER BY "Date", "ID") AS BIGINT) AS row_id,
        CAST(EXTRACT(EPOCH FROM "Date") AS BIGINT) AS timestamp_sec,
        "Latitude" AS lat,
        "Longitude" AS lon,
        "Primary Type" AS primary_type,
        "District" AS district,
        "IUCR" AS iucr,
        CAST("Year" AS INTEGER) AS year
      FROM read_csv_auto('${safePath}')
      WHERE "Date" IS NOT NULL
      ORDER BY "Date", "ID"
    `
  );

  // Persist the fingerprint guard for the fact table.
  await exec(
    db,
    `
      CREATE TABLE crimes_fact_meta (
        fingerprint VARCHAR,
        built_at TIMESTAMP DEFAULT now()
      );
      INSERT INTO crimes_fact_meta (fingerprint) VALUES ('${escapeSqlString(fingerprint)}');
    `
  );

  console.log(`[crimes_fact] canonical fact table ready (fingerprint=${fingerprint}).`);
  return CRIMES_FACT_TABLE;
};

/**
 * Ensure the single-row dataset metadata table exists. Materializes min/max
 * bounds, distinct crime types, and the year range so `/api/crime/meta` can
 * serve startup metadata in a single persisted read.
 */
export const ensureDatasetMetaTable = async (): Promise<string> => {
  await ensureCrimesFactTable();
  const db = await getDb();

  const existing = (await runAll(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${CRIME_DATASET_META_TABLE}'`
  )) as { name: string }[];
  if (existing.length > 0) {
    console.log(`[crime_dataset_meta] table already exists; reusing.`);
    return CRIME_DATASET_META_TABLE;
  }

  console.log(`[crime_dataset_meta] building precomputed metadata table...`);

  await exec(
    db,
    `
      CREATE TABLE ${CRIME_DATASET_META_TABLE} AS
      WITH bounds AS (
        SELECT
          MIN(timestamp_sec) AS min_time,
          MAX(timestamp_sec) AS max_time,
          MIN(lat) AS min_lat,
          MAX(lat) AS max_lat,
          MIN(lon) AS min_lon,
          MAX(lon) AS max_lon,
          COUNT(*) AS count,
          MIN(year) AS year_min,
          MAX(year) AS year_max
        FROM ${CRIMES_FACT_TABLE}
      ), types_agg AS (
        SELECT to_json(list(distinct primary_type)) AS crime_types_json
        FROM ${CRIMES_FACT_TABLE}
      )
      SELECT
        b.min_time,
        b.max_time,
        b.min_lat,
        b.max_lat,
        b.min_lon,
        b.max_lon,
        b.count,
        b.year_min,
        b.year_max,
        t.crime_types_json,
        CAST(NULL AS VARCHAR) AS fingerprint,
        now() AS built_at
      FROM bounds b CROSS JOIN types_agg t
    `
  );

  await ensureMetaColumn(db, CRIME_DATASET_META_TABLE, 'fingerprint', 'VARCHAR');
  await exec(
    db,
    `UPDATE ${CRIME_DATASET_META_TABLE} SET fingerprint = '${escapeSqlString(computeDatasetFingerprint())}'`
  );

  console.log(`[crime_dataset_meta] precomputed metadata table ready.`);
  return CRIME_DATASET_META_TABLE;
};

/**
 * Ensure the medium-resolution overview bins table exists. The table is keyed
 * by (primary_type, district, bin_id) so any filter combination is a simple
 * sum-and-group at query time. Bin boundaries are uniform-time, fixed at
 * OVERVIEW_BIN_COUNT_MEDIUM for the locked "medium default" resolution.
 */
export const ensureOverviewBinsTable = async (): Promise<string> => {
  await ensureCrimesFactTable();
  const db = await getDb();

  const existing = (await runAll(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${CRIME_OVERVIEW_BINS_MEDIUM_TABLE}'`
  )) as { name: string }[];
  if (existing.length > 0) {
    console.log(`[crime_overview_bins_medium] table already exists; reusing.`);
    return CRIME_OVERVIEW_BINS_MEDIUM_TABLE;
  }

  const metaRows = (await runAll(
    db,
    `SELECT min_time, max_time FROM ${CRIME_DATASET_META_TABLE} LIMIT 1`
  )) as { min_time: number | bigint | null; max_time: number | bigint | null }[];

  const minTime = metaRows[0]?.min_time ?? 0;
  const maxTime = metaRows[0]?.max_time ?? 0;
  const domain = maxTime > minTime ? [minTime, maxTime] : [0, 1];
  const span = Math.max(1, Number(domain[1]) - Number(domain[0]));
  const binCount = OVERVIEW_BIN_COUNT_MEDIUM;

  console.log(
    `[crime_overview_bins_medium] building medium-resolution bins (binCount=${binCount}, span=${span}s)...`
  );

  await exec(
    db,
    `
      CREATE TABLE ${CRIME_OVERVIEW_BINS_MEDIUM_TABLE} AS
      WITH meta AS (
        SELECT MIN(timestamp_sec) AS min_time, MAX(timestamp_sec) AS max_time
        FROM ${CRIMES_FACT_TABLE}
      ), m AS (
        SELECT
          CASE WHEN max_time > min_time THEN CAST(min_time AS DOUBLE) ELSE 0 END AS min_t,
          CASE WHEN max_time > min_time THEN CAST(max_time AS DOUBLE) ELSE 1 END AS max_t
        FROM meta
      ), binned AS (
        SELECT
          primary_type,
          district,
          LEAST(
            CAST(FLOOR((CAST(timestamp_sec AS DOUBLE) - m.min_t) / ((m.max_t - m.min_t) / ${binCount})) AS INTEGER),
            ${binCount - 1}
          ) AS bin_id
        FROM ${CRIMES_FACT_TABLE}, m
        WHERE timestamp_sec IS NOT NULL
      )
      SELECT
        b.primary_type,
        b.district,
        b.bin_id,
        CAST(m.min_t + b.bin_id * ((m.max_t - m.min_t) / ${binCount}) AS BIGINT) AS bin_start,
        CAST(m.min_t + (b.bin_id + 1) * ((m.max_t - m.min_t) / ${binCount}) AS BIGINT) AS bin_end,
        COUNT(*) AS count
      FROM binned b, m
      GROUP BY b.primary_type, b.district, b.bin_id, m.min_t, m.max_t
      ORDER BY b.primary_type, b.district, b.bin_id
    `
  );

  console.log(`[crime_overview_bins_medium] pre-binned counts table ready.`);
  return CRIME_OVERVIEW_BINS_MEDIUM_TABLE;
};

/**
 * Read the persisted dataset metadata. Returns null if the meta table is
 * unavailable (caller decides whether to fall back to mock).
 */
export const readDatasetMetadata = async (): Promise<{
  minTime: number;
  maxTime: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  count: number;
  yearMin: number;
  yearMax: number;
  crimeTypes: string[];
  fingerprint: string;
  builtAt: string;
} | null> => {
  const db = await getDb();
  const rows = (await runAll(
    db,
    `
      SELECT
        min_time,
        max_time,
        min_lat,
        max_lat,
        min_lon,
        max_lon,
        count,
        year_min,
        year_max,
        CAST(crime_types_json AS VARCHAR) AS crime_types_json,
        fingerprint,
        CAST(built_at AS VARCHAR) AS built_at
      FROM ${CRIME_DATASET_META_TABLE}
      LIMIT 1
    `
  )) as {
    min_time: number | bigint | null;
    max_time: number | bigint | null;
    min_lat: number | bigint | null;
    max_lat: number | bigint | null;
    min_lon: number | bigint | null;
    max_lon: number | bigint | null;
    count: number | bigint | null;
    year_min: number | bigint | null;
    year_max: number | bigint | null;
    crime_types_json: string | null;
    fingerprint: string | null;
    built_at: string | null;
  }[];

  const row = rows[0];
  if (!row) return null;
  const toNum = (v: number | bigint | null | undefined) =>
    typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : 0;

  const crimeTypes: string[] = (() => {
    const raw = row.crime_types_json;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === 'string');
      }
    } catch {
      // Fall through to empty list; corrupted JSON is treated as "no data".
    }
    return [];
  })();

  return {
    minTime: toNum(row.min_time),
    maxTime: toNum(row.max_time),
    minLat: toNum(row.min_lat),
    maxLat: toNum(row.max_lat),
    minLon: toNum(row.min_lon),
    maxLon: toNum(row.max_lon),
    count: toNum(row.count),
    yearMin: toNum(row.year_min),
    yearMax: toNum(row.year_max),
    crimeTypes,
    fingerprint: row.fingerprint ?? '',
    builtAt: row.built_at ?? '',
  };
};

/**
 * Read persisted overview bins for a filter combination. Returns server-binned
 * counts plus the explicit domain metadata so the client can render directly
 * without rebucketing raw timestamps.
 */
export const readOverviewBins = async (filters: {
  crimeTypes?: string[];
  districts?: string[];
}): Promise<{
  domain: { startEpoch: number; endEpoch: number; binCount: number; binSizeSec: number };
  bins: { binIndex: number; startEpoch: number; endEpoch: number; count: number }[];
  filter: { crimeTypes: string[]; districts: string[] };
  fingerprint: string;
  builtAt: string;
} | null> => {
  const db = await getDb();
  const crimeTypes = (filters.crimeTypes ?? []).filter(Boolean);
  const districts = (filters.districts ?? []).filter(Boolean);

  const metaRows = (await runAll(
    db,
    `SELECT min_time, max_time FROM ${CRIME_DATASET_META_TABLE} LIMIT 1`
  )) as { min_time: number | bigint | null; max_time: number | bigint | null }[];
  const minTime = Number(metaRows[0]?.min_time ?? 0);
  const maxTime = Number(metaRows[0]?.max_time ?? 0);
  const safeMax = maxTime > minTime ? maxTime : minTime + 1;
  const spanSec = Math.max(1, safeMax - minTime);
  const binSizeSec = spanSec / OVERVIEW_BIN_COUNT_MEDIUM;

  const useTypeFilter = crimeTypes.length > 0;
  const useDistrictFilter = districts.length > 0;

  const sql = `
    SELECT
      bin_id,
      MIN(bin_start) AS bin_start,
      MIN(bin_end) AS bin_end,
      SUM(count) AS count
    FROM ${CRIME_OVERVIEW_BINS_MEDIUM_TABLE}
    WHERE (? OR primary_type IN (${crimeTypes.map(() => '?').join(', ') || 'NULL'}))
      AND (? OR district IN (${districts.map(() => '?').join(', ') || 'NULL'}))
    GROUP BY bin_id
    ORDER BY bin_id
  `;

  const params: unknown[] = [
    useTypeFilter ? 1 : 0,
    ...(useTypeFilter ? crimeTypes : []),
    useDistrictFilter ? 1 : 0,
    ...(useDistrictFilter ? districts : []),
  ];

  const rows = (await runAll(db, sql, params)) as {
    bin_id: number | bigint;
    bin_start: number | bigint;
    bin_end: number | bigint;
    count: number | bigint;
  }[];

  const bins = rows.map((row) => ({
    binIndex: typeof row.bin_id === 'bigint' ? Number(row.bin_id) : row.bin_id,
    startEpoch: typeof row.bin_start === 'bigint' ? Number(row.bin_start) : row.bin_start,
    endEpoch: typeof row.bin_end === 'bigint' ? Number(row.bin_end) : row.bin_end,
    count: typeof row.count === 'bigint' ? Number(row.count) : row.count,
  }));

  return {
    domain: {
      startEpoch: minTime,
      endEpoch: safeMax,
      binCount: OVERVIEW_BIN_COUNT_MEDIUM,
      binSizeSec,
    },
    bins,
    filter: { crimeTypes, districts },
    fingerprint: computeDatasetFingerprint(),
    builtAt: new Date().toISOString(),
  };
};
