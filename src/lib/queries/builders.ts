import { buildNormalizedSqlExpression, NORMALIZED_COORDINATE_RANGE } from '../coordinate-normalization';
import { buildCrimeRangeFilters } from './filters';
import { clampPositiveInt, sanitizeTableName } from './sanitization';
import type { QueryCrimesOptions, QueryFilters } from './types';

export const buildCrimeCoordinateSelectColumns = () => `
  EXTRACT(EPOCH FROM "Date") as timestamp,
  "Primary Type" as type,
  "Latitude" as lat,
  "Longitude" as lon,
  ${buildNormalizedSqlExpression('"Longitude"', 'lon')} as x,
  ${buildNormalizedSqlExpression('"Latitude"', 'lat')} as z,
  "IUCR" as iucr,
  "District" as district,
  EXTRACT(YEAR FROM "Date") as year
`;

export const buildSpatialBinIndexSql = (column: string, axis: 'lon' | 'lat', resolution: number): string =>
  `floor(((${buildNormalizedSqlExpression(column, axis)} - ${NORMALIZED_COORDINATE_RANGE.min}) / ${NORMALIZED_COORDINATE_RANGE.span}) * ${resolution})`;

export const buildCrimesInRangeQuery = (
  tableName: string,
  startEpoch: number,
  endEpoch: number,
  options?: QueryCrimesOptions
): { sql: string; params: unknown[] } => {
  const safeTableName = sanitizeTableName(tableName);
  const limit = clampPositiveInt(options?.limit ?? 50000, 1, 50000);
  const sampleStride = clampPositiveInt(options?.sampleStride ?? 1, 1, 1000);
  const filters = buildCrimeRangeFilters(startEpoch, endEpoch, options, true);
  const selectColumns = buildCrimeCoordinateSelectColumns();

  if (sampleStride > 1) {
    return {
      sql: `
        WITH filtered AS (
          SELECT ${selectColumns}
          FROM ${safeTableName}
          WHERE ${filters.sql}
        ), numbered AS (
          SELECT *, row_number() OVER () as rn
          FROM filtered
        )
        SELECT timestamp, type, lat, lon, x, z, iucr, district, year
        FROM numbered
        WHERE ((rn - 1) % ?) = 0
        LIMIT ?
      `,
      params: [...filters.params, sampleStride, limit],
    };
  }

  return {
    sql: `
      SELECT ${selectColumns}
      FROM ${safeTableName}
      WHERE ${filters.sql}
      LIMIT ?
    `,
    params: [...filters.params, limit],
  };
};

export const buildCrimesRangeQuery = buildCrimesInRangeQuery;

export const buildCrimeCountQuery = (
  tableName: string,
  startEpoch: number,
  endEpoch: number,
  filters?: QueryFilters
): { sql: string; params: unknown[] } => {
  const safeTableName = sanitizeTableName(tableName);
  const where = buildCrimeRangeFilters(startEpoch, endEpoch, filters, false);
  return {
    sql: `
      SELECT COUNT(*) as count
      FROM ${safeTableName}
      WHERE ${where.sql}
    `,
    params: where.params,
  };
};

export const buildDensityBinsQuery = (
  tableName: string,
  startEpoch: number,
  endEpoch: number,
  resX: number,
  resY: number,
  resZ: number
): string => {
  const safeTableName = sanitizeTableName(tableName);
  const safeResX = clampPositiveInt(resX, 1, 1000);
  const safeResY = clampPositiveInt(resY, 1, 1000);
  const safeResZ = clampPositiveInt(resZ, 1, 1000);
  const minEpoch = 978307200;
  const maxEpoch = 1767225600;

  return `
    WITH binned AS (
      SELECT
        ${buildSpatialBinIndexSql('"Longitude"', 'lon', safeResX)} as ix,
        floor(((EXTRACT(EPOCH FROM "Date") - ${minEpoch}) / (${maxEpoch} - ${minEpoch}) * ${safeResY})) as iy,
        ${buildSpatialBinIndexSql('"Latitude"', 'lat', safeResZ)} as iz,
        "Primary Type" as type
      FROM ${safeTableName}
      WHERE "Date" IS NOT NULL
        AND "Latitude" IS NOT NULL
        AND "Longitude" IS NOT NULL
        AND EXTRACT(EPOCH FROM "Date") >= ${startEpoch}
        AND EXTRACT(EPOCH FROM "Date") <= ${endEpoch}
    )
    SELECT
      ((ix + 0.5) / ${safeResX} * 100.0) - 50.0 as x,
      ((iy + 0.5) / ${safeResY} * 100.0) as y,
      ((iz + 0.5) / ${safeResZ} * 100.0) - 50.0 as z,
      CAST(count(*) AS INTEGER) as count,
      mode(type) as dominantType
    FROM binned
    WHERE ix >= 0 AND ix < ${safeResX}
      AND iy >= 0 AND iy < ${safeResY}
      AND iz >= 0 AND iz < ${safeResZ}
    GROUP BY ix, iy, iz
  `;
};
