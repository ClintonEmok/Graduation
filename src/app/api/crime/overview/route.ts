import { NextResponse } from 'next/server';
import { getDataPath, isMockDataEnabled, readDatasetMetadata, readOverviewBins } from '@/lib/db';
import { existsSync } from 'fs';
import { TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS } from '@/lib/timeline-series';

export const dynamic = 'force-dynamic';

const MOCK_OVERVIEW = {
  timestampsSec: Array.from({ length: 1000 }, (_, i) => 1704067200 + i * 60 * 60 * 6),
};

const overviewBinsToTimestampsSec = (bins: Array<{ x0: number; x1: number; length: number }>) =>
  bins.map((bin) => Math.round((bin.x0 + bin.x1) / 2));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const maxPointsParam = searchParams.get('maxPoints');
    const maxPoints = Math.max(
      1,
      Math.min(TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS, Number.parseInt(maxPointsParam ?? String(TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS), 10) || TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS)
    );

    if (isMockDataEnabled()) {
      return NextResponse.json(MOCK_OVERVIEW, {
        status: 200,
        headers: {
          'X-Data-Warning': 'Using demo data - database disabled',
        },
      });
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return NextResponse.json(MOCK_OVERVIEW, {
        status: 200,
        headers: {
          'X-Data-Warning': 'Using demo data - dataset file not found',
        },
      });
    }

    const metadata = await readDatasetMetadata();
    const overviewBins = await readOverviewBins(maxPoints);

    return NextResponse.json({
      overviewBins,
      timestampsSec: overviewBinsToTimestampsSec(overviewBins),
      domain: {
        start: metadata.minTime,
        end: metadata.maxTime,
      },
    });
  } catch (error) {
    console.error('Error fetching overview timestamps:', error);
    return NextResponse.json(MOCK_OVERVIEW, {
      status: 200,
      headers: {
        'X-Data-Warning': 'Using demo data - database unavailable',
      },
    });
  }
}
