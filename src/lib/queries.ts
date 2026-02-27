import { getDb, ensureSortedCrimesTable, isMockDataEnabled } from './db';

/**
 * Crime record type returned by queries
 */
export interface CrimeRecord {
  timestamp: number;
  type: string;
  lat: number;
  lon: number;
  x: number;
  z: number;
  iucr: string;
  district: string;
  year: number;
}

/**
 * Query options for crimes in range
 */
export interface QueryCrimesOptions {
  /** Maximum number of records to return (default: 50000) */
  limit?: number;
  /** Sample every Nth row after filtering (1 = no sampling) */
  sampleStride?: number;
  /** Filter by crime types */
  crimeTypes?: string[];
  /** Filter by districts */
  districts?: string[];
}

/**
 * Filter options for count queries
 */
export interface QueryFilters {
  /** Filter by crime types */
  crimeTypes?: string[];
  /** Filter by districts */
  districts?: string[];
}

const MOCK_CRIME_TYPES = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
const MOCK_DISTRICTS = Array.from({ length: 25 }, (_, idx) => String(idx + 1));
const MIN_LON = -87.9;
const MAX_LON = -87.5;
const MIN_LAT = 41.6;
const MAX_LAT = 42.1;

type MockHotspot = {
  district: string;
  centerLon: number;
  centerLat: number;
  typeWeights: Partial<Record<string, number>>;
};

const MOCK_HOTSPOTS: MockHotspot[] = [
  { district: '1', centerLon: -87.63, centerLat: 41.88, typeWeights: { THEFT: 4, BATTERY: 3, ROBBERY: 2 } },
  { district: '6', centerLon: -87.66, centerLat: 41.74, typeWeights: { BATTERY: 4, ASSAULT: 3, BURGLARY: 2 } },
  { district: '8', centerLon: -87.71, centerLat: 41.78, typeWeights: { MOTOR_VEHICLE_THEFT: 1, 'MOTOR VEHICLE THEFT': 4, THEFT: 2 } },
  { district: '11', centerLon: -87.72, centerLat: 41.88, typeWeights: { BATTERY: 4, ROBBERY: 3, ASSAULT: 2 } },
  { district: '18', centerLon: -87.64, centerLat: 41.92, typeWeights: { THEFT: 5, DECEPTIVE_PRACTICE: 1, 'DECEPTIVE PRACTICE': 3 } },
  { district: '24', centerLon: -87.68, centerLat: 42.01, typeWeights: { BURGLARY: 4, THEFT: 3, CRIMINAL_DAMAGE: 1, 'CRIMINAL DAMAGE': 2 } },
];

const normalizeRange = (start: number, end: number) => {
  if (start <= end) return { start, end };
  return { start: end, end: start };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const weightedPick = <T>(items: T[], weights: number[], rng: () => number): T => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)] ?? items[0];
  let cursor = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i] ?? 0;
    if (cursor <= 0) return items[i];
  }
  return items[items.length - 1];
};

const gaussianish = (rng: () => number) => {
  // Sum of uniforms gives a cheap bell-ish distribution around 0.
  return (rng() + rng() + rng() + rng() + rng() + rng()) - 3;
};

