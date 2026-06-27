/**
 * CSV serialization for synthetic crime data and burstiness ground truth.
 *
 * Column order matches the internal CrimeRecord shape so the output
 * plugs directly into the existing pipeline. Burstiness CSV uses a
 * "typeBreakdown" column that JSON-encodes the per-type counts — this
 * keeps the file flat and easy to load into Excel or pandas.
 */
import type { CrimeRecord } from '@/types/crime';
import type { RollingBurstinessPoint } from './types';

const EVENT_COLUMNS = [
  'timestamp',
  'type',
  'district',
  'iucr',
  'lat',
  'lon',
  'x',
  'z',
  'year',
] as const;

const BURSTINESS_COLUMNS = [
  'startEpoch',
  'endEpoch',
  'burstinessParam',
  'eventCount',
  'typeBreakdown',
] as const;

/** RFC 4180 field escaping: wrap in quotes if it contains a comma, quote, or newline. */
function escapeField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(values: Array<string | number>): string {
  return values.map(escapeField).join(',');
}

/** Serialize CrimeRecord[] to a CSV string. */
export function eventsToCsv(records: CrimeRecord[]): string {
  const lines: string[] = [EVENT_COLUMNS.join(',')];
  for (const r of records) {
    lines.push(
      toRow([
        r.timestamp,
        r.type,
        r.district,
        r.iucr,
        r.lat,
        r.lon,
        r.x,
        r.z,
        r.year,
      ])
    );
  }
  return lines.join('\n');
}

/** Serialize RollingBurstinessPoint[] to a CSV string. */
export function burstinessToCsv(points: RollingBurstinessPoint[]): string {
  const lines: string[] = [BURSTINESS_COLUMNS.join(',')];
  for (const p of points) {
    lines.push(
      toRow([
        p.startEpoch,
        p.endEpoch,
        p.burstinessParam.toFixed(6),
        p.eventCount,
        JSON.stringify(p.typeBreakdown),
      ])
    );
  }
  return lines.join('\n');
}

/** Build a download filename with a seed and timestamp. */
export function buildFilename(prefix: string, seed: number): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-seed${seed}-${ts}.csv`;
}
