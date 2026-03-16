import { NextResponse } from 'next/server';
import { queryCrimesInRange } from '@/lib/queries';
import { computeStkdeFromAggregates, computeStkdeFromCrimes } from '@/lib/stkde/compute';
import { buildFullPopulationStkdeInputs } from '@/lib/stkde/full-population-pipeline';
import { validateAndNormalizeStkdeRequest } from '@/lib/stkde/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isFullPopulationQaEnabled = () => {
  const raw = (process.env.STKDE_QA_FULL_POP_ENABLED ?? 'true').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
};

const withTimeout = async <T>(work: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('full-pop-timeout')), timeoutMs);
    });
    return await Promise.race([work, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

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

    const requestedMode = normalizedRequest.computeMode;
    const clampNotes = validation.clampsApplied ?? [];
    const fallbackReasons: string[] = [];
    let effectiveMode = requestedMode;
    let fullPopulationStats:
      | {
          scannedRows: number;
          aggregatedCells: number;
          queryMs: number;
        }
      | undefined;

    if (requestedMode === 'full-population') {
      if (!isFullPopulationQaEnabled() || normalizedRequest.callerIntent !== 'stkde') {
        effectiveMode = 'sampled';
        fallbackReasons.push('full-pop-guard');
      } else {
        const spanDays =
          (normalizedRequest.domain.endEpochSec - normalizedRequest.domain.startEpochSec) / 86_400;
        const maxSpanDays = normalizedRequest.guardrails?.fullPopulationMaxSpanDays ?? 180;
        if (spanDays > maxSpanDays) {
          effectiveMode = 'sampled';
          fallbackReasons.push('full-pop-span-cap');
        }
      }
    }

    let payload;
    if (effectiveMode === 'full-population') {
      try {
        const timeoutMs = normalizedRequest.guardrails?.fullPopulationTimeoutMs ?? 20_000;
        const inputs = await withTimeout(
          buildFullPopulationStkdeInputs(normalizedRequest),
          timeoutMs,
        );
        fullPopulationStats = {
          scannedRows: inputs.stats.scannedRows,
          aggregatedCells: inputs.stats.aggregatedCells,
          queryMs: inputs.stats.queryMs,
        };

        const { response } = computeStkdeFromAggregates(normalizedRequest, inputs, {
          requestedComputeMode: requestedMode,
          effectiveComputeMode: 'full-population',
          fallbackApplied: fallbackReasons.length ? fallbackReasons.join(',') : null,
          clampsApplied: clampNotes,
          fullPopulationStats,
        });
        payload = response;
      } catch (fullPopError) {
        effectiveMode = 'sampled';
        const reason =
          fullPopError instanceof Error && fullPopError.message === 'full-pop-timeout'
            ? 'full-pop-timeout'
            : 'full-pop-error';
        fallbackReasons.push(reason);
        if (reason === 'full-pop-timeout') {
          fullPopulationStats = {
            scannedRows: 0,
            aggregatedCells: 0,
            queryMs: normalizedRequest.guardrails?.fullPopulationTimeoutMs ?? 20_000,
          };
        }
      }
    }

    if (!payload) {
      const crimes = await queryCrimesInRange(
        normalizedRequest.domain.startEpochSec,
        normalizedRequest.domain.endEpochSec,
        {
          limit: normalizedRequest.limits.maxEvents,
          crimeTypes: normalizedRequest.filters.crimeTypes,
        },
      );

      const { response } = computeStkdeFromCrimes(normalizedRequest, crimes, {
        requestedComputeMode: requestedMode,
        effectiveComputeMode: 'sampled',
        fallbackApplied: fallbackReasons.length ? fallbackReasons.join(',') : null,
        clampsApplied: clampNotes,
        fullPopulationStats,
      });
      payload = response;
    }

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
