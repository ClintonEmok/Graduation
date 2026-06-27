#!/usr/bin/env python3
"""Compare density-only, burstiness-only, and hybrid adaptive weights.

The script reads the showcase windows CSV, rebuilds the full hourly crime series
from the raw corpus in chunks, and then evaluates how the adaptive warp changes
as the burst influence moves from 0.0 (density only) to 1.0 (burstiness only).

Outputs a CSV plus thesis-ready figures that compare ranking stability, highlight
the windows picked by density vs burstiness, and show how the signals diverge.
It also derives a combined burstiness + CV metric so the experiment can compare
burstiness against within-window unevenness as a third signal.
CV is carried through as a companion readout so the same windows can be read as
burstiness + CV, not just burstiness + density.

Examples:
  python scripts/compare_density_burstiness_weights.py
  python scripts/compare_density_burstiness_weights.py --weights 0,0.25,0.5,0.75,1
"""

from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd


matplotlib.use('Agg')
import matplotlib.pyplot as plt


RAW_DATE_FORMAT = '%m/%d/%Y %I:%M:%S %p'
DEFAULT_CSV_PATH = Path('data/sources/Crimes_-_2001_to_Present_20260114.csv')
DEFAULT_WINDOWS_PATH = Path('scripts/output/showcase_windows.csv')
DEFAULT_OUTPUT_PATH = Path('scripts/output/density_burstiness_weight_sweep.csv')
DEFAULT_CROSSREF_PATH = Path('scripts/output/density_burstiness_cross_reference.csv')
DEFAULT_FIGURE_DIR = Path('scripts/output/density_burstiness_weight_sweep')
DEFAULT_ROLLING_METRICS_PATH = Path('scripts/output/spatial-burstiness-experiment/rolling_window_metrics.csv')
DEFAULT_CHUNKSIZE = 250_000
DEFAULT_KERNEL_WIDTH = 3
DEFAULT_ISOLATION_NEIGHBORS = 2
DEFAULT_CONTEXT_PADDING_DAYS = 14
DEFAULT_WEIGHTS = [0.0, 0.25, 0.5, 0.75, 1.0]


@dataclass(frozen=True)
class WindowRow:
    window_days: int
    rank: int
    start: str
    end: str
    cv: float
    peak_ratio: float
    total_events: int


@dataclass(frozen=True)
class RollingWindowRow:
    grid_size: int
    window_days: int
    step_days: int
    start: pd.Timestamp
    end: pd.Timestamp
    record_count: int
    temporal_b: float
    isolation_score: float = 0.0


def load_rolling_metrics(path: Path, grid_size: int = 32) -> pd.DataFrame:
    frame = pd.read_csv(path)
    frame = frame[frame['grid_size'] == grid_size].copy()
    frame['start'] = pd.to_datetime(frame['start'])
    frame['end'] = pd.to_datetime(frame['end'])
    frame = frame.sort_values('start').reset_index(drop=True)
    return frame


def select_isolated_rolling_window(frame: pd.DataFrame, neighbors: int = DEFAULT_ISOLATION_NEIGHBORS) -> tuple[pd.Series, pd.DataFrame, float]:
    if frame.empty:
        raise ValueError('Rolling metrics frame is empty')

    scores: list[float] = []
    for index in range(len(frame)):
        lo = max(0, index - neighbors)
        hi = min(len(frame), index + neighbors + 1)
        neighborhood = frame.iloc[lo:hi]['temporal_b'].to_numpy(dtype=float)
        current = float(frame.iloc[index]['temporal_b'])
        if len(neighborhood) <= 1:
            scores.append(current)
            continue
        surrounding = (float(neighborhood.sum()) - current) / (len(neighborhood) - 1)
        scores.append(current - surrounding)

    frame = frame.copy()
    frame['isolation_score'] = scores
    winner = frame.nlargest(1, 'isolation_score').iloc[0]
    winner_index = int(winner.name)
    lo = max(0, winner_index - neighbors)
    hi = min(len(frame), winner_index + neighbors + 1)
    neighborhood = frame.iloc[lo:hi].copy()
    return winner, neighborhood, float(winner['isolation_score'])


def parse_window_row(row: dict[str, str]) -> WindowRow:
    return WindowRow(
        window_days=int(row['window_days']),
        rank=int(row['rank']),
        start=row['start'],
        end=row['end'],
        cv=float(row['cv']),
        peak_ratio=float(row['peak_ratio']),
        total_events=int(row['total_events']),
    )


def build_hourly_series(csv_path: Path, chunksize: int = DEFAULT_CHUNKSIZE) -> pd.Series:
    """Read the full CSV in chunks and aggregate to hourly counts."""

    hour_counts: dict[pd.Timestamp, int] = {}
    min_ts: pd.Timestamp | None = None
    max_ts: pd.Timestamp | None = None

    for chunk in pd.read_csv(
        csv_path,
        usecols=['Date'],
        dtype={'Date': 'string'},
        chunksize=chunksize,
        na_values={'': None},
    ):
        parsed = pd.to_datetime(chunk['Date'], format=RAW_DATE_FORMAT, errors='coerce')
        parsed = parsed.dropna().dt.floor('h')
        if parsed.empty:
            continue

        counts = parsed.value_counts()
        for ts, count in counts.items():
            hour_counts[ts] = hour_counts.get(ts, 0) + int(count)

        local_min = parsed.min()
        local_max = parsed.max()
        min_ts = local_min if min_ts is None else min(min_ts, local_min)
        max_ts = local_max if max_ts is None else max(max_ts, local_max)

    if min_ts is None or max_ts is None:
        raise ValueError(f'No valid timestamps found in {csv_path}')

    index = pd.date_range(min_ts, max_ts, freq='1h')
    values = [hour_counts.get(ts, 0) for ts in index]
    return pd.Series(values, index=index)


