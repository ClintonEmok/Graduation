import { NextRequest, NextResponse } from 'next/server';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { getOrCreateGlobalAdaptiveMaps } from '@/lib/queries';

const resolveBinningMode = (rawMode: string | null): 'uniform-time' | 'uniform-events' => {
  return rawMode === 'uniform-events' ? 'uniform-events' : 'uniform-time';
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const binCount = Number(searchParams.get('binCount') ?? ADAPTIVE_BIN_COUNT);
    const kernelWidth = Number(searchParams.get('kernelWidth') ?? ADAPTIVE_KERNEL_WIDTH);
    const binningMode = resolveBinningMode(searchParams.get('binningMode'));

    const safeBinCount = Number.isFinite(binCount) ? Math.max(64, Math.min(4096, Math.floor(binCount))) : ADAPTIVE_BIN_COUNT;
    const safeKernelWidth = Number.isFinite(kernelWidth)
      ? Math.max(0, Math.min(25, Math.floor(kernelWidth)))
      : ADAPTIVE_KERNEL_WIDTH;

    const maps = await getOrCreateGlobalAdaptiveMaps(safeBinCount, safeKernelWidth, binningMode);

    return NextResponse.json(
      {
        binCount: maps.binCount,
        kernelWidth: maps.kernelWidth,
        binningMode: maps.binningMode,
        domain: maps.domain,
        rowCount: maps.rowCount,
        generatedAt: maps.generatedAt,
        densityMap: Array.from(maps.densityMap),
        countMap: Array.from(maps.countMap),
        burstinessMap: Array.from(maps.burstinessMap),
        warpMap: Array.from(maps.warpMap),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Error generating global adaptive maps:', error);
    return NextResponse.json(
      { error: 'Failed to generate global adaptive maps' },
      { status: 500 }
    );
  }
}
