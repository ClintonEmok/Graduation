#!/usr/bin/env python3
"""Compute burstiness B from inter-event time distribution.

B = (sigma - mu) / (sigma + mu)  [Goh & Barabási, 2008]
Range: [-1, 1]. Positive = bursty, 0 = Poisson, negative = regular.

Usage:
  python compute_burstiness.py data/source.csv
  python compute_burstiness.py data/source.csv --start 2025-01-01 --end 2025-12-31 --type Assault
  python compute_burstiness.py "data/sources/Crimes_-_2001_to_Present_20260114.csv" --type BURGLARY --district 5
"""

import csv
import sys
import argparse
import math
from datetime import datetime, timezone


# ── Timestamp parsers ──────────────────────────────────────────────

def parse_iso(ts: str) -> float:
    return datetime.fromisoformat(ts.rstrip('Z')).timestamp()


def parse_us_date(ts: str) -> float:
    return datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p').timestamp()


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

def read_timestamps(csv_path: str, start: str = None, end: str = None,
                    crime_type: str = None, district: str = None) -> tuple[list[float], int, int]:
    timestamps: list[float] = []
    total = filtered = 0

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
                ts = parse(row[idx_date])
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

            timestamps.append(ts)

    timestamps.sort()
    return timestamps, total, filtered


def compute_burstiness(timestamps: list[float]) -> tuple[float | None, int]:
    if len(timestamps) < 2:
        return None, 0

    gaps = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps) - 1)]
    n = len(gaps)
    mu = sum(gaps) / n
    if mu == 0:
        return None, n

    variance = sum((g - mu) ** 2 for g in gaps) / n
    sigma = math.sqrt(variance)

    if sigma + mu == 0:
        return None, n

    return (sigma - mu) / (sigma + mu), n


# ── CLI ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Compute burstiness B from inter-event time distribution.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', help='Path to crime CSV')
    parser.add_argument('--start', help='Start date YYYY-MM-DD')
    parser.add_argument('--end', help='End date YYYY-MM-DD')
    parser.add_argument('--type', help='Crime type filter (case-insensitive)')
    parser.add_argument('--district', help='District filter')
    args = parser.parse_args()

    timestamps, total, filtered = read_timestamps(
        args.csv_path, args.start, args.end, args.type, args.district
    )

    b, gap_count = compute_burstiness(timestamps)

    t0 = t1 = ''
    if timestamps:
        t0 = datetime.fromtimestamp(timestamps[0], tz=timezone.utc).strftime('%Y-%m-%d')
        t1 = datetime.fromtimestamp(timestamps[-1], tz=timezone.utc).strftime('%Y-%m-%d')

    print(f'Burstiness B:        {b:.6f}' if b is not None else 'Burstiness B:        N/A  (< 2 events)')
    print(f'Events (in window):  {len(timestamps)}')
    print(f'Total in CSV:        {total}')
    print(f'Filtered out:        {filtered}')
    print(f'Inter-event gaps:    {gap_count}')
    print(f'Time window:         {t0}  →  {t1}' if t0 else 'Time window:         N/A')

    # Print effective filters
    parts = []
    if args.start: parts.append(f'start={args.start}')
    if args.end:   parts.append(f'end={args.end}')
    if args.type:  parts.append(f'type={args.type}')
    if args.district: parts.append(f'district={args.district}')
    print(f'Filters:             {", ".join(parts) or "(none — full dataset)"}')


if __name__ == '__main__':
    main()
