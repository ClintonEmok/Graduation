#!/usr/bin/env python3
"""Spatial concentration sweep — does spatial signal vary across windows?

Tests whether *spatial* metrics carry more discriminative signal
across time windows than burstiness does. If they do, they're better
candidates for driving adaptive time scaling in the STC.

For each window in a sweep, we bin events into a lat/lon grid and
compute per-window:
  - n_events          (raw count)
  - n_active          (cells with ≥1 event)
  - peak              (max events in any cell)
  - mean_per_active   (mean across active cells)
  - spatial_cv        (σ/μ across active cells)
  - gini              (Gini across all cells, zeros included)
  - hotspot_share     (peak / n_events — concentration)

If any of these vary meaningfully across windows, that metric
is a candidate for adaptive scaling.

Usage:
  python spatial_concentration_sweep.py data/source.csv
  python spatial_concentration_sweep.py data/source.csv --type BURGLARY
  python spatial_concentration_sweep.py data/source.csv --grid 50 --windows 3600,21600,86400
  python spatial_concentration_sweep.py data/source.csv --json out.json
"""

import argparse
import bisect
import csv
import json
import math
import sys
from datetime import datetime, timezone
from statistics import mean, median, pstdev


# ── Timestamp + event parsing (mirrors burstiness_sweep.py) ───────

def parse_iso(ts: str) -> float:
    return datetime.fromisoformat(ts.rstrip('Z')).timestamp()


def parse_us_date(ts: str) -> float:
    return datetime.strptime(ts, '%m/%d/%Y %I:%M:%S %p').timestamp()


FORMATS = {
    'full':   {'date': 'Date', 'type': 'Primary Type',
               'district': 'District', 'parse': parse_us_date,
               'lat': 'Latitude', 'lon': 'Longitude'},
    'sample': {'date': 'timestamp', 'type': 'type',
               'district': 'district', 'parse': parse_iso,
               'lat': 'lat', 'lon': 'lon'},
}


def detect_format(header):
    for name, spec in FORMATS.items():
        if spec['date'] in header and spec['type'] in header \
                and spec['lat'] in header and spec['lon'] in header:
            return name
    raise ValueError(f'Unknown CSV format — header: {header}')


def read_events(csv_path, start=None, end=None,
                crime_type=None, district=None):
    """Return sorted (timestamp, lat, lon) tuples plus counts."""
    events = []
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
        idx_lat = header.index(spec['lat'])
        idx_lon = header.index(spec['lon'])

        for row in reader:
            total += 1
            try:
                ts = parse(row[idx_date])
                lat = float(row[idx_lat])
                lon = float(row[idx_lon])
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
            events.append((ts, lat, lon))

    events.sort()
    return events, total, filtered


# ── Spatial grid ───────────────────────────────────────────────────

class SpatialGrid:
    """Regular lat/lon grid over a bounding box."""

    def __init__(self, lats, lons, n_cells):
        self.lat_min = min(lats)
        self.lat_max = max(lats)
        self.lon_min = min(lons)
        self.lon_max = max(lons)
        self.n = n_cells
        # Square cells in degree space — fine for this analysis.
        self.lat_step = (self.lat_max - self.lat_min) / n_cells
        self.lon_step = (self.lon_max - self.lon_min) / n_cells

    def cell(self, lat, lon):
        i = int((lat - self.lat_min) / self.lat_step)
        j = int((lon - self.lon_min) / self.lon_step)
        if i < 0: i = 0
        elif i >= self.n: i = self.n - 1
        if j < 0: j = 0
        elif j >= self.n: j = self.n - 1
        return i * self.n + j

    def total_cells(self):
        return self.n * self.n


# ── Concentration metrics ──────────────────────────────────────────

