import { NextRequest, NextResponse } from 'next/server';
import { isMockDataEnabled } from '@/lib/db';
import { computeSliceKde } from '@/lib/kde';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Point {
  timestamp: number;
  x: number;
  z: number;
}

interface BurstBin {
  startEpoch: number;
  endEpoch: number;
  recordCount: number;
  temporalB: number;
  spatialB: number;
  combinedB: number;
}

const GRANULARITY_SECONDS: Record<string, number> = {
  hourly: 3600,
  daily: 86400,
  weekly: 604800,
  monthly: 2592000,
  quarterly: 7776000,
};

function resolveBinCount(startEpoch: number, endEpoch: number, granularity: string | null, requestedBinCount: number): number {
  const safeRequested = Math.min(50, Math.max(2, requestedBinCount));
  const rangeSeconds = Math.max(1, endEpoch - startEpoch);
  const granularitySeconds = granularity ? GRANULARITY_SECONDS[granularity] : undefined;

  if (granularitySeconds) {
    return Math.min(50, Math.max(2, Math.ceil(rangeSeconds / granularitySeconds)));
  }

  return safeRequested;
}

function computeTemporalBFromTimestamps(timestamps: number[]): number {
  if (timestamps.length < 3) return 0;
  const sorted = [...timestamps].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  if (gaps.length < 2) return 0;
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean <= 0) return 0;
  const variance = gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length;
  const std = Math.sqrt(variance);
  return Number(((std - mean) / (std + mean)).toFixed(4));
}

function computeSpatialBFromPoints(points: Array<{ x: number; z: number }>): number {
  if (points.length < 3) return 0;
  const { cells, maxIntensity } = computeSliceKde(points);
  if (maxIntensity <= 0 || cells.length === 0) return 0;
  const meanIntensity = cells.reduce((sum, c) => sum + c.intensity, 0) / cells.length;
  return Number((1 - meanIntensity / maxIntensity).toFixed(4));
}

function generateMockBurstData(
  startEpoch: number,
  endEpoch: number,
  binCount: number,
): BurstBin[] {
  const range = endEpoch - startEpoch;
  const binSpan = range / binCount;
  const bins: BurstBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const binStart = startEpoch + i * binSpan;
    const binEnd = binStart + binSpan;
    const mockCount = Math.floor(Math.random() * 200) + 20;
    const temporalB = Number((Math.random() * 0.8 + 0.1).toFixed(4));
    const spatialB = Number((Math.random() * 0.6 + 0.1).toFixed(4));

    bins.push({
      startEpoch: Math.floor(binStart),
      endEpoch: Math.floor(binEnd),
      recordCount: mockCount,
      temporalB,
      spatialB,
      combinedB: Number((0.5 * temporalB + 0.5 * spatialB).toFixed(4)),
    });
  }

  return bins;
}

async function queryCrimePoints(
  startEpoch: number,
  endEpoch: number,
  crimeTypes?: string[],
): Promise<Point[]> {
  const { buildCrimesInRangeQuery } = await import('@/lib/queries/builders');
  const { getDb, ensureSortedCrimesTable } = await import('@/lib/db');

  const tableName = await ensureSortedCrimesTable();
  const db = await getDb();

  const { sql, params } = buildCrimesInRangeQuery(tableName, startEpoch, endEpoch, {
    limit: 50000,
    crimeTypes,
  });

  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: Point[]) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startEpoch = Number(searchParams.get('startEpoch'));
    const endEpoch = Number(searchParams.get('endEpoch'));
    const requestedBinCount = Number(searchParams.get('binCount') ?? 10);
    const granularity = searchParams.get('granularity');
    const binCount = resolveBinCount(
      startEpoch,
      endEpoch,
      granularity,
      Number.isFinite(requestedBinCount) ? requestedBinCount : 10,
    );
    const crimeTypes = searchParams.get('crimeTypes')?.split(',').filter(Boolean);

    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch) || endEpoch <= startEpoch) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }

    let bins: BurstBin[];

    if (isMockDataEnabled()) {
      bins = generateMockBurstData(startEpoch, endEpoch, binCount);
    } else {
      const points = await queryCrimePoints(startEpoch, endEpoch, crimeTypes);

      if (points.length === 0) {
        bins = generateMockBurstData(startEpoch, endEpoch, binCount);
      } else {
        const range = endEpoch - startEpoch;
        const binSpan = range / binCount;
        bins = [];

        for (let i = 0; i < binCount; i++) {
          const binStart = startEpoch + i * binSpan;
          const binEnd = binStart + binSpan;
          const binPoints = points.filter((p) => p.timestamp >= binStart && p.timestamp < binEnd);

          if (binPoints.length === 0) {
            bins.push({
              startEpoch: Math.floor(binStart),
              endEpoch: Math.floor(binEnd),
              recordCount: 0,
              temporalB: 0,
              spatialB: 0,
              combinedB: 0,
            });
            continue;
          }

          const timestamps = binPoints.map((p) => p.timestamp);
          const temporalB = computeTemporalBFromTimestamps(timestamps);
          const spatialB = computeSpatialBFromPoints(binPoints);
          const combinedB = Number((0.5 * temporalB + 0.5 * spatialB).toFixed(4));

          bins.push({
            startEpoch: Math.floor(binStart),
            endEpoch: Math.floor(binEnd),
            recordCount: binPoints.length,
            temporalB,
            spatialB,
            combinedB,
          });
        }
      }
    }

    const totalB = bins.reduce((sum, b) => sum + b.combinedB, 0);
    const targetSliceCount = Math.max(binCount, Math.min(50, Math.ceil(binCount * 3)));

    return NextResponse.json(
      {
        bins,
        targetSliceCount,
        totalB: Number(totalB.toFixed(4)),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
        },
      },
    );
  } catch (error) {
    console.error('Error computing burst data:', error);
    return NextResponse.json({ error: 'Failed to compute burst data' }, { status: 500 });
  }
}
