import { NextResponse } from 'next/server';
import { buildNeighbourhoodSummary } from '@/lib/neighbourhood';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const minLat = parseFloat(searchParams.get('minLat') ?? '');
    const maxLat = parseFloat(searchParams.get('maxLat') ?? '');
    const minLon = parseFloat(searchParams.get('minLon') ?? '');
    const maxLon = parseFloat(searchParams.get('maxLon') ?? '');

    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(minLon) ||
      !Number.isFinite(maxLon)
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing bounds parameters: minLat, maxLat, minLon, maxLon are required and must be finite numbers' },
        { status: 400 }
      );
    }

    const cacheKey = `${minLat.toFixed(4)},${maxLat.toFixed(4)},${minLon.toFixed(4)},${maxLon.toFixed(4)}`;
    
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const neighbourhood = await buildNeighbourhoodSummary({
      bounds: { minLat, maxLat, minLon, maxLon },
    });

    setCache(cacheKey, neighbourhood);

    return NextResponse.json(neighbourhood, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error (/api/neighbourhood/poi):', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
