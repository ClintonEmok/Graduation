#!/usr/bin/env python3
"""Run STKDE for one month and print the observed intensity ranges.

This is a lightweight exploration script for picking sensible UI scales.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from stkde_core import STKDEConfig, STKDEEngine


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_INPUT = PROJECT_ROOT / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'


def parse_month(month_text: str) -> tuple[datetime, datetime]:
    try:
        year_text, month_part = month_text.split('-', 1)
        year = int(year_text)
        month = int(month_part)
        first_day = datetime(year, month, 1)
        next_month = month + 1
        next_year = year
        if next_month == 13:
            next_month = 1
            next_year += 1
        return first_day, datetime(next_year, next_month, 1)
    except ValueError as exc:
        raise ValueError('Month must be formatted as YYYY-MM') from exc


def read_month_slice(csv_path: Path, start: datetime, end: datetime, chunksize: int = 250_000) -> tuple[np.ndarray, np.ndarray, np.ndarray, Counter[str]]:
    frames: list[pd.DataFrame] = []
    daily_counts: Counter[str] = Counter()
    date_format = '%m/%d/%Y %I:%M:%S %p'

    for chunk in pd.read_csv(
        csv_path,
        usecols=['Date', 'Latitude', 'Longitude'],
        chunksize=chunksize,
        low_memory=False,
    ):
        chunk['Date'] = pd.to_datetime(chunk['Date'], format=date_format, errors='coerce')
        chunk = chunk.dropna(subset=['Date', 'Latitude', 'Longitude'])
        chunk = chunk[(chunk['Latitude'] != 0) & (chunk['Longitude'] != 0)]
        chunk = chunk[(chunk['Date'] >= start) & (chunk['Date'] < end)]
        if chunk.empty:
            continue

        frames.append(chunk)
        for day_label, count in chunk['Date'].dt.strftime('%Y-%m-%d').value_counts().items():
            daily_counts[day_label] += int(count)

    if not frames:
        raise ValueError(f'No rows found in {csv_path} for {start:%Y-%m} month slice')

    data = pd.concat(frames, ignore_index=True)
    timestamps = (data['Date'].astype('int64') // 10**9).to_numpy(dtype=np.int64)
    lats = data['Latitude'].to_numpy(dtype=np.float64)
    lons = data['Longitude'].to_numpy(dtype=np.float64)
    return lons, lats, timestamps, daily_counts


def quantile_summary(values: np.ndarray) -> str:
    if values.size == 0:
        return 'n/a'
    q = np.quantile(values, [0, 0.25, 0.5, 0.75, 0.9, 1.0])
    return (
        f'min={q[0]:.6f} p25={q[1]:.6f} median={q[2]:.6f} '
        f'p75={q[3]:.6f} p90={q[4]:.6f} max={q[5]:.6f}'
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run STKDE on a single month and print the resulting ranges.')
    parser.add_argument('--input-csv', type=Path, default=DEFAULT_INPUT, help=f'Crime CSV to read (default: {DEFAULT_INPUT})')
    parser.add_argument('--month', default='2020-01', help='Month to inspect in YYYY-MM format (default: 2020-01)')
    parser.add_argument('--spatial-bw-m', type=int, default=750, help='Spatial bandwidth in meters')
    parser.add_argument('--temporal-bw-h', type=int, default=24, help='Temporal bandwidth in hours')
    parser.add_argument('--grid-cell-m', type=int, default=500, help='Grid cell size in meters')
    parser.add_argument('--top-k', type=int, default=12, help='Number of hotspots to keep')
    parser.add_argument('--min-support', type=int, default=5, help='Minimum support for hotspot candidates')
    parser.add_argument('--time-window-h', type=int, default=24, help='Temporal window used for hotspot peak search')
    parser.add_argument('--kernel', default='gaussian', choices=['gaussian', 'epanechnikov', 'uniform', 'quartic', 'triangular'])
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start, end = parse_month(args.month)
    lons, lats, timestamps, daily_counts = read_month_slice(args.input_csv, start, end)

    engine = STKDEEngine(
        STKDEConfig(
            spatial_bw_m=args.spatial_bw_m,
            temporal_bw_h=args.temporal_bw_h,
            grid_cell_m=args.grid_cell_m,
            top_k=args.top_k,
            min_support=args.min_support,
            time_window_h=args.time_window_h,
            kernel=args.kernel,
        )
    )

    hotspots, stats = engine.run(lons, lats, timestamps)
    support = engine._support if engine._support is not None else np.array([])
    intensity = engine._intensity if engine._intensity is not None else np.array([])
    active_support = support[support > 0]
    active_intensity = intensity[intensity > 0]
    hotspot_intensity = np.array([float(row['intensity']) for row in hotspots], dtype=np.float64)

    print(f'Month window: {start:%Y-%m-01} to {end:%Y-%m-01}')
    print(f'Input rows: {len(lons):,}')
    print(f'Daily span: {len(daily_counts)} days')
    print(f'Peak day count: {max(daily_counts.values()):,}')
    print(f'Lowest day count: {min(daily_counts.values()):,}')
    print(f'Grid: {stats["grid_rows"]} rows x {stats["grid_cols"]} cols = {stats["n_cells"]:,} cells')
    print(f'Active cells: {stats["n_active_cells"]:,}')
    print(f'Hotspot candidates: {stats["n_hotspot_candidates"]:,}')
    print(f'Returned hotspots: {stats["n_hotspots"]:,}')
    print()
    print('Support range (active cells):')
    print(f'  {quantile_summary(active_support)}')
    print('Intensity range (active cells):')
    print(f'  {quantile_summary(active_intensity)}')
    print('Hotspot intensity range (top-k normalized scores):')
    print(f'  {quantile_summary(hotspot_intensity)}')
    print()
    print('Top hotspots:')
    for row in hotspots[: min(len(hotspots), 10)]:
        print(
            '  '
            f"{row['id']} intensity={row['intensity']:.6f} support={row['support']} "
            f"lat={row['lat']:.4f} lon={row['lon']:.4f} "
            f"peak={datetime.fromtimestamp(row['peak_start'], tz=timezone.utc):%Y-%m-%d %H:%M}"
            f"→{datetime.fromtimestamp(row['peak_end'], tz=timezone.utc):%Y-%m-%d %H:%M}"
        )


if __name__ == '__main__':
    main()