const generateMockCrimeRecords = (
  startEpoch: number,
  endEpoch: number,
  options?: QueryCrimesOptions
): CrimeRecord[] => {
  const limit = options?.limit ?? 50000;
  const recordCount = Math.min(limit, 5000);
  const crimeTypes = options?.crimeTypes?.length ? options.crimeTypes : MOCK_CRIME_TYPES;
  const districts = options?.districts?.length ? options.districts : MOCK_DISTRICTS;
  const { start, end } = normalizeRange(startEpoch, endEpoch);
  const span = Math.max(1, end - start);

  const seed =
    (Math.floor(start / 3600) * 31) ^
    (Math.floor(end / 3600) * 17) ^
    (crimeTypes.join('|').length * 101) ^
    (districts.join('|').length * 53);
  const rng = createSeededRandom(seed);

  const activeHotspots = MOCK_HOTSPOTS.filter((hotspot) => districts.includes(hotspot.district));
  const hotspots = activeHotspots.length > 0
    ? activeHotspots
    : districts.map((district) => ({
        district,
        centerLon: MIN_LON + rng() * (MAX_LON - MIN_LON),
        centerLat: MIN_LAT + rng() * (MAX_LAT - MIN_LAT),
        typeWeights: {} as Partial<Record<string, number>>,
      }));

  const temporalPeakCount = 3 + Math.floor(rng() * 3); // 3-5 peaks
  const temporalPeaks = Array.from({ length: temporalPeakCount }, () => {
    const center = start + Math.floor(rng() * span);
    const width = Math.max(3600, span * (0.04 + rng() * 0.12)); // 4-16% of window
    return { center, width };
  });

  const records: CrimeRecord[] = [];
  for (let i = 0; i < recordCount; i++) {
    const hotspot = hotspots[Math.floor(rng() * hotspots.length)];

    const peak = temporalPeaks[Math.floor(rng() * temporalPeaks.length)];
    const usePeak = rng() < 0.78;
    const timestamp = usePeak
      ? Math.floor(clamp(peak.center + gaussianish(rng) * (peak.width / 2), start, end))
      : Math.floor(start + rng() * span);

    const spatialSpread = 0.015 + rng() * 0.02;
    const lon = clamp(hotspot.centerLon + gaussianish(rng) * spatialSpread, MIN_LON, MAX_LON);
    const lat = clamp(hotspot.centerLat + gaussianish(rng) * spatialSpread, MIN_LAT, MAX_LAT);

    const candidateTypes = crimeTypes;
    const typeWeights = candidateTypes.map((type) => hotspot.typeWeights[type] ?? 1);
    const type = weightedPick(candidateTypes, typeWeights, rng);

    const iucrBase = String(Math.floor(100 + rng() * 900));
    const year = new Date(timestamp * 1000).getUTCFullYear();

    records.push({
      timestamp,
      type,
      lat,
      lon,
      x: ((lon - MIN_LON) / (MAX_LON - MIN_LON) * 100.0) - 50.0,
      z: ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT) * 100.0) - 50.0,
      iucr: iucrBase,
      district: hotspot.district,
      year,
    });
  }

  records.sort((a, b) => a.timestamp - b.timestamp);
  return records;
};

const mockCrimeCount = (startEpoch: number, endEpoch: number, filters?: QueryFilters): number => {
  const typeFactor = filters?.crimeTypes?.length ? filters.crimeTypes.length / MOCK_CRIME_TYPES.length : 1;
  const districtFactor = filters?.districts?.length ? filters.districts.length / MOCK_DISTRICTS.length : 1;
  const { start, end } = normalizeRange(startEpoch, endEpoch);
  const spanDays = Math.max(1, (end - start) / 86400);
  const yearScale = spanDays / 365;
  const basePerYear = 100000;
  return Math.max(1000, Math.floor(basePerYear * yearScale * typeFactor * districtFactor));
};

/**
 * Query crimes within a time range using the zone-map-optimized sorted table.
 * 
 * @param startEpoch - Start time as Unix epoch seconds
 * @param endEpoch - End time as Unix epoch seconds
 * @param options - Query options (limit, crimeTypes, districts)
 * @returns Array of crime records within the specified range
 */
