import type { AdaptiveBinningMode, QueryFragment } from './types';
import { buildNormalizedSqlExpression, NORMALIZED_COORDINATE_RANGE } from '../coordinate-normalization';
import { clampDensityResolution } from './sanitization';

type AdaptiveCacheInsertPayload = {
  cacheKey: string;
  binCount: number;
  kernelWidth: number;
  binningMode: AdaptiveBinningMode;
  domain: [number, number];
  rowCount: number;
  densityJson: string;
  countJson: string;
  burstJson: string;
  warpJson: string;
};

export const toNumber = (value: number | string | bigint | null | undefined): number => {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return typeof value === 'number' ? value : 0;
};

export const smoothSeries = (values: Float32Array, kernelWidth: number): Float32Array => {
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

export const computeWarpMap = (normalizedDensity: Float32Array, domain: [number, number]): Float32Array => {
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

export const buildAdaptiveDomainQuery = (tableName: string): string => `
  SELECT
    MIN(EXTRACT(EPOCH FROM "Date")) as min_ts,
    MAX(EXTRACT(EPOCH FROM "Date")) as max_ts,
    COUNT(*) as row_count
  FROM ${tableName}
  WHERE "Date" IS NOT NULL
`;

export const buildGlobalAdaptiveCacheQueries = (
  cacheTableName: string,
  payload: AdaptiveCacheInsertPayload
): {
  ensureTableSql: string;
  ensureColumnsSql: string[];
  readByKey: QueryFragment;
  deleteByKey: QueryFragment;
  insert: QueryFragment;
} => ({
  ensureTableSql: `
    CREATE TABLE IF NOT EXISTS ${cacheTableName} (
      cache_key VARCHAR PRIMARY KEY,
      bin_count INTEGER,
      kernel_width INTEGER,
      binning_mode VARCHAR,
      domain_start DOUBLE,
      domain_end DOUBLE,
      row_count BIGINT,
      density_json VARCHAR,
      count_json VARCHAR,
      burstiness_json VARCHAR,
      warp_json VARCHAR,
      generated_at TIMESTAMP DEFAULT now()
    )
  `,
  ensureColumnsSql: [
    `ALTER TABLE ${cacheTableName} ADD COLUMN IF NOT EXISTS binning_mode VARCHAR`,
    `ALTER TABLE ${cacheTableName} ADD COLUMN IF NOT EXISTS count_json VARCHAR`,
  ],
  readByKey: {
    sql: `
      SELECT domain_start, domain_end, row_count, density_json, count_json, burstiness_json, warp_json, binning_mode, CAST(generated_at AS VARCHAR) as generated_at
      FROM ${cacheTableName}
      WHERE cache_key = ?
      LIMIT 1
    `,
    params: [payload.cacheKey],
  },
  deleteByKey: {
    sql: `DELETE FROM ${cacheTableName} WHERE cache_key = ?`,
    params: [payload.cacheKey],
  },
  insert: {
    sql: `
      INSERT INTO ${cacheTableName} (
        cache_key,
        bin_count,
        kernel_width,
        binning_mode,
        domain_start,
        domain_end,
        row_count,
        density_json,
        count_json,
        burstiness_json,
        warp_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      payload.cacheKey,
      payload.binCount,
      payload.kernelWidth,
      payload.binningMode,
      payload.domain[0],
      payload.domain[1],
      payload.rowCount,
      payload.densityJson,
      payload.countJson,
      payload.burstJson,
      payload.warpJson,
    ],
  },
});

export const buildAdaptiveTimestampQuery = (tableName: string, domain: [number, number]): QueryFragment => ({
  sql: `
    SELECT EXTRACT(EPOCH FROM "Date") as ts
    FROM ${tableName}
    WHERE "Date" IS NOT NULL
      AND EXTRACT(EPOCH FROM "Date") >= ?
      AND EXTRACT(EPOCH FROM "Date") <= ?
    ORDER BY "Date" ASC
  `,
  params: [domain[0], domain[1]],
});

export const buildAdaptiveDensityQuery = (tableName: string, domain: [number, number], binCount: number): QueryFragment => {
  const span = Math.max(1, domain[1] - domain[0]);
  return {
    sql: `
      SELECT idx, COUNT(*) as count
      FROM (
        SELECT LEAST(CAST(FLOOR(((EXTRACT(EPOCH FROM "Date") - ?) / ?) * ?) AS INTEGER), ?) AS idx
        FROM ${tableName}
        WHERE "Date" IS NOT NULL
      ) binned
      WHERE idx >= 0 AND idx < ?
      GROUP BY idx
    `,
    params: [domain[0], span, binCount, binCount - 1, binCount],
  };
};

export const buildAdaptiveBurstQuery = (tableName: string, domain: [number, number], binCount: number): QueryFragment => {
  const span = Math.max(1, domain[1] - domain[0]);
  return {
    sql: `
      WITH ordered AS (
        SELECT
          EXTRACT(EPOCH FROM "Date") as ts,
          EXTRACT(EPOCH FROM "Date") - LAG(EXTRACT(EPOCH FROM "Date")) OVER (ORDER BY "Date") as delta
        FROM ${tableName}
        WHERE "Date" IS NOT NULL
      ), binned AS (
        SELECT
          LEAST(CAST(FLOOR(((ts - ?) / ?) * ?) AS INTEGER), ?) AS idx,
          delta
        FROM ordered
        WHERE ts >= ? AND ts <= ? AND delta IS NOT NULL AND delta >= 0
      )
      SELECT idx, COUNT(*) as c, SUM(delta) as s, SUM(delta * delta) as ss
      FROM binned
      WHERE idx >= 0 AND idx < ?
      GROUP BY idx
    `,
    params: [domain[0], span, binCount, binCount - 1, domain[0], domain[1], binCount],
  };
};

export const withWhereClause = (fragment: QueryFragment): string => `WHERE ${fragment.sql}`;

export const buildDensityBinsQuery = (
  tableName: string,
  startEpoch: number,
  endEpoch: number,
  resX: number,
  resY: number,
  resZ: number
): QueryFragment => {
  const minEpoch = 978307200;
  const maxEpoch = 1767225600;
  const safeResX = clampDensityResolution(resX);
  const safeResY = clampDensityResolution(resY);
  const safeResZ = clampDensityResolution(resZ);
  const lonBinSql = `floor(((${buildNormalizedSqlExpression('"Longitude"', 'lon')} - ${NORMALIZED_COORDINATE_RANGE.min}) / ${NORMALIZED_COORDINATE_RANGE.span}) * ?)`;
  const latBinSql = `floor(((${buildNormalizedSqlExpression('"Latitude"', 'lat')} - ${NORMALIZED_COORDINATE_RANGE.min}) / ${NORMALIZED_COORDINATE_RANGE.span}) * ?)`;

  return {
    sql: `
      WITH binned AS (
        SELECT
          ${lonBinSql} as ix,
          floor(((EXTRACT(EPOCH FROM "Date") - ?) / (? - ?) * ?)) as iy,
          ${latBinSql} as iz,
          "Primary Type" as type
        FROM ${tableName}
        WHERE "Date" IS NOT NULL
          AND "Latitude" IS NOT NULL
          AND "Longitude" IS NOT NULL
          AND EXTRACT(EPOCH FROM "Date") >= ?
          AND EXTRACT(EPOCH FROM "Date") <= ?
      )
      SELECT
        ((ix + 0.5) / ? * 100.0) - 50.0 as x,
        ((iy + 0.5) / ? * 100.0) as y,
        ((iz + 0.5) / ? * 100.0) - 50.0 as z,
        CAST(count(*) AS INTEGER) as count,
        mode(type) as dominantType
      FROM binned
      WHERE ix >= 0 AND ix < ?
        AND iy >= 0 AND iy < ?
        AND iz >= 0 AND iz < ?
      GROUP BY ix, iy, iz
    `,
    params: [
      safeResX,
      minEpoch,
      maxEpoch,
      minEpoch,
      safeResY,
      safeResZ,
      startEpoch,
      endEpoch,
      safeResX,
      safeResY,
      safeResZ,
      safeResX,
      safeResY,
      safeResZ,
    ],
  };
};
