import { buildNormalizedSqlExpression, NORMALIZED_COORDINATE_RANGE } from '../coordinate-normalization';
import { buildCrimeRangeFilters } from './filters';
import { clampPositiveInt, sanitizeTableName } from './sanitization';
import type {
  QueryCrimesOptions,
  QueryFilters,
  QueryFragment,
  RangePagedRequest,
  RangeQueryCursor,
} from './types';

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

/**
 * Phase 81 Wave 3: select columns for the persisted `crimes_fact` table.
 * Returns the canonical `CrimeRecord` shape — the fact table stores
 * `timestamp_sec` (BIGINT) and `lat` / `lon` (DOUBLE) directly, so we
 * project those plus server-computed normalized x/z coordinates.
 */
export const buildCrimesFactSelectColumns = () => `
  timestamp_sec as timestamp,
  primary_type as type,
  lat,
  lon,
  ${buildNormalizedSqlExpression('lon', 'lon')} as x,
  ${buildNormalizedSqlExpression('lat', 'lat')} as z,
  iucr,
  district,
  year,
  row_id
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

/**
 * Phase 81 Wave 3: encode a keyset paging cursor as an opaque base64-JSON
 * string. The encoding is prefixed with a version tag (`v1.`) so the
 * format can evolve without breaking persisted cursors. Cursor stability
 * is guaranteed by the `(timestamp_sec, row_id)` sort order of the
 * persisted `crimes_fact` table.
 *
 * The encoding works in both Node (server routes) and the browser
 * (client hooks). On platforms without `btoa`/`atob`, callers should
 * polyfill or use a Node-side fallback.
 */
const CURSOR_PREFIX = 'v1.';

const encodeBase64 = (value: string): string => {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return Buffer.from(value, 'utf-8').toString('base64');
};

const decodeBase64 = (value: string): string => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }
  return Buffer.from(value, 'base64').toString('utf-8');
};

export const encodeRangeCursor = (cursor: RangeQueryCursor): string => {
  const json = JSON.stringify({ ts: cursor.ts, rid: cursor.rowId });
  return `${CURSOR_PREFIX}${encodeBase64(json)}`;
};

export const decodeRangeCursor = (raw: string | null | undefined): RangeQueryCursor | null => {
  if (!raw || !raw.startsWith(CURSOR_PREFIX)) return null;
  try {
    const json = decodeBase64(raw.slice(CURSOR_PREFIX.length));
    const parsed = JSON.parse(json) as { ts?: unknown; rid?: unknown };
    const ts = typeof parsed.ts === 'number' ? parsed.ts : Number(parsed.ts);
    const rowId = typeof parsed.rid === 'number' ? parsed.rid : Number(parsed.rid);
    if (!Number.isFinite(ts) || !Number.isFinite(rowId)) return null;
    return { ts, rowId };
  } catch {
    return null;
  }
};

/**
 * Phase 81 Wave 3: build the exact keyset paged read against the
 * persisted `crimes_fact` table. The query:
 *   - filters on the explicit time range and optional crimeTypes/districts
 *   - resumes after the supplied cursor using a tuple comparison
 *     `(timestamp_sec, row_id) > (?, ?)` so the page order is stable
 *   - returns `pageSize + 1` rows so the caller can detect `hasMore`
 *     by simply checking if the last row's `row_id` is the same as
 *     the last row the client already has, or by trimming
 *   - projects normalized x/z via the shared coordinate-normalization
 *     helper, so downstream consumers get a `CrimeRecord`-shaped row
 *
 * The query is intentionally unsampled (D-11). It is the canonical
 * exact detail contract for the dashboard in Wave 3.
 */
export const buildCrimesInRangePagedQuery = (request: RangePagedRequest): QueryFragment => {
  const safeTableName = sanitizeTableName(request.tableName);
  const pageSize = clampPositiveInt(request.pageSize, 1, 50000);
  const startEpoch = Math.floor(request.startEpoch);
  const endEpoch = Math.floor(request.endEpoch);
  const crimeTypes = request.crimeTypes ?? [];
  const districts = request.districts ?? [];
  const useTypeFilter = crimeTypes.length > 0;
  const useDistrictFilter = districts.length > 0;

  const whereClauses: string[] = ['timestamp_sec >= ?', 'timestamp_sec <= ?'];
  const params: unknown[] = [startEpoch, endEpoch];

  if (useTypeFilter) {
    whereClauses.push(`primary_type IN (${crimeTypes.map(() => '?').join(', ')})`);
    params.push(...crimeTypes);
  }
  if (useDistrictFilter) {
    whereClauses.push(`district IN (${districts.map(() => '?').join(', ')})`);
    params.push(...districts);
  }
  if (request.cursor) {
    // Tuple comparison: rows strictly after (cursor.ts, cursor.rowId).
    whereClauses.push('(timestamp_sec, row_id) > (?, ?)');
    params.push(request.cursor.ts, request.cursor.rowId);
  }

  // Fetch pageSize + 1 so the caller can detect hasMore by trimming
  // the extra row. The extra row is consumed by the row-mapping layer.
  params.push(pageSize + 1);

  const selectColumns = buildCrimesFactSelectColumns();
  return {
    sql: `
      SELECT ${selectColumns}
      FROM ${safeTableName}
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY timestamp_sec ASC, row_id ASC
      LIMIT ?
    `,
    params,
  };
};
