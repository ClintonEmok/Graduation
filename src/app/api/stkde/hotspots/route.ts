import { NextResponse } from 'next/server';
import { queryCrimesInRange } from '@/lib/queries';
import { computeStkdeFromCrimes } from '@/lib/stkde/compute';
import { validateAndNormalizeStkdeRequest } from '@/lib/stkde/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const validation = validateAndNormalizeStkdeRequest(body);
    if (!validation.ok || !validation.request) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid STKDE request' },
        { status: 400 },
      );
    }

    const normalizedRequest = validation.request;
    const crimes = await queryCrimesInRange(
      normalizedRequest.domain.startEpochSec,
      normalizedRequest.domain.endEpochSec,
      {
        limit: normalizedRequest.limits.maxEvents,
        crimeTypes: normalizedRequest.filters.crimeTypes,
      },
    );

    const { response } = computeStkdeFromCrimes(normalizedRequest, crimes);
    const fallbackParts = [response.meta.fallbackApplied, validation.clampsApplied?.length ? `clamps:${validation.clampsApplied.join('|')}` : null]
      .filter(Boolean)
      .join(',');

    const payload = {
      ...response,
      meta: {
        ...response.meta,
        fallbackApplied: fallbackParts || null,
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('API Error (/api/stkde/hotspots):', error);
    return NextResponse.json(
      {
        error: 'Failed to compute STKDE hotspots',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
