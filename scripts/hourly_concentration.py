#!/usr/bin/env python3
"""Compute CV and Gini from the hourly distribution of crime events.

CV (coefficient of variation) = sigma / mu of the 24 hourly counts
Gini coefficient = inequality of the 24 hourly counts

Usage:
  python hourly_concentration.py data/source.csv
  python hourly_concentration.py data/source.csv --start 2025-01-01 --end 2025-12-31 --type Assault
  python hourly_concentration.py "data/sources/Crimes_-_2001_to_Present_20260114.csv"
"""

import csv
import sys
import argparse
import math
from datetime import datetime, timezone


# ── Timestamp parsers ──────────────────────────────────────────────

def parse_iso(ts: str) -> tuple[float, int]:
    dt = datetime.fromisoformat(ts.rstrip('Z'))
    return dt.timestamp(), dt.hour


def parse_us_date(ts: str) -> tuple[float, int]:
    dt = datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p')
    return dt.timestamp(), dt.hour


# ── CSV format detection ───────────────────────────────────────────

FORMATS = {
    'full':   {'date': 'Date', 'type': 'Primary Type', 'district': 'District', 'parse': parse_us_date},
    'sample': {'date': 'timestamp', 'type': 'type', 'district': 'district', 'parse': parse_iso},
}


def detect_format(header: list[str]) -> str:
    for name, spec in FORMATS.items():
        if spec['date'] in header and spec['type'] in header:
            return name
    raise ValueError(f'Unknown CSV format — header: {header}')


# ── Core ────────────────────────────────────────────────────────────

def stream_hourly_counts(
    csv_path: str,
    start: str = None,
    end: str = None,
    crime_type: str = None,
    district: str = None,
) -> tuple[list[int], float | None, float | None, int, int]:
    """Stream CSV and return (hourly_counts, min_epoch, max_epoch, total, filtered)."""
    hourly = [0] * 24
    total = filtered = 0
    min_ts = float('inf')
    max_ts = float('-inf')
    has_data = False

    start_epoch = (datetime.strptime(start, '%Y-%m-%d')
                       .replace(tzinfo=timezone.utc).timestamp()) if start else None
    end_epoch = (datetime.strptime(end, '%Y-%m-%d')
                     .replace(tzinfo=timezone.utc).timestamp() + 86400) if end else None
    dist = str(district) if district else None

    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        fmt = detect_format(header)
        spec = FORMATS[fmt]
        parse = spec['parse']
        idx_date = header.index(spec['date'])
        idx_type = header.index(spec['type'])
        idx_dist = header.index(spec['district'])

        for row in reader:
            total += 1
            try:
                ts, hr = parse(row[idx_date])
            except (ValueError, IndexError):
                filtered += 1
                continue

            if crime_type and row[idx_type].upper() != crime_type.upper():
                filtered += 1
                continue
            if dist and row[idx_dist].strip().lstrip('0') != dist.lstrip('0'):
                filtered += 1
                continue
            if start_epoch and ts < start_epoch:
                filtered += 1
                continue
            if end_epoch and ts > end_epoch:
                filtered += 1
                continue

            hourly[hr] += 1
            has_data = True
            if ts < min_ts: min_ts = ts
            if ts > max_ts: max_ts = ts

    if not has_data:
        return hourly, None, None, total, filtered

    return hourly, min_ts, max_ts, total, filtered


def compute_cv(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    n = len(counts)
    mu = total / n
    variance = sum((c - mu) ** 2 for c in counts) / n
    return math.sqrt(variance) / mu


def compute_gini(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    n = len(counts)
    sorted_c = sorted(counts)
    weighted = sum((i + 1) * c for i, c in enumerate(sorted_c))
    return (2 * weighted) / (n * total) - (n + 1) / n


# ── CLI ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Compute CV and Gini from hourly crime event counts.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', help='Path to crime CSV')
    parser.add_argument('--start', help='Start date YYYY-MM-DD')
    parser.add_argument('--end', help='End date YYYY-MM-DD')
    parser.add_argument('--type', help='Crime type filter (case-insensitive)')
    parser.add_argument('--district', help='District filter')
    parser.add_argument('--no-histogram', action='store_true', help='Hide hourly bar chart')
    args = parser.parse_args()

    hourly, min_ts, max_ts, total, filtered = stream_hourly_counts(
        args.csv_path, args.start, args.end, args.type, args.district
    )

    cv = compute_cv(hourly)
    gini = compute_gini(hourly)

    n_events = sum(hourly)

    if min_ts is not None:
        t0 = datetime.fromtimestamp(min_ts, tz=timezone.utc).strftime('%Y-%m-%d')
        t1 = datetime.fromtimestamp(max_ts, tz=timezone.utc).strftime('%Y-%m-%d')
        window_str = f'{t0}  →  {t1}'
    else:
        window_str = 'N/A'

    print(f'CV (hourly):         {cv:.6f}' if cv is not None else 'CV (hourly):         N/A  (no events)')
    print(f'Gini (hourly):       {gini:.6f}' if gini is not None else 'Gini (hourly):       N/A  (no events)')
    print(f'Events (in window):  {n_events}')
    print(f'Total in CSV:        {total}')
    print(f'Filtered out:        {filtered}')
    print(f'Time window:         {window_str}')

    if not args.no_histogram and n_events > 0:
        print()
        print('Hourly distribution:')
        max_count = max(hourly)
        bar_scale = 60 / max_count if max_count > 0 else 1
        for hr in range(24):
            bar_len = int(hourly[hr] * bar_scale)
            bar = '█' * bar_len
            pct = hourly[hr] / n_events * 100
            print(f'  {hr:02d}: {hourly[hr]:>8d}  ({pct:5.1f}%)  {bar}')

    parts = []
    if args.start: parts.append(f'start={args.start}')
    if args.end:   parts.append(f'end={args.end}')
    if args.type:  parts.append(f'type={args.type}')
    if args.district: parts.append(f'district={args.district}')
    print(f'Filters:             {", ".join(parts) or "(none — full dataset)"}')


if __name__ == '__main__':
    main()
