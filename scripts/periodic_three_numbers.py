#!/usr/bin/env python3
"""Compute B, CV, Gini per period (year, month, day-of-week, or full-dataset).

Goal: characterize whether the crime dataset exhibits temporal burstiness.
Outputs a CSV-ready table plus a readable summary.

Usage:
  python periodic_three_numbers.py data/source.csv
  python periodic_three_numbers.py data/source.csv --period year
  python periodic_three_numbers.py data/source.csv --period month
  python periodic_three_numbers.py data/source.csv --period dow
  python periodic_three_numbers.py "data/sources/Crimes_-_2001_to_Present_20260114.csv" \
      --period year --type BURGLARY --district 5
"""

import csv
import sys
import argparse
import math
import zoneinfo
from datetime import datetime, timezone

_CHICAGO_TZ = zoneinfo.ZoneInfo('America/Chicago')


# ═══════════════════════════════════════════════════════════════════
#  Timestamp parsers
#  Return (epoch_seconds, year, month, weekday_index, hour)
#  where year/month/weekday/hour are LOCAL time components
#  (Chicago time for the full CSV, UTC for the sample CSV).
# ═══════════════════════════════════════════════════════════════════

def parse_iso(ts: str) -> tuple[float, int, int, int, int]:
    """Parse ISO 8601 '2025-02-24T11:09:36.747Z' — treat as UTC."""
    dt = datetime.fromisoformat(ts.rstrip('Z')).replace(tzinfo=timezone.utc)
    return dt.timestamp(), dt.year, dt.month, dt.weekday(), dt.hour


def parse_us_date(ts: str) -> tuple[float, int, int, int, int]:
    """Parse 'MM/DD/YYYY hh:mm:ss AM' — treat as America/Chicago local time."""
    dt_naive = datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p')
    dt_local = dt_naive.replace(tzinfo=_CHICAGO_TZ)
    return (dt_local.timestamp(), dt_naive.year, dt_naive.month,
            dt_naive.weekday(), dt_naive.hour)


# ═══════════════════════════════════════════════════════════════════
#  CSV format detection
# ═══════════════════════════════════════════════════════════════════

FORMATS = {
    'full':   {'date': 'Date', 'type': 'Primary Type', 'district': 'District',
               'parse': parse_us_date},
    'sample': {'date': 'timestamp', 'type': 'type', 'district': 'district',
               'parse': parse_iso},
}


def detect_format(header: list[str]) -> str:
    for name, spec in FORMATS.items():
        if spec['date'] in header and spec['type'] in header:
            return name
    raise ValueError(f'Unknown CSV format — header: {header}')


# ═══════════════════════════════════════════════════════════════════
#  Period key generators
#  Takes local-time components directly, not epoch.
# ═══════════════════════════════════════════════════════════════════

def key_full(year: int, month: int, wday: int) -> str:
    return '__full__'


def key_year(year: int, month: int, wday: int) -> str:
    return str(year)


def key_month(year: int, month: int, wday: int) -> str:
    return f'{year}-{month:02d}'


def key_dow(year: int, month: int, wday: int) -> str:
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][wday]


PERIOD_FUNCS = {
    'full':  key_full,
    'year':  key_year,
    'month': key_month,
    'dow':   key_dow,
}

PERIOD_LABELS = {
    'full':  'Full dataset',
    'year':  'Year',
    'month': 'Month',
    'dow':   'Day of week',
}


# ═══════════════════════════════════════════════════════════════════
#  Core streaming accumulator
# ═══════════════════════════════════════════════════════════════════

