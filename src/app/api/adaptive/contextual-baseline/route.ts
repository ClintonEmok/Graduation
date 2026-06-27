import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import {
  getDb,
  ensureSortedCrimesTable,
  getDbPath,
  isMockDataEnabled,
} from '@/lib/db';
import type { Baseline168 } from '@/lib/signal-sources/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Module-level cache keyed by DuckDB path. The same DB file produces
 * the same baseline for the lifetime of the Node process; rebuilds
 * only happen when the path changes (different DB) or the server
 * restarts. The fingerprint in the payload surfaces a tsMin/tsMax
 * identifier so clients can detect a different dataset range.
 */
const baselineCache = new Map<string, Baseline168>();

interface CellRow {
  hour: number;
  dow: number;
  count: number;
  mean_per_sec: number;
  sigma_per_sec: number;
}

interface TotalRow {
  total_weeks: number | null;
  n_events: number;
  ts_min: number | null;
  ts_max: number | null;
}

async function buildBaselineFromDuckDB(duckdbPath: string): Promise<Baseline168> {
  const cached = baselineCache.get(duckdbPath);
  if (cached) return cached;

  if (isMockDataEnabled() || !existsSync(duckdbPath)) {
    throw new Error(
      `DuckDB cache not available at ${duckdbPath}; static baseline is the fallback.`,
    );
  }

  const tableName = await ensureSortedCrimesTable();
  const db = await getDb();

  // One query: total weeks, n_events, ts_min, ts_max.
  const totalRows = await new Promise<TotalRow[]>((resolve, reject) => {
    db.all(
      `SELECT (EXTRACT(EPOCH FROM (MAX("Date") - MIN("Date"))) / (7 * 86400)) AS total_weeks,
              COUNT(*) AS n_events,
              MIN(EXTRACT(EPOCH FROM "Date")) AS ts_min,
              MAX(EXTRACT(EPOCH FROM "Date")) AS ts_max
       FROM ${tableName}
       WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL`,
      (err, rows) => (err ? reject(err) : resolve(rows as TotalRow[])),
    );
  });
  const totalWeeks = Number(totalRows[0]?.total_weeks ?? 0);
  const nEvents = Number(totalRows[0]?.n_events ?? 0);
  const tsMin = Number(totalRows[0]?.ts_min ?? 0);
  const tsMax = Number(totalRows[0]?.ts_max ?? 0);

  // Per-cell counts (168 rows after CROSS JOIN, but DuckDB returns only
  // observed cells; missing cells are filled below).
  const cellRows = await new Promise<CellRow[]>((resolve, reject) => {
    db.all(
      `SELECT EXTRACT(HOUR FROM "Date") AS hour,
              EXTRACT(DOW FROM "Date") AS dow,
              COUNT(*) AS count,
              COUNT(*)::DOUBLE / (3600.0 * ?) AS mean_per_sec,
              SQRT(COUNT(*)::DOUBLE / (3600.0 * ?)) / SQRT(3600.0 * ?) AS sigma_per_sec
       FROM ${tableName}
       WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
       GROUP BY hour, dow`,
      totalWeeks,
      totalWeeks,
      totalWeeks,
      (err: Error | null, rows: unknown[]) =>
        err ? reject(err) : resolve(rows as CellRow[]),
    );
  });

  // Fill all 168 (h, d) cells; missing cells get count=0, mu=0, sig=0.
  const cellMap = new Map<number, CellRow>();
  for (const row of cellRows) {
    cellMap.set(Number(row.hour) * 7 + Number(row.dow), row);
  }
  const cells: Baseline168['cells'] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let d = 0; d < 7; d += 1) {
      const observed = cellMap.get(h * 7 + d);
      cells.push({
        h,
        d,
        c: Number(observed?.count ?? 0),
        mu: Number(observed?.mean_per_sec ?? 0),
        sig: Number(observed?.sigma_per_sec ?? 0),
      });
    }
  }

  const baseline: Baseline168 = {
    header: {
      nEvents,
      tsMin,
      tsMax,
      totalWeeks,
      // Poor-man's fingerprint identifying the dataset range (not
      // cryptographic; the real fingerprint is on the static JSON).
      fingerprint: `sha256:duckdb-${tsMin}-${tsMax}`,
      builtAt: new Date().toISOString(),
    },
    cells,
  };

  baselineCache.set(duckdbPath, baseline);
  return baseline;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const duckdbPath = getDbPath();
    const baseline = await buildBaselineFromDuckDB(duckdbPath);
    return NextResponse.json(baseline, {
      status: 200,
      headers: {
        // 1h fresh + 1d stale — baseline is dataset-locked.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Contextual baseline route: DuckDB unavailable', error);
    return NextResponse.json(
      {
        error: 'baseline unavailable',
        source: 'duckdb',
        staticFile: '/baselines/baseline_168.json',
      },
      { status: 404 },
    );
  }
}
