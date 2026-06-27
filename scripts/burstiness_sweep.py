#!/usr/bin/env python3
"""Burstiness B sweep — does B actually vary across windows?

Tests whether Goh–Barabási burstiness (B = (σ−μ)/(σ+μ)) carries
discriminative signal at different time scales, on both inter-event
intervals (IEI) and binned counts.

For each window size in a sweep we slide the window across the
timeline and compute B for the events in each window. If B is flat
across windows, it's not a useful driver for adaptive scaling.

Usage:
  python burstiness_sweep.py data/source.csv
  python burstiness_sweep.py data/source.csv --type BURGLARY
  python burstiness_sweep.py data/source.csv --windows 3600,21600,86400,604800
  python burstiness_sweep.py data/source.csv --json out.json
"""

import argparse
import csv
import json
import math
import sys
from datetime import datetime, timezone
from statistics import mean, median, pstdev


# ── Timestamp parsing (mirrors compute_burstiness.py) ─────────────

def parse_iso(ts: str) -> float:
    return datetime.fromisoformat(ts.rstrip('Z')).timestamp()


def parse_us_date(ts: str) -> float:
    return datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p').timestamp()


FORMATS = {
    'full':   {'date': 'Date', 'type': 'Primary Type',
               'district': 'District', 'parse': parse_us_date},
    'sample': {'date': 'timestamp', 'type': 'type',
               'district': 'district', 'parse': parse_iso},
}


def detect_format(header):
    for name, spec in FORMATS.items():
        if spec['date'] in header and spec['type'] in header:
            return name
    raise ValueError(f'Unknown CSV format — header: {header}')


def read_timestamps(csv_path, start=None, end=None,
                    crime_type=None, district=None):
    timestamps = []
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


# ── Burstiness core ────────────────────────────────────────────────

def burstiness(values):
    """Goh–Barabási B = (σ−μ)/(σ+μ) on a sequence of values.
    Returns None for degenerate inputs (length<2, μ=0, σ+μ=0).
    """
    n = len(values)
    if n < 2:
        return None
    mu = sum(values) / n
    if mu == 0:
        return None
    variance = sum((v - mu) ** 2 for v in values) / n
    sigma = math.sqrt(variance)
    if sigma + mu == 0:
        return None
    return (sigma - mu) / (sigma + mu)


# ── Window sweep ───────────────────────────────────────────────────

def windows_for_size(t_start, t_end, window_sec, step_sec):
    """Yield [win_start, win_end) covering [t_start, t_end) with step."""
    if t_end <= t_start or window_sec <= 0:
        return
    t = t_start
    while t + window_sec <= t_end:
        yield t, t + window_sec
        t += step_sec


def events_in_window(timestamps, win_start, win_end):
    """Slice timestamps into [win_start, win_end) via binary search."""
    import bisect
    lo = bisect.bisect_left(timestamps, win_start)
    hi = bisect.bisect_left(timestamps, win_end)
    return timestamps[lo:hi]


def sweep_iei(timestamps, window_sec, step_sec, min_events):
    """IEI-based B per window. Returns list of valid B values."""
    if len(timestamps) < 2:
        return []
    out = []
    for ws, we in windows_for_size(timestamps[0], timestamps[-1], window_sec, step_sec):
        ev = events_in_window(timestamps, ws, we)
        if len(ev) < min_events:
            continue
        gaps = [ev[i+1] - ev[i] for i in range(len(ev) - 1)]
        b = burstiness(gaps)
        if b is not None:
            out.append(b)
    return out