def compute_periods(
    csv_path: str,
    period: str,
    start: str = None,
    end: str = None,
    crime_type: str = None,
    district: str = None,
) -> tuple[dict, int, int, int]:
    """
    Single pass over sorted timestamps.
    Returns (periods_dict, total_rows, filtered, n_in_window).

    periods_dict: period_key -> {
        'hourly': [24 ints],
        'count': int,
        'gap_n': int,
        'gap_sum': float,
        'gap_sumsq': float,
        'min_ts': float,
        'max_ts': float,
    }
    """
    get_key = PERIOD_FUNCS[period]
    periods: dict = {}
    total_rows = 0
    filtered = 0

    start_epoch = (datetime.strptime(start, '%Y-%m-%d')
                       .replace(tzinfo=timezone.utc).timestamp()) if start else None
    end_epoch = (datetime.strptime(end, '%Y-%m-%d')
                     .replace(tzinfo=timezone.utc).timestamp() + 86400) if end else None
    dist = str(district) if district else None

    # Phase 1: read, filter, and parse all events
    # Store (epoch, year, month, weekday, hour) for each event
    parsed: list[tuple[float, int, int, int, int]] = []
    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        fmt = detect_format(header)
        spec = FORMATS[fmt]
        parse_fn = spec['parse']
        idx_date = header.index(spec['date'])
        idx_type = header.index(spec['type'])
        idx_dist = header.index(spec['district'])

        for row in reader:
            total_rows += 1
            try:
                ts_epoch, yr, mo, wd, hr = parse_fn(row[idx_date])
            except (ValueError, IndexError):
                filtered += 1
                continue
            if crime_type and row[idx_type].upper() != crime_type.upper():
                filtered += 1
                continue
            if dist and row[idx_dist].strip().lstrip('0') != dist.lstrip('0'):
                filtered += 1
                continue
            if start_epoch and ts_epoch < start_epoch:
                filtered += 1
                continue
            if end_epoch and ts_epoch > end_epoch:
                filtered += 1
                continue
            parsed.append((ts_epoch, yr, mo, wd, hr))

    # Sort by epoch for gap computation
    parsed.sort(key=lambda x: x[0])
    n_window = len(parsed)

    # Phase 2: accumulate per period
    prev_ts: float | None = None
    prev_key: str | None = None

    for ts_epoch, yr, mo, wd, hr in parsed:
        key = get_key(yr, mo, wd)

        if key not in periods:
            periods[key] = {
                'hourly': [0] * 24,
                'count': 0,
                'gap_n': 0,
                'gap_sum': 0.0,
                'gap_sumsq': 0.0,
                'min_ts': ts_epoch,
                'max_ts': ts_epoch,
            }

        p = periods[key]
        p['count'] += 1
        p['hourly'][hr] += 1
        if ts_epoch < p['min_ts']: p['min_ts'] = ts_epoch
        if ts_epoch > p['max_ts']: p['max_ts'] = ts_epoch

        # Gap: only count if within the same period
        if prev_ts is not None and prev_key == key:
            gap = ts_epoch - prev_ts
            # Include zero gaps — they reflect co-occurring events
            p['gap_n'] += 1
            p['gap_sum'] += gap
            p['gap_sumsq'] += gap * gap

        prev_ts = ts_epoch
        prev_key = key

    return periods, total_rows, filtered, n_window


# ═══════════════════════════════════════════════════════════════════
#  Metric computation
# ═══════════════════════════════════════════════════════════════════

def compute_B_from_stats(gap_n: int, gap_sum: float, gap_sumsq: float) -> float | None:
    if gap_n < 1:
        return None
    mu = gap_sum / gap_n
    if mu == 0:
        return None
    variance = gap_sumsq / gap_n - mu * mu
    if variance < 0:
        variance = 0.0
    sigma = math.sqrt(variance)
    denom = sigma + mu
    return (sigma - mu) / denom if denom != 0 else None


def compute_CV(hourly: list[int]) -> float | None:
    total = sum(hourly)
    if total == 0:
        return None
    n = len(hourly)
    mu = total / n
    variance = sum((c - mu) ** 2 for c in hourly) / n
    return math.sqrt(variance) / mu


def compute_Gini(hourly: list[int]) -> float | None:
    total = sum(hourly)
    if total == 0:
        return None
    n = len(hourly)
    sorted_c = sorted(hourly)
    weighted = sum((i + 1) * c for i, c in enumerate(sorted_c))
    return (2 * weighted) / (n * total) - (n + 1) / n


# ═══════════════════════════════════════════════════════════════════
#  Interpretation
# ═══════════════════════════════════════════════════════════════════

def interpret_B(b: float) -> str:
    if b is None:       return 'N/A'
    if b > 0.5:         return 'strongly bursty'
    if b > 0.2:         return 'bursty'
    if b > 0.02:        return 'weakly bursty'
    if b > -0.02:       return 'Poisson-like'
    if b > -0.1:        return 'weakly regular'
    if b > -0.3:        return 'moderately regular'
    return 'strongly regular'


# ═══════════════════════════════════════════════════════════════════
#  Output helpers
# ═══════════════════════════════════════════════════════════════════

