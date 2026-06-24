#!/usr/bin/env python3
"""Render Chapter 3 data-exploration figures for the thesis.

The script writes a self-contained set of thesis-style figures into
`scripts/output/chapter3/` so it can live alongside the other generator scripts
without touching the thesis sources until you decide to promote the images.
"""

from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from map_figures.chapter3_maps import build_district_map, build_spatial_distribution


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / 'output' / 'chapter3'
DEFAULT_CRIME_CSV = SCRIPT_DIR.parent / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'
FIGURE_SIZE_OVERVIEW = (10.8, 5.8)
FIGURE_SIZE_TEMPORAL = (10.8, 6.4)
FIGURE_SIZE_SPATIAL = (10.6, 5.8)
FIGURE_DPI = 320

BG = '#ffffff'
INK = '#18202a'
SUBTLE = '#687482'
GRID = '#d8e0e8'
BLUE = '#3b6ea8'
BLUE_DARK = '#24486f'
BLUE_LIGHT = '#b8d1ea'
TEAL = '#76a9b7'
ACCENT = '#d9a441'
RED = '#d46c68'


@dataclass(frozen=True)
class FigureSet:
    dataset_overview: Path
    temporal_density: Path
    yearly_metrics: Path
    yearly_crime_types: Path
    yearly_district_concentration: Path
    yearly_monthly_seasonality: Path
    spatial_distribution: Path
    district_map: Path
    crime_types: Path
    weekday_heatmap: Path
    preprocessing_flow: Path


def configure_matplotlib() -> None:
    import matplotlib.pyplot as plt

    plt.rcParams.update(
        {
            'figure.facecolor': BG,
            'axes.facecolor': BG,
            'savefig.facecolor': BG,
            'savefig.bbox': 'tight',
            'savefig.pad_inches': 0.04,
            'font.family': 'serif',
            'font.serif': ['DejaVu Serif', 'Times New Roman', 'Times'],
            'mathtext.fontset': 'stix',
            'axes.edgecolor': GRID,
            'axes.labelcolor': INK,
            'xtick.color': SUBTLE,
            'ytick.color': SUBTLE,
            'text.color': INK,
            'axes.titlepad': 10,
            'axes.spines.top': False,
            'axes.spines.right': False,
            'axes.spines.left': False,
            'axes.spines.bottom': False,
            'grid.color': GRID,
            'grid.linewidth': 0.8,
            'grid.alpha': 0.8,
        }
    )


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_png(fig, path: Path) -> None:
    fig.savefig(path.with_suffix('.png'), dpi=FIGURE_DPI)


def build_dataset_overview(outdir: Path) -> Path:
    import matplotlib.patches as patches
    import matplotlib.pyplot as plt
    import numpy as np

    fig = plt.figure(figsize=FIGURE_SIZE_OVERVIEW)
    ax_map = fig.add_subplot(111)

    ax_map.set_xlim(0, 10)
    ax_map.set_ylim(0, 10)
    ax_map.set_aspect('equal')
    ax_map.axis('off')
    footprint = patches.FancyBboxPatch((1.1, 1.1), 7.8, 7.8, boxstyle='round,pad=0.02,rounding_size=0.12', facecolor='#f8fbfe', edgecolor=GRID, linewidth=1.1)
    ax_map.add_patch(footprint)
    for x in np.linspace(2.0, 7.6, 5):
        ax_map.plot([x, x], [1.3, 8.7], color=GRID, lw=0.8)
    for y in np.linspace(2.0, 8.4, 5):
        ax_map.plot([1.5, 8.7], [y, y], color=GRID, lw=0.8)
    rng = np.random.default_rng(11)
    centers = np.array([[3.0, 6.9], [5.7, 5.0], [4.4, 3.1], [6.8, 7.6]])
    for cx, cy in centers:
        pts = rng.normal(loc=(cx, cy), scale=(0.55, 0.55), size=(48, 2))
        ax_map.scatter(pts[:, 0], pts[:, 1], s=10, color=BLUE, alpha=0.22, linewidths=0)
        ax_map.add_patch(patches.Circle((cx, cy), 0.95, fill=False, ec=BLUE_DARK, lw=1.2, ls='--', alpha=0.55))
    out = outdir / 'chapter3_dataset_overview'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def synthetic_temporal_counts(days: int = 31, seed: int = 7):
    import numpy as np

    rng = np.random.default_rng(seed)
    hours = np.arange(24)
    day_index = np.arange(days)
    hour_profile = (
        0.18
        + 0.35 * np.exp(-((hours - 8) / 2.3) ** 2)
        + 0.55 * np.exp(-((hours - 18.5) / 3.2) ** 2)
        + 0.22 * np.exp(-((hours - 23) / 1.6) ** 2)
    )
    weekend_boost = np.where((day_index % 7) >= 5, 1.22, 1.0)
    seasonal = 1.0 + 0.12 * np.sin(np.linspace(0, 2.5 * np.pi, days))
    day_scale = weekend_boost * seasonal
    heat = np.outer(day_scale, hour_profile)

    burst_days = {4: 1.70, 11: 1.45, 17: 1.90, 23: 1.55, 28: 1.35}
    for day, factor in burst_days.items():
        heat[day, 16:22] *= factor
        heat[day, 6:9] *= 1.12

    counts = rng.poisson(lam=heat * 165)
    totals = counts.sum(axis=1)
    hourly = counts.sum(axis=0)
    return counts, totals, hourly