def sweep_bincount(timestamps, window_sec, step_sec, min_events, sub_bin_sec):
    """Binned-count B per window. Sub-bin the window, B on the counts."""
    if len(timestamps) < 2:
        return []
    out = []
    n_sub = max(2, int(window_sec // sub_bin_sec))
    for ws, we in windows_for_size(timestamps[0], timestamps[-1], window_sec, step_sec):
        ev = events_in_window(timestamps, ws, we)
        if len(ev) < min_events:
            continue
        counts = [0] * n_sub
        for ts in ev:
            idx = int((ts - ws) // sub_bin_sec)
            if 0 <= idx < n_sub:
                counts[idx] += 1
        b = burstiness(counts)
        if b is not None:
            out.append(b)
    return out


# ── Aggregation ────────────────────────────────────────────────────

def stats(values):
    if not values:
        return None
    return {
        'n':     len(values),
        'mean':  mean(values),
        'std':   pstdev(values) if len(values) > 1 else 0.0,
        'min':   min(values),
        'p25':   _percentile(values, 0.25),
        'p50':   median(values),
        'p75':   _percentile(values, 0.75),
        'max':   max(values),
    }


def _percentile(values, q):
    s = sorted(values)
    k = (len(s) - 1) * q
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return s[int(k)]
    return s[f] * (c - k) + s[c] * (k - f)


# ── Pretty printing ────────────────────────────────────────────────

WINDOW_LABELS = {
    3600:    '1h',
    21600:   '6h',
    86400:   '1d',
    604800:  '1w',
    2592000: '30d',
}


def label(sec):
    return WINDOW_LABELS.get(sec, f'{int(sec)}s')


def print_table(results):
    print()
    print(f'{"window":<6} {"method":<10} {"n":>6} '
          f'{"mean":>8} {"std":>8} {"min":>8} {"p50":>8} {"max":>8}')
    print('─' * 70)
    for row in results:
        s = row['stats']
        if s is None:
            print(f'{label(row["window_sec"]):<6} {row["method"]:<10} {"—":>6}')
            continue
        print(f'{label(row["window_sec"]):<6} {row["method"]:<10} '
              f'{s["n"]:>6d} {s["mean"]:>8.3f} {s["std"]:>8.3f} '
              f'{s["min"]:>8.3f} {s["p50"]:>8.3f} {s["max"]:>8.3f}')
    print()


# ── Main ───────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description='Windowed burstiness sweep — does B vary?',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument('csv_path', help='Path to crime CSV')
    ap.add_argument('--start', help='Start date YYYY-MM-DD')
    ap.add_argument('--end', help='End date YYYY-MM-DD')
    ap.add_argument('--type', help='Crime type filter (case-insensitive)')
    ap.add_argument('--district', help='District filter')
    ap.add_argument('--windows', default='3600,21600,86400,604800',
                    help='Comma-separated window sizes in seconds '
                         '(default: 1h,6h,1d,1w)')
    ap.add_argument('--step', type=int, default=None,
                    help='Step size in seconds '
                         '(default: window/4)')
    ap.add_argument('--min-events', type=int, default=10,
                    help='Min events in a window to compute B '
                         '(default: 10)')
    ap.add_argument('--sub-bin', type=int, default=60,
                    help='Sub-bin size in seconds for the '
                         'binned-count method (default: 60)')
    ap.add_argument('--json', dest='json_out', default=None,
                    help='Write full results to JSON file')
    args = ap.parse_args()

    timestamps, total, filtered = read_timestamps(
        args.csv_path, args.start, args.end, args.type, args.district,
    )
    if len(timestamps) < 2:
        print('Not enough events to compute burstiness.', file=sys.stderr)
        sys.exit(1)

    # Global reference (IEI on the full series).
    gaps = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps) - 1)]
    b_global = burstiness(gaps)
    print(f'Loaded {len(timestamps):,} events  '
          f'(total={total:,}, filtered={filtered:,})')
    print(f'Timeline: {datetime.fromtimestamp(timestamps[0], tz=timezone.utc):%Y-%m-%d}'
          f'  →  {datetime.fromtimestamp(timestamps[-1], tz=timezone.utc):%Y-%m-%d}')
    print(f'Global B (IEI, full series): '
          f'{b_global:.4f}' if b_global is not None else 'Global B: N/A')

    sizes = [int(s) for s in args.windows.split(',')]
    results = []
    for ws in sizes:
        step = args.step or max(1, ws // 4)
        iei = sweep_iei(timestamps, ws, step, args.min_events)
        binc = sweep_bincount(timestamps, ws, step, args.min_events, args.sub_bin)
        results.append({
            'window_sec': ws,
            'step_sec':   step,
            'method':     'iei',
            'stats':      stats(iei),
        })
        results.append({
            'window_sec': ws,
            'step_sec':   step,
            'method':     'bincount',
            'stats':      stats(binc),
            'sub_bin_sec': args.sub_bin,
        })

    print_table(results)

    # Headline: how much does B vary across windows?
    print('Verdict:')
    for row in results:
        s = row['stats']
        if s is None or s['n'] < 5:
            print(f'  {label(row["window_sec"]):<6} {row["method"]:<10}  '
                  f'insufficient windows ({s["n"] if s else 0})')
            continue
        spread = s['max'] - s['min']
        flag = 'flat' if s['std'] < 0.05 else ('low' if s['std'] < 0.15 else 'varies')
        print(f'  {label(row["window_sec"]):<6} {row["method"]:<10}  '
              f'σ={s["std"]:.3f}  spread={spread:.3f}  →  {flag}')

    if args.json_out:
        payload = {
            'csv_path':  args.csv_path,
            'events':    len(timestamps),
            'global_b':  b_global,
            'filters': {
                'start':    args.start,
                'end':      args.end,
                'type':     args.type,
                'district': args.district,
            },
            'windows':   results,
        }
        with open(args.json_out, 'w') as f:
            json.dump(payload, f, indent=2)
        print(f'\nWrote {args.json_out}')


if __name__ == '__main__':
    main()
