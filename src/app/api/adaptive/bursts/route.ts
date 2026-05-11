import { NextRequest, NextResponse } from 'next/server';
import { isMockDataEnabled } from '@/lib/db';
import { computeSpatialBBinned, type SpatialFormula } from '@/lib/burst-detection';
import { buildCrimeCountQuery, buildCrimesInRangeQuery } from '@/lib/queries/builders';
import { getDb, ensureSortedCrimesTable } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BurstBin {
  startEpoch: number;
  endEpoch: number;
  recordCount: number;
  temporalB: number;
  spatialB: number;
  combinedB: number;
}

interface Point {
  timestamp: number;
  x: number;
  z: number;
}

interface BurstBinRange {
  startEpoch: number;
  endEpoch: number;
}

interface BurstRequestBody {
  partitions?: BurstBinRange[];
  crimeTypes?: string[];
  granularity?: string;
  spatialFormula?: SpatialFormula;
}

const GRANULARITY_TARGET_SLICE_COUNTS: Record<string, number> = {
  hourly: 8,
  daily: 6,
  weekly: 5,
  monthly: 4,
  quarterly: 3,
};

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

async function queryCrimeCount(startEpoch: number, endEpoch: number, crimeTypes?: string[]): Promise<number> {
  const tableName = await ensureSortedCrimesTable();
  const db = await getDb();
  const { sql, params } = buildCrimeCountQuery(tableName, startEpoch, endEpoch, crimeTypes ? { crimeTypes } : undefined);

  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: Array<{ count: number }>) => {
      if (err) reject(err);
      else resolve(Number(rows?.[0]?.count ?? 0));
    });
  });
}

async function queryCrimePoints(
  startEpoch: number,
  endEpoch: number,
  crimeTypes?: string[],
  sampleStride = 1,
  limit = 50000,
): Promise<Point[]> {
  const tableName = await ensureSortedCrimesTable();
  const db = await getDb();
  const { sql, params } = buildCrimesInRangeQuery(tableName, startEpoch, endEpoch, {
    limit,
    sampleStride,
    crimeTypes,
  });

  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: Point[]) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

function buildBurstBin(
  startEpoch: number,
  endEpoch: number,
  points: Point[],
  recordCount: number,
  baselinePoints?: Point[],
  spatialFormula: SpatialFormula = 'balanced',
): BurstBin {
  const timestamps = points.map((point) => point.timestamp);
  const temporalB = computeTemporalBFromTimestamps(timestamps);
  const spatialB = computeSpatialBBinned(
    points.map((point) => ({ x: point.x, z: point.z })),
    (baselinePoints ?? points).map((point) => ({ x: point.x, z: point.z })),
    spatialFormula,
  );
  return {
    startEpoch: Math.floor(startEpoch),
    endEpoch: Math.floor(endEpoch),
    recordCount,
    temporalB,
    spatialB,
    combinedB: Number((0.5 * temporalB + 0.5 * spatialB).toFixed(4)),
  };
}

function generateMockBurstBin(
  startEpoch: number,
  endEpoch: number,
  spatialFormula: SpatialFormula = 'balanced',
): BurstBin {
  const mockCount = Math.floor(Math.random() * 200) + 20;
  const mockPoints = Array.from({ length: mockCount }, () => ({
    timestamp: Math.floor(startEpoch + Math.random() * Math.max(1, endEpoch - startEpoch)),
    x: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
  }));

  const baselinePoints = Array.from({ length: mockCount * 2 }, () => ({
    timestamp: Math.floor(startEpoch + Math.random() * Math.max(1, endEpoch - startEpoch)),
    x: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
  }));

  return buildBurstBin(startEpoch, endEpoch, mockPoints, mockCount, baselinePoints, spatialFormula);
}

const normalizeSpatialFormula = (value: unknown): SpatialFormula => {
  if (value === 'ann' || value === 'entropy' || value === 'js-divergence' || value === 'balanced') {
    return value;
  }
  return 'balanced';
};

