import { NextResponse } from 'next/server';
import {
  ensureOverviewBinsTable,
  getDataPath,
  isMockDataEnabled,
  readOverviewBins,
} from '@/lib/db';
import { existsSync } from 'fs';
import { OVERVIEW_BIN_COUNT_MEDIUM } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface MockOverviewBin {
  binIndex: number;
  startEpoch: number;
  endEpoch: number;
  count: number;
}

const buildMockOverview = (startEpoch: number, endEpoch: number) => {
  const safeEnd = endEpoch > startEpoch ? endEpoch : startEpoch + 1;
  const span = Math.max(1, safeEnd - startEpoch);
  const binSize = span / OVERVIEW_BIN_COUNT_MEDIUM;
  const bins: MockOverviewBin[] = Array.from({ length: OVERVIEW_BIN_COUNT_MEDIUM }, (_, index) => ({
    binIndex: index,
    startEpoch: startEpoch + index * binSize,
    endEpoch: startEpoch + (index + 1) * binSize,
    count: 1000 + (index % 12) * 17,
  }));
  return {
    domain: {
      startEpoch,
      endEpoch: safeEnd,
      binCount: OVERVIEW_BIN_COUNT_MEDIUM,
      binSizeSec: binSize,
    },
    bins,
    filter: { crimeTypes: [] as string[], districts: [] as string[] },
    fingerprint: 'mock',
    builtAt: '',
  };
};

const parseCsvFilterParam = (raw: string | null): string[] => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const mockResponse = (warning: string) => {
  const mock = buildMockOverview(1704067200, 1735689600);
  return NextResponse.json({ ...mock, isMock: true }, {
    status: 200,
    headers: { 'X-Data-Warning': warning },
  });
};

export async function GET(request: Request) {
  try {
    if (isMockDataEnabled()) {
      return mockResponse('Using demo data - database disabled');
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return mockResponse('Using demo data - dataset file not found');
    }

    const { searchParams } = new URL(request.url);
    // The legacy `maxPoints` query param is accepted (and ignored) for
    // backward compatibility with older clients. The new contract is
    // server-binned counts at a fixed medium resolution.
    void searchParams.get('maxPoints');

    const crimeTypes = parseCsvFilterParam(searchParams.get('crimeTypes'));
    const districts = parseCsvFilterParam(searchParams.get('districts'));

    // Phase 81: pre-aggregated overview bins from the persisted
    // crime_overview_bins_medium table. The bootstrap builds the table on
    // first request; subsequent requests hit a small indexed read.
    await ensureOverviewBinsTable();
    const overview = await readOverviewBins({ crimeTypes, districts });

    if (!overview) {
      return mockResponse('Using demo data - overview unavailable');
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Error fetching overview bins:', error);
    return mockResponse('Using demo data - database unavailable');
  }
}
