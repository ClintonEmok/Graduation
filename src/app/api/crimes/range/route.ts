import { NextResponse } from 'next/server';
import { CHICAGO_BOUNDS, lonLatToNormalized } from '@/lib/coordinate-normalization';
import { buildCrimeCoordinateSelectColumns } from '@/lib/queries/builders';
import { buildCrimeRangeFilters } from '@/lib/queries/filters';
import { clampPositiveInt } from '@/lib/queries/sanitization';
import { ensureSortedCrimesTable, getDb, isMockDataEnabled } from '@/lib/db';
import type { CrimeDataMeta, CrimeRecord } from '@/types/crime';

/**
 * Viewport-based crime data API endpoint.
 *
 * Returns exact rows from the persisted DuckDB fact table using cursor-based paging.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 5000;
const MAX_PAGE_SIZE = 50000;
const MAX_EXACT_RANGE_SECONDS = 365 * 86400;

const MOCK_CRIME_TYPES = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
const MOCK_DISTRICTS = Array.from({ length: 25 }, (_, idx) => String(idx + 1));

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export const parseCsvFilterParam = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
};

export const buildBufferedRange = (startEpoch: number, endEpoch: number, bufferDays: number) => {
  const bufferSeconds = bufferDays * 86400;
  return {
    bufferSeconds,
    bufferedStart: startEpoch - bufferSeconds,
    bufferedEnd: endEpoch + bufferSeconds,
  };
};

const encodeCursor = (timestamp: number, rowId: number) => `${Math.floor(timestamp)}:${Math.floor(rowId)}`;

const decodeCursor = (cursor: string | null): { timestamp: number; rowId: number } | null => {
  if (!cursor) return null;
  const [timestampRaw, rowIdRaw] = cursor.split(':');
  const timestamp = Number(timestampRaw);
  const rowId = Number(rowIdRaw);
  if (!Number.isFinite(timestamp) || !Number.isFinite(rowId)) {
    return null;
  }
  return { timestamp: Math.floor(timestamp), rowId: Math.floor(rowId) };
};

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

  return results;
};

const runAll = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    (db.all as unknown as (this: typeof db, sql: string, ...args: unknown[]) => void).call(
      db,
      sql,
      ...params,
      (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(rows as T[]);
      }
    );
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const startEpoch = searchParams.get('startEpoch');
    const endEpoch = searchParams.get('endEpoch');

    if (!startEpoch || !endEpoch) {
      return NextResponse.json({ error: 'Missing required parameters: startEpoch and endEpoch are required' }, { status: 400 });
    }

    const start = Number.parseInt(startEpoch, 10);
    const end = Number.parseInt(endEpoch, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return NextResponse.json({ error: 'Invalid epoch parameters: must be valid integers' }, { status: 400 });
    }
    if (start >= end) {
      return NextResponse.json({ error: 'Invalid range: startEpoch must be less than endEpoch' }, { status: 400 });
    }

    const pageSize = clampPositiveInt(
      Number.parseInt(searchParams.get('pageSize') || searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      1,
      MAX_PAGE_SIZE
    );
    const bufferDays = clampPositiveInt(Number.parseInt(searchParams.get('bufferDays') || '0', 10), 0, 3650);
    const crimeTypes = parseCsvFilterParam(searchParams.get('crimeTypes'));
    const districts = parseCsvFilterParam(searchParams.get('districts'));
    const target = searchParams.get('target') || 'detail';
    const cursor = decodeCursor(searchParams.get('cursor'));

    const { bufferedStart, bufferedEnd } = buildBufferedRange(start, end, bufferDays);

    if (isMockDataEnabled()) {
      const mockCount = Math.min(pageSize + 1, 100000);
      const crimes = generateMockCrimes(mockCount, bufferedStart, bufferedEnd, crimeTypes, districts);
      const pageRows = crimes.slice(0, pageSize);
      const hasMore = crimes.length > pageSize;

      return NextResponse.json(
        {
          data: pageRows,
          meta: {
            viewport: { start, end },
            buffer: { days: bufferDays, applied: { start: bufferedStart, end: bufferedEnd } },
            returned: pageRows.length,
            limit: pageSize,
            pageSize,
            target,
            hasMore,
            nextCursor: hasMore && pageRows.length > 0 ? encodeCursor(pageRows[pageRows.length - 1]!.timestamp, pageRows.length) : null,
            requiresNarrowing: false,
            sampled: false,
            sampleStride: 1,
            isMock: true,
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

    if (!cursor && bufferedEnd - bufferedStart > MAX_EXACT_RANGE_SECONDS) {
      return NextResponse.json(
        {
          data: [],
          meta: {
            viewport: { start, end },
            buffer: { days: bufferDays, applied: { start: bufferedStart, end: bufferedEnd } },
            returned: 0,
            limit: pageSize,
            pageSize,
            target,
            hasMore: false,
            nextCursor: null,
            requiresNarrowing: true,
            sampled: false,
            sampleStride: 1,
            suggestedWindowDays: 30,
          },
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    await ensureSortedCrimesTable();
    const filters = buildCrimeRangeFilters(bufferedStart, bufferedEnd, { crimeTypes, districts }, true);
    const cursorClause = cursor
      ? 'AND (timestamp > ? OR (timestamp = ? AND crime_row_id > ?))'
      : '';
    const cursorParams = cursor ? [cursor.timestamp, cursor.timestamp, cursor.rowId] : [];

    const rows = await runAll<Record<string, unknown>>(
      `WITH ordered AS (
        SELECT
          row_number() OVER (ORDER BY "Date", "Primary Type", "District", "IUCR", "Latitude", "Longitude") AS crime_row_id,
          ${buildCrimeCoordinateSelectColumns()}
        FROM crimes_sorted
        WHERE ${filters.sql}
      ), paged AS (
        SELECT *
        FROM ordered
        WHERE 1=1
        ${cursorClause}
        ORDER BY timestamp, crime_row_id
        LIMIT ?
      )
      SELECT * FROM paged`,
      [...filters.params, ...cursorParams, pageSize + 1]
    );

    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore && pageRows.length > 0
      ? encodeCursor(Number(pageRows[pageRows.length - 1]?.timestamp ?? 0), Number(pageRows[pageRows.length - 1]?.crime_row_id ?? 0))
      : null;

    return NextResponse.json(
      {
        data: pageRows.map((row) => ({
          id: String(row.crime_row_id ?? row.timestamp ?? Math.random()),
          timestamp: Number(row.timestamp),
          type: String(row.type),
          lat: Number(row.lat),
          lon: Number(row.lon),
          x: Number(row.x),
          z: Number(row.z),
          iucr: String(row.iucr),
          district: String(row.district),
          year: Number(row.year),
        })) satisfies CrimeRecord[],
        meta: {
          viewport: { start, end },
          buffer: { days: bufferDays, applied: { start: bufferedStart, end: bufferedEnd } },
          returned: pageRows.length,
          limit: pageSize,
          pageSize,
          target,
          hasMore,
          nextCursor,
          requiresNarrowing: false,
          sampled: false,
          sampleStride: 1,
        } satisfies CrimeDataMeta & { hasMore: boolean; nextCursor: string | null; requiresNarrowing: boolean; pageSize: number; target: string },
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
