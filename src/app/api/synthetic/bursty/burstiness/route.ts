/**
 * Rolling burstiness time series endpoint.
 *
 * GET /api/synthetic/bursty/burstiness
 *   - default: returns JSON array of RollingBurstinessPoint
 *   - ?format=csv: returns CSV download (ground truth for adaptive scaling evaluation)
 *
 * Reuses the same generator config as /api/synthetic/bursty.
 * Deterministic per seed, so this endpoint is the ground-truth signal
 * that the adaptive scaling algorithm should respond to.
 */
import { NextResponse } from 'next/server';
import { generateBurstySequence } from '@/lib/synthetic/goh-barabasi';
import type { BurstyGeneratorConfig } from '@/lib/synthetic/types';
import { buildFilename, burstinessToCsv } from '@/lib/synthetic/csv-export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EVENTS = 100000;

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  if (max !== undefined) return Math.min(Math.max(1, n), max);
  return Math.max(1, n);
}

function parseFloat(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') ?? 'json').toLowerCase();

    const config: Partial<BurstyGeneratorConfig> = {
      alpha: parseFloat(searchParams.get('alpha'), 1.5),
      delta: parsePositiveInt(searchParams.get('delta'), 1),
      numEvents: parsePositiveInt(searchParams.get('count'), 10000, MAX_EVENTS),
      startTime: parsePositiveInt(searchParams.get('startEpoch'), 1704067200),
      endTime: parsePositiveInt(searchParams.get('endEpoch'), 1735689600),
      typeStrategy: (searchParams.get('typeStrategy') ?? 'weighted') === 'uniform' ? 'uniform' : 'weighted',
      seed: parsePositiveInt(searchParams.get('seed'), 42),
      rollingWindowSec: parsePositiveInt(searchParams.get('windowSec'), 7 * 24 * 60 * 60),
    };

    const sequence = generateBurstySequence(config);
    const points = sequence.rollingBurstiness;

    if (format === 'csv') {
      const csv = burstinessToCsv(points);
      const filename = buildFilename('burstiness', sequence.config.seed);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      {
        data: points,
        meta: {
          returned: points.length,
          config: sequence.config,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate burstiness series', details: message },
      { status: 400 }
    );
  }
}