def parse_full_date_parts(date_str: str) -> tuple[int, int, float]:
    month = int(date_str[0:2])
    day = int(date_str[3:5])
    year = int(date_str[6:10])
    hour12 = int(date_str[11:13])
    minute = int(date_str[14:16])
    second = int(date_str[17:19])
    is_pm = date_str[20:22] == 'PM'
    hour24 = (hour12 % 12) + (12 if is_pm else 0)
    timestamp = datetime(year, month, day, hour24, minute, second, tzinfo=timezone.utc).timestamp()
    return year, hour24, timestamp


def compute_cv(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    mean = total / len(counts)
    variance = sum((count - mean) ** 2 for count in counts) / len(counts)
    return math.sqrt(variance) / mean


def compute_gini(counts: list[int]) -> float | None:
    total = sum(counts)
    if total == 0:
        return None
    ordered = sorted(counts)
    n = len(ordered)
    weighted = sum((idx + 1) * count for idx, count in enumerate(ordered))
    return (2 * weighted) / (n * total) - (n + 1) / n


def compute_burstiness_from_running_stats(n: int, mean: float, m2: float) -> float | None:
    if n == 0 or mean == 0:
        return None
    sigma = math.sqrt(m2 / n)
    if sigma + mean == 0:
        return None
    return (sigma - mean) / (sigma + mean)


@lru_cache(maxsize=4)
def compute_yearly_profiles(csv_path: Path) -> dict[str, object]:
    yearly: dict[int, dict[str, object]] = {}
    overall_types: dict[str, int] = {}
    overall_districts: dict[str, int] = {}

    with csv_path.open(newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx_date = header.index('Date')
        idx_primary_type = header.index('Primary Type')
        idx_district = header.index('District')

        for row in reader:
            try:
                date_str = row[idx_date]
                year, hour, timestamp = parse_full_date_parts(date_str)
            except (ValueError, IndexError):
                continue

            bucket = yearly.setdefault(
                year,
                {
                    'count': 0,
                    'hourly': [0] * 24,
                    'monthly': [0] * 12,
                    'prev_ts': None,
                    'gap_n': 0,
                    'gap_mean': 0.0,
                    'gap_m2': 0.0,
                    'months': set(),
                    'types': {},
                    'districts': {},
                },
            )
            primary_type = row[idx_primary_type].strip().title() or 'Unknown'
            district = row[idx_district].strip() or 'Unknown'
            month = int(date_str[0:2])

            bucket['count'] += 1
            bucket['hourly'][hour] += 1
            bucket['monthly'][month - 1] += 1
            bucket['months'].add(month)
            bucket['types'][primary_type] = bucket['types'].get(primary_type, 0) + 1
            bucket['districts'][district] = bucket['districts'].get(district, 0) + 1
            overall_types[primary_type] = overall_types.get(primary_type, 0) + 1
            overall_districts[district] = overall_districts.get(district, 0) + 1

            prev_ts = bucket['prev_ts']
            if prev_ts is not None:
                gap = prev_ts - timestamp
                if gap >= 0:
                    bucket['gap_n'] += 1
                    delta = gap - bucket['gap_mean']
                    bucket['gap_mean'] += delta / bucket['gap_n']
                    bucket['gap_m2'] += delta * (gap - bucket['gap_mean'])
            bucket['prev_ts'] = timestamp

    if not yearly:
        return []

    latest_year = max(yearly)
    if len(yearly[latest_year]['months']) < 12:
        yearly.pop(latest_year)

    years = sorted(yearly)
    metrics: list[dict[str, float]] = []
    for year in years:
        bucket = yearly[year]
        hourly = bucket['hourly']
        top_quarter_share = sum(sorted(hourly)[-6:]) / bucket['count'] if bucket['count'] else 0.0
        metrics.append(
            {
                'year': year,
                'count': bucket['count'],
                'cv': compute_cv(hourly) or 0.0,
                'gini': compute_gini(hourly) or 0.0,
                'burstiness': compute_burstiness_from_running_stats(bucket['gap_n'], bucket['gap_mean'], bucket['gap_m2']) or 0.0,
                'top_quarter_share': top_quarter_share,
            }
        )

    top_types = [
        label
        for label, _count in sorted(
            overall_types.items(),
            key=lambda item: (-item[1], item[0]),
        )[:5]
    ]
    top_districts = [
        label
        for label, _count in sorted(
            overall_districts.items(),
            key=lambda item: (-item[1], int(item[0]) if item[0].isdigit() else 9999),
        )[:8]
    ]

    return {
        'metrics': metrics,
        'years': years,
        'top_types': top_types,
        'top_districts': top_districts,
        'yearly': yearly,
    }


def compute_yearly_metrics(csv_path: Path) -> list[dict[str, float]]:
    return compute_yearly_profiles(csv_path)['metrics']


def build_temporal_density(outdir: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np

    counts, _, _ = synthetic_temporal_counts()

    fig = plt.figure(figsize=FIGURE_SIZE_TEMPORAL)
    ax = fig.add_subplot(111)
    im = ax.imshow(counts.T, origin='lower', aspect='auto', cmap='Blues', interpolation='nearest')
    ax.set_xlabel('day in representative window')
    ax.set_ylabel('hour of day')
    ax.set_yticks([0, 6, 12, 18, 23])
    ax.set_yticklabels(['00', '06', '12', '18', '23'])
    ax.set_xticks([1, 8, 15, 22, 31])
    ax.set_xticklabels(['1', '8', '15', '22', '31'])
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label('incident count', color=SUBTLE)
    ax.text(0.01, 1.02, 'temporal density', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')
    out = outdir / 'chapter3_temporal_density_distribution'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_yearly_metrics(outdir: Path, csv_path: Path) -> Path:
    import matplotlib.pyplot as plt
    from matplotlib.ticker import FuncFormatter

    metrics = compute_yearly_metrics(csv_path)
    years = [item['year'] for item in metrics]
    counts = [item['count'] for item in metrics]
    burstiness = [item['burstiness'] for item in metrics]
    cv_values = [item['cv'] for item in metrics]
    top_quarter = [item['top_quarter_share'] for item in metrics]

    fig, axes = plt.subplots(2, 2, figsize=(11.4, 7.2), sharex=True)
    ax_count, ax_burst, ax_cv, ax_top = axes.flatten()
    tick_years = years[::4] if len(years) > 4 else years

    ax_count.bar(years, counts, color=BLUE_LIGHT, edgecolor=BLUE_DARK, linewidth=0.7)
    ax_count.set_ylabel('incidents')
    ax_count.yaxis.set_major_formatter(FuncFormatter(lambda value, _pos: f'{value / 1_000_000:.1f}M'))
    ax_count.text(0.01, 1.03, 'annual incident volume', transform=ax_count.transAxes, fontsize=10.5, color=SUBTLE, va='bottom')
    ax_count.grid(True, axis='y')

    ax_burst.plot(years, burstiness, color=BLUE_DARK, linewidth=2.0, marker='o', markersize=3.8)
    ax_burst.axhline(0, color=GRID, linewidth=0.9)
    ax_burst.set_ylabel('B')
    ax_burst.set_ylim(min(-0.05, min(burstiness) - 0.02), max(0.35, max(burstiness) + 0.02))
    ax_burst.text(0.01, 1.03, 'annual burstiness coefficient', transform=ax_burst.transAxes, fontsize=10.5, color=SUBTLE, va='bottom')
    ax_burst.grid(True, axis='y')

    ax_cv.plot(years, cv_values, color=TEAL, linewidth=2.0, marker='o', markersize=3.8)
    ax_cv.set_ylabel('CV')
    ax_cv.text(0.01, 1.03, 'hourly coefficient of variation', transform=ax_cv.transAxes, fontsize=10.5, color=SUBTLE, va='bottom')
    ax_cv.grid(True, axis='y')

    ax_top.plot(years, top_quarter, color=ACCENT, linewidth=2.0, marker='o', markersize=3.8)
    ax_top.set_ylabel('share')
    ax_top.set_ylim(0.20, max(0.38, max(top_quarter) + 0.02))
    ax_top.yaxis.set_major_formatter(FuncFormatter(lambda value, _pos: f'{value * 100:.0f}%'))
    ax_top.text(0.01, 1.03, 'share in busiest 25% of hours', transform=ax_top.transAxes, fontsize=10.5, color=SUBTLE, va='bottom')
    ax_top.grid(True, axis='y')

    for ax in axes[-1]:
        ax.set_xlabel('year')
    for ax in axes.flatten():
        ax.set_xticks(tick_years)
        ax.tick_params(axis='x', rotation=35)

    out = outdir / 'chapter3_yearly_metrics'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_yearly_crime_types(outdir: Path, csv_path: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np
    from matplotlib.ticker import FuncFormatter

    profiles = compute_yearly_profiles(csv_path)
    years = profiles['years']
    yearly = profiles['yearly']
    top_types = profiles['top_types']
    palette = [BLUE_DARK, BLUE, TEAL, ACCENT, RED]

    fig = plt.figure(figsize=(11.2, 6.2))
    ax = fig.add_subplot(111)
    bottom = np.zeros(len(years), dtype=float)

    for idx, crime_type in enumerate(top_types):
        shares = np.array(
            [
                yearly[year]['types'].get(crime_type, 0) / yearly[year]['count']
                if yearly[year]['count']
                else 0.0
                for year in years
            ],
            dtype=float,
        )
        ax.bar(
            years,
            shares,
            bottom=bottom,
            color=palette[idx % len(palette)],
            edgecolor=BG,
            linewidth=0.35,
            label=crime_type.lower(),
        )
        bottom += shares

    ax.set_ylabel('share of incidents')
    ax.set_xlabel('year')
    ax.set_ylim(0, 0.82)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _pos: f'{value * 100:.0f}%'))
    ax.set_xticks(years[::4] if len(years) > 4 else years)
    ax.tick_params(axis='x', rotation=35)
    ax.grid(True, axis='y')
    ax.text(0.01, 1.02, 'yearly crime-type composition', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')
    ax.legend(ncol=min(3, len(top_types)), loc='upper center', bbox_to_anchor=(0.5, -0.12), frameon=False)

    out = outdir / 'chapter3_yearly_crime_type_composition'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_yearly_district_concentration(outdir: Path, csv_path: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np

    profiles = compute_yearly_profiles(csv_path)
    years = profiles['years']
    yearly = profiles['yearly']
    top_districts = profiles['top_districts']

    matrix = np.array(
        [
            [
                yearly[year]['districts'].get(district, 0) / yearly[year]['count']
                if yearly[year]['count']
                else 0.0
                for district in top_districts
            ]
            for year in years
        ],
        dtype=float,
    )

    fig = plt.figure(figsize=(11.0, 6.4))
    ax = fig.add_subplot(111)
    im = ax.imshow(matrix, origin='lower', aspect='auto', cmap='Blues', interpolation='nearest')
    ax.set_xlabel('district')
    ax.set_ylabel('year')
    ax.set_xticks(np.arange(len(top_districts)))
    ax.set_xticklabels(top_districts)
    y_tick_idx = np.arange(0, len(years), 2) if len(years) > 10 else np.arange(len(years))
    ax.set_yticks(y_tick_idx)
    ax.set_yticklabels([years[idx] for idx in y_tick_idx])
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label('share of annual incidents', color=SUBTLE)
    ax.text(0.01, 1.02, 'yearly district concentration', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')

    out = outdir / 'chapter3_yearly_district_concentration'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_yearly_monthly_seasonality(outdir: Path, csv_path: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np

    profiles = compute_yearly_profiles(csv_path)
    years = profiles['years']
    yearly = profiles['yearly']
    month_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    matrix = []
    for year in years:
        monthly = np.array(yearly[year]['monthly'], dtype=float)
        mean = monthly.mean() if monthly.size else 0.0
        matrix.append(monthly / mean if mean else monthly)
    matrix = np.array(matrix, dtype=float)

    fig = plt.figure(figsize=(11.0, 6.4))
    ax = fig.add_subplot(111)
    im = ax.imshow(matrix, origin='lower', aspect='auto', cmap='Blues', interpolation='nearest')
    ax.set_xlabel('month')
    ax.set_ylabel('year')
    ax.set_xticks(np.arange(12))
    ax.set_xticklabels(month_labels)
    y_tick_idx = np.arange(0, len(years), 2) if len(years) > 10 else np.arange(len(years))
    ax.set_yticks(y_tick_idx)
    ax.set_yticklabels([years[idx] for idx in y_tick_idx])
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label('monthly intensity vs annual monthly mean', color=SUBTLE)
    ax.text(0.01, 1.02, 'monthly seasonality by year', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')

    out = outdir / 'chapter3_yearly_monthly_seasonality'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def synthetic_spatial_counts(n_beats: int = 77, seed: int = 19):
    import numpy as np

    rng = np.random.default_rng(seed)
    ranks = np.arange(1, n_beats + 1)
    base = ranks ** -1.12
    wobble = 1.0 + 0.10 * np.sin(ranks / 4.6) + rng.normal(0, 0.025, size=n_beats)
    counts = np.clip(base * wobble, 0.01, None)
    counts /= counts.sum()
    return counts


def build_crime_types(outdir: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np

    labels = ['theft', 'battery', 'assault', 'damage', 'burglary', 'other']
    values = np.array([28, 18, 14, 12, 15, 13], dtype=float)
    colors = ['#24486f', '#3b6ea8', '#76a9b7', '#b8d1ea', '#d9a441', '#dbe7f4']

    fig = plt.figure(figsize=FIGURE_SIZE_SPATIAL)
    ax = fig.add_subplot(111)
    bars = ax.bar(labels, values, color=colors, edgecolor=BLUE_DARK, linewidth=0.6)
    for bar in bars:
        bar.set_alpha(0.95)
    ax.set_ylabel('share of incidents')
    ax.set_ylim(0, 32)
    ax.grid(True, axis='y')
    ax.tick_params(axis='x', labelrotation=20)
    ax.text(0.01, 1.02, 'crime type distribution', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')

    out = outdir / 'chapter3_crime_type_distribution'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_weekday_heatmap(outdir: Path) -> Path:
    import matplotlib.pyplot as plt
    import numpy as np

    hours = np.arange(24)
    weekdays = np.array([0.90, 0.95, 1.00, 1.04, 1.10, 1.22, 1.16])
    hour_profile = (
        0.16
        + 0.28 * np.exp(-((hours - 8) / 2.5) ** 2)
        + 0.48 * np.exp(-((hours - 18.5) / 3.1) ** 2)
        + 0.20 * np.exp(-((hours - 23) / 1.8) ** 2)
    )
    matrix = np.outer(weekdays, hour_profile)
    matrix[5:, 17:24] *= 1.25
    matrix[4, 6:10] *= 1.10

    fig = plt.figure(figsize=FIGURE_SIZE_TEMPORAL)
    ax = fig.add_subplot(111)
    im = ax.imshow(matrix, origin='lower', aspect='auto', cmap='Blues', interpolation='nearest')
    ax.set_xticks([0, 6, 12, 18, 23])
    ax.set_xticklabels(['00', '06', '12', '18', '23'])
    ax.set_yticks(np.arange(7))
    ax.set_yticklabels(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    ax.set_xlabel('hour of day')
    ax.set_ylabel('day of week')
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label('relative intensity', color=SUBTLE)
    ax.text(0.01, 1.02, 'weekday-hour density', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='bottom')

    out = outdir / 'chapter3_weekday_hour_heatmap'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def build_preprocessing_flow(outdir: Path) -> Path:
    import matplotlib.patches as patches
    import matplotlib.pyplot as plt

    fig = plt.figure(figsize=(12.2, 4.8))
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

    steps = [
        ('raw crime data', 'source CSV and boundaries'),
        ('clean', 'dedupe and parse timestamps'),
        ('normalize', 'beat IDs and coordinates'),
        ('analyze', 'density and concentration metrics'),
        ('render', 'figures for the thesis'),
    ]
    xs = [0.03, 0.23, 0.43, 0.63, 0.83]
    widths = [0.15, 0.15, 0.15, 0.15, 0.14]

    for i, ((title, subtitle), x, w) in enumerate(zip(steps, xs, widths)):
        ax.add_patch(
            patches.FancyBboxPatch(
                (x, 0.30),
                w,
                0.40,
                boxstyle='round,pad=0.012,rounding_size=0.02',
                linewidth=1.0,
                edgecolor=GRID,
                facecolor='#fbfcfe',
            )
        )
        ax.text(x + w / 2, 0.56, title, ha='center', va='center', fontsize=10.5, fontweight='bold')
        ax.text(x + w / 2, 0.42, subtitle, ha='center', va='center', fontsize=8.7, color=SUBTLE, wrap=True)
        if i < len(xs) - 1:
            ax.add_patch(patches.FancyArrowPatch((x + w, 0.50), (xs[i + 1] - 0.01, 0.50), arrowstyle='-|>', mutation_scale=13, lw=1.0, color=SUBTLE))

    ax.text(0.03, 0.82, 'preprocessing pipeline', fontsize=11.5, color=SUBTLE, fontweight='bold')

    out = outdir / 'chapter3_preprocessing_flow'
    save_png(fig, out)
    plt.close(fig)
    return out.with_suffix('.png')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Generate Chapter 3 thesis figures.')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help=f'Output directory for generated figure files (default: {DEFAULT_OUTPUT_DIR})')
    parser.add_argument('--crime-csv', type=Path, default=DEFAULT_CRIME_CSV, help=f'Crime CSV used for year-based metrics (default: {DEFAULT_CRIME_CSV})')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    configure_matplotlib()
    ensure_dir(args.output_dir)
    community_geojson = Path(__file__).resolve().parents[1] / 'public' / 'data' / 'chicago-community-areas.geojson'

    generated = FigureSet(
        dataset_overview=build_dataset_overview(args.output_dir),
        temporal_density=build_temporal_density(args.output_dir),
        yearly_metrics=build_yearly_metrics(args.output_dir, args.crime_csv),
        yearly_crime_types=build_yearly_crime_types(args.output_dir, args.crime_csv),
        yearly_district_concentration=build_yearly_district_concentration(args.output_dir, args.crime_csv),
        yearly_monthly_seasonality=build_yearly_monthly_seasonality(args.output_dir, args.crime_csv),
        spatial_distribution=build_spatial_distribution(args.output_dir, args.crime_csv, community_geojson),
        district_map=build_district_map(args.output_dir),
        crime_types=build_crime_types(args.output_dir),
        weekday_heatmap=build_weekday_heatmap(args.output_dir),
        preprocessing_flow=build_preprocessing_flow(args.output_dir),
    )

    print(generated.dataset_overview)
    print(generated.temporal_density)
    print(generated.yearly_metrics)
    print(generated.yearly_crime_types)
    print(generated.yearly_district_concentration)
    print(generated.yearly_monthly_seasonality)
    print(generated.spatial_distribution)
    print(generated.district_map)
    print(generated.crime_types)
    print(generated.weekday_heatmap)
    print(generated.preprocessing_flow)


if __name__ == '__main__':
    main()
