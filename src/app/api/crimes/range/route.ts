import { NextResponse } from 'next/server';
import {
  queryCrimesInRangePaged,
  encodeRangeCursor,
  decodeRangeCursor,
  type RangePagedRow,
} from '@/lib/queries';
import { isMockDataEnabled } from '@/lib/db';
import { CHICAGO_BOUNDS, lonLatToNormalized } from '@/lib/coordinate-normalization';
import type { CrimeRecord } from '@/types/crime';

/**
 * Phase 81 Wave 3: exact paged detail contract for the dashboard.
 *
 * Replaces the prior sampled-timestamp range read. Rows are now served
 * from the persisted `crimes_fact` table in `(timestamp_sec, row_id)`
 * order with keyset paging, so the client can fetch an exact working
 * window progressively.
 *
 * Query Parameters:
 * - startEpoch: number (required) - start of visible range (Unix epoch seconds)
 * - endEpoch: number (required) - end of visible range (Unix epoch seconds)
 * - crimeTypes: string (optional) - comma-separated crime types
 * - districts: string (optional) - comma-separated districts
 * - pageSize: number (optional, default 5000) - rows per page; max 50000
 * - cursor: string (optional) - opaque cursor returned by a previous call
 * - target: string (optional) - slice / brush id for server-side tracing
 *
 * Response shape:
 *   { data: CrimeRecord[], meta: { hasMore, nextCursor, returned, limit, requiresNarrowing? } }
 */

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
// Prevent static optimization as we serve dynamic viewport data
export const dynamic = 'force-dynamic';

const MOCK_CRIME_TYPES = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
const MOCK_DISTRICTS = Array.from({ length: 25 }, (_, idx) => String(idx + 1));

/**
 * Phase 81 Wave 3: page-size policy. The default is intentionally
 * small (5000) so the first page of an exact working window loads
 * quickly; the max (50000) is the product policy threshold beyond
 * which the route returns a `requiresNarrowing` prompt instead of
 * running the query.
 */
const DEFAULT_PAGE_SIZE = 5000;
const MAX_PAGE_SIZE = 50000;

/**
 * Phase 81 Wave 3: range policy. Exact reads over a window wider
 * than this trigger `requiresNarrowing`. 90 days is a defensible
 * default for a "focused working window" — narrow enough that the
 * client can comfortably page through a 5000-row default page,
 * generous enough that all common brush ranges pass.
 */
const MAX_RANGE_SEC = 90 * 86400;

export const parseCsvFilterParam = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
};

/**
 * Phase 81 Wave 3: exported for tests. The route no longer applies a
 * server-side buffer (the client controls the exact range). The helper
 * is kept as a named export so the existing `route.test.ts` helper
 * assertions continue to compile, even though the new contract does
 * not use the buffered range for the response.
 */