def gini(counts):
    """Gini coefficient over a non-negative list. 0=uniform, 1=concentrated."""
    n = len(counts)
    if n == 0:
        return None
    s = float(sum(counts))
    if s == 0:
        return 0.0
    counts_sorted = sorted(counts)
    cumulative = 0.0
    weighted = 0.0
    for i, c in enumerate(counts_sorted, start=1):
        cumulative += c
        weighted += i * c
    # G = (2 * Σ(i·x_i) / (n * Σx)) − (n+1)/n
    return (2.0 * weighted) / (n * s) - (n + 1) / n


def concentration_metrics(counts, total_cells, n_events):
    """Compute per-window spatial metrics. Returns dict or None if no events."""
    if n_events == 0:
        return None
    active = [c for c in counts if c > 0]
    n_active = len(active)
    peak = max(counts)
    mean_active = sum(active) / n_active if n_active else 0.0
    var_active = sum((c - mean_active) ** 2 for c in active) / n_active if n_active else 0.0
    sd_active = math.sqrt(var_active)
    spatial_cv = sd_active / mean_active if mean_active > 0 else 0.0
    g = gini(counts)
    return {
        'n_events':       n_events,
        'n_active':       n_active,
        'peak':           peak,
        'mean_per_active': mean_active,
        'spatial_cv':     spatial_cv,
        'gini':           g if g is not None else 0.0,
        'hotspot_share':  peak / n_events,
    }


# ── Window sweep ───────────────────────────────────────────────────

def windows_for_size(t_start, t_end, window_sec, step_sec):
    if t_end <= t_start or window_sec <= 0:
        return
    t = t_start
    while t + window_sec <= t_end:
        yield t, t + window_sec
        t += step_sec


def sweep_concentration(events, window_sec, step_sec, grid):
    """Slide a window, bin into grid, compute per-window metrics.

    `events` is a sorted list of (ts, lat, lon). For speed, we use
    bisect to slice, then bin into the grid.
    """
    if not events:
        return []
    timestamps = [e[0] for e in events]
    total_cells = grid.total_cells()
    out = []
    for ws, we in windows_for_size(timestamps[0], timestamps[-1],
                                   window_sec, step_sec):
        lo = bisect.bisect_left(timestamps, ws)
        hi = bisect.bisect_left(timestamps, we)
        n_events = hi - lo
        if n_events == 0:
            continue
        counts = [0] * total_cells
        for k in range(lo, hi):
            _, lat, lon = events[k]
            counts[grid.cell(lat, lon)] += 1
        m = concentration_metrics(counts, total_cells, n_events)
        if m is not None:
            out.append(m)
    return out


# ── Aggregation ────────────────────────────────────────────────────

METRIC_KEYS = ['n_events', 'n_active', 'peak', 'mean_per_active',
               'spatial_cv', 'gini', 'hotspot_share']