def build_timestamps_from_hourly_counts(counts: np.ndarray, start_epoch_sec: int, hour_sec: int = 3600) -> np.ndarray:
    """Reconstruct event timestamps from hourly counts.

    Events are spread evenly inside each hour so the burst-weight experiment can
    operate on a stable timestamp sequence without loading every raw record.
    """

    timestamps: list[float] = []
    for hour_index, count in enumerate(counts):
        base = start_epoch_sec + hour_index * hour_sec
        if count <= 0:
            continue
        step = hour_sec / max(int(count), 1)
        for k in range(int(count)):
            timestamps.append(base + min(hour_sec - 1, (k + 0.5) * step))
    return np.asarray(timestamps, dtype=float)


def clamp_to_bin(index: int, bin_count: int) -> int:
    if index < 0:
        return 0
    if index >= bin_count:
        return bin_count - 1
    return index


def compute_adaptive_maps(
    timestamps: np.ndarray,
    domain: tuple[float, float],
    *,
    bin_count: int,
    kernel_width: int = DEFAULT_KERNEL_WIDTH,
    burst_influence: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Mirror the prototype's adaptive blending logic in a lightweight form."""

    t_start, t_end = domain
    safe_bin_count = max(1, int(bin_count))
    t_span = max(1.0, float(t_end - t_start))

    valid = np.asarray([t for t in timestamps if np.isfinite(t) and t_start <= t <= t_end], dtype=float)
    if valid.size == 0:
        zero = np.zeros(safe_bin_count, dtype=float)
        return zero, zero, np.linspace(t_start, t_end, safe_bin_count + 1), zero

    sorted_ts = np.sort(valid)
    count_map = np.zeros(safe_bin_count, dtype=float)
    density_input = np.zeros(safe_bin_count, dtype=float)

    for t in sorted_ts:
        norm = (t - t_start) / t_span
        idx = clamp_to_bin(int(math.floor(norm * safe_bin_count)), safe_bin_count)
        count_map[idx] += 1

    density_input[:] = count_map

    smoothed_density = density_input.copy()
    if kernel_width > 1:
        for i in range(safe_bin_count):
            start = max(0, i - kernel_width)
            end = min(safe_bin_count, i + kernel_width + 1)
            smoothed_density[i] = float(np.mean(density_input[start:end])) if end > start else 0.0

    max_density = max(float(np.max(smoothed_density)), 1.0)
    density_map = np.clip(smoothed_density / max_density, 0, 1)

    burst_counts = np.zeros(safe_bin_count, dtype=float)
    burst_sum = np.zeros(safe_bin_count, dtype=float)
    burst_sum_sq = np.zeros(safe_bin_count, dtype=float)
    if sorted_ts.size > 1:
        for i in range(1, sorted_ts.size):
            delta = sorted_ts[i] - sorted_ts[i - 1]
            if not np.isfinite(delta) or delta < 0:
                continue
            norm = (sorted_ts[i] - t_start) / t_span
            idx = clamp_to_bin(int(math.floor(norm * safe_bin_count)), safe_bin_count)
            burst_counts[idx] += 1
            burst_sum[idx] += delta
            burst_sum_sq[idx] += delta * delta

    burstiness_map = np.zeros(safe_bin_count, dtype=float)
    for i in range(safe_bin_count):
        count = burst_counts[i]
        if count <= 1:
            continue
        mean_gap = burst_sum[i] / count
        variance = max(0.0, burst_sum_sq[i] / count - mean_gap * mean_gap)
        sigma = math.sqrt(variance)
        denom = sigma + mean_gap
        burstiness = (sigma - mean_gap) / denom if denom > 0 else 0.0
        burstiness_map[i] = max(0.0, min(1.0, (burstiness + 1.0) / 2.0))

    safe_burst_influence = max(0.0, min(1.0, float(burst_influence)))
    weights = np.zeros(safe_bin_count, dtype=float)
    for i in range(safe_bin_count):
        blended = ((1 - safe_burst_influence) * density_map[i]) + (safe_burst_influence * burstiness_map[i])
        weights[i] = 1 + blended * 5

    total_weight = float(np.sum(weights)) if np.sum(weights) > 0 else float(safe_bin_count)
    adaptive_edges = np.zeros(safe_bin_count + 1, dtype=float)
    adaptive_edges[0] = t_start
    accumulated = 0.0
    for i in range(safe_bin_count):
        accumulated += weights[i]
        adaptive_edges[i + 1] = t_start + (accumulated / total_weight) * t_span

    return density_map, burstiness_map, adaptive_edges, count_map


def compute_share_metrics(adaptive_edges: np.ndarray, bin_count: int, counts: np.ndarray) -> dict[str, float]:
    linear_share = np.full(bin_count, 1.0 / max(bin_count, 1), dtype=float)
    adaptive_share = np.diff(adaptive_edges)
    adaptive_share = adaptive_share / max(np.sum(adaptive_share), 1e-9)
    share_ratio = adaptive_share / np.maximum(linear_share, 1e-12)

    counts = counts.astype(float)
    if counts.size > 1 and np.std(counts) > 0 and np.std(adaptive_share) > 0:
        count_share_corr = float(np.corrcoef(counts, adaptive_share)[0, 1])
    else:
        count_share_corr = 0.0

    sorted_share = np.sort(adaptive_share)
    n = sorted_share.size
    if n == 0 or np.sum(sorted_share) <= 0:
        gini = 0.0
    else:
        cumulative = np.arange(1, n + 1, dtype=float)
        gini = float((2 * np.sum(cumulative * sorted_share)) / (n * np.sum(sorted_share)) - (n + 1) / n)

    return {
        'peak_expansion_ratio': float(np.max(share_ratio)) if share_ratio.size else 0.0,
        'mean_expansion_ratio': float(np.mean(share_ratio)) if share_ratio.size else 0.0,
        'share_gini': gini,
        'count_share_corr': count_share_corr,
        'top_share': float(np.max(adaptive_share)) if adaptive_share.size else 0.0,
    }


def build_cross_reference_frame(rows: list[dict[str, str]]) -> pd.DataFrame:
    frame = pd.DataFrame(rows).copy()
    frame['burst_influence'] = frame['burst_influence'].astype(float)
    frame['peak_expansion_ratio'] = frame['peak_expansion_ratio'].astype(float)
    frame['count_share_corr'] = frame['count_share_corr'].astype(float)
    frame['share_gini'] = frame['share_gini'].astype(float)
    frame['density_peak'] = frame['density_peak'].astype(float)
    frame['burstiness_peak'] = frame['burstiness_peak'].astype(float)
    frame['window_label'] = frame['window_days'].astype(str) + 'd #' + frame['rank'].astype(str)

    extremes = frame[frame['burst_influence'].isin([0.0, 1.0])].copy()
    density = (
        extremes[extremes['burst_influence'] == 0.0]
        .sort_values(['peak_expansion_ratio', 'count_share_corr'], ascending=False)
        .rename(columns={
            'peak_expansion_ratio': 'density_peak_expansion_ratio',
            'count_share_corr': 'density_count_share_corr',
            'share_gini': 'density_share_gini',
            'top_share': 'density_top_share',
        })
    )
    burst = (
        extremes[extremes['burst_influence'] == 1.0]
        .sort_values(['peak_expansion_ratio', 'count_share_corr'], ascending=False)
        .rename(columns={
            'peak_expansion_ratio': 'burst_peak_expansion_ratio',
            'count_share_corr': 'burst_count_share_corr',
            'share_gini': 'burst_share_gini',
            'top_share': 'burst_top_share',
        })
    )

    key_cols = ['window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio', 'total_events', 'window_label']
    merged = density[
        key_cols
        + ['density_peak_expansion_ratio', 'density_count_share_corr', 'density_share_gini', 'density_top_share', 'density_peak', 'burstiness_peak']
    ].merge(
        burst[key_cols + ['burst_peak_expansion_ratio', 'burst_count_share_corr', 'burst_share_gini', 'burst_top_share']],
        on=key_cols,
        how='inner',
    )

    merged['density_rank'] = merged['density_peak_expansion_ratio'].rank(method='min', ascending=False).astype(int)
    merged['burst_rank'] = merged['burst_peak_expansion_ratio'].rank(method='min', ascending=False).astype(int)
    merged['rank_delta'] = (merged['density_rank'] - merged['burst_rank']).abs()
    merged['rank_delta_signed'] = merged['density_rank'] - merged['burst_rank']
    merged['rank_swap_ratio'] = merged['rank_delta'] / max(len(merged), 1)
    merged['density_vs_burst_gap'] = merged['density_peak_expansion_ratio'] - merged['burst_peak_expansion_ratio']

    cv_min = float(merged['cv'].min()) if len(merged) else 0.0
    cv_max = float(merged['cv'].max()) if len(merged) else 0.0
    burst_min = float(merged['burst_peak_expansion_ratio'].min()) if len(merged) else 0.0
    burst_max = float(merged['burst_peak_expansion_ratio'].max()) if len(merged) else 0.0

    def normalize(value: float, low: float, high: float) -> float:
        if not math.isfinite(value):
            return 0.0
        if high <= low:
            return 0.0
        return max(0.0, min(1.0, (value - low) / (high - low)))

    merged['cv_norm'] = merged['cv'].map(lambda value: normalize(float(value), cv_min, cv_max))
    merged['burst_strength_norm'] = merged['burst_peak_expansion_ratio'].map(
        lambda value: normalize(float(value), burst_min, burst_max)
    )
    merged['burst_cv_combo'] = 0.5 * merged['cv_norm'] + 0.5 * merged['burst_strength_norm']
    merged['burst_cv_rank'] = merged['burst_cv_combo'].rank(method='min', ascending=False).astype(int)

    return merged.sort_values(['rank_delta', 'density_rank', 'burst_rank'], ascending=[False, True, True]).reset_index(drop=True)


def plot_cross_reference_figure(crossref: pd.DataFrame, output_dir: Path, top_k: int = 5) -> None:
    density_top = crossref.nsmallest(top_k, 'density_rank').sort_values('density_peak_expansion_ratio', ascending=True)
    burst_top = crossref.nsmallest(top_k, 'burst_rank').sort_values('burst_peak_expansion_ratio', ascending=True)

    fig, axes = plt.subplots(1, 2, figsize=(13.2, 6.8), sharex=False)
    scheme_specs = [
        (axes[0], density_top, 'Density-only winners (weight 0.0)', 'density_peak_expansion_ratio', 'density_count_share_corr', '#0f766e'),
        (axes[1], burst_top, 'Burstiness-only winners (weight 1.0)', 'burst_peak_expansion_ratio', 'burst_count_share_corr', '#7c3aed'),
    ]

    for ax, subset, title, value_col, cross_col, color in scheme_specs:
        subset = subset.copy()
        y = np.arange(len(subset))
        values = subset[value_col].to_numpy(dtype=float)
        labels = subset['window_label'].tolist()
        bars = ax.barh(y, values, color=color, alpha=0.9, edgecolor='white', linewidth=0.5)
        ax.set_yticks(y)
        ax.set_yticklabels(labels)
        ax.set_title(title)
        ax.set_xlabel('Peak expansion ratio')
        ax.set_xlim(0, max(1.0, float(values.max()) * 1.22))
        for i, bar in enumerate(bars):
            window = subset.iloc[i]
            cross_value = float(window[cross_col])
            ax.text(
                float(bar.get_width()) + 0.03,
                bar.get_y() + bar.get_height() / 2,
                f"B={window['burstiness_peak']:.3f} | D={window['density_peak']:.3f} | {cross_value:.3f}",
                va='center',
                ha='left',
                fontsize=8,
                color='#334155',
            )
        ax.grid(axis='x', color='#e2e8f0', linewidth=0.8)
        ax.set_axisbelow(True)

    fig.suptitle('Windows selected by density vs burstiness', y=1.02, fontsize=14, fontweight='bold')
    fig.tight_layout()
    fig.savefig(output_dir / 'top_windows_cross_reference.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_rank_scatter(crossref: pd.DataFrame, output_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(7.2, 6.8))
    color_values = crossref['window_days'].astype(float)
    sc = ax.scatter(
        crossref['density_rank'],
        crossref['burst_rank'],
        c=color_values,
        cmap='viridis',
        s=70,
        edgecolor='white',
        linewidth=0.6,
        alpha=0.92,
    )
    max_rank = int(max(crossref['density_rank'].max(), crossref['burst_rank'].max()))
    ax.plot([1, max_rank], [1, max_rank], linestyle='--', color='#64748b', linewidth=1.4)
    for _, row in crossref.iterrows():
        if row['rank_delta'] >= max(3, max_rank // 4):
            ax.text(row['density_rank'] + 0.08, row['burst_rank'] + 0.08, row['window_label'], fontsize=8, color='#111827')
    ax.set_xlim(0.5, max_rank + 0.5)
    ax.set_ylim(0.5, max_rank + 0.5)
    ax.invert_xaxis()
    ax.invert_yaxis()
    ax.set_xlabel('Density rank (1 = strongest density expansion)')
    ax.set_ylabel('Burst rank (1 = strongest burst expansion)')
    ax.set_title('Ranking divergence: density vs burstiness')
    fig.colorbar(sc, ax=ax, label='Window length (days)')
    fig.tight_layout()
    fig.savefig(output_dir / 'density_vs_burst_rank_scatter.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_burstiness_cv_figure(crossref: pd.DataFrame, output_dir: Path, top_k: int = 6) -> None:
    top = crossref.nsmallest(top_k, 'burst_cv_rank').sort_values('burst_cv_combo', ascending=True)

    fig, axes = plt.subplots(1, 2, figsize=(13.2, 6.6))

    y = np.arange(len(top))
    bars = axes[0].barh(y, top['burst_cv_combo'], color='#0891b2', edgecolor='white', linewidth=0.5)
    axes[0].set_yticks(y)
    axes[0].set_yticklabels(top['window_label'])
    axes[0].set_xlabel('Combined score')
    axes[0].set_title('Top burstiness + CV windows')
    axes[0].set_xlim(0, max(1.0, float(top['burst_cv_combo'].max()) * 1.18))
    for i, bar in enumerate(bars):
        row = top.iloc[i]
        axes[0].text(
            float(bar.get_width()) + 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"CV={row['cv']:.3f} | burst={row['burst_strength_norm']:.3f}",
            va='center',
            ha='left',
            fontsize=8,
            color='#334155',
        )
    axes[0].grid(axis='x', color='#e2e8f0', linewidth=0.8)
    axes[0].set_axisbelow(True)

    sc = axes[1].scatter(
        crossref['cv_norm'],
        crossref['burst_strength_norm'],
        c=crossref['burst_cv_combo'],
        cmap='viridis',
        s=70,
        edgecolor='white',
        linewidth=0.6,
        alpha=0.92,
    )
    for _, row in top.iterrows():
        axes[1].text(row['cv_norm'] + 0.015, row['burst_strength_norm'] + 0.015, row['window_label'], fontsize=8, color='#111827')
    axes[1].set_xlabel('Normalized CV')
    axes[1].set_ylabel('Normalized burstiness strength')
    axes[1].set_title('Burstiness + CV combined metric')
    axes[1].set_xlim(-0.02, 1.02)
    axes[1].set_ylim(-0.02, 1.02)
    fig.colorbar(sc, ax=axes[1], label='Combined score')

    fig.tight_layout()
    fig.savefig(output_dir / 'burstiness_cv_combined_metric.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_cv_signal_scatter(crossref: pd.DataFrame, output_dir: Path) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(13.2, 6.2), sharex=True)
    series_specs = [
        (axes[0], 'density_peak_expansion_ratio', 'Density-only peak expansion', '#0f766e'),
        (axes[1], 'burst_peak_expansion_ratio', 'Burstiness-only peak expansion', '#7c3aed'),
    ]

    for ax, value_col, title, color in series_specs:
        sc = ax.scatter(
            crossref['cv'],
            crossref[value_col],
            c=crossref['window_days'].astype(float),
            cmap='viridis',
            s=78,
            edgecolor='white',
            linewidth=0.6,
            alpha=0.92,
        )
        top_cv = crossref.nlargest(5, 'cv')
        for _, row in top_cv.iterrows():
            ax.text(
                row['cv'] + 0.01,
                row[value_col] + 0.01,
                row['window_label'],
                fontsize=8,
                color='#334155',
            )
        ax.set_title(title)
        ax.set_xlabel('CV (hourly count unevenness)')
        ax.set_ylabel('Peak expansion ratio')
        ax.grid(axis='both', color='#e2e8f0', linewidth=0.8)
        ax.set_axisbelow(True)
        ax.set_xlim(left=0)
        ax.set_ylim(bottom=0)
        fig.colorbar(sc, ax=ax, label='Window length (days)')

    fig.suptitle('Burstiness + CV readout across showcase windows', y=1.02, fontsize=14, fontweight='bold')
    fig.tight_layout()
    fig.savefig(output_dir / 'cv_vs_burstiness_signal_scatter.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_summary_figure(rows: list[dict[str, str]], output_dir: Path) -> None:
    frame = pd.DataFrame(rows)
    frame['burst_influence'] = frame['burst_influence'].astype(float)
    frame['peak_expansion_ratio'] = frame['peak_expansion_ratio'].astype(float)
    frame['count_share_corr'] = frame['count_share_corr'].astype(float)
    frame['share_gini'] = frame['share_gini'].astype(float)
    frame['window_label'] = frame['window_days'].astype(str) + 'd #' + frame['rank'].astype(str)

    summary = frame.groupby('burst_influence', as_index=False).agg(
        mean_peak_expansion=('peak_expansion_ratio', 'mean'),
        min_peak_expansion=('peak_expansion_ratio', 'min'),
        max_peak_expansion=('peak_expansion_ratio', 'max'),
        mean_corr=('count_share_corr', 'mean'),
        mean_gini=('share_gini', 'mean'),
    )

    fig, ax1 = plt.subplots(figsize=(9, 5.2))
    ax1.plot(summary['burst_influence'], summary['mean_peak_expansion'], color='#7c3aed', marker='o', linewidth=2.4, label='Mean peak expansion')
    ax1.fill_between(
        summary['burst_influence'],
        summary['min_peak_expansion'],
        summary['max_peak_expansion'],
        color='#7c3aed',
        alpha=0.12,
        linewidth=0,
    )
    ax1.set_xlabel('Burst influence weight')
    ax1.set_ylabel('Peak expansion ratio', color='#7c3aed')
    ax1.tick_params(axis='y', labelcolor='#7c3aed')
    ax1.set_ylim(bottom=0)

    ax2 = ax1.twinx()
    ax2.plot(summary['burst_influence'], summary['mean_corr'], color='#0f766e', marker='s', linewidth=2.0, label='Mean count/share corr')
    ax2.plot(summary['burst_influence'], summary['mean_gini'], color='#c2410c', marker='^', linewidth=2.0, label='Mean share Gini')
    ax2.set_ylabel('Correlation / Gini', color='#334155')
    ax2.tick_params(axis='y', labelcolor='#334155')

    lines_1, labels_1 = ax1.get_legend_handles_labels()
    lines_2, labels_2 = ax2.get_legend_handles_labels()
    ax1.legend(lines_1 + lines_2, labels_1 + labels_2, loc='upper right', frameon=False)
    ax1.set_title('Density vs burstiness weight sweep')
    fig.tight_layout()
    fig.savefig(output_dir / 'weight_sweep_summary.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_heatmap_figure(rows: list[dict[str, str]], output_dir: Path) -> None:
    frame = pd.DataFrame(rows)
    frame['burst_influence'] = frame['burst_influence'].astype(float)
    frame['peak_expansion_ratio'] = frame['peak_expansion_ratio'].astype(float)
    frame['count_share_corr'] = frame['count_share_corr'].astype(float)
    frame['window_label'] = frame['window_days'].astype(str) + 'd #' + frame['rank'].astype(str)

    pivot_peak = frame.pivot(index='window_label', columns='burst_influence', values='peak_expansion_ratio')
    pivot_corr = frame.pivot(index='window_label', columns='burst_influence', values='count_share_corr')
    pivot_peak = pivot_peak.loc[sorted(pivot_peak.index, key=lambda label: (int(label.split('d #')[0]), int(label.split('#')[1])))]
    pivot_corr = pivot_corr.loc[pivot_peak.index]

    fig, axes = plt.subplots(1, 2, figsize=(11.5, max(6, 0.36 * len(pivot_peak.index))))
    for ax, pivot, title, cmap in [
        (axes[0], pivot_peak, 'Peak expansion ratio', 'magma'),
        (axes[1], pivot_corr, 'Count/share correlation', 'viridis'),
    ]:
        im = ax.imshow(pivot.to_numpy(), aspect='auto', cmap=cmap)
        ax.set_title(title)
        ax.set_xlabel('Burst influence weight')
        ax.set_xticks(range(len(pivot.columns)))
        ax.set_xticklabels([f'{value:.2f}' for value in pivot.columns], rotation=0)
        ax.set_yticks(range(len(pivot.index)))
        ax.set_yticklabels(pivot.index)
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

    fig.suptitle('Window-by-window burstiness vs density contrast', y=1.01)
    fig.tight_layout()
    fig.savefig(output_dir / 'window_weight_heatmaps.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_contrast_example(
    hourly: pd.Series,
    window: WindowRow,
    weights: list[float],
    output_dir: Path,
    kernel_width: int,
) -> None:
    segment = slice_window(hourly, window.start, window.end)
    counts = segment.to_numpy(dtype=float)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    bin_count = len(counts)
    domain = (0.0, float(bin_count * 3600))

    density_map, burstiness_map, _, count_map = compute_adaptive_maps(
        timestamps,
        domain,
        bin_count=bin_count,
        kernel_width=kernel_width,
        burst_influence=0.0,
    )

    model_rows = []
    for weight in weights:
        _, _, adaptive_edges, _ = compute_adaptive_maps(
            timestamps,
            domain,
            bin_count=bin_count,
            kernel_width=kernel_width,
            burst_influence=weight,
        )
        adaptive_share = np.diff(adaptive_edges)
        adaptive_share = adaptive_share / max(np.sum(adaptive_share), 1e-9)
        model_rows.append((weight, adaptive_share))

    fig = plt.figure(figsize=(13.5, 8.2))
    grid = fig.add_gridspec(2, 1, height_ratios=[1.1, 1], hspace=0.22)
    ax_top = fig.add_subplot(grid[0])
    ax_bottom = fig.add_subplot(grid[1])

    x = np.arange(bin_count)
    ax_top.bar(x, count_map, color='#cbd5e1', edgecolor='white', linewidth=0.2, label='Hourly counts')
    ax_top.plot(x, density_map * (count_map.max() if count_map.size else 1), color='#0f766e', linewidth=2.2, label='Normalized density')
    ax_top.plot(x, burstiness_map * (count_map.max() if count_map.size else 1), color='#7c3aed', linewidth=2.2, label='Normalized burstiness')
    ax_top.set_title(
        f"{window.window_days}d #{window.rank}: {window.start} -> {window.end} | CV={window.cv:.2f}, peak/mean={window.peak_ratio:.2f}"
    )
    ax_top.set_ylabel('Count / scaled signal')
    ax_top.legend(frameon=False, loc='upper right')

    colors = {0.0: '#334155', weights[len(weights) // 2]: '#c2410c', 1.0: '#7c3aed'}
    for weight, adaptive_share in model_rows:
        ax_bottom.plot(x, adaptive_share, linewidth=2.0, label=f'burst influence {weight:.2f}', color=colors.get(weight, None))

    ax_bottom.set_title('Visual-space share under different weights')
    ax_bottom.set_xlabel('Hourly bin')
    ax_bottom.set_ylabel('Share')
    ax_bottom.legend(frameon=False, loc='upper right')
    fig.tight_layout()
    fig.savefig(output_dir / 'contrast_example.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def plot_isolated_context_example(
    hourly: pd.Series,
    window: RollingWindowRow,
    neighborhood: pd.DataFrame,
    output_dir: Path,
    context_padding_days: int = DEFAULT_CONTEXT_PADDING_DAYS,
) -> None:
    context_start = window.start - pd.Timedelta(days=context_padding_days)
    context_end = window.end + pd.Timedelta(days=context_padding_days)
    context = hourly[(hourly.index >= context_start) & (hourly.index < context_end)]
    if context.empty:
        return

    selected = hourly[(hourly.index >= window.start) & (hourly.index < window.end)]
    if selected.empty:
        return

    fig, (ax_counts, ax_burst) = plt.subplots(2, 1, figsize=(13.5, 7.8), gridspec_kw={'height_ratios': [1.15, 0.85]})

    x = np.arange(len(context))
    counts = context.to_numpy(dtype=float)
    ax_counts.bar(x, counts, color='#cbd5e1', edgecolor='white', linewidth=0.18)

    selected_start_idx = int((window.start - context.index[0]) / pd.Timedelta(hours=1))
    selected_end_idx = int((window.end - context.index[0]) / pd.Timedelta(hours=1))
    ax_counts.axvspan(selected_start_idx, selected_end_idx, color='#dc2626', alpha=0.22, label='Selected burst window')
    ax_counts.set_title(
        f"Isolated burst context: {window.start.date()} -> {window.end.date()} | temporal B={window.temporal_b:.3f} | isolation={window.isolation_score:.3f}"
    )
    ax_counts.set_ylabel('Hourly count')
    ax_counts.legend(frameon=False, loc='upper right')
    ax_counts.grid(axis='y', color='#e2e8f0', linewidth=0.8)
    ax_counts.set_axisbelow(True)

    ax_burst.plot(neighborhood['start'], neighborhood['temporal_b'], color='#7c3aed', marker='o', linewidth=2.2)
    ax_burst.axvline(window.start, color='#dc2626', linestyle='--', linewidth=1.6)
    ax_burst.scatter([window.start], [window.temporal_b], s=70, color='#dc2626', zorder=3)
    ax_burst.set_title('Local burstiness neighborhood (rolling 14-day windows)')
    ax_burst.set_xlabel('Window start')
    ax_burst.set_ylabel('Temporal B')
    ax_burst.grid(axis='y', color='#e2e8f0', linewidth=0.8)
    ax_burst.set_axisbelow(True)

    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(output_dir / 'isolated_burst_context.png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def parse_weights(raw: str) -> list[float]:
    weights: list[float] = []
    for part in raw.split(','):
        value = part.strip()
        if not value:
            continue
        weights.append(float(value))
    if not weights:
        raise argparse.ArgumentTypeError('At least one weight is required')
    return weights


def slice_window(hourly: pd.Series, start: str, end: str) -> pd.Series:
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    segment = hourly[(hourly.index >= start_ts) & (hourly.index < end_ts)]
    if segment.empty or float(segment.sum()) <= 0:
        raise ValueError(f'No events found in window {start} -> {end}')
    return segment


def main() -> None:
    parser = argparse.ArgumentParser(description='Compare density-only vs burstiness-only adaptive weights.')
    parser.add_argument('--csv-path', type=Path, default=DEFAULT_CSV_PATH, help=f'Input CSV (default: {DEFAULT_CSV_PATH})')
    parser.add_argument('--windows-path', type=Path, default=DEFAULT_WINDOWS_PATH, help=f'Window shortlist CSV (default: {DEFAULT_WINDOWS_PATH})')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT_PATH, help=f'Output CSV (default: {DEFAULT_OUTPUT_PATH})')
    parser.add_argument('--crossref-output', type=Path, default=DEFAULT_CROSSREF_PATH, help=f'Cross-reference CSV (default: {DEFAULT_CROSSREF_PATH})')
    parser.add_argument('--figure-dir', type=Path, default=DEFAULT_FIGURE_DIR, help=f'Output figure directory (default: {DEFAULT_FIGURE_DIR})')
    parser.add_argument('--rolling-metrics', type=Path, default=DEFAULT_ROLLING_METRICS_PATH, help=f'Rolling metrics CSV (default: {DEFAULT_ROLLING_METRICS_PATH})')
    parser.add_argument('--isolation-neighbors', type=int, default=DEFAULT_ISOLATION_NEIGHBORS, help=f'Neighbors on each side when scoring isolation (default: {DEFAULT_ISOLATION_NEIGHBORS})')
    parser.add_argument('--context-padding-days', type=int, default=DEFAULT_CONTEXT_PADDING_DAYS, help=f'Padding around the burst window for the context figure (default: {DEFAULT_CONTEXT_PADDING_DAYS})')
    parser.add_argument('--weights', type=parse_weights, default=DEFAULT_WEIGHTS, help='Comma-separated burst influence weights, e.g. 0,0.25,0.5,0.75,1')
    parser.add_argument('--kernel-width', type=int, default=DEFAULT_KERNEL_WIDTH, help=f'Smoothing kernel width (default: {DEFAULT_KERNEL_WIDTH})')
    args = parser.parse_args()

    with args.windows_path.open(newline='') as f:
        windows = [parse_window_row(row) for row in csv.DictReader(f)]

    hourly = build_hourly_series(args.csv_path)

    rows: list[dict[str, str]] = []
    print(f'Loaded {len(windows)} showcase windows from {args.windows_path}')
    print(f'Built hourly series with {len(hourly)} bins from {args.csv_path}')
    print('')

    for window in windows:
        segment = slice_window(hourly, window.start, window.end)
        counts = segment.to_numpy(dtype=float)
        timestamps = build_timestamps_from_hourly_counts(counts, 0)
        bin_count = len(counts)
        domain = (0.0, float(bin_count * 3600))

        for weight in args.weights:
            density_map, burstiness_map, adaptive_edges, count_map = compute_adaptive_maps(
                timestamps,
                domain,
                bin_count=bin_count,
                kernel_width=args.kernel_width,
                burst_influence=weight,
            )
            metrics = compute_share_metrics(adaptive_edges, bin_count, count_map)
            rows.append({
                'window_days': str(window.window_days),
                'rank': str(window.rank),
                'start': window.start,
                'end': window.end,
                'cv': f'{window.cv:.3f}',
                'peak_ratio': f'{window.peak_ratio:.3f}',
                'total_events': str(window.total_events),
                'burst_influence': f'{weight:.3f}',
                'density_peak': f'{float(np.max(density_map)):.3f}',
                'burstiness_peak': f'{float(np.max(burstiness_map)):.3f}',
                'peak_expansion_ratio': f'{metrics["peak_expansion_ratio"]:.3f}',
                'mean_expansion_ratio': f'{metrics["mean_expansion_ratio"]:.3f}',
                'share_gini': f'{metrics["share_gini"]:.3f}',
                'count_share_corr': f'{metrics["count_share_corr"]:.3f}',
                'top_share': f'{metrics["top_share"]:.6f}',
            })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        'window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio', 'total_events',
        'burst_influence', 'density_peak', 'burstiness_peak', 'peak_expansion_ratio',
        'mean_expansion_ratio', 'share_gini', 'count_share_corr', 'top_share',
    ]
    with args.output.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    args.figure_dir.mkdir(parents=True, exist_ok=True)
    plot_summary_figure(rows, args.figure_dir)
    plot_heatmap_figure(rows, args.figure_dir)

    crossref = build_cross_reference_frame(rows)
    numeric_columns = [
        'window_days', 'rank', 'cv', 'peak_ratio', 'total_events',
        'density_rank', 'burst_rank', 'rank_delta', 'rank_delta_signed', 'rank_swap_ratio',
        'density_peak_expansion_ratio', 'burst_peak_expansion_ratio',
        'density_count_share_corr', 'burst_count_share_corr',
        'density_share_gini', 'burst_share_gini',
        'density_top_share', 'burst_top_share',
        'density_peak', 'burstiness_peak', 'density_vs_burst_gap',
        'cv_norm', 'burst_strength_norm', 'burst_cv_combo', 'burst_cv_rank',
    ]
    for column in numeric_columns:
        if column in crossref.columns:
            crossref[column] = pd.to_numeric(crossref[column], errors='coerce')
    crossref_output = args.crossref_output
    crossref_output.parent.mkdir(parents=True, exist_ok=True)
    crossref_columns = [
        'window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio', 'total_events', 'window_label',
        'density_rank', 'burst_rank', 'rank_delta', 'rank_delta_signed', 'rank_swap_ratio',
        'density_peak_expansion_ratio', 'burst_peak_expansion_ratio',
        'density_count_share_corr', 'burst_count_share_corr',
        'density_share_gini', 'burst_share_gini',
        'density_top_share', 'burst_top_share',
        'density_peak', 'burstiness_peak', 'density_vs_burst_gap',
        'cv_norm', 'burst_strength_norm', 'burst_cv_combo', 'burst_cv_rank',
    ]
    crossref.to_csv(crossref_output, index=False, columns=[c for c in crossref_columns if c in crossref.columns])
    plot_cross_reference_figure(crossref, args.figure_dir)
    plot_rank_scatter(crossref, args.figure_dir)
    plot_cv_signal_scatter(crossref, args.figure_dir)
    plot_burstiness_cv_figure(crossref, args.figure_dir)

    if args.rolling_metrics.exists():
        rolling_frame = load_rolling_metrics(args.rolling_metrics, grid_size=32)
        if not rolling_frame.empty:
            winner_row, neighborhood, isolation_score = select_isolated_rolling_window(rolling_frame, neighbors=args.isolation_neighbors)
            isolated_window = RollingWindowRow(
                grid_size=int(winner_row['grid_size']),
                window_days=int(winner_row['window_days']),
                step_days=int(winner_row['step_days']),
                start=pd.Timestamp(winner_row['start']),
                end=pd.Timestamp(winner_row['end']),
                record_count=int(winner_row['record_count']),
                temporal_b=float(winner_row['temporal_b']),
                isolation_score=isolation_score,
            )
            plot_isolated_context_example(hourly, isolated_window, neighborhood, args.figure_dir, args.context_padding_days)

    # Pick the most contrasting window between density-only and burst-only.
    row_frame = pd.DataFrame(rows)
    row_frame['burst_influence'] = row_frame['burst_influence'].astype(float)
    row_frame['peak_expansion_ratio'] = row_frame['peak_expansion_ratio'].astype(float)
    contrast = row_frame.pivot(index=['window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio'], columns='burst_influence', values='peak_expansion_ratio').reset_index()
    if 0.0 in contrast.columns and 1.0 in contrast.columns:
        contrast['delta'] = (contrast[1.0] - contrast[0.0]).abs()
        winner = contrast.sort_values('delta', ascending=False).iloc[0]
        example_window = WindowRow(
            window_days=int(winner['window_days']),
            rank=int(winner['rank']),
            start=str(winner['start']),
            end=str(winner['end']),
            cv=float(winner['cv']),
            peak_ratio=float(winner['peak_ratio']),
            total_events=0,
        )
        plot_contrast_example(hourly, example_window, [0.0, 0.5, 1.0], args.figure_dir, args.kernel_width)

    print(f'Wrote weight-sweep results to {args.output}')
    print(f'Wrote cross-reference results to {crossref_output}')
    print(f'Wrote figures to {args.figure_dir}')
    print('')

    density_winner = crossref.nsmallest(1, 'density_rank').iloc[0]
    burst_winner = crossref.nsmallest(1, 'burst_rank').iloc[0]
    print('Density-only winner:')
    print(
        f"  {density_winner['window_label']} | density score={density_winner['density_peak_expansion_ratio']:.3f} | "
        f"burst score={density_winner['burst_peak_expansion_ratio']:.3f} | rank delta={int(density_winner['rank_delta'])}"
    )
    print('Burstiness-only winner:')
    print(
        f"  {burst_winner['window_label']} | burst score={burst_winner['burst_peak_expansion_ratio']:.3f} | "
        f"density score={burst_winner['density_peak_expansion_ratio']:.3f} | rank delta={int(burst_winner['rank_delta'])}"
    )
    print('')

    print('CV-heavy windows:')
    for _, row in crossref.nlargest(3, 'cv').iterrows():
        print(
            f"  {row['window_label']} | CV={row['cv']:.3f} | density={row['density_peak_expansion_ratio']:.3f} | "
            f"burst={row['burst_peak_expansion_ratio']:.3f}"
        )
    print('')

    print('Burstiness + CV combined windows:')
    for _, row in crossref.nsmallest(3, 'burst_cv_rank').iterrows():
        print(
            f"  {row['window_label']} | combo={row['burst_cv_combo']:.3f} | CV={row['cv']:.3f} | "
            f"burst_norm={row['burst_strength_norm']:.3f}"
        )
    print('')

    for weight in args.weights:
        subset = [row for row in rows if float(row['burst_influence']) == float(weight)]
        ranked = sorted(subset, key=lambda row: (float(row['peak_expansion_ratio']), float(row['count_share_corr'])), reverse=True)
        print(f'Weight {weight:.2f}:')
        for row in ranked[:3]:
            print(
                f"  {row['window_days']:>2}d #{row['rank']}: {row['start']} -> {row['end']} | "
                f"peak_expansion={row['peak_expansion_ratio']} | gini={row['share_gini']} | corr={row['count_share_corr']}"
            )
        print('')


if __name__ == '__main__':
    main()