export const queryCrimesInRange = async (
  startEpoch: number,
  endEpoch: number,
  options?: QueryCrimesOptions
): Promise<CrimeRecord[]> => {
  if (isMockDataEnabled()) {
    return generateMockCrimeRecords(startEpoch, endEpoch, options);
  }
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  
  const limit = options?.limit ?? 50000;
  const sampleStride = Math.max(1, Math.floor(options?.sampleStride ?? 1));
  const crimeTypes = options?.crimeTypes;
  const districts = options?.districts;

  // Build query with direct values (DuckDB prepared statements have issues with dynamic params)
  let whereClause = `WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL`;
  
  whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= ${startEpoch} AND EXTRACT(EPOCH FROM "Date") <= ${endEpoch}`;

  if (crimeTypes && crimeTypes.length > 0) {
    // Escape single quotes in crime types
    const escaped = crimeTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
    whereClause += ` AND "Primary Type" IN (${escaped})`;
  }

  if (districts && districts.length > 0) {
    const escaped = districts.map(d => `'${d.replace(/'/g, "''")}'`).join(', ');
    whereClause += ` AND "District" IN (${escaped})`;
  }

  // Chicago coordinate bounds for normalization
  const minLon = -87.9;
  const maxLon = -87.5;
  const minLat = 41.6;
  const maxLat = 42.1;

  const selectColumns = `
    EXTRACT(EPOCH FROM "Date") as timestamp,
    "Primary Type" as type,
    "Latitude" as lat,
    "Longitude" as lon,
    (("Longitude" - ${minLon}) / (${maxLon} - ${minLon}) * 100.0) - 50.0 as x,
    (("Latitude" - ${minLat}) / (${maxLat} - ${minLat}) * 100.0) - 50.0 as z,
    "IUCR" as iucr,
    "District" as district,
    EXTRACT(YEAR FROM "Date") as year
  `;

  const query = sampleStride > 1
    ? `
      WITH filtered AS (
        SELECT ${selectColumns}
        FROM ${tableName}
        ${whereClause}
      ), numbered AS (
        SELECT *, row_number() OVER () as rn
        FROM filtered
      )
      SELECT timestamp, type, lat, lon, x, z, iucr, district, year
      FROM numbered
      WHERE ((rn - 1) % ${sampleStride}) = 0
      LIMIT ${limit}
    `
    : `
      SELECT ${selectColumns}
      FROM ${tableName}
      ${whereClause}
      LIMIT ${limit}
    `;

  return new Promise((resolve, reject) => {
    db.all(query, (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error querying crimes in range:', err);
        reject(err);
        return;
      }

      // Convert BigInt values to Number for JSON serialization
      const records = (rows as Record<string, unknown>[]).map((row) => ({
        timestamp: typeof row.timestamp === 'bigint' ? Number(row.timestamp) : row.timestamp,
        type: row.type as string,
        lat: typeof row.lat === 'bigint' ? Number(row.lat) : row.lat,
        lon: typeof row.lon === 'bigint' ? Number(row.lon) : row.lon,
        x: typeof row.x === 'bigint' ? Number(row.x) : row.x,
        z: typeof row.z === 'bigint' ? Number(row.z) : row.z,
        iucr: row.iucr as string,
        district: row.district as string,
        year: typeof row.year === 'bigint' ? Number(row.year) : row.year,
      }));

      resolve(records as CrimeRecord[]);
    });
  });
};

/**
 * Query the count of crimes within a time range.
 * Much faster than fetching all records - used for density calculations.
 * 
 * @param startEpoch - Start time as Unix epoch seconds
 * @param endEpoch - End time as Unix epoch seconds
 * @param filters - Optional filters (crimeTypes, districts)
 * @returns Count of crimes in the specified range
 */
export const queryCrimeCount = async (
  startEpoch: number,
  endEpoch: number,
  filters?: QueryFilters
): Promise<number> => {
  if (isMockDataEnabled()) {
    return mockCrimeCount(startEpoch, endEpoch, filters);
  }
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  
  const crimeTypes = filters?.crimeTypes;
  const districts = filters?.districts;

  let whereClause = `WHERE "Date" IS NOT NULL`;
  whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= ${startEpoch} AND EXTRACT(EPOCH FROM "Date") <= ${endEpoch}`;

  if (crimeTypes && crimeTypes.length > 0) {
    const escaped = crimeTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
    whereClause += ` AND "Primary Type" IN (${escaped})`;
  }

  if (districts && districts.length > 0) {
    const escaped = districts.map(d => `'${d.replace(/'/g, "''")}'`).join(', ');
    whereClause += ` AND "District" IN (${escaped})`;
  }

  const query = `
    SELECT COUNT(*) as count
    FROM ${tableName}
    ${whereClause}
  `;

  return new Promise((resolve, reject) => {
    db.all(query, (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error querying crime count:', err);
        reject(err);
        return;
      }

      const row = rows[0] as { count: number | string | bigint };
      const count = typeof row.count === 'bigint' ? Number(row.count) : 
                    typeof row.count === 'string' ? parseInt(row.count, 10) : 
                    row.count;
      
      resolve(count);
    });
  });
};

