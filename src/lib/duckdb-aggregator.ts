import { getDb } from './db';
import { join } from 'path';
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
  const dataPath = join(process.cwd(), 'data', 'crime.parquet');

  // 1. Get metadata for bounds (if we want to be dynamic)
  // For now, we know the normalization logic from setup-data.js:
  // x: 0..1, z: 0..1, y: 0..100
  // And the 3D scene uses:
  // x: -50..50, z: -50..50, y: 0..100
  
  // We'll use the 0..1 normalization from the parquet file directly.
  
  let whereClause = 'WHERE 1=1';
  if (types && types.length > 0) {
    whereClause += ` AND type IN (${types.map(t => `'${t}'`).join(',')})`;
  }
  if (districts && districts.length > 0) {
    whereClause += ` AND district IN (${districts.map(d => `'${d}'`).join(',')})`;
  }
  // y is 0-100 in our parquet file
  if (startTime !== undefined && endTime !== undefined) {
    // We would need the full time range to normalize if we wanted to filter by raw timestamps
    // but the API usually works with normalized or pre-filtered data.
    // For now, let's assume y is already 0-100 and we filter on it if needed.
  }

  const query = `
    WITH binned AS (
      SELECT
        floor(x * ${resX}) as ix,
        floor((y / 100.0) * ${resY}) as iy,
        floor(z * ${resZ}) as iz,
        type
      FROM '${dataPath}'
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
