import { NextResponse } from 'next/server';
import { getDataPath, isMockDataEnabled } from '@/lib/db';
import { existsSync } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CrimeAroundResponse {
  total: number;
  byType: { type: string; count: number }[];
  radiusMeters: number;
  latitude: number;
  longitude: number;
}

const DEFAULT_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 5000;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildMockResponse(
  lat: number,
  lon: number,
  radius: number,
): CrimeAroundResponse {
  const seed = Math.abs(Math.round(lat * 1000) + Math.round(lon * 1000));
  // Approx density per 500m radius = 20..100; scale linearly with radius.
  const baseDensity = 20 + (seed % 80);
  const total = Math.max(1, Math.round((baseDensity * radius) / DEFAULT_RADIUS_METERS));
  const baseTypes = ['THEFT', 'BATTERY', 'ASSAULT', 'CRIMINAL DAMAGE', 'BURGLARY', 'MOTOR VEHICLE THEFT', 'ROBBERY', 'NARCOTICS'];
  const byType = baseTypes.map((type, i) => ({
    type,
    count: Math.max(1, Math.round((total * (baseTypes.length - i)) / (baseTypes.length * 1.5))),
  }));
  return { total, byType, radiusMeters: radius, latitude: lat, longitude: lon };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number.parseFloat(searchParams.get('lat') ?? '');
    const lon = Number.parseFloat(searchParams.get('lon') ?? '');
    const radius = Math.max(
      1,
      Math.min(MAX_RADIUS_METERS, Number.parseInt(searchParams.get('radius') ?? String(DEFAULT_RADIUS_METERS), 10) || DEFAULT_RADIUS_METERS),
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: 'lat and lon query params required as numbers' },
        { status: 400 },
      );
    }

    if (isMockDataEnabled()) {
      return NextResponse.json(buildMockResponse(lat, lon, radius), {
        status: 200,
        headers: { 'X-Data-Warning': 'Using demo data - database disabled' },
      });
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return NextResponse.json(buildMockResponse(lat, lon, radius), {
        status: 200,
        headers: { 'X-Data-Warning': 'Using demo data - dataset file not found' },
      });
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    // Cheap prefilter: lat/lon bounding box (1 deg lat ≈ 111 km, 1 deg lon ≈ 111*cos(lat) km)
    const latDelta = radius / 111_000;
    const lonDelta = radius / (111_000 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));

    const rows: { type: string | null }[] = await new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DuckDB param overloads not in TS types
      (db.all as any)(
        `
          SELECT "Primary Type" AS type
          FROM read_csv_auto('${dataPath}', sample_size=-1)
          WHERE Latitude  BETWEEN ? AND ?
            AND Longitude BETWEEN ? AND ?
            AND Latitude  IS NOT NULL
            AND Longitude IS NOT NULL
        `,
        lat - latDelta,
        lat + latDelta,
        lon - lonDelta,
        lon + lonDelta,
        (err: Error | null, res: unknown[]) => {
          if (err) reject(err);
          else resolve(res as { type: string | null }[]);
        },
      );
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      const t = (row.type ?? 'UNKNOWN').trim() || 'UNKNOWN';
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const byType = [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json(
      {
        total: rows.length,
        byType,
        radiusMeters: radius,
        latitude: lat,
        longitude: lon,
      } satisfies CrimeAroundResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json(
      { error: 'failed to load crime-around data', detail: message },
      { status: 500 },
    );
  }
}