export interface GlobalAdaptiveMaps {
  binCount: number;
  kernelWidth: number;
  domain: [number, number];
  rowCount: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  generatedAt: string;
}

interface AdaptiveCacheRow {
  domain_start: number | bigint;
  domain_end: number | bigint;
  row_count: number | bigint;
  density_json: string;
  burstiness_json: string;
  warp_json: string;
  generated_at: string;
}

const toNumber = (value: number | string | bigint | null | undefined): number => {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return typeof value === 'number' ? value : 0;
};

const smoothSeries = (values: Float32Array, kernelWidth: number): Float32Array => {
  if (kernelWidth <= 0) return values;
  const smoothed = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let k = -kernelWidth; k <= kernelWidth; k += 1) {
      const idx = i + k;
      if (idx >= 0 && idx < values.length) {
        sum += values[idx];
        count += 1;
      }
    }
    smoothed[i] = count > 0 ? sum / count : 0;
  }
  return smoothed;
};

const computeWarpMap = (normalizedDensity: Float32Array, domain: [number, number]): Float32Array => {
  const [start, end] = domain;
  const span = Math.max(1, end - start);
  const weights = new Float32Array(normalizedDensity.length);
  let totalWeight = 0;

  for (let i = 0; i < normalizedDensity.length; i += 1) {
    const w = 1 + normalizedDensity[i] * 5;
    weights[i] = w;
    totalWeight += w;
  }

  const warpMap = new Float32Array(normalizedDensity.length);
  let accumulated = 0;
  const denom = totalWeight > 0 ? totalWeight : 1;
  for (let i = 0; i < normalizedDensity.length; i += 1) {
    warpMap[i] = start + (accumulated / denom) * span;
    accumulated += weights[i];
  }

  return warpMap;
};

