import { getDb, ensureSortedCrimesTable, getDataPath } from './db';

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
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  const dataPath = getDataPath();
  
  const limit = options?.limit ?? 50000;
  const crimeTypes = options?.crimeTypes;
  const districts = options?.districts;

  // Build parameterized query
  let whereClause = `WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL`;
  
  // Use parameterized queries to prevent SQL injection
  const params: (number | string)[] = [startEpoch, endEpoch];
  
  whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= $1 AND EXTRACT(EPOCH FROM "Date") <= $2`;

  if (crimeTypes && crimeTypes.length > 0) {
    // Add placeholders for each crime type
    const placeholders = crimeTypes.map((_, i) => `$${params.length + i + 1}`).join(', ');
    whereClause += ` AND "Primary Type" IN (${placeholders})`;
    params.push(...crimeTypes);
  }

  if (districts && districts.length > 0) {
    const placeholders = districts.map((_, i) => `$${params.length + i + 1}`).join(', ');
    whereClause += ` AND "District" IN (${placeholders})`;
    params.push(...districts);
  }

  // Chicago coordinate bounds for normalization
  const minLon = -87.9;
  const maxLon = -87.5;
  const minLat = 41.6;
  const maxLat = 42.1;

  const query = `
    SELECT 
      EXTRACT(EPOCH FROM "Date") as timestamp,
      "Primary Type" as type,
      "Latitude" as lat,
      "Longitude" as lon,
      (("Longitude" - ${minLon}) / (${maxLon} - ${minLon}) * 100.0) - 50.0 as x,
      (("Latitude" - ${minLat}) / (${maxLat} - ${minLat}) * 100.0) - 50.0 as z,
      "IUCR" as iucr,
      "District" as district,
      EXTRACT(YEAR FROM "Date") as year
    FROM ${tableName}
    ${whereClause}
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit);

  return new Promise((resolve, reject) => {
    db.all(query, params, (err: Error | null, rows: unknown[]) => {
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
  const db = await getDb();
  const tableName = await ensureSortedCrimesTable();
  
  const crimeTypes = filters?.crimeTypes;
  const districts = filters?.districts;

  let whereClause = `WHERE "Date" IS NOT NULL`;
  const params: (number | string)[] = [startEpoch, endEpoch];
  
  whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= $1 AND EXTRACT(EPOCH FROM "Date") <= $2`;

  if (crimeTypes && crimeTypes.length > 0) {
    const placeholders = crimeTypes.map((_, i) => `$${params.length + i + 1}`).join(', ');
    whereClause += ` AND "Primary Type" IN (${placeholders})`;
    params.push(...crimeTypes);
  }

  if (districts && districts.length > 0) {
    const placeholders = districts.map((_, i) => `$${params.length + i + 1}`).join(', ');
    whereClause += ` AND "District" IN (${placeholders})`;
    params.push(...districts);
  }

  const query = `
    SELECT COUNT(*) as count
    FROM ${tableName}
    ${whereClause}
  `;

  return new Promise((resolve, reject) => {
    db.all(query, params, (err: Error | null, rows: unknown[]) => {
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
