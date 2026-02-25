import { getDb, getDataPath, isMockDataEnabled } from './db';
import { Bin } from '@/types';

export interface AggregationParams {
  resX: number;
  resY: number;
  resZ: number;
  // Optional filters
  types?: string[];
  districts?: string[];
  startTime?: number;
  endTime?: number;
}

const generateMockBins = (resX: number, resY: number, resZ: number): Bin[] => {
  const bins: Bin[] = [];
  const binCount = Math.min(resX * resY * resZ, 100);

  for (let i = 0; i < binCount; i++) {
    const ix = Math.floor(Math.random() * resX);
    const iy = Math.floor(Math.random() * resY);
    const iz = Math.floor(Math.random() * resZ);

    bins.push({
      x: ((ix + 0.5) / resX * 100.0) - 50.0,
      y: ((iy + 0.5) / resY * 100.0),
      z: ((iz + 0.5) / resZ * 100.0) - 50.0,
      count: Math.floor(Math.random() * 1000) + 100,
      dominantType: ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT'][Math.floor(Math.random() * 4)],
    });
  }

  return bins;
};

export const getAggregatedBins = async (params: AggregationParams): Promise<Bin[]> => {
  const { resX, resY, resZ, types, districts, startTime, endTime } = params;
  if (isMockDataEnabled()) {
    return generateMockBins(resX, resY, resZ);
  }
  const db = await getDb();
  const dataPath = getDataPath();

  // Query from CSV file with proper date parsing
  // Using 0..1 normalization for x, z based on Chicago coordinate bounds
  // Chicago bounds: lon -87.9 to -87.5, lat 41.6 to 42.1
  
  let whereClause = 'WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL';
  
  if (types && types.length > 0) {
    const typeList = types.map(t => `'${t}'`).join(',');
    whereClause += ` AND "Primary Type" IN (${typeList})`;
  }
  if (districts && districts.length > 0) {
    const districtList = districts.map(d => `'${d}'`).join(',');
    whereClause += ` AND "District" IN (${districtList})`;
  }
  
  // Time filter using epoch seconds from Date column
  // Default to full range if not specified
  const minEpoch = 978307200;   // 2001-01-01
  const maxEpoch = 1767225600;  // 2026-01-01
  const startTs = startTime ?? minEpoch;
  const endTs = endTime ?? maxEpoch;
  
  whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= ${startTs} AND EXTRACT(EPOCH FROM "Date") <= ${endTs}`;

  const query = `
    WITH binned AS (
      SELECT
        floor(((("Longitude" - (-87.9)) / (-87.5 - (-87.9)))) * ${resX}) as ix,
        floor(((EXTRACT(EPOCH FROM "Date") - ${minEpoch}) / (${maxEpoch} - ${minEpoch})) * ${resY}) as iy,
        floor(((("Latitude" - 41.6) / (42.1 - 41.6))) * ${resZ}) as iz,
        "Primary Type" as type
      FROM read_csv_auto('${dataPath}')
      ${whereClause}
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
    db.all(query, (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('DuckDB Aggregation Error:', err);
        reject(err);
      } else {
        resolve(rows as Bin[]);
      }
    });
  });
};