def stats_for(values):
    if not values:
        return None
    return {
        'n':    len(values),
        'mean': mean(values),
        'std':  pstdev(values) if len(values) > 1 else 0.0,
        'min':  min(values),
        'p25':  _percentile(values, 0.25),
        'p50':  median(values),
        'p75':  _percentile(values, 0.75),
        'max':  max(values),
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


METRIC_LABELS = {
    'n_events':        'n_events',
    'n_active':        'n_active',
    'peak':            'peak',
    'mean_per_active': 'mean/cell',
    'spatial_cv':      'sp_cv',
    'gini':            'gini',
    'hotspot_share':   'hs_share',
}


def print_table(results, metric):
    print(f'\n── {METRIC_LABELS[metric]} '
          f'{"─" * max(0, 60 - len(METRIC_LABELS[metric]))}')
    print(f'{"window":<6} {"n":>6} '
          f'{"mean":>10} {"std":>10} {"min":>10} '
          f'{"p50":>10} {"max":>10}   {"CV":>6}  verdict')
    print('─' * 90)
    for row in results:
        s = row['stats'].get(metric)
        if s is None:
            print(f'{label(row["window_sec"]):<6} {"—":>6}')
            continue
        cv = s['std'] / s['mean'] if s['mean'] else 0.0
        flag = ('flat' if cv < 0.10 else
                'low'  if cv < 0.30 else
                'varies')
        print(f'{label(row["window_sec"]):<6} {s["n"]:>6d} '
              f'{s["mean"]:>10.3f} {s["std"]:>10.3f} {s["min"]:>10.3f} '
              f'{s["p50"]:>10.3f} {s["max"]:>10.3f}   {cv:>6.3f}  {flag}')
    print()


# ── Main ───────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description='Windowed spatial concentration sweep — '
                    'does spatial signal vary?',
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
                    help='Step size in seconds (default: window/4)')
    ap.add_argument('--grid', type=int, default=50,
                    help='Grid resolution NxN (default: 50)')
    ap.add_argument('--json', dest='json_out', default=None,
                    help='Write full results to JSON file')
    args = ap.parse_args()

    events, total, filtered = read_events(
        args.csv_path, args.start, args.end, args.type, args.district,
    )
    if not events:
        print('No events after filtering.', file=sys.stderr)
        sys.exit(1)

    lats = [e[1] for e in events]
    lons = [e[2] for e in events]
    grid = SpatialGrid(lats, lons, args.grid)
    cell_deg = (grid.lat_step + grid.lon_step) / 2
    cell_km = cell_deg * 111.0  # rough — degrees → km at this latitude

    print(f'Loaded {len(events):,} events  '
          f'(total={total:,}, filtered={filtered:,})')
    print(f'Timeline: '
          f'{datetime.fromtimestamp(events[0][0], tz=timezone.utc):%Y-%m-%d}'
          f'  →  {datetime.fromtimestamp(events[-1][0], tz=timezone.utc):%Y-%m-%d}')
    print(f'Grid: {args.grid}×{args.grid}  '
          f'cell ≈ {cell_km:.2f} km  '
          f'bbox: lat [{grid.lat_min:.3f},{grid.lat_max:.3f}], '
          f'lon [{grid.lon_min:.3f},{grid.lon_max:.3f}]')

    sizes = [int(s) for s in args.windows.split(',')]
    results = []
    for ws in sizes:
        step = args.step or max(1, ws // 4)
        per_window = sweep_concentration(events, ws, step, grid)
        agg = {}
        for key in METRIC_KEYS:
            vals = [m[key] for m in per_window]
            agg[key] = stats_for(vals)
        results.append({
            'window_sec': ws,
            'step_sec':   step,
            'grid_n':     args.grid,
            'stats':      agg,
        })

    for metric in METRIC_KEYS:
        print_table(results, metric)

    # Headline verdict — CV of CVs (coefficient of variation) per metric.
    print('Summary: per-metric CV-of-CV (higher = more discriminative)')
    print(f'{"metric":<18} {"1h":>10} {"6h":>10} {"1d":>10} {"1w":>10}')
    print('─' * 62)
    by_metric = {m: [] for m in METRIC_KEYS}
    for row in results:
        for m in METRIC_KEYS:
            s = row['stats'].get(m)
            if s is None or s['mean'] == 0:
                by_metric[m].append(None)
            else:
                by_metric[m].append(s['std'] / s['mean'])
    for m in METRIC_KEYS:
        vals = by_metric[m]
        cells = [f'{v:>10.3f}' if v is not None else f'{"—":>10}'
                 for v in vals]
        print(f'{METRIC_LABELS[m]:<18} ' + ' '.join(cells))
    print()

    if args.json_out:
        payload = {
            'csv_path':  args.csv_path,
            'events':    len(events),
            'filters': {
                'start':    args.start,
                'end':      args.end,
                'type':     args.type,
                'district': args.district,
            },
            'grid_n':    args.grid,
            'windows':   results,
        }
        with open(args.json_out, 'w') as f:
            json.dump(payload, f, indent=2)
        print(f'Wrote {args.json_out}')


if __name__ == '__main__':
    main()
