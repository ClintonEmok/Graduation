import { mkdirSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';

type DuckDbInstance = {
  exec: (sql: string, callback: (err: Error | null) => void) => void;
  all: (sql: string, callback: (err: Error | null, rows: unknown[]) => void) => void;
  run: (sql: string, callback: (err: Error | null) => void) => void;
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
  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
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

          resolve(instance);
        });
      });

      await configureDatabase(database as DuckDbInstance);

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
      
      const createQuery = `
        CREATE TABLE crimes_sorted AS 
        SELECT * FROM read_csv_auto('${dataPath}')
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
