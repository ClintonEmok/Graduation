#!/usr/bin/env python3
"""Scan rolling Chicago crime windows for temporal and spatial burstiness.

This script mirrors the app's burst math in Python so the full raw dataset can
be scanned without API overhead. It reads the source CSV in chunks, rebuilds
normalized Chicago x/z coordinates from lat/lon, and emits rolling-window
metrics plus thesis-ready plots.

Default input:
  data/sources/Crimes_-_2001_to_Present_20260114.csv

Default output:
  scripts/output/spatial-burstiness-experiment/

Examples:
  /Users/clintonemok/miniconda3/bin/python3 scripts/spatial_burstiness_experiment.py
  /Users/clintonemok/miniconda3/bin/python3 scripts/spatial_burstiness_experiment.py \
    --input data/source.csv --window-days 14 --step-days 7
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd


CHICAGO_BOUNDS = {
    'minLon': -87.9,
    'maxLon': -87.5,
    'minLat': 41.6,
    'maxLat': 42.1,
}

NORMALIZED_COORDINATE_RANGE = {
    'min': -50.0,
    'max': 50.0,
    'span': 100.0,
}

GRID_SIZE = 32
EPSILON = 1e-12

DEFAULT_INPUT = Path('data/sources/Crimes_-_2001_to_Present_20260114.csv')
DEFAULT_OUTPUT_DIR = Path('scripts/output/spatial-burstiness-experiment')
DEFAULT_WINDOW_DAYS = 14
DEFAULT_STEP_DAYS = 7
DEFAULT_CHUNKSIZE = 250_000

RAW_DATE_FORMAT = '%m/%d/%Y %I:%M:%S %p'


@dataclass(frozen=True)
class WindowMetrics:
    grid_size: int
    window_days: int
    step_days: int
    start: str
    end: str
    start_epoch: int
    end_epoch: int
    record_count: int
    temporal_b: float
    spatial_entropy_b: float
    spatial_balanced_b: float
    combined_entropy_b: float
    combined_balanced_b: float


def normalize_lon_lat(lon: np.ndarray, lat: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    lon_span = CHICAGO_BOUNDS['maxLon'] - CHICAGO_BOUNDS['minLon']
    lat_span = CHICAGO_BOUNDS['maxLat'] - CHICAGO_BOUNDS['minLat']
    x = ((lon - CHICAGO_BOUNDS['minLon']) / lon_span) * NORMALIZED_COORDINATE_RANGE['span'] + NORMALIZED_COORDINATE_RANGE['min']
    z = ((lat - CHICAGO_BOUNDS['minLat']) / lat_span) * NORMALIZED_COORDINATE_RANGE['span'] + NORMALIZED_COORDINATE_RANGE['min']
    return x, z


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def normalized_entropy(distribution: np.ndarray) -> float:
    entropy = 0.0
    support = 0

    for probability in distribution:
        if probability <= EPSILON:
            continue
        entropy -= float(probability) * math.log(float(probability))
        support += 1

    if support <= 1:
        return 0.0

    return clamp01(entropy / math.log(support))


def jensen_shannon_divergence(left: np.ndarray, right: np.ndarray) -> float:
    left_kld = 0.0
    right_kld = 0.0

    for p, q in zip(left, right, strict=True):
        m = (float(p) + float(q)) / 2.0
        if p > EPSILON and m > EPSILON:
            left_kld += float(p) * math.log(float(p) / m)
        if q > EPSILON and m > EPSILON:
            right_kld += float(q) * math.log(float(q) / m)

    return clamp01((0.5 * (left_kld + right_kld)) / math.log(2.0))


def build_distribution(xs: np.ndarray, zs: np.ndarray, grid_size: int) -> np.ndarray:
    clipped_x = np.clip(xs, NORMALIZED_COORDINATE_RANGE['min'], NORMALIZED_COORDINATE_RANGE['max'])
    clipped_z = np.clip(zs, NORMALIZED_COORDINATE_RANGE['min'], NORMALIZED_COORDINATE_RANGE['max'])
    counts, _, _ = np.histogram2d(
        clipped_x,
        clipped_z,
        bins=grid_size,
        range=[
            [NORMALIZED_COORDINATE_RANGE['min'], NORMALIZED_COORDINATE_RANGE['max']],
            [NORMALIZED_COORDINATE_RANGE['min'], NORMALIZED_COORDINATE_RANGE['max']],
        ],
    )

    total = float(counts.sum())
    if total <= EPSILON:
        return np.zeros(grid_size * grid_size, dtype=float)

    return (counts.reshape(-1) / total).astype(float, copy=False)


def compute_temporal_b(timestamps: np.ndarray) -> float:
    if timestamps.size < 2:
        return 0.0

    sorted_timestamps = np.sort(timestamps)
    timestamp_seconds = sorted_timestamps.astype('datetime64[ns]').astype(np.int64).astype(float) / 1_000_000_000.0
    gaps = np.diff(timestamp_seconds)
    if gaps.size < 2:
        return 0.0

    mean_gap = float(gaps.mean())
    if mean_gap <= EPSILON:
        return 0.0

    std_gap = float(gaps.std())
    return (std_gap - mean_gap) / (std_gap + mean_gap)


def compute_spatial_metrics(xs: np.ndarray, zs: np.ndarray, grid_size: int) -> tuple[float, float]:
    distribution = build_distribution(xs, zs, grid_size)
    concentration = 1.0 - normalized_entropy(distribution)

    if xs.size < 3:
        surprise = 1.0
    else:
        surprise = jensen_shannon_divergence(distribution, distribution)

    balanced = clamp01(concentration * (0.25 + 0.75 * surprise))
    return concentration, balanced


def load_events(csv_path: Path, chunksize: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    header = list(pd.read_csv(csv_path, nrows=0).columns)
    header_set = set(header)

    if {'Date', 'Latitude', 'Longitude'}.issubset(header_set):
        schema = 'raw'
        usecols = ['Date', 'Latitude', 'Longitude']
    elif {'timestamp', 'lat', 'lon'}.issubset(header_set):
        schema = 'source'
        usecols = ['timestamp', 'lat', 'lon']
    elif {'timestamp', 'x', 'z'}.issubset(header_set):
        schema = 'normalized'
        usecols = ['timestamp', 'x', 'z']
    else:
        raise ValueError(f'Unsupported CSV schema in {csv_path}: {header}')

    timestamp_parts: list[np.ndarray] = []
    x_parts: list[np.ndarray] = []
    z_parts: list[np.ndarray] = []

    for chunk in pd.read_csv(
        csv_path,
        usecols=usecols,
        dtype='string',
        chunksize=chunksize,
    ):
        if schema == 'raw':
            timestamps = pd.to_datetime(chunk['Date'], format=RAW_DATE_FORMAT, errors='coerce')
            latitudes = pd.to_numeric(chunk['Latitude'], errors='coerce')
            longitudes = pd.to_numeric(chunk['Longitude'], errors='coerce')
        elif schema == 'source':
            timestamps = pd.to_datetime(chunk['timestamp'], errors='coerce', utc=True).dt.tz_convert(None)
            latitudes = pd.to_numeric(chunk['lat'], errors='coerce')
            longitudes = pd.to_numeric(chunk['lon'], errors='coerce')
        else:
            timestamps = pd.to_datetime(chunk['timestamp'], errors='coerce', utc=True).dt.tz_convert(None)
            x_values = pd.to_numeric(chunk['x'], errors='coerce')
            z_values = pd.to_numeric(chunk['z'], errors='coerce')

        if schema == 'normalized':
            valid = timestamps.notna() & x_values.notna() & z_values.notna()
            if not valid.any():
                continue

            timestamp_parts.append(timestamps.loc[valid].to_numpy(dtype='datetime64[ns]'))
            x_parts.append(x_values.loc[valid].to_numpy(dtype=float))
            z_parts.append(z_values.loc[valid].to_numpy(dtype=float))
            continue

        valid = timestamps.notna() & latitudes.notna() & longitudes.notna()
        if not valid.any():
            continue

        valid_timestamps = timestamps.loc[valid].to_numpy(dtype='datetime64[ns]')
        lon_values = longitudes.loc[valid].to_numpy(dtype=float)
        lat_values = latitudes.loc[valid].to_numpy(dtype=float)
        x_values, z_values = normalize_lon_lat(lon_values, lat_values)

        timestamp_parts.append(valid_timestamps)
        x_parts.append(x_values)
        z_parts.append(z_values)

    if not timestamp_parts:
        raise ValueError(f'No valid rows found in {csv_path}')

    timestamps = np.concatenate(timestamp_parts)
    xs = np.concatenate(x_parts)
    zs = np.concatenate(z_parts)

    order = np.argsort(timestamps, kind='mergesort')
    return timestamps[order], xs[order], zs[order]


def summarize(values: np.ndarray) -> dict[str, float]:
    mean = float(values.mean()) if values.size else 0.0
    std = float(values.std()) if values.size else 0.0
    return {
        'mean': mean,
        'std': std,
        'cv': (std / abs(mean)) if abs(mean) > EPSILON else 0.0,
        'min': float(values.min()) if values.size else 0.0,
        'max': float(values.max()) if values.size else 0.0,
        'median': float(np.median(values)) if values.size else 0.0,
        'q25': float(np.quantile(values, 0.25)) if values.size else 0.0,
        'q75': float(np.quantile(values, 0.75)) if values.size else 0.0,
    }


def summarize_grouped(frame: pd.DataFrame, value_column: str) -> list[dict[str, float]]:
    summary_rows: list[dict[str, float]] = []
    for grid_size, group in frame.groupby('grid_size', sort=True):
        values = group[value_column].to_numpy(dtype=float)
        stats = summarize(values)
        stats['grid_size'] = int(grid_size)
        summary_rows.append(stats)
    return summary_rows


def scan_windows(
    timestamps: np.ndarray,
    xs: np.ndarray,
    zs: np.ndarray,
    window_days: int,
    step_days: int,
    grid_size: int,
) -> list[WindowMetrics]:
    window_delta = np.timedelta64(window_days, 'D')
    step_delta = np.timedelta64(step_days, 'D')

    window_start = pd.Timestamp(timestamps[0]).floor('D').to_datetime64()
    final_start = timestamps[-1] - window_delta

    results: list[WindowMetrics] = []
    cursor = window_start

    while cursor <= final_start:
        end = cursor + window_delta
        left = int(np.searchsorted(timestamps, cursor, side='left'))
        right = int(np.searchsorted(timestamps, end, side='left'))

        window_timestamps = timestamps[left:right]
        window_xs = xs[left:right]
        window_zs = zs[left:right]

        record_count = int(window_timestamps.size)
        temporal_b = compute_temporal_b(window_timestamps)
        spatial_entropy_b, spatial_balanced_b = compute_spatial_metrics(window_xs, window_zs, grid_size)

        results.append(
            WindowMetrics(
                grid_size=grid_size,
                window_days=window_days,
                step_days=step_days,
                start=pd.Timestamp(cursor).strftime('%Y-%m-%d %H:%M:%S'),
                end=pd.Timestamp(end).strftime('%Y-%m-%d %H:%M:%S'),
                start_epoch=int(pd.Timestamp(cursor).value // 1_000_000_000),
                end_epoch=int(pd.Timestamp(end).value // 1_000_000_000),
                record_count=record_count,
                temporal_b=temporal_b,
                spatial_entropy_b=spatial_entropy_b,
                spatial_balanced_b=spatial_balanced_b,
                combined_entropy_b=0.5 * (temporal_b + spatial_entropy_b),
                combined_balanced_b=0.5 * (temporal_b + spatial_balanced_b),
            )
        )

        cursor = cursor + step_delta

    return results


def build_plots(rows: pd.DataFrame, output_dir: Path) -> None:
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except ImportError as error:
        raise RuntimeError(
            'Matplotlib is required to generate plots. Use a Python environment with matplotlib installed, e.g. /Users/clintonemok/miniconda3/bin/python3.'
        ) from error

    figure_dir = output_dir / 'figures'
    figure_dir.mkdir(parents=True, exist_ok=True)

    grid_sizes = sorted(rows['grid_size'].unique().tolist())

    if len(grid_sizes) > 1:
        grouped = rows.groupby('grid_size', sort=True).agg(
            spatial_entropy_mean=('spatial_entropy_b', 'mean'),
            spatial_entropy_std=('spatial_entropy_b', 'std'),
            spatial_balanced_mean=('spatial_balanced_b', 'mean'),
            spatial_balanced_std=('spatial_balanced_b', 'std'),
            temporal_mean=('temporal_b', 'mean'),
            temporal_std=('temporal_b', 'std'),
            correlation=('temporal_b', lambda s: s.corr(rows.loc[s.index, 'spatial_entropy_b'])),
        ).reset_index()

        fig, ax = plt.subplots(figsize=(9.2, 4.8))
        ax.errorbar(
            grouped['grid_size'],
            grouped['spatial_entropy_mean'],
            yerr=grouped['spatial_entropy_std'].fillna(0.0),
            fmt='-o',
            color='#f58518',
            label='Spatial B (entropy)',
        )
        ax.errorbar(
            grouped['grid_size'],
            grouped['spatial_balanced_mean'],
            yerr=grouped['spatial_balanced_std'].fillna(0.0),
            fmt='-o',
            color='#54a24b',
            label='Spatial B (balanced)',
        )
        ax.set_xlabel('Grid size')
        ax.set_ylabel('B value')
        ax.set_title('Spatial burstiness sensitivity to grid size')
        ax.legend(frameon=False)
        ax.set_xticks(grid_sizes)
        fig.tight_layout()
        fig.savefig(figure_dir / 'grid_size_sensitivity.png', dpi=300, bbox_inches='tight')
        fig.savefig(figure_dir / 'grid_size_sensitivity.svg', bbox_inches='tight')
        plt.close(fig)

        fig, ax = plt.subplots(figsize=(9.2, 4.8))
        ax.plot(grouped['grid_size'], grouped['correlation'], marker='o', color='#4c78a8')
        ax.axhline(0.0, color='#999999', linewidth=1.0, linestyle='--')
        ax.set_xlabel('Grid size')
        ax.set_ylabel('Pearson r')
        ax.set_title('Temporal vs spatial correlation by grid size')
        ax.set_xticks(grid_sizes)
        fig.tight_layout()
        fig.savefig(figure_dir / 'grid_size_correlation.png', dpi=300, bbox_inches='tight')
        fig.savefig(figure_dir / 'grid_size_correlation.svg', bbox_inches='tight')
        plt.close(fig)

        return

    temporal = rows['temporal_b'].to_numpy(dtype=float)
    spatial = rows['spatial_entropy_b'].to_numpy(dtype=float)
    combined = rows['combined_entropy_b'].to_numpy(dtype=float)
    starts = pd.to_datetime(rows['start'])

    # Histogram: temporal vs spatial.
    fig, ax = plt.subplots(figsize=(9.5, 5.0))
    bins = np.linspace(min(temporal.min(), spatial.min()), max(temporal.max(), spatial.max()), 36)
    ax.hist(temporal, bins=bins, alpha=0.68, color='#4c78a8', label='Temporal B')
    ax.hist(spatial, bins=bins, alpha=0.68, color='#f58518', label='Spatial B (entropy)')
    ax.set_xlabel('B value')
    ax.set_ylabel('Window count')
    ax.legend(frameon=False)
    ax.set_title('Rolling-window burstiness distribution')
    fig.tight_layout()
    fig.savefig(figure_dir / 'burstiness_histogram.png', dpi=300, bbox_inches='tight')
    fig.savefig(figure_dir / 'burstiness_histogram.svg', bbox_inches='tight')
    plt.close(fig)

    # Scatter: temporal vs spatial.
    fig, ax = plt.subplots(figsize=(6.6, 6.0))
    ax.scatter(temporal, spatial, s=12, alpha=0.45, color='#54a24b', edgecolors='none')
    ax.set_xlabel('Temporal B')
    ax.set_ylabel('Spatial B (entropy)')
    ax.set_title('Temporal vs spatial burstiness')
    fig.tight_layout()
    fig.savefig(figure_dir / 'temporal_vs_spatial_scatter.png', dpi=300, bbox_inches='tight')
    fig.savefig(figure_dir / 'temporal_vs_spatial_scatter.svg', bbox_inches='tight')
    plt.close(fig)

    # Time series: spatial and combined over the scan.
    fig, ax = plt.subplots(figsize=(11.0, 4.4))
    ax.plot(starts, spatial, color='#f58518', linewidth=1.6, label='Spatial B (entropy)')
    ax.plot(starts, combined, color='#4c78a8', linewidth=1.3, alpha=0.9, label='Combined B (entropy)')
    ax.set_xlabel('Window start')
    ax.set_ylabel('B value')
    ax.set_title('Spatial burstiness over time')
    ax.legend(frameon=False)
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(figure_dir / 'spatial_burstiness_timeseries.png', dpi=300, bbox_inches='tight')
    fig.savefig(figure_dir / 'spatial_burstiness_timeseries.svg', bbox_inches='tight')
    plt.close(fig)


def format_stats(name: str, stats: dict[str, float]) -> str:
    return (
        f'{name}: mean={stats["mean"]:.6f}, std={stats["std"]:.6f}, cv={stats["cv"]:.6f}, '
        f'min={stats["min"]:.6f}, max={stats["max"]:.6f}'
    )


def main() -> None:
    parser = argparse.ArgumentParser(description='Rolling-window temporal vs spatial burstiness scan.')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT, help=f'Crime CSV to scan (default: {DEFAULT_INPUT})')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help=f'Output directory (default: {DEFAULT_OUTPUT_DIR})')
    parser.add_argument('--window-days', type=int, default=DEFAULT_WINDOW_DAYS, help=f'Rolling window length in days (default: {DEFAULT_WINDOW_DAYS})')
    parser.add_argument('--step-days', type=int, default=DEFAULT_STEP_DAYS, help=f'Rolling step in days (default: {DEFAULT_STEP_DAYS})')
    parser.add_argument('--chunksize', type=int, default=DEFAULT_CHUNKSIZE, help=f'CSV chunk size (default: {DEFAULT_CHUNKSIZE})')
    grid_group = parser.add_mutually_exclusive_group()
    grid_group.add_argument('--grid-size', type=int, help='Single grid size to scan, e.g. 32')
    grid_group.add_argument('--grid-sizes', type=int, nargs='+', help='Grid sizes to sweep, e.g. 8 16 32 64')
    parser.add_argument('--no-plots', action='store_true', help='Skip generating PNG/SVG figures')
    args = parser.parse_args()

    if args.grid_sizes is not None:
        grid_sizes = args.grid_sizes
    elif args.grid_size is not None:
        grid_sizes = [args.grid_size]
    else:
        grid_sizes = [8, 16, 32, 64]

    if any(grid_size <= 0 for grid_size in grid_sizes):
        raise ValueError('Grid sizes must be positive integers.')

    timestamps, xs, zs = load_events(args.input, chunksize=args.chunksize)
    rows: list[WindowMetrics] = []
    for grid_size in grid_sizes:
        rows.extend(
            scan_windows(
                timestamps,
                xs,
                zs,
                window_days=args.window_days,
                step_days=args.step_days,
                grid_size=grid_size,
            )
        )

    if not rows:
        raise RuntimeError('No rolling windows were produced.')

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    frame = pd.DataFrame(asdict(row) for row in rows)
    metrics_csv = output_dir / 'rolling_window_metrics.csv'
    frame.to_csv(metrics_csv, index=False)

    summary = {
        'input': str(args.input),
        'window_days': args.window_days,
        'step_days': args.step_days,
        'grid_sizes': grid_sizes,
        'window_count': int(len(frame)),
        'record_count_total': int(frame['record_count'].sum()),
        'start': str(frame['start'].iloc[0]),
        'end': str(frame['end'].iloc[-1]),
        'overall': {
            'temporal_b': summarize(frame['temporal_b'].to_numpy(dtype=float)),
            'spatial_entropy_b': summarize(frame['spatial_entropy_b'].to_numpy(dtype=float)),
            'spatial_balanced_b': summarize(frame['spatial_balanced_b'].to_numpy(dtype=float)),
            'combined_entropy_b': summarize(frame['combined_entropy_b'].to_numpy(dtype=float)),
            'combined_balanced_b': summarize(frame['combined_balanced_b'].to_numpy(dtype=float)),
            'pearson_temporal_vs_spatial_entropy': float(frame['temporal_b'].corr(frame['spatial_entropy_b'])),
            'pearson_temporal_vs_spatial_balanced': float(frame['temporal_b'].corr(frame['spatial_balanced_b'])),
        },
        'by_grid_size': {
            str(int(grid_size)): {
                'temporal_b': summarize(group['temporal_b'].to_numpy(dtype=float)),
                'spatial_entropy_b': summarize(group['spatial_entropy_b'].to_numpy(dtype=float)),
                'spatial_balanced_b': summarize(group['spatial_balanced_b'].to_numpy(dtype=float)),
                'combined_entropy_b': summarize(group['combined_entropy_b'].to_numpy(dtype=float)),
                'combined_balanced_b': summarize(group['combined_balanced_b'].to_numpy(dtype=float)),
                'pearson_temporal_vs_spatial_entropy': float(group['temporal_b'].corr(group['spatial_entropy_b'])),
                'pearson_temporal_vs_spatial_balanced': float(group['temporal_b'].corr(group['spatial_balanced_b'])),
            }
            for grid_size, group in frame.groupby('grid_size', sort=True)
        },
    }

    summary_path = output_dir / 'summary.json'
    summary_path.write_text(json.dumps(summary, indent=2), encoding='utf-8')

    if not args.no_plots:
        build_plots(frame, output_dir)

    print(f'Saved rolling metrics to {metrics_csv}')
    print(f'Saved summary to {summary_path}')
    if not args.no_plots:
        print(f'Saved figures to {output_dir / "figures"}')

    print('')
    print(format_stats('Temporal B', summary['overall']['temporal_b']))
    print(format_stats('Spatial B (entropy)', summary['overall']['spatial_entropy_b']))
    print(format_stats('Spatial B (balanced)', summary['overall']['spatial_balanced_b']))
    print(format_stats('Combined B (entropy)', summary['overall']['combined_entropy_b']))
    print(format_stats('Combined B (balanced)', summary['overall']['combined_balanced_b']))
    print(f'Correlation (temporal vs spatial entropy): {summary["overall"]["pearson_temporal_vs_spatial_entropy"]:.6f}')

    if len(grid_sizes) > 1:
        print('')
        print('Grid sweep:')
        for grid_size in grid_sizes:
            grid_summary = summary['by_grid_size'][str(grid_size)]
            print(
                f'  {grid_size:>2}x{grid_size:<2} '
                f'spatial_mean={grid_summary["spatial_entropy_b"]["mean"]:.6f} '
                f'spatial_std={grid_summary["spatial_entropy_b"]["std"]:.6f} '
                f'corr={grid_summary["pearson_temporal_vs_spatial_entropy"]:.6f}'
            )


if __name__ == '__main__':
    main()