def fmt_ts(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime('%Y-%m-%d')


def fmt_val(v: float | None, decimals: int = 6) -> str:
    if v is None:
        return 'N/A'
    return f'{v:.{decimals}f}'


# ═══════════════════════════════════════════════════════════════════
#  CLI
# ═══════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Three-number summary (B, CV, Gini) per period.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', help='Path to crime CSV')
    parser.add_argument('--period', default='full',
                        choices=['full', 'year', 'month', 'dow'],
                        help='Time period to group by (default: full)')
    parser.add_argument('--start', help='Start date YYYY-MM-DD')
    parser.add_argument('--end', help='End date YYYY-MM-DD')
    parser.add_argument('--type', help='Crime type filter')
    parser.add_argument('--district', help='District filter')
    parser.add_argument('--csv-out', action='store_true',
                        help='Print CSV rows only (no table formatting)')
    args = parser.parse_args()

    periods, total, filtered, n_window = compute_periods(
        args.csv_path, args.period, args.start, args.end,
        args.type, args.district
    )

    # Build output rows
    rows = []
    for key in sorted(periods.keys()):
        p = periods[key]
        B  = compute_B_from_stats(p['gap_n'], p['gap_sum'], p['gap_sumsq'])
        CV = compute_CV(p['hourly'])
        G  = compute_Gini(p['hourly'])

        if args.period == 'full':
            label = 'Full dataset'
        elif args.period == 'year':
            label = key
        elif args.period == 'month':
            label = key
        elif args.period == 'dow':
            label = key

        rows.append({
            'period': label,
            'events': p['count'],
            'gaps': p['gap_n'],
            'B': B,
            'CV': CV,
            'Gini': G,
            't0': fmt_ts(p['min_ts']),
            't1': fmt_ts(p['max_ts']),
            'interpretation': interpret_B(B),
        })

    has_filters = any([args.start, args.end, args.type, args.district])
    scope = f'Filtered ({n_window} events)' if has_filters else 'Full dataset'

    # ── CSV output ───────────────────────────────────────────────
    if args.csv_out:
        print('period,events,gaps,B,CV,Gini,t0,t1,interpretation')
        for r in rows:
            print(f'{r["period"]},{r["events"]},{r["gaps"]},'
                  f'{fmt_val(r["B"])},{fmt_val(r["CV"])},{fmt_val(r["Gini"])},'
                  f'{r["t0"]},{r["t1"]},{r["interpretation"]}')
        return

    # ── Readable table ───────────────────────────────────────────
    print()
    print(f'  ┌{"─"*58}┐')
    print(f'  │  Three-number summary  —  {PERIOD_LABELS[args.period]:<14s}          │')
    print(f'  └{"─"*58}┘')
    print(f'  Source: {args.csv_path}')
    print(f'  Scope:  {scope}')
    print(f'  Rows in CSV: {total:,}  |  Filtered out: {filtered:,}')
    print()

    max_period = max(len(r['period']) for r in rows) if rows else 10
    col_w = max(max_period, 10)

    hdr = (f'  {"Period":<{col_w}}  {"Events":>8}  {"B":>10}  {"CV":>10}  '
           f'{"Gini":>10}  {"Interpretation":<20}')
    sep = f'  {"─"*col_w}  {"─"*8}  {"─"*10}  {"─"*10}  {"─"*10}  {"─"*20}'
    print(hdr)
    print(sep)
    for r in rows:
        print(f'  {r["period"]:<{col_w}}  {r["events"]:>8,}  {fmt_val(r["B"]):>10}  '
              f'{fmt_val(r["CV"]):>10}  {fmt_val(r["Gini"]):>10}  {r["interpretation"]:<20}')
    print()

    # ── Summary stats ────────────────────────────────────────────
    b_vals = [r['B'] for r in rows if r['B'] is not None]
    cv_vals = [r['CV'] for r in rows if r['CV'] is not None]
    g_vals = [r['Gini'] for r in rows if r['Gini'] is not None]

    if b_vals:
        def mean(vs): return sum(vs) / len(vs)
        def sd(vs):
            m = mean(vs)
            return math.sqrt(sum((v - m) ** 2 for v in vs) / len(vs))

        print(f'  Summary across {len(b_vals)} periods:')
        print(f'    B (burstiness):          mean = {mean(b_vals):.4f},  sd = {sd(b_vals):.4f}')
        print(f'                            min  = {min(b_vals):.4f},  max = {max(b_vals):.4f}')
        print(f'                            B > 0:  {sum(1 for v in b_vals if v > 0)}/{len(b_vals)}  '
              f'B < 0:  {sum(1 for v in b_vals if v < 0)}/{len(b_vals)}')
        if cv_vals:
            print(f'    CV (hourly dispersion):   mean = {mean(cv_vals):.4f},  sd = {sd(cv_vals):.4f}')
        if g_vals:
            print(f'    Gini (hourly dist.):      mean = {mean(g_vals):.4f},  sd = {sd(g_vals):.4f}')
    print()


if __name__ == '__main__':
    main()