export const buildBufferedRange = (startEpoch: number, endEpoch: number, bufferDays: number) => {
  const bufferSeconds = bufferDays * 86400;
  return {
    bufferSeconds,
    bufferedStart: startEpoch - bufferSeconds,
    bufferedEnd: endEpoch + bufferSeconds,
  };
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const generateMockCrimes = (
  count: number,
  startEpoch: number,
  endEpoch: number,
  crimeTypes?: string[],
  districts?: string[]
): CrimeRecord[] => {
  const typePool = crimeTypes?.length ? crimeTypes : MOCK_CRIME_TYPES;
  const districtPool = districts?.length ? districts : MOCK_DISTRICTS;
  const start = Math.min(startEpoch, endEpoch);
  const end = Math.max(startEpoch, endEpoch);
  const results: CrimeRecord[] = [];

  for (let i = 0; i < count; i++) {
    const lon = randomBetween(CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.maxLon);
    const lat = randomBetween(CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLat);
    const timestamp = Math.floor(randomBetween(start, end));
    const year = new Date(timestamp * 1000).getUTCFullYear();
    const { x, z } = lonLatToNormalized(lon, lat);

    results.push({
      timestamp,
      type: typePool[Math.floor(Math.random() * typePool.length)],
      lat,
      lon,
      x,
      z,
      iucr: `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
      district: districtPool[Math.floor(Math.random() * districtPool.length)],
      year,
    });
  }

  // Sort by timestamp to mirror the exact-paged contract order
  results.sort((a, b) => a.timestamp - b.timestamp);
  return results;
};

const rowToCrimeRecord = (row: RangePagedRow): CrimeRecord => ({
  timestamp: row.timestamp,
  type: row.type,
  lat: row.lat,
  lon: row.lon,
  x: row.x,
  z: row.z,
  iucr: row.iucr,
  district: row.district,
  year: row.year,
});

const parsePageSize = (raw: string | null): number => {
  if (raw === null) return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return parsed;
};

const parseEpoch = (raw: string | null, fallback: number): number => {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const startEpochRaw = searchParams.get('startEpoch');
    const endEpochRaw = searchParams.get('endEpoch');

    if (!startEpochRaw || !endEpochRaw) {
      return NextResponse.json(
        { error: 'Missing required parameters: startEpoch and endEpoch are required' },
        { status: 400 }
      );
    }

    const start = parseEpoch(startEpochRaw, Number.NaN);
    const end = parseEpoch(endEpochRaw, Number.NaN);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return NextResponse.json(
        { error: 'Invalid epoch parameters: must be valid integers' },
        { status: 400 }
      );
    }
    if (start >= end) {
      return NextResponse.json(
        { error: 'Invalid range: startEpoch must be less than endEpoch' },
        { status: 400 }
      );
    }

    const crimeTypes = parseCsvFilterParam(searchParams.get('crimeTypes'));
    const districts = parseCsvFilterParam(searchParams.get('districts'));
    const cursor = searchParams.get('cursor');
    const target = searchParams.get('target');
    const pageSize = parsePageSize(searchParams.get('pageSize'));

    const requestedRangeSec = end - start;
    if (pageSize > MAX_PAGE_SIZE) {
      return NextResponse.json(
        {
          data: [],
          meta: {
            returned: 0,
            limit: MAX_PAGE_SIZE,
            pageSize,
            hasMore: false,
            nextCursor: null,
            requiresNarrowing: {
              reason: 'page-size-too-large',
              maxRangeSec: MAX_RANGE_SEC,
              requestedRangeSec,
              maxPageSize: MAX_PAGE_SIZE,
              requestedPageSize: pageSize,
              message: `pageSize ${pageSize} exceeds the policy maximum of ${MAX_PAGE_SIZE}. Reduce pageSize or use progressive paging.`,
            },
            target,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    if (requestedRangeSec > MAX_RANGE_SEC) {
      return NextResponse.json(
        {
          data: [],
          meta: {
            returned: 0,
            limit: pageSize,
            pageSize,
            hasMore: false,
            nextCursor: null,
            requiresNarrowing: {
              reason: 'range-too-broad',
              maxRangeSec: MAX_RANGE_SEC,
              requestedRangeSec,
              maxPageSize: MAX_PAGE_SIZE,
              requestedPageSize: pageSize,
              message: `Requested range ${requestedRangeSec}s exceeds the policy maximum of ${MAX_RANGE_SEC}s. Narrow the time window to a focused working slice.`,
            },
            target,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const decodedCursor = cursor ? decodeRangeCursor(cursor) : null;

    if (isMockDataEnabled()) {
      // Mock fallback: synthesize the same pageSize+1 shape so the
      // client paging logic stays identical, but do not pretend to
      // be exact (mock data is not a faithful slice of the dataset).
      const count = Math.min(pageSize, 200);
      const mockRows = generateMockCrimes(count, start, end, crimeTypes, districts);
      const hasMore = false;
      return NextResponse.json(
        {
          data: mockRows,
          meta: {
            viewport: { start, end },
            returned: mockRows.length,
            limit: pageSize,
            pageSize,
            hasMore,
            nextCursor: null,
            isMock: true,
            target,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'X-Content-Type-Options': 'nosniff',
            'X-Data-Warning': 'Using demo data - database disabled',
          },
        }
      );
    }

    const result = await queryCrimesInRangePaged({
      startEpoch: start,
      endEpoch: end,
      pageSize,
      cursor: decodedCursor,
      crimeTypes,
      districts,
      target,
    });

    return NextResponse.json(
      {
        data: result.rows.map(rowToCrimeRecord),
        meta: {
          viewport: { start, end },
          returned: result.rows.length,
          limit: pageSize,
          pageSize,
          hasMore: result.hasMore,
          nextCursor: result.hasMore && result.nextCursor ? encodeRangeCursor(result.nextCursor) : null,
          target,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error('API Error (/api/crimes/range):', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch crime data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
