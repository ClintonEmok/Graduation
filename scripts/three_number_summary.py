#!/usr/bin/env python3
"""Compute B, CV, and Gini — the three-number summary of spatiotemporal crime patterns.

  B      burstiness from inter-event time distribution  (range: -1 .. 1)
  CV     coefficient of variation of hourly event counts (range:  0 .. ∞)
  Gini   Gini coefficient of hourly event counts         (range:  0 .. 1)

Usage:
  python three_number_summary.py data/source.csv
  python three_number_summary.py data/source.csv --start 2025-06-01 --end 2026-01-01
  python three_number_summary.py "data/sources/Crimes_-_2001_to_Present_20260114.csv" \\
      --type BURGLARY --district 5
"""

import csv
import sys
import argparse
import math
from datetime import datetime, timezone


# ═══════════════════════════════════════════════════════════════════
#  Timestamp parsers
# ═══════════════════════════════════════════════════════════════════

def parse_iso(ts: str) -> tuple[float, int]:
    dt = datetime.fromisoformat(ts.rstrip('Z'))
    return dt.timestamp(), dt.hour


def parse_us_date(ts: str) -> tuple[float, int]:
    dt = datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p')
    return dt.timestamp(), dt.hour


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
#  Streaming CSV reader (single pass, dual output)
# ═══════════════════════════════════════════════════════════════════

def read_dataset(
    csv_path: str,
    start: str = None,
    end: str = None,
    crime_type: str = None,
    district: str = None,
) -> dict:
    """Single pass — returns hourly bins + sorted epoch timestamps + metadata."""
    hourly = [0] * 24
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
            timestamps.append(ts)

    timestamps.sort()

    return {
        'hourly': hourly,
        'timestamps': timestamps,
        'total': total,
        'filtered': filtered,
        'count': len(timestamps),
    }


# ═══════════════════════════════════════════════════════════════════
#  Metric computations
# ═══════════════════════════════════════════════════════════════════

def compute_B(timestamps: list[float]) -> float | None:
    """Burstiness: (sigma - mu) / (sigma + mu) from inter-event gaps."""
    if len(timestamps) < 2:
        return None
    gaps = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps) - 1)]
    n = len(gaps)
    mu = sum(gaps) / n
    if mu == 0:
        return None
    variance = sum((g - mu) ** 2 for g in gaps) / n
    sigma = math.sqrt(variance)
    return (sigma - mu) / (sigma + mu) if (sigma + mu) != 0 else None


def compute_CV(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    n = len(counts)
    mu = total / n
    variance = sum((c - mu) ** 2 for c in counts) / n
    return math.sqrt(variance) / mu


def compute_Gini(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    n = len(counts)
    sorted_c = sorted(counts)
    weighted = sum((i + 1) * c for i, c in enumerate(sorted_c))
    return (2 * weighted) / (n * total) - (n + 1) / n


def format_time(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime('%Y-%m-%d')


# ═══════════════════════════════════════════════════════════════════
#  Interpretation helpers
# ═══════════════════════════════════════════════════════════════════

def interpret_B(b: float) -> str:
    if b is None:       return 'N/A'
    if b > 0.5:         return 'strongly bursty'
    if b > 0.2:         return 'moderately bursty'
    if b > -0.2:        return 'Poisson-like (random)'
    if b > -0.5:        return 'moderately regular'
    return 'strongly regular'


def interpret_CV(cv: float) -> str:
    if cv is None:      return 'N/A'
    if cv > 2.0:        return 'highly overdispersed (strong hourly concentration)'
    if cv > 1.0:        return 'overdispersed (moderate hourly clustering)'
    if cv > 0.5:        return 'moderately dispersed'
    return 'underdispersed (nearly uniform hourly spread)'


def interpret_Gini(g: float) -> str:
    if g is None:       return 'N/A'
    if g > 0.7:         return 'high inequality (events dominated by few hours)'
    if g > 0.4:         return 'moderate inequality'
    if g > 0.2:         return 'moderate equality'
    return 'high equality (events spread evenly across hours)'


# ═══════════════════════════════════════════════════════════════════
#  CLI
# ═══════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Three-number summary: Burstiness B, CV, Gini.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', help='Path to crime CSV')
    parser.add_argument('--start', help='Start date YYYY-MM-DD')
    parser.add_argument('--end', help='End date YYYY-MM-DD')
    parser.add_argument('--type', help='Crime type filter (case-insensitive)')
    parser.add_argument('--district', help='District filter')
    args = parser.parse_args()

    data = read_dataset(args.csv_path, args.start, args.end,
                        args.type, args.district)

    B  = compute_B(data['timestamps'])
    CV = compute_CV(data['hourly'])
    G  = compute_Gini(data['hourly'])

    # ── Determine window label ────────────────────────────────────
    ts = data['timestamps']
    if ts:
        window = f'{format_time(ts[0])}  →  {format_time(ts[-1])}'
    else:
        window = 'N/A'

    has_filters = any([args.start, args.end, args.type, args.district])
    scope = 'Filtered window' if has_filters else 'Full dataset'

    # ── Output ───────────────────────────────────────────────────┐
    #     Three numbers are all I need                              │
    # ──────────────────────────────────────────────────────────────┘
    print()
    print(f'  ╔════════════════════════════════════════════════════════╗')
    print(f'  ║              THREE-NUMBER SUMMARY                     ║')
    print(f'  ╚════════════════════════════════════════════════════════╝')
    print()

    print(f'  B      = {B:>9.6f}'     if B is not None  else '  B      =       N/A')
    print(f'  CV     = {CV:>9.6f}'    if CV is not None else '  CV     =       N/A')
    print(f'  Gini   = {G:>9.6f}'     if G is not None  else '  Gini   =       N/A')
    print()

    print(f'  Interpretation:')
    print(f'    B     →  {interpret_B(B)}')
    print(f'    CV    →  {interpret_CV(CV)}')
    print(f'    Gini  →  {interpret_Gini(G)}')
    print()

    print(f'  Scope:   {scope}')
    print(f'  Events:  {data["count"]}  (of {data["total"]:,} in CSV, {data["filtered"]:,} filtered)')
    print(f'  Window:  {window}')
    print(f'  Source:  {args.csv_path}')

    # Show filter details
    parts = []
    if args.start: parts.append(f'start={args.start}')
    if args.end:   parts.append(f'end={args.end}')
    if args.type:  parts.append(f'type="{args.type}"')
    if args.district: parts.append(f'district={args.district}')
    if parts:
        print(f'  Filters: {", ".join(parts)}')

    # ── Hourly histogram (compact) ────────────────────────────────
    if data['count'] > 0:
        print()
        print('  Hourly spread (bar = fraction of day):')
        h = data['hourly']
        max_c = max(h)
        scale = 40 / max_c if max_c > 0 else 1
        for hr in range(24):
            bar = '▓' * int(h[hr] * scale)
            pct = h[hr] / data['count'] * 100
            print(f'    {hr:02d}  {bar:<40s}  {h[hr]:>6d}  ({pct:4.1f}%)')

    print()


if __name__ == '__main__':
    main()
