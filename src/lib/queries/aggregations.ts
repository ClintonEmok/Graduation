import type { QueryFragment } from './types';

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

export const buildAdaptiveDensityQuery = (tableName: string, domain: [number, number], binCount: number): string => {
  const span = Math.max(1, domain[1] - domain[0]);
  return `
    SELECT idx, COUNT(*) as count
    FROM (
      SELECT LEAST(CAST(FLOOR(((EXTRACT(EPOCH FROM "Date") - ${domain[0]}) / ${span}) * ${binCount}) AS INTEGER), ${binCount - 1}) AS idx
      FROM ${tableName}
      WHERE "Date" IS NOT NULL
    ) binned
    WHERE idx >= 0 AND idx < ${binCount}
    GROUP BY idx
  `;
};

export const buildAdaptiveBurstQuery = (tableName: string, domain: [number, number], binCount: number): string => {
  const span = Math.max(1, domain[1] - domain[0]);
  return `
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
  `;
};

export const withWhereClause = (fragment: QueryFragment): string => `WHERE ${fragment.sql}`;
