import { NextResponse } from 'next/server';
import { getDataPath, isMockDataEnabled } from '@/lib/db';
import { existsSync } from 'fs';
import { TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS } from '@/lib/timeline-series';

export const dynamic = 'force-dynamic';

const MOCK_OVERVIEW = {
  timestampsSec: Array.from({ length: 1000 }, (_, i) => 1704067200 + i * 60 * 60 * 6),
};

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

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const rows: { timestamp_sec: number | string }[] = await new Promise((resolve, reject) => {
      db.all(
        `
          WITH ordered AS (
            SELECT
              EXTRACT(EPOCH FROM "Date") AS timestamp_sec,
              NTILE(${maxPoints}) OVER (ORDER BY "Date") AS bucket
            FROM read_csv_auto('${dataPath}')
            WHERE "Date" IS NOT NULL
          )
          SELECT MIN(timestamp_sec) AS timestamp_sec
          FROM ordered
          GROUP BY bucket
          ORDER BY bucket
        `,
        (err: Error | null, res: unknown[]) => {
          if (err) reject(err);
          else resolve(res as { timestamp_sec: number | string }[]);
        }
      );
    });

    return NextResponse.json({
      timestampsSec: rows.map((row) => Number(row.timestamp_sec)).filter(Number.isFinite),
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