const computeBurstBin = async (
  startEpoch: number,
  endEpoch: number,
  baselineStartEpoch: number,
  baselineEndEpoch: number,
  crimeTypes: string[] | undefined,
  spatialFormula: SpatialFormula,
): Promise<BurstBin> => {
  if (isMockDataEnabled()) {
    return generateMockBurstBin(startEpoch, endEpoch, spatialFormula);
  }

  const totalMatches = await queryCrimeCount(startEpoch, endEpoch, crimeTypes);
  const baselineTotalMatches = await queryCrimeCount(baselineStartEpoch, baselineEndEpoch, crimeTypes);
  const sampleStride = totalMatches > 50000 ? Math.ceil(totalMatches / 50000) : 1;
  const baselineSampleStride = baselineTotalMatches > 50000 ? Math.ceil(baselineTotalMatches / 50000) : 1;
  const points = await queryCrimePoints(startEpoch, endEpoch, crimeTypes, sampleStride, 50000);
  const baselinePoints = await queryCrimePoints(
    baselineStartEpoch,
    baselineEndEpoch,
    crimeTypes,
    baselineSampleStride,
    50000,
  );

  if (points.length === 0) {
    return generateMockBurstBin(startEpoch, endEpoch, spatialFormula);
  }

  return buildBurstBin(startEpoch, endEpoch, points, totalMatches, baselinePoints, spatialFormula);
};

const computeBurstResponse = async (params: {
  partitions: BurstBinRange[];
  crimeTypes?: string[];
  granularity?: string;
  spatialFormula?: SpatialFormula;
}) => {
  const normalizedGranularity = params.granularity ?? 'daily';
  const normalizedSpatialFormula = normalizeSpatialFormula(params.spatialFormula);
  if (params.partitions.length === 0) {
    return {
      bins: [],
      targetSliceCount: 0,
      totalB: 0,
    };
  }

  const baselineRange = params.partitions.reduce(
    (acc, partition) => ({
      startEpoch: Math.min(acc.startEpoch, partition.startEpoch),
      endEpoch: Math.max(acc.endEpoch, partition.endEpoch),
    }),
    { startEpoch: Number.POSITIVE_INFINITY, endEpoch: Number.NEGATIVE_INFINITY },
  );

  const bins: BurstBin[] = [];
  const batchSize = 4;

  for (let i = 0; i < params.partitions.length; i += batchSize) {
    const batch = params.partitions.slice(i, i + batchSize);
    for (const partition of batch) {
      bins.push(
        await computeBurstBin(
          partition.startEpoch,
          partition.endEpoch,
          baselineRange.startEpoch,
          baselineRange.endEpoch,
          params.crimeTypes,
          normalizedSpatialFormula,
        ),
      );
    }
  }

  const totalB = bins.reduce((sum, b) => sum + b.combinedB, 0);
  const targetSliceCount = bins.length * (GRANULARITY_TARGET_SLICE_COUNTS[normalizedGranularity] ?? GRANULARITY_TARGET_SLICE_COUNTS.daily);

  return {
    bins,
    targetSliceCount,
    totalB: Number(totalB.toFixed(4)),
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startEpoch = Number(searchParams.get('startEpoch'));
    const endEpoch = Number(searchParams.get('endEpoch'));
    const baselineStartEpoch = Number(searchParams.get('baselineStartEpoch') ?? startEpoch);
    const baselineEndEpoch = Number(searchParams.get('baselineEndEpoch') ?? endEpoch);
    const granularity = searchParams.get('granularity') ?? 'daily';
    const crimeTypes = searchParams.get('crimeTypes')?.split(',').filter(Boolean);
    const spatialFormula = normalizeSpatialFormula(searchParams.get('spatialFormula'));

    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch) || endEpoch <= startEpoch) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }

    const payload = await computeBurstResponse({
      partitions: [{ startEpoch, endEpoch }],
      crimeTypes,
      granularity,
      spatialFormula,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Error computing burst data:', error);
    return NextResponse.json({ error: 'Failed to compute burst data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BurstRequestBody;
    if (!Array.isArray(body.partitions)) {
      return NextResponse.json({ error: 'Invalid burst request' }, { status: 400 });
    }

    const partitions = body.partitions.filter(
      (partition): partition is BurstBinRange =>
        Number.isFinite(partition?.startEpoch) &&
        Number.isFinite(partition?.endEpoch) &&
        partition.endEpoch > partition.startEpoch,
    );

    const payload = await computeBurstResponse({
      partitions,
      crimeTypes: Array.isArray(body.crimeTypes) ? body.crimeTypes.filter((value): value is string => typeof value === 'string') : undefined,
      granularity: body.granularity,
      spatialFormula: normalizeSpatialFormula(body.spatialFormula),
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Error computing burst data:', error);
    return NextResponse.json({ error: 'Failed to compute burst data' }, { status: 500 });
  }
}
