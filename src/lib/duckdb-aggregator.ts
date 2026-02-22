import { getDb, getDataPath } from './db';
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

export const getAggregatedBins = async (params: AggregationParams): Promise<Bin[]> => {
  const { resX, resY, resZ, types, districts, startTime, endTime } = params;
  const db = await getDb();
  const dataPath = getDataPath();

  // Query from CSV file with proper date parsing
  // Using 0..1 normalization for x, z based on Chicago coordinate bounds
  // x: -87.9 to -87.5 -> 0 to 1
  // z: 41.6 to 42.1 -> 0 to 1  
  // y (time): normalized to 0-100 range
  
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
  if (startTime !== undefined && endTime !== undefined) {
    whereClause += ` AND EXTRACT(EPOCH FROM "Date") >= ${startTime} AND EXTRACT(EPOCH FROM "Date") <= ${endTime}`;
  }

  const query = `
    WITH binned AS (
      SELECT
        floor(((("Longitude" + 87.5) / (87.7 - 87.5))) * ${resX}) as ix,
        floor(((EXTRACT(EPOCH FROM "Date") - 978307200) / (1767225600 - 978307200)) * ${resY}) as iy,
        floor(((("Latitude" - 37) / (42 - 37))) * ${resZ}) as iz,
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