export const getOrCreateGlobalAdaptiveMaps = async (
  binCount: number,
  kernelWidth: number
): Promise<GlobalAdaptiveMaps> => {
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  const cacheKey = `global:${binCount}:${kernelWidth}`;

  const allAsync = <T>(query: string): Promise<T[]> =>
    new Promise((resolve, reject) => {
      db.all(query, (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as T[]);
      });
    });

  const runAsync = (query: string): Promise<void> =>
    new Promise((resolve, reject) => {
      db.run(query, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

  await runAsync(`
    CREATE TABLE IF NOT EXISTS adaptive_global_cache (
      cache_key VARCHAR PRIMARY KEY,
      bin_count INTEGER,
      kernel_width INTEGER,
      domain_start DOUBLE,
      domain_end DOUBLE,
      row_count BIGINT,
      density_json VARCHAR,
      burstiness_json VARCHAR,
      warp_json VARCHAR,
      generated_at TIMESTAMP DEFAULT now()
    )
  `);

  const cached = await allAsync<AdaptiveCacheRow>(`
    SELECT domain_start, domain_end, row_count, density_json, burstiness_json, warp_json, CAST(generated_at AS VARCHAR) as generated_at
    FROM adaptive_global_cache
    WHERE cache_key = '${cacheKey}'
    LIMIT 1
  `);

  if (cached.length > 0) {
    const row = cached[0];
    return {
      binCount,
      kernelWidth,
      domain: [toNumber(row.domain_start), toNumber(row.domain_end)],
      rowCount: toNumber(row.row_count),
      densityMap: Float32Array.from(JSON.parse(row.density_json) as number[]),
      burstinessMap: Float32Array.from(JSON.parse(row.burstiness_json) as number[]),
      warpMap: Float32Array.from(JSON.parse(row.warp_json) as number[]),
      generatedAt: row.generated_at,
    };
  }

  const domainRows = await allAsync<{ min_ts: number | bigint; max_ts: number | bigint; row_count: number | bigint }>(`
    SELECT
      MIN(EXTRACT(EPOCH FROM "Date")) as min_ts,
      MAX(EXTRACT(EPOCH FROM "Date")) as max_ts,
      COUNT(*) as row_count
    FROM ${tableName}
    WHERE "Date" IS NOT NULL
  `);

  const minTs = toNumber(domainRows[0]?.min_ts);
  const maxTs = toNumber(domainRows[0]?.max_ts);
  const rowCount = toNumber(domainRows[0]?.row_count);
  const domain: [number, number] = [minTs, maxTs > minTs ? maxTs : minTs + 1];
  const span = Math.max(1, domain[1] - domain[0]);

  const densityRows = await allAsync<{ idx: number | bigint; count: number | bigint }>(`
    SELECT idx, COUNT(*) as count
    FROM (
      SELECT LEAST(CAST(FLOOR(((EXTRACT(EPOCH FROM "Date") - ${domain[0]}) / ${span}) * ${binCount}) AS INTEGER), ${binCount - 1}) AS idx
      FROM ${tableName}
      WHERE "Date" IS NOT NULL
    ) binned
    WHERE idx >= 0 AND idx < ${binCount}
    GROUP BY idx
  `);

  const rawDensity = new Float32Array(binCount);
  for (const row of densityRows) {
    const idx = toNumber(row.idx);
    if (idx >= 0 && idx < binCount) rawDensity[idx] = toNumber(row.count);
  }

  const smoothedDensity = smoothSeries(rawDensity, Math.max(0, Math.floor(kernelWidth)));
  let maxDensity = 0;
  for (let i = 0; i < smoothedDensity.length; i += 1) {
    if (smoothedDensity[i] > maxDensity) maxDensity = smoothedDensity[i];
  }
  if (maxDensity <= 0) maxDensity = 1;

  const normalizedDensity = new Float32Array(binCount);
  for (let i = 0; i < smoothedDensity.length; i += 1) {
    normalizedDensity[i] = smoothedDensity[i] / maxDensity;
  }

  const burstRows = await allAsync<{ idx: number | bigint; c: number | bigint; s: number | bigint; ss: number | bigint }>(`
    WITH ordered AS (
      SELECT
        EXTRACT(EPOCH FROM "Date") as ts,
        EXTRACT(EPOCH FROM "Date") - LAG(EXTRACT(EPOCH FROM "Date")) OVER (ORDER BY "Date") as delta
      FROM ${tableName}
      WHERE "Date" IS NOT NULL
    ), binned AS (
      SELECT
        LEAST(CAST(FLOOR(((ts - ${domain[0]}) / ${span}) * ${binCount}) AS INTEGER), ${binCount - 1}) AS idx,
        delta
      FROM ordered
      WHERE ts >= ${domain[0]} AND ts <= ${domain[1]} AND delta IS NOT NULL AND delta >= 0
    )
    SELECT idx, COUNT(*) as c, SUM(delta) as s, SUM(delta * delta) as ss
    FROM binned
    WHERE idx >= 0 AND idx < ${binCount}
    GROUP BY idx
  `);

  const burstinessMap = new Float32Array(binCount);
  for (const row of burstRows) {
    const idx = toNumber(row.idx);
    if (idx < 0 || idx >= binCount) continue;
    const count = toNumber(row.c);
    if (count <= 1) {
      burstinessMap[idx] = 0;
      continue;
    }
    const sum = toNumber(row.s);
    const sumSq = toNumber(row.ss);
    const mean = sum / count;
    const variance = Math.max(0, sumSq / count - mean * mean);
    const sigma = Math.sqrt(variance);
    const denom = sigma + mean;
    const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
    burstinessMap[idx] = Math.max(0, Math.min(1, (burstiness + 1) / 2));
  }

  const warpMap = computeWarpMap(normalizedDensity, domain);

  const densityJson = JSON.stringify(Array.from(normalizedDensity));
  const burstJson = JSON.stringify(Array.from(burstinessMap));
  const warpJson = JSON.stringify(Array.from(warpMap));

  await runAsync(`DELETE FROM adaptive_global_cache WHERE cache_key = '${cacheKey}'`);
  await runAsync(`
    INSERT INTO adaptive_global_cache (
      cache_key,
      bin_count,
      kernel_width,
      domain_start,
      domain_end,
      row_count,
      density_json,
      burstiness_json,
      warp_json
    ) VALUES (
      '${cacheKey}',
      ${binCount},
      ${kernelWidth},
      ${domain[0]},
      ${domain[1]},
      ${rowCount},
      '${densityJson}',
      '${burstJson}',
      '${warpJson}'
    )
  `);

  return {
    binCount,
    kernelWidth,
    domain,
    rowCount,
    densityMap: normalizedDensity,
    burstinessMap,
    warpMap,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Query density bins pre-computed at query time.
 * Returns binned counts for visualization.
 * 
 * @param startEpoch - Start time as Unix epoch seconds
 * @param endEpoch - End time as Unix epoch seconds
 * @param resX - Resolution in X dimension (longitude)
 * @param resY - Resolution in Y dimension (time)
 * @param resZ - Resolution in Z dimension (latitude)
 * @returns Array of binned data with counts
 */
export interface DensityBin {
  x: number;
  y: number;
  z: number;
  count: number;
  dominantType: string;
}

export const queryDensityBins = async (
  startEpoch: number,
  endEpoch: number,
  resX: number,
  resY: number,
  resZ: number
): Promise<DensityBin[]> => {
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  
  // Chicago coordinate bounds
  const minLon = -87.9;
  const maxLon = -87.5;
  const minLat = 41.6;
  const maxLat = 42.1;
  const minEpoch = 978307200;   // 2001-01-01
  const maxEpoch = 1767225600;  // 2026-01-01

  const query = `
    WITH binned AS (
      SELECT
        floor(((("Longitude" - ${minLon}) / (${maxLon} - ${minLon})) * ${resX})) as ix,
        floor(((EXTRACT(EPOCH FROM "Date") - ${minEpoch}) / (${maxEpoch} - ${minEpoch}) * ${resY})) as iy,
        floor(((("Latitude" - ${minLat}) / (${maxLat} - ${minLat})) * ${resZ})) as iz,
        "Primary Type" as type
      FROM ${tableName}
      WHERE "Date" IS NOT NULL 
        AND "Latitude" IS NOT NULL 
        AND "Longitude" IS NOT NULL
        AND EXTRACT(EPOCH FROM "Date") >= $1 
        AND EXTRACT(EPOCH FROM "Date") <= $2
    )
    SELECT
      ((ix + 0.5) / ${resX} * 100.0) - 50.0 as x,
      ((iy + 0.5) / ${resY} * 100.0) as y,
      ((iz + 0.5) / ${resZ} * 100.0) - 50.0 as z,
      CAST(count(*) AS INTEGER) as count,
      mode(type) as dominantType
    FROM binned
    WHERE ix >= 0 AND ix < ${resX}
      AND iy >= 0 AND iy < ${resY}
      AND iz >= 0 AND iz < ${resZ}
    GROUP BY ix, iy, iz
  `;

  return new Promise((resolve, reject) => {
    db.all(query, [startEpoch, endEpoch], (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error querying density bins:', err);
        reject(err);
        return;
      }

      const bins = (rows as Record<string, unknown>[]).map((row) => ({
        x: typeof row.x === 'bigint' ? Number(row.x) : row.x,
        y: typeof row.y === 'bigint' ? Number(row.y) : row.y,
        z: typeof row.z === 'bigint' ? Number(row.z) : row.z,
        count: typeof row.count === 'bigint' ? Number(row.count) : row.count,
        dominantType: row.dominantType as string,
      }));

      resolve(bins as DensityBin[]);
    });
  });
};
