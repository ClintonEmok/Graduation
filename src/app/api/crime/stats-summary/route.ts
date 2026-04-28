import { existsSync } from 'fs';
import { NextResponse } from 'next/server';
import { getDataPath, getDb, isMockDataEnabled } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOCK_STATS = {
  stats: {
    total: 1000,
    byDistrict: [],
    byType: [
      { name: 'THEFT', count: 240, percentage: 24 },
      { name: 'BATTERY', count: 180, percentage: 18 },
      { name: 'ASSAULT', count: 140, percentage: 14 },
      { name: 'BURGLARY', count: 90, percentage: 9 },
    ],
    byHour: Array.from({ length: 24 }, (_, hour) => (hour >= 7 && hour <= 18 ? 24 : 12)),
    byDayOfWeek: [120, 130, 145, 160, 170, 170, 105],
    byMonth: Array.from({ length: 12 }, (_, month) => (month === 6 || month === 7 ? 120 : 80)),
    peakHour: { hour: 17, count: 58 },
    peakDay: { day: 4, count: 170, label: 'Thu' },
  },
  summary: {
    totalCrimes: 1000,
    avgPerDay: 3,
    peakHour: 17,
    peakHourLabel: '5:00 PM',
    mostCommonCrime: 'THEFT',
    mostCommonCrimeCount: 240,
    districtCount: 25,
    dateRange: '2024-01-01 - 2025-01-01',
  },
};

function parseCsvFilterParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function parseDistrictIds(value: string | null): number[] | undefined {
  const parsed = parseCsvFilterParam(value);
  if (!parsed) return undefined;
  const values = parsed
    .map((item) => Number.parseInt(item, 10))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : undefined;
}

function buildStatsFilters(startEpoch: number, endEpoch: number, districts?: number[]) {
  const fragments: Array<{ sql: string; params: unknown[] }> = [
    { sql: '"Date" IS NOT NULL', params: [] },
    { sql: 'EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?', params: [startEpoch, endEpoch] },
  ];

  if (districts?.length) {
    fragments.push({ sql: `TRY_CAST("District" AS INTEGER) IN (${districts.map(() => '?').join(', ')})`, params: districts });
  }

  return {
    sql: fragments.map((fragment) => fragment.sql).join(' AND '),
    params: fragments.flatMap((fragment) => fragment.params),
  };
}

function toCountMap(rows: Array<{ name?: string | number | null; count?: number | string | null }>): Array<{ name: string; count: number }> {
  return rows
    .map((row) => ({
      name: String(row.name ?? 'Unknown'),
      count: Number(row.count ?? 0),
    }))
    .filter((row) => Number.isFinite(row.count));
}

function toPercentages(items: Array<{ name: string; count: number }>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
  }));
}

function formatPeakHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startEpochParam = searchParams.get('startEpoch');
    const endEpochParam = searchParams.get('endEpoch');
    const districts = parseDistrictIds(searchParams.get('districts'));

    if (!startEpochParam || !endEpochParam) {
      return NextResponse.json({ error: 'Missing required parameters: startEpoch and endEpoch are required' }, { status: 400 });
    }

    const startEpoch = Number.parseInt(startEpochParam, 10);
    const endEpoch = Number.parseInt(endEpochParam, 10);

    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
      return NextResponse.json({ error: 'Invalid epoch parameters: must be valid integers' }, { status: 400 });
    }

    if (startEpoch >= endEpoch) {
      return NextResponse.json({ error: 'Invalid range: startEpoch must be less than endEpoch' }, { status: 400 });
    }

    if (isMockDataEnabled()) {
      return NextResponse.json(MOCK_STATS, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Data-Warning': 'Using demo data - database disabled',
        },
      });
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return NextResponse.json(MOCK_STATS, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Data-Warning': 'Using demo data - dataset file not found',
        },
      });
    }

    const db = await getDb();
    const filters = buildStatsFilters(startEpoch, endEpoch, districts);

    const totalRows = await new Promise<Array<{ total: number | string }>>((resolve, reject) => {
      db.all(`SELECT COUNT(*) AS total FROM read_csv_auto('${dataPath}') WHERE ${filters.sql}`, ...filters.params, (err: Error | null, rows: unknown[]) => {
        if (err) reject(err);
        else resolve(rows as Array<{ total: number | string }>);
      });
    });

    const typeRows = await new Promise<Array<{ name: string; count: number | string }>>((resolve, reject) => {
      db.all(
        `
          SELECT "Primary Type" AS name, COUNT(*) AS count
          FROM read_csv_auto('${dataPath}')
          WHERE ${filters.sql}
          GROUP BY "Primary Type"
          ORDER BY count DESC, name ASC
          LIMIT 10
        `,
        ...filters.params,
        (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows as Array<{ name: string; count: number | string }>);
        }
      );
    });

    const hourRows = await new Promise<Array<{ hour: number | string; count: number | string }>>((resolve, reject) => {
      db.all(
        `
          SELECT CAST(strftime('%H', "Date") AS INTEGER) AS hour, COUNT(*) AS count
          FROM read_csv_auto('${dataPath}')
          WHERE ${filters.sql}
          GROUP BY hour
          ORDER BY hour ASC
        `,
        ...filters.params,
        (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows as Array<{ hour: number | string; count: number | string }>);
        }
      );
    });

    const dayRows = await new Promise<Array<{ day: number | string; count: number | string }>>((resolve, reject) => {
      db.all(
        `
          SELECT CAST(strftime('%w', "Date") AS INTEGER) AS day, COUNT(*) AS count
          FROM read_csv_auto('${dataPath}')
          WHERE ${filters.sql}
          GROUP BY day
          ORDER BY day ASC
        `,
        ...filters.params,
        (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows as Array<{ day: number | string; count: number | string }>);
        }
      );
    });

    const monthRows = await new Promise<Array<{ month: number | string; count: number | string }>>((resolve, reject) => {
      db.all(
        `
          SELECT CAST(strftime('%m', "Date") AS INTEGER) - 1 AS month, COUNT(*) AS count
          FROM read_csv_auto('${dataPath}')
          WHERE ${filters.sql}
          GROUP BY month
          ORDER BY month ASC
        `,
        ...filters.params,
        (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows as Array<{ month: number | string; count: number | string }>);
        }
      );
    });

    const districtRows = await new Promise<Array<{ district: string | number; count: number | string }>>((resolve, reject) => {
      db.all(
        `
          SELECT COALESCE(CAST(TRY_CAST("District" AS INTEGER) AS VARCHAR), 'Unknown') AS district, COUNT(*) AS count
          FROM read_csv_auto('${dataPath}')
          WHERE ${filters.sql}
          GROUP BY district
          ORDER BY count DESC, district ASC
        `,
        ...filters.params,
        (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows as Array<{ district: string | number; count: number | string }>);
        }
      );
    });

    const total = Number(totalRows[0]?.total ?? 0);
    const byType = toPercentages(toCountMap(typeRows));
    const byHour = Array.from({ length: 24 }, () => 0);
    for (const row of hourRows) {
      const hour = Number(row.hour);
      if (Number.isFinite(hour) && hour >= 0 && hour < byHour.length) {
        byHour[hour] = Number(row.count ?? 0);
      }
    }
    const byDayOfWeek = Array.from({ length: 7 }, () => 0);
    for (const row of dayRows) {
      const day = Number(row.day);
      if (Number.isFinite(day) && day >= 0 && day < byDayOfWeek.length) {
        byDayOfWeek[day] = Number(row.count ?? 0);
      }
    }
    const byMonth = Array.from({ length: 12 }, () => 0);
    for (const row of monthRows) {
      const month = Number(row.month);
      if (Number.isFinite(month) && month >= 0 && month < byMonth.length) {
        byMonth[month] = Number(row.count ?? 0);
      }
    }
    const peakHourIndex = byHour.reduce((bestIndex, count, index, array) => (count > array[bestIndex] ? index : bestIndex), 0);
    const peakHourCount = byHour[peakHourIndex] ?? 0;
    const peakDayIndex = byDayOfWeek.reduce((bestIndex, count, index, array) => (count > array[bestIndex] ? index : bestIndex), 0);
    const peakDayCount = byDayOfWeek[peakDayIndex] ?? 0;

    const stats = {
      total,
      byDistrict: toPercentages(toCountMap(districtRows.map((row) => ({ name: row.district, count: row.count })))),
      byType,
      byHour,
      byDayOfWeek,
      byMonth,
      peakHour: { hour: peakHourIndex, count: peakHourCount },
      peakDay: { day: peakDayIndex, count: peakDayCount, label: DAY_LABELS[peakDayIndex] ?? 'Unknown' },
    };

    return NextResponse.json(
      {
        stats,
        summary: {
          totalCrimes: total,
          avgPerDay: Math.round(total / Math.max(1, Math.ceil((endEpoch - startEpoch) / 86400))),
          peakHour: peakHourIndex,
          peakHourLabel: formatPeakHour(peakHourIndex),
          mostCommonCrime: byType[0]?.name ?? 'N/A',
          mostCommonCrimeCount: byType[0]?.count ?? 0,
          districtCount: districts?.length ?? 25,
          dateRange: `${new Date(startEpoch * 1000).toISOString().slice(0, 10)} - ${new Date(endEpoch * 1000).toISOString().slice(0, 10)}`,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching stats summary:', error);
    return NextResponse.json(MOCK_STATS, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Data-Warning': 'Using demo data - database unavailable',
      },
    });
  }
}
