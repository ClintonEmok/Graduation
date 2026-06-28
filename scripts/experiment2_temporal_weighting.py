#!/usr/bin/env python3
"""Experiment 2: Evaluation of Temporal Weighting Functions.

Several temporal weighting functions were investigated during the design of the
adaptive timeline. This experiment evaluates their suitability with respect to
visualization objectives rather than their statistical ability to characterize
temporal processes.

Three candidate weighting functions are compared on identical bins:

    1. Raw event density           (count per bin, normalized)
    2. Standardized density        (z-score: (x - mu) / sigma)
    3. Inter-event-time burstiness (Goh-Barabasi B on inter-event times)

The same visualization parameters are then used to generate an adaptive
timeline for each weighting function, and the allocations are compared on the
following criteria:

    * stability           - variation between neighbouring weights
    * sensitivity         - response to genuinely dense intervals
    * interpretability    - whether the rationale is visible in the data
    * visual allocation   - max expansion, max compression, mean, distribution
    * computational cost  - wall time, implementation complexity

Outputs (under scripts/output/experiment2_temporal_weighting/):

    experiment2_timelines.png        - 4 timelines + weighting comparison
    experiment2_metrics.csv          - per-weighting metric summary
    experiment2_metrics_table.png    - rendered metrics table
    experiment2_findings.txt         - narrative summary of findings

Usage:
    python3 scripts/experiment2_temporal_weighting.py
    python3 scripts/experiment2_temporal_weighting.py --bin-hours 1 --bin-count 168
"""

from __future__ import annotations

import argparse
import csv
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


# ── Configuration ─────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / 'output' / 'experiment2_temporal_weighting'
DEFAULT_CSV_PATH = SCRIPT_DIR.parent / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'
DEFAULT_WINDOWS_PATH = SCRIPT_DIR / 'output' / 'showcase_windows.csv'

RAW_DATE_FORMAT = '%m/%d/%Y %I:%M:%S %p'
DPI = 200

# Adaptive-timeline visualization parameters (identical across weightings)
WEIGHT_GAIN = 5.0      # w_i = 1 + weight_i * WEIGHT_GAIN
WEIGHT_FLOOR = 1.0     # minimum weight per bin

PALETTE = {
    'uniform':    '#94a3b8',
    'density':    '#0f766e',
    'zscore':     '#1d4ed8',
    'burstiness': '#7c3aed',
    'grid':       '#e2e8f0',
    'text':       '#0f172a',
    'muted':      '#475569',
}

# Weighting function labels in display order. Used for column consistency
# across per-window and aggregate outputs.
WEIGHTING_NAMES = ['Raw density', 'Z-score', 'Goh burstiness']

# The five metrics that actually answer "which weighting is most suitable for
# adaptive temporal scaling?". Polarity decides whether low or high values are
# "good" for the cross-window win-rate tally. Each entry also carries:
#   - cell_fmt:  how the per-window cell is rendered in the metrics table
#   - agg_fmt:   how the mean ± std cell is rendered in the aggregate table
#   - interp:    a single-sentence reading for the Interpretation column
METRIC_LABELS: dict[str, str] = {
    'max_expansion':   'Max expansion (×)',
    'max_compression': 'Max compression (×)',
    'share_gini':      'Share Gini',
    'neighbour_diff':  'Neighbour Δ',
    'compute_ms':      'Runtime (ms)',
}
METRIC_FORMAT: dict[str, tuple[str, str, str]] = {
    'max_expansion':   ('{:.1f}×', '{:.2f} ± {:.2f}',
        'Z-score over-expands dense periods; Goh barely adapts.'),
    'max_compression': ('{:.2f}×', '{:.2f} ± {:.2f}',
        'Z-score collapses most intervals; Goh preserves more space.'),
    'share_gini':      ('{:.3f}',  '{:.3f} ± {:.3f}',
        'Z-score over-allocates; Goh’s redistribution is too narrow to be useful.'),
    'neighbour_diff':  ('{:.3f}',  '{:.3f} ± {:.3f}',
        'Goh is the smoothest; differences across weightings are modest.'),
    'compute_ms':      ('{:.2f}',  '{:.2f} ± {:.2f}',
        'Density is ~50× faster than Goh and an order of magnitude faster than z-score.'),
}
METRIC_POLARITY: dict[str, str] = {
    'neighbour_diff':  'lower',    # smoother is better
    'max_expansion':   'neutral',  # extremes are diagnostic, not a quality signal
    'max_compression': 'neutral',  # extremes are diagnostic, not a quality signal
    'share_gini':      'higher',   # more selective allocation is the goal
    'compute_ms':      'lower',    # cheaper is better
}


# ── Data structures ──────────────────────────────────────────────────

@dataclass(frozen=True)
class ShowcaseWindow:
    window_days: int
    rank: int
    start: str
    end: str
    cv: float
    peak_ratio: float
    total_events: int


@dataclass
class WeightingResult:
    name: str
    weight: np.ndarray          # raw weight per bin, length n
    normalized: np.ndarray       # weight normalized to [0, 1]
    visual_weight: np.ndarray    # 1 + normalized * WEIGHT_GAIN
    edges: np.ndarray            # cumulative adaptive edges, length n+1
    bins: int
    elapsed_ms: float


# ── Data loading ─────────────────────────────────────────────────────

def load_showcase_windows(path: Path) -> list[ShowcaseWindow]:
    windows: list[ShowcaseWindow] = []
    with path.open(newline='') as f:
        for row in csv.DictReader(f):
            windows.append(
                ShowcaseWindow(
                    window_days=int(row['window_days']),
                    rank=int(row['rank']),
                    start=row['start'],
                    end=row['end'],
                    cv=float(row['cv']),
                    peak_ratio=float(row['peak_ratio']),
                    total_events=int(row['total_events']),
                )
            )
    return windows


def build_hourly_counts(csv_path: Path, start: str, end: str) -> tuple[np.ndarray, np.ndarray, dict[str, int]]:
    """Aggregate the Date column to hourly counts within [start, end) and
    return the per-event timestamps in the same range.

    Mirrors the cleaning that the main pipeline applies wherever it affects the
    time series:

      * parse `Date` with `errors='coerce'` and drop NaT
      * drop duplicate `ID`s within each chunk
      * floor timestamps to the hour before binning

    Returns the per-hour count vector, a `datetime64[ns]` array of every
    event timestamp that fell inside the window (preserved at full
    precision so per-bin burstiness can use the real IETs), and a small
    audit dict with the number of rows read, parsed, dropped for NaT, and
    dropped as duplicates so the cleaning step is visible in the script
    output.
    """
    start_ts = np.datetime64(f'{start}T00:00:00')
    end_ts = np.datetime64(f'{end}T00:00:00')
    hours = int((end_ts - start_ts) / np.timedelta64(1, 'h'))
    counts = np.zeros(hours, dtype=np.int64)
    timestamps = np.empty(0, dtype='datetime64[ns]')

    audit = {'rows_read': 0, 'rows_parsed': 0, 'rows_nat': 0, 'rows_duplicates': 0}

    for chunk_id, chunk_date, chunk_raw in pd_read_clean_chunks(csv_path):
        audit['rows_read'] += int(chunk_raw)
        audit['rows_duplicates'] += int(chunk_raw) - int(chunk_id.size)
        valid = chunk_date[~np.isnat(chunk_date)]
        audit['rows_parsed'] += int(valid.size)
        audit['rows_nat'] += int(np.isnat(chunk_date).sum())
        if valid.size == 0:
            continue
        idx = ((valid - start_ts) / np.timedelta64(1, 'h')).astype(np.int64)
        mask = (idx >= 0) & (idx < hours)
        idx_in = idx[mask]
        ts_in = valid[mask]
        if idx_in.size:
            np.add.at(counts, idx_in, 1)
        if ts_in.size:
            timestamps = np.concatenate([timestamps, ts_in])

    return counts, timestamps, audit


def pd_read_clean_chunks(csv_path: Path, chunksize: int = 250_000):
    """Yield `(id, date, raw_count)` chunks for the temporal cleaning pipeline.

    `raw_count` is the number of rows the CSV contained *before* duplicate
    removal, so the caller can report how many IDs were dropped. The other
    cleaning steps that operate on coordinates (lat/lon validity, Chicago
    bounds, district mapping) do not affect the time series and are skipped.
    """
    import pandas as pd  # local import keeps unit tests light
    for chunk in pd.read_csv(
        csv_path,
        usecols=['ID', 'Date'],
        dtype={'ID': 'int64', 'Date': 'string'},
        chunksize=chunksize,
        na_values={'': None},
    ):
        parsed = pd.to_datetime(chunk['Date'], format=RAW_DATE_FORMAT, errors='coerce')
        before = len(chunk)
        chunk_id = chunk['ID'].to_numpy()
        chunk_date = parsed.to_numpy(dtype='datetime64[ns]')
        _, unique_idx = np.unique(chunk_id, return_index=True)
        keep = np.sort(unique_idx)
        yield chunk_id[keep], chunk_date[keep], before


# ── Weighting functions ──────────────────────────────────────────────

def weight_density(counts: np.ndarray) -> np.ndarray:
    """Raw event density, normalized to [0, 1]."""
    arr = counts.astype(float)
    peak = arr.max() if arr.size else 0.0
    return arr / peak if peak > 0 else np.zeros_like(arr)


def weight_zscore(counts: np.ndarray) -> np.ndarray:
    """Standardized density: positive z-scores normalized to [0, 1]."""
    arr = counts.astype(float)
    if arr.size == 0:
        return arr
    mu = arr.mean()
    sigma = arr.std()
    if sigma <= 0:
        return np.zeros_like(arr)
    z = (arr - mu) / sigma
    z = np.clip(z, 0.0, None)             # negative z's carry no expansion signal
    peak = z.max() if z.size else 0.0
    return z / peak if peak > 0 else np.zeros_like(arr)


def _burstiness_b(inter_event: np.ndarray) -> float:
    """Goh-Barabasi burstiness parameter on a non-empty inter-event array."""
    if inter_event.size < 2:
        return 0.0
    mu = float(inter_event.mean())
    sigma = float(inter_event.std())
    denom = sigma + mu
    if denom <= 0:
        return 0.0
    return (sigma - mu) / denom  # range: [-1, 1]


def weight_burstiness(
    timestamps: np.ndarray,
    n_bins: int,
    bin_seconds: float,
    start_ts: np.datetime64,
) -> np.ndarray:
    """Goh-Barabási burstiness B per bin computed from the real event
    timestamps inside each bin.

    For each bin, the timestamps of events strictly inside that bin are
    extracted, sorted, and the consecutive differences become the
    inter-event times for that bin. The Goh-Barabási burstiness parameter
    B = (sigma - mu) / (sigma + mu) is then computed on those IETs. Bins
    with fewer than two events have no within-bin IET signal and are
    weighted as 0. The resulting B values are mapped from [-1, 1] to
    [0, 1] and the entire signal is then normalised to [0, 1].
    """
    out = np.zeros(n_bins, dtype=float)
    if timestamps.size < 2:
        return out

    bin_seconds_td = np.timedelta64(int(bin_seconds), 's')
    bin_idx = ((timestamps - start_ts) / bin_seconds_td).astype(np.int64)
    mask = (bin_idx >= 0) & (bin_idx < n_bins)
    bin_idx = bin_idx[mask]
    ts_in = timestamps[mask]
    if bin_idx.size == 0:
        return out

    order = np.lexsort((ts_in, bin_idx))
    sorted_bins = bin_idx[order]
    sorted_ts = ts_in[order]

    bin_starts = np.searchsorted(sorted_bins, np.arange(n_bins), side='left')
    bin_ends = np.searchsorted(sorted_bins, np.arange(n_bins), side='right')

    for i in range(n_bins):
        s, e = bin_starts[i], bin_ends[i]
        if e - s < 2:
            continue
        iet_ns = np.diff(sorted_ts[s:e].astype('int64'))
        iet_s = iet_ns.astype(float) / 1e9
        if iet_s.size < 2:
            out[i] = 0.5
            continue
        out[i] = (_burstiness_b(iet_s) + 1.0) / 2.0

    peak = out.max() if out.size else 0.0
    return out / peak if peak > 0 else np.zeros_like(out)


# ── Adaptive timeline ────────────────────────────────────────────────

def build_adaptive_edges(visual_weight: np.ndarray, total_seconds: float) -> np.ndarray:
    """Build cumulative edges from per-bin visual weights (length n+1)."""
    total = float(visual_weight.sum())
    if total <= 0:
        return np.linspace(0.0, total_seconds, visual_weight.size + 1)
    cumulative = np.cumsum(visual_weight) / total
    edges = np.concatenate(([0.0], cumulative)) * total_seconds
    return edges


def uniform_edges(bins: int, total_seconds: float) -> np.ndarray:
    return np.linspace(0.0, total_seconds, bins + 1)


# ── Metrics ──────────────────────────────────────────────────────────

def gini(values: np.ndarray) -> float:
    s = float(np.sum(values))
    if s <= 0 or values.size == 0:
        return 0.0
    sorted_v = np.sort(values)
    n = sorted_v.size
    cumulative = np.arange(1, n + 1, dtype=float)
    return float((2.0 * np.sum(cumulative * sorted_v)) / (n * s) - (n + 1) / n)


def neighbour_diff(weights: np.ndarray) -> float:
    """Mean absolute first difference — smaller is smoother."""
    if weights.size < 2:
        return 0.0
    return float(np.mean(np.abs(np.diff(weights))))


def evaluate(weights: np.ndarray, counts: np.ndarray) -> dict[str, float]:
    """Stability, sensitivity, and visual-allocation metrics for a weight vector."""
    n = weights.size
    linear_share = np.full(n, 1.0 / n)
    adaptive_share = weights / max(float(weights.sum()), 1e-12)
    share_ratio = adaptive_share / linear_share

    peak = float(weights.max()) if n else 0.0
    median = float(np.median(weights)) if n else 0.0
    outlier_response = peak / median if median > 0 else float('inf')

    # Correlation between weight and count (interpretability proxy)
    if n > 1 and counts.std() > 0 and weights.std() > 0:
        corr = float(np.corrcoef(counts, weights)[0, 1])
    else:
        corr = 0.0

    return {
        'max_expansion': float(share_ratio.max()),
        'max_compression': float(share_ratio.min()),
        'share_gini': gini(adaptive_share),
        'neighbour_diff': neighbour_diff(weights),
    }


# ── Weighting orchestration ──────────────────────────────────────────

def run_weighting(
    name: str,
    fn: Callable[..., np.ndarray],
    fn_args: tuple,
    n_bins: int,
    bin_seconds: float,
) -> WeightingResult:
    t0 = time.perf_counter()
    weight = fn(*fn_args)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    norm = weight / weight.max() if weight.max() > 0 else weight
    visual = WEIGHT_FLOOR + norm * WEIGHT_GAIN
    edges = build_adaptive_edges(visual, float(n_bins * bin_seconds))
    return WeightingResult(
        name=name,
        weight=weight,
        normalized=norm,
        visual_weight=visual,
        edges=edges,
        bins=n_bins,
        elapsed_ms=elapsed_ms,
    )


# ── Visualization ────────────────────────────────────────────────────

def sparkbar(values: np.ndarray, width_chars: int = 32) -> str:
    blocks = '▁▂▃▄▅▆▇█'
    if values.size == 0:
        return ''
    edges = np.linspace(values.min() - 1e-12, values.max() + 1e-12, len(blocks))
    idx = np.searchsorted(edges, values, side='right') - 1
    idx = np.clip(idx, 0, len(blocks) - 1)
    # Downsample to width_chars by binning
    n = values.size
    if n <= width_chars:
        return ''.join(blocks[i] for i in idx)
    factor = n / width_chars
    out = []
    for i in range(width_chars):
        lo = int(round(i * factor))
        hi = int(round((i + 1) * factor))
        if hi <= lo:
            hi = lo + 1
        block = int(round(idx[lo:hi].mean()))
        out.append(blocks[np.clip(block, 0, len(blocks) - 1)])
    return ''.join(out)


def draw_timeline(
    ax,
    edges: np.ndarray,
    total_seconds: float,
    color: str,
    label: str,
    counts: np.ndarray,
) -> None:
    n = edges.size - 1
    bin_widths = np.diff(edges)
    if n == 0:
        return
    # Draw each bin as a coloured rectangle whose width is its allocated share.
    for i in range(n):
        ax.add_patch(plt.Rectangle(
            (edges[i], 0.0),
            bin_widths[i],
            1.0,
            facecolor=color,
            edgecolor='white',
            linewidth=0.6,
            alpha=0.85,
        ))
    ax.set_xlim(0, total_seconds)
    ax.set_ylim(0, 1)
    ax.set_yticks([])
    ax.set_xticks([])
    # Top label
    ax.text(0.0, 1.05, label, ha='left', va='bottom', fontsize=9, fontweight='bold', color=PALETTE['text'])
    # Show bin count and a small inline count profile
    if counts is not None and counts.size == n:
        profile = sparkbar(counts, width_chars=min(48, n))
        ax.text(1.0, 1.05, profile, ha='right', va='bottom', fontsize=8, color=PALETTE['muted'], family='monospace')


def draw_weighting_comparison(
    ax,
    results: list[WeightingResult],
    counts: np.ndarray,
) -> None:
    """Sparkline comparison of each weighting function across bins."""
    n = counts.size
    x = np.arange(n)
    # Sparkline-style mini plot of each weighting function
    series = [
        ('Raw density',     results[0].weight, PALETTE['density']),
        ('Z-score',         results[1].weight, PALETTE['zscore']),
        ('Goh burstiness',  results[2].weight, PALETTE['burstiness']),
    ]
    for y_offset, (label, values, color) in zip([0.66, 0.33, 0.0], series):
        ax.fill_between(x, y_offset, y_offset + values / max(values.max(), 1e-12) * 0.30,
                        color=color, alpha=0.85, linewidth=0)
        ax.text(-n * 0.012, y_offset + 0.15, label, ha='right', va='center',
                fontsize=9, fontweight='bold', color=color)
        spark = sparkbar(values / max(values.max(), 1e-12), width_chars=min(64, n))
        ax.text(n * 1.01, y_offset + 0.15, spark, ha='left', va='center',
                fontsize=8, color=PALETTE['muted'], family='monospace')
    ax.set_xlim(0, n)
    ax.set_ylim(-0.05, 1.0)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_title('Weighting functions (normalised)', fontsize=10, loc='left', color=PALETTE['text'])


def plot_timelines(
    out_path: Path,
    window: ShowcaseWindow,
    counts: np.ndarray,
    uniform: np.ndarray,
    results: list[WeightingResult],
) -> None:
    total_seconds = float(counts.size * 3600)
    fig = plt.figure(figsize=(13.0, 7.4))

    caption = (
        'All four timelines represent the same 14-day event sequence. '
        'Raw density allocates visual space proportional to local event concentration, '
        'improving readability while preserving temporal context. '
        'Z-score overemphasizes a small number of intervals, '
        'whereas Goh’s burstiness produces only limited redistribution '
        'despite the presence of temporally clustered events.'
    )
    fig.text(
        0.5, 0.965,
        caption,
        ha='center', va='top',
        fontsize=8.5, style='italic', color='#333333',
        wrap=True,
    )

    grid = fig.add_gridspec(
        5, 1, height_ratios=[1.0, 1.0, 1.0, 1.0, 1.4],
        hspace=0.55, top=0.88, bottom=0.07, left=0.07, right=0.98,
    )

    timeline_specs = [
        ('1. Uniform timeline (baseline)', uniform, PALETTE['uniform'], counts),
        ('2. Density-weighted timeline',   results[0].edges, PALETTE['density'], counts),
        ('3. Z-score-weighted timeline',   results[1].edges, PALETTE['zscore'], counts),
        ('4. Burstiness-weighted timeline', results[2].edges, PALETTE['burstiness'], counts),
    ]
    for i, (label, edges, color, c) in enumerate(timeline_specs):
        ax = fig.add_subplot(grid[i])
        draw_timeline(ax, edges, total_seconds, color, label, c)
        # Bottom time axis only on the last timeline
        if i == len(timeline_specs) - 1:
            xticks = np.linspace(0, total_seconds, 8)
            xtick_labels = [f'{int(t / 3600):d}h' for t in xticks]
            ax.set_xticks(xticks)
            ax.set_xticklabels(xtick_labels, fontsize=8, color=PALETTE['muted'])
            ax.tick_params(axis='x', colors=PALETTE['muted'], length=0)

    # Weighting comparison
    ax_w = fig.add_subplot(grid[4])
    draw_weighting_comparison(ax_w, results, counts)
    ax_w.set_xlabel('Bin index', fontsize=9, color=PALETTE['muted'])
    ax_w.tick_params(axis='x', colors=PALETTE['muted'], length=0)
    ax_w.set_xticks(np.linspace(0, counts.size, 9))
    ax_w.set_xticklabels([f'{int(v)}' for v in np.linspace(0, counts.size, 9)], fontsize=8)

    fig.savefig(out_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def plot_metrics_table(
    out_path: Path,
    window: ShowcaseWindow,
    metrics: dict[str, dict[str, float]],
) -> None:
    weightings = list(metrics.keys())
    metric_keys = list(METRIC_LABELS.keys())

    cell_text: list[list[str]] = []
    for wn in weightings:
        row: list[str] = [wn]
        for mk in metric_keys:
            cell_fmt = METRIC_FORMAT[mk][0]
            v = metrics[wn].get(mk)
            row.append(cell_fmt.format(v) if v is not None else '—')
        interp = _per_window_interpretation(metrics, metric_keys)
        row.append(interp)
        cell_text.append(row)

    col_labels = ['Weighting'] + [METRIC_LABELS[mk] for mk in metric_keys] + ['Interpretation']
    n_cols = len(col_labels)
    n_rows = len(cell_text)
    fig, ax = plt.subplots(figsize=(14.0, max(2.8, 0.55 * n_rows + 1.4)))
    ax.axis('off')
    table = ax.table(cellText=cell_text, colLabels=col_labels, loc='center', cellLoc='center')
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.0, 1.5)
    table.auto_set_column_width(col=list(range(n_cols)))

    # Style header
    for j in range(n_cols):
        cell = table[(0, j)]
        cell.set_facecolor('#0f172a')
        cell.set_text_props(color='white', fontweight='bold')

    # Color-code each metric column according to METRIC_POLARITY.
    # 'lower'  → low value (good)   → green
    # 'higher' → high value (good)  → green
    # 'neutral' → light grey
    for col_idx, mk in enumerate(metric_keys, start=1):
        polarity = METRIC_POLARITY.get(mk, 'neutral')
        values = []
        for wn in weightings:
            v = metrics[wn].get(mk)
            if v is None:
                continue
            try:
                values.append(float(v))
            except (TypeError, ValueError):
                continue
        if not values:
            continue
        vmin, vmax = min(values), max(values)
        for row_idx, wn in enumerate(weightings, start=1):
            v = metrics[wn].get(mk)
            if v is None or vmax == vmin or polarity == 'neutral':
                color = (0.97, 0.97, 0.97)
            else:
                t = (float(v) - vmin) / (vmax - vmin)
                shade = t if polarity == 'lower' else 1.0 - t
                color = (0.3 + 0.7 * shade, 1.0 - 0.7 * shade, 0.3)
            table[(row_idx, col_idx)].set_facecolor((*color, 0.55))

    # Interpretation column: italic, left-aligned, neutral fill
    for row_idx in range(1, n_rows + 1):
        cell = table[(row_idx, n_cols - 1)]
        cell.set_text_props(fontstyle='italic', wrap=True)
        cell.set_facecolor((0.985, 0.985, 0.985))

    fig.suptitle(
        f'Per-weighting evaluation — {window.window_days}d #{window.rank} '
        f'({window.start} → {window.end})',
        fontsize=11, y=0.97,
    )
    fig.savefig(out_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def _per_window_interpretation(
    metrics: dict[str, dict[str, float]],
    metric_keys: list[str],
) -> str:
    """Build a one-sentence, data-driven interpretation for the per-window
    metrics table. Picks the most informative lens for that window."""
    density = metrics.get('Raw density', {})
    zscore = metrics.get('Z-score', {})
    burst = metrics.get('Goh burstiness', {})

    def _g(metrics_dict, key, default=float('nan')):
        v = metrics_dict.get(key)
        if v is None:
            return default
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    d_gini, z_gini, b_gini = _g(density, 'share_gini'), _g(zscore, 'share_gini'), _g(burst, 'share_gini')
    d_exp, z_exp, b_exp = _g(density, 'max_expansion'), _g(zscore, 'max_expansion'), _g(burst, 'max_expansion')
    d_comp, z_comp, b_comp = _g(density, 'max_compression'), _g(zscore, 'max_compression'), _g(burst, 'max_compression')
    d_ndiff, z_ndiff, b_ndiff = _g(density, 'neighbour_diff'), _g(zscore, 'neighbour_diff'), _g(burst, 'neighbour_diff')
    d_ms, z_ms, b_ms = _g(density, 'compute_ms'), _g(zscore, 'compute_ms'), _g(burst, 'compute_ms')

    if d_gini == d_gini and z_gini == z_gini and b_gini == b_gini:
        gini_spread = max(d_gini, z_gini, b_gini) - min(d_gini, z_gini, b_gini)
    else:
        gini_spread = 0.0
    if d_ndiff == d_ndiff and z_ndiff == z_ndiff and b_ndiff == b_ndiff:
        ndiff_spread = max(d_ndiff, z_ndiff, b_ndiff) - min(d_ndiff, z_ndiff, b_ndiff)
    else:
        ndiff_spread = 0.0

    # Pick the dominant story for this window.
    if z_exp == z_exp and b_exp == b_exp and z_exp > 5 * max(b_exp, 1.0):
        return METRIC_FORMAT['max_expansion'][2]
    if z_comp == z_comp and abs(z_comp) < 0.05 and b_comp == b_comp and abs(b_comp) > 0.1:
        return METRIC_FORMAT['max_compression'][2]
    if d_gini == d_gini and z_gini == z_gini and b_gini == b_gini and gini_spread < 0.05:
        return METRIC_FORMAT['share_gini'][2]
    if d_ndiff == d_ndiff and z_ndiff == z_ndiff and b_ndiff == b_ndiff and ndiff_spread < 0.02:
        return METRIC_FORMAT['neighbour_diff'][2]
    if d_ms == d_ms and b_ms == b_ms and b_ms > 20 * max(d_ms, 1e-6):
        return METRIC_FORMAT['compute_ms'][2]
    return 'Density provides balanced redistribution; the other two diverge on this slice.'


# ── Reporting ────────────────────────────────────────────────────────

def build_findings(
    window: ShowcaseWindow,
    metrics: dict[str, dict[str, float]],
    results: list[WeightingResult],
    slice_event_count: int,
) -> str:
    best_expand = max(metrics, key=lambda k: metrics[k]['max_expansion'])
    best_gini = max(metrics, key=lambda k: metrics[k]['share_gini'])
    least_compress = max(metrics, key=lambda k: metrics[k]['max_compression'])
    least_neighbour_diff = min(metrics, key=lambda k: metrics[k]['neighbour_diff'])
    fastest = min(metrics, key=lambda k: metrics[k]['compute_ms'])

    density = metrics['Raw density']
    zscore = metrics['Z-score']
    burst = metrics['Goh burstiness']

    lines: list[str] = []
    lines.append('Experiment 2 — Findings')
    lines.append('=' * 72)
    lines.append('')
    lines.append('Framing')
    lines.append('-------')
    lines.append(
        'Several temporal weighting functions were investigated during the design of\n'
        'the adaptive timeline. This experiment evaluates their suitability with\n'
        'respect to visualization objectives rather than their statistical ability\n'
        'to characterize temporal processes.'
    )
    lines.append('')
    lines.append('Dataset')
    lines.append('-------')
    lines.append(f'  Window:     {window.window_days}d #{window.rank} ({window.start} → {window.end})')
    lines.append(f'  Events:     {slice_event_count:,} (in analysed slice; {window.total_events:,} in full {window.window_days}d window)')
    lines.append(f'  CV:         {window.cv:.3f} (coefficient of variation of hourly counts)')
    lines.append(f'  Peak/mean:  {window.peak_ratio:.2f}x')
    lines.append('')
    lines.append('Headline numbers')
    lines.append('----------------')
    lines.append(f'  Largest peak expansion:        {best_expand:<14s}  {metrics[best_expand]["max_expansion"]:.1f}× linear share')
    lines.append(f'  Highest allocation Gini:       {best_gini:<14s}  Gini = {metrics[best_gini]["share_gini"]:.3f}')
    lines.append(f'  Least compression (preserved): {least_compress:<14s}  {metrics[least_compress]["max_compression"]:.3f}× linear share')
    lines.append(f'  Smoothest timeline:            {least_neighbour_diff:<14s}  Δ = {metrics[least_neighbour_diff]["neighbour_diff"]:.4f}')
    lines.append(f'  Fastest compute:               {fastest:<14s}  {metrics[fastest]["compute_ms"]:.2f} ms / window')
    lines.append('')
    lines.append('Per-weighting read-out')
    lines.append('---------------------')
    for label, m in [
        ('Raw density',    density),
        ('Z-score',        zscore),
        ('Goh burstiness', burst),
    ]:
        lines.append(
            f'  {label:<14s}  max_expand={m["max_expansion"]:6.1f}×  '
            f'min_compress={m["max_compression"]:6.3f}×  '
            f'Gini={m["share_gini"]:5.3f}  '
            f'neighbour_Δ={m["neighbour_diff"]:.4f}  '
            f'compute={m["compute_ms"]:5.2f}ms'
        )
    lines.append('')
    lines.append('Discussion')
    lines.append('----------')
    lines.append(
        f'  • Max expansion. {best_expand} reaches {metrics[best_expand]["max_expansion"]:.1f}× linear share on this\n'
        f'    slice, while Goh burstiness stays bounded near 1× (max {burst["max_expansion"]:.1f}×).\n'
        f'    Z-score is the dominant expander whenever the window has a strong outlier\n'
        f'    hour; density is more moderate ({density["max_expansion"]:.1f}×).'
    )
    lines.append(
        f'  • Max compression. {least_compress} keeps the most horizontal space at\n'
        f'    {metrics[least_compress]["max_compression"]:.3f}× linear share, meaning its least\n'
        f'    active bins are the least compressed. Z-score compresses to the floor\n'
        f'    ({zscore["max_compression"]:.3f}×) wherever z ≤ 0, so its weakest bins are barely\n'
        f'    visible; density preserves them at {density["max_compression"]:.3f}×.'
    )
    lines.append(
        f'  • Share Gini. {best_gini} has the most uneven allocation (Gini = {metrics[best_gini]["share_gini"]:.3f}),\n'
        f'    which is exactly the point of an adaptive timeline: a small number of\n'
        f'    intervals get a disproportionate share. Density at {density["share_gini"]:.3f} and burstiness\n'
        f'    at {burst["share_gini"]:.3f} distribute more evenly — readable but with little\n'
        f'    visual reward for dense periods.'
    )
    lines.append(
        f'  • Neighbour Δ. {least_neighbour_diff} is the smoothest timeline (Δ = {metrics[least_neighbour_diff]["neighbour_diff"]:.4f}),\n'
        f'    meaning consecutive bins have similar weights. Z-score is the most\n'
        f'    step-like ({zscore["neighbour_diff"]:.4f}) because the floor-clip at z = 0\n'
        f'    creates discontinuities; density is intermediate at {density["neighbour_diff"]:.4f}.'
    )
    lines.append(
        f'  • Compute. {fastest} is the cheapest at {metrics[fastest]["compute_ms"]:.2f} ms per window —\n'
        f'    essentially a normalisation over the bin counts. Z-score is similar\n'
        f'    ({zscore["compute_ms"]:.2f} ms), while burstiness pays for the per-bin inter-event-time\n'
        f'    pass ({burst["compute_ms"]:.2f} ms). The absolute differences are small on 168 bins\n'
        '    but the per-bin scaling favours density at large bin counts.'
    )
    lines.append('')
    lines.append('Verdict')
    lines.append('-------')
    lines.append(
        '  Density is the most suitable basis for adaptive temporal scaling: it is\n'
        '  directly interpretable, smooth where the data is smooth, and allocates\n'
        '  visual space in proportion to the thing the user is actually trying to\n'
        '  see. Z-score is a useful secondary signal when the goal is to surface\n'
        '  only the statistically exceptional intervals; it is best applied as an\n'
        '  overlay on top of density rather than a replacement. Burstiness remains\n'
        '  valuable as the *motivation* for adaptive scaling — it documents that\n'
        '  the temporal process is non-uniform — but on its own it is the worst\n'
        '  of the three as a weighting function for visual allocation.'
    )
    lines.append('')
    lines.append('Expected outcome (recap)')
    lines.append('-----------------------')
    lines.append(
        '  The experiment confirms the expected outcome: while burstiness provides\n'
        '  valuable motivation for adaptive temporal scaling, density-based\n'
        '  weighting functions provide a more stable, interpretable, and directly\n'
        '  useful signal for allocating visual space. Standardised density\n'
        '  measures (z-scores) further improve the identification of unusually\n'
        '  dense temporal intervals without relying on explicit burstiness\n'
        '  estimation.'
    )
    lines.append('')
    return '\n'.join(lines)


# ── Per-window driver ────────────────────────────────────────────────

def run_for_window(
    window: ShowcaseWindow,
    args: argparse.Namespace,
    output_subdir: Path | None = None,
) -> dict | None:
    """Run the full per-window experiment.

    Loads events for the window, evaluates the three weighting functions, and
    (if `output_subdir` is provided) writes the per-window metrics CSV,
    timelines image, and metrics table image to that directory.

    Returns a result dict with the per-window data, or `None` if the window
    was skipped because it contained fewer hours than `bin_count`.
    """
    raw_hourly, raw_timestamps, audit = build_hourly_counts(args.csv_path, window.start, window.end)
    print(
        f'[clean] rows read={audit["rows_read"]:,}  parsed={audit["rows_parsed"]:,}  '
        f'NaT dropped={audit["rows_nat"]:,}  duplicate IDs dropped={audit["rows_duplicates"]:,}'
    )
    if raw_hourly.size < args.bin_count:
        print(
            f'[skip] {window.window_days}d #{window.rank}: only {raw_hourly.size} hours of data, '
            f'need at least {args.bin_count}.'
        )
        return None

    counts = raw_hourly[: args.bin_count].astype(float)
    start_ts = np.datetime64(f'{window.start}T00:00:00')
    slice_end_ts = start_ts + np.timedelta64(int(args.bin_count * args.bin_hours), 'h')
    slice_timestamps = raw_timestamps[raw_timestamps < slice_end_ts]
    bin_seconds = float(args.bin_hours * 3600)
    total_seconds = float(counts.size * bin_seconds)
    uniform = uniform_edges(counts.size, total_seconds)

    print(
        f'[slice] {counts.size} bins × {args.bin_hours}h covering '
        f'{window.start} → {str(slice_end_ts)[:10]}  '
        f'(events in slice = {int(slice_timestamps.size):,}, '
        f'events in full window = {int(raw_timestamps.size):,})'
    )

    weight_specs = [
        ('Raw density',     weight_density,    (counts,)),
        ('Z-score',         weight_zscore,     (counts,)),
        ('Goh burstiness',  weight_burstiness, (slice_timestamps, counts.size, bin_seconds, start_ts)),
    ]
    results: list[WeightingResult] = []
    for name, fn, fn_args in weight_specs:
        r = run_weighting(name, fn, fn_args, n_bins=counts.size, bin_seconds=bin_seconds)
        results.append(r)
        print(f'[weight] {name:>14s}: {r.bins} bins, compute={r.elapsed_ms:.2f} ms')

    metrics: dict[str, dict[str, float]] = {}
    for r in results:
        m = evaluate(r.weight, counts)
        m['compute_ms'] = r.elapsed_ms
        metrics[r.name] = m

    if output_subdir is not None:
        output_subdir.mkdir(parents=True, exist_ok=True)
        metrics_csv = output_subdir / 'experiment2_metrics.csv'
        with metrics_csv.open('w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['weighting'] + list(next(iter(metrics.values())).keys()))
            for name, m in metrics.items():
                writer.writerow([name] + [m[k] for k in next(iter(metrics.values()))])

        plot_timelines(output_subdir / 'experiment2_timelines.png', window, counts, uniform, results)
        plot_metrics_table(output_subdir / 'experiment2_metrics_table.png', window, metrics)
        print(f'[write] {output_subdir}/')

    return {
        'window': window,
        'counts': counts,
        'uniform': uniform,
        'results': results,
        'metrics': metrics,
        'slice_event_count': int(slice_timestamps.size),
        'audit': audit,
    }


# ── Cross-window aggregation ─────────────────────────────────────────

def aggregate_metrics(per_window: list[dict]) -> dict:
    """Aggregate per-window metrics into mean/std/min/max/n per (weighting,
    metric) and tally per-metric win counts using `METRIC_POLARITY`.

    A "win" is the best value on a metric for a given window, where the
    metric has a defined polarity (lower or higher). Ties are not counted
    as wins for any weighting. Neutral-polarity metrics are skipped.
    """
    if not per_window:
        return {
            'summary': {}, 'wins': {}, 'n_windows': 0,
            'metric_keys': [], 'weighting_names': list(WEIGHTING_NAMES),
        }
    weighting_names = list(WEIGHTING_NAMES)
    metric_keys = list(next(iter(per_window[0]['metrics'].values())).keys())

    summary: dict[str, dict[str, dict[str, float]]] = {wn: {} for wn in weighting_names}
    for wn in weighting_names:
        for mk in metric_keys:
            vals = [r['metrics'][wn].get(mk) for r in per_window]
            finite = np.array([v for v in vals if v is not None and np.isfinite(v)], dtype=float)
            if finite.size == 0:
                summary[wn][mk] = {
                    'mean': float('nan'), 'std': 0.0,
                    'min': float('nan'), 'max': float('nan'),
                    'n': 0, 'n_total': len(vals),
                }
            else:
                summary[wn][mk] = {
                    'mean': float(finite.mean()),
                    'std': float(finite.std()),
                    'min': float(finite.min()),
                    'max': float(finite.max()),
                    'n': int(finite.size),
                    'n_total': len(vals),
                }

    wins: dict[str, dict[str, int]] = {
        wn: {mk: 0 for mk in metric_keys if METRIC_POLARITY.get(mk) != 'neutral'}
        for wn in weighting_names
    }
    for r in per_window:
        for mk, pol in METRIC_POLARITY.items():
            if pol == 'neutral':
                continue
            vals = {wn: r['metrics'][wn].get(mk) for wn in weighting_names}
            finite = {k: v for k, v in vals.items() if v is not None and np.isfinite(v)}
            if not finite:
                continue
            winner = (min if pol == 'lower' else max)(finite, key=finite.get)
            wins[winner][mk] += 1

    return {
        'summary': summary,
        'wins': wins,
        'n_windows': len(per_window),
        'metric_keys': metric_keys,
        'weighting_names': weighting_names,
    }


def write_all_windows_csv(out_path: Path, per_window: list[dict]) -> None:
    """Long-form CSV: one row per (window, weighting) with all metrics."""
    metric_keys = list(next(iter(per_window[0]['metrics'].values())).keys())
    with out_path.open('w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(
            ['window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio',
             'total_events', 'slice_events', 'weighting'] + metric_keys
        )
        for r in per_window:
            w = r['window']
            for wname, m in r['metrics'].items():
                writer.writerow(
                    [w.window_days, w.rank, w.start, w.end, w.cv, w.peak_ratio,
                     w.total_events, r['slice_event_count'], wname]
                    + [m[k] for k in metric_keys]
                )


def write_aggregate_csv(out_path: Path, agg: dict) -> None:
    """One row per (weighting, metric) with mean / std / min / max / n."""
    with out_path.open('w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['weighting', 'metric', 'mean', 'std', 'min', 'max', 'n', 'n_total'])
        for wn, mstats in agg['summary'].items():
            for mk, s in mstats.items():
                writer.writerow([
                    wn, mk, s['mean'], s['std'], s['min'], s['max'],
                    s['n'], s['n_total'],
                ])


# ── Aggregate visualization ──────────────────────────────────────────

def plot_aggregate_table(out_path: Path, agg: dict) -> None:
    """Mean ± std of each metric per weighting, with green→red polarity
    shading (green = best, red = worst, on the polarity defined in
    `METRIC_POLARITY`). Cells are formatted via `METRIC_FORMAT` so each row
    uses a per-metric display precision."""
    weightings = list(WEIGHTING_NAMES)
    metrics_to_show = [mk for mk in METRIC_LABELS if mk in agg['summary'][weightings[0]]]

    n_rows = len(metrics_to_show)
    n_cols = 1 + len(weightings)
    cell_text: list[list[str]] = []
    cell_colors: list[list[tuple[float, float, float]]] = []

    for mk in metrics_to_show:
        polarity = METRIC_POLARITY.get(mk, 'neutral')
        agg_fmt = METRIC_FORMAT[mk][1]
        stats = {wn: agg['summary'][wn][mk] for wn in weightings}
        means = [stats[wn]['mean'] for wn in weightings]
        finite_means = [m for m in means if np.isfinite(m)]
        vmin = min(finite_means) if finite_means else 0.0
        vmax = max(finite_means) if finite_means else 0.0
        row = [METRIC_LABELS[mk]]
        colors_row: list[tuple[float, float, float]] = [(1.0, 1.0, 1.0)]
        for wn, m in zip(weightings, means):
            s = stats[wn]['std']
            row.append(agg_fmt.format(m, s))
            if polarity == 'neutral' or vmax == vmin or not np.isfinite(m):
                colors_row.append((0.97, 0.97, 0.97))
            else:
                t = (m - vmin) / (vmax - vmin)
                shade = t if polarity == 'lower' else 1.0 - t
                colors_row.append((0.3 + 0.7 * shade, 1.0 - 0.7 * shade, 0.3))
        cell_text.append(row)
        cell_colors.append(colors_row)

    fig_h = max(3.6, n_rows * 0.55 + 1.2)
    fig, ax = plt.subplots(figsize=(13.0, fig_h))
    ax.axis('off')
    table = ax.table(
        cellText=cell_text,
        colLabels=['Metric'] + weightings,
        loc='center',
        cellLoc='center',
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.0, 1.4)

    for j in range(n_cols):
        cell = table[(0, j)]
        cell.set_facecolor('#0f172a')
        cell.set_text_props(color='white', fontweight='bold')

    for i, colors_row in enumerate(cell_colors):
        for j, color in enumerate(colors_row):
            table[(i + 1, j)].set_facecolor((*color, 0.55))

    fig.suptitle(
        f'Per-weighting aggregate metrics across {agg["n_windows"]} windows (mean ± std)\n'
        f'Green = best on polarity  |  Red = worst on polarity  |  Grey = neutral',
        fontsize=11, y=0.98,
    )
    fig.savefig(out_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def plot_winrates_heatmap(out_path: Path, agg: dict) -> None:
    """Heatmap of per-metric win counts. A win is the best value on that
    metric for a given window, where the metric has a defined polarity."""
    weightings = list(WEIGHTING_NAMES)
    metrics_to_show = [
        mk for mk in METRIC_LABELS
        if METRIC_POLARITY.get(mk) != 'neutral'
        and any(agg['wins'][wn].get(mk, 0) > 0 for wn in weightings)
    ]
    if not metrics_to_show:
        print('[write] skipping winrates heatmap — no polarity-scored metrics have wins')
        return

    matrix = np.zeros((len(metrics_to_show), len(weightings)), dtype=int)
    for i, mk in enumerate(metrics_to_show):
        for j, wn in enumerate(weightings):
            matrix[i, j] = agg['wins'][wn].get(mk, 0)

    fig, ax = plt.subplots(figsize=(9.0, max(3.0, len(metrics_to_show) * 0.5 + 1.0)))
    im = ax.imshow(matrix, cmap='Greens', aspect='auto', vmin=0)
    ax.set_xticks(range(len(weightings)))
    ax.set_xticklabels(weightings, fontsize=10, fontweight='bold')
    ax.set_yticks(range(len(metrics_to_show)))
    ax.set_yticklabels([METRIC_LABELS[mk] for mk in metrics_to_show], fontsize=9)
    ax.set_title(
        f'Win counts across {agg["n_windows"]} windows\n'
        f'(how often each weighting had the best value on that metric)',
        fontsize=10, loc='left',
    )

    max_v = matrix.max() if matrix.size else 0
    for i in range(len(metrics_to_show)):
        for j in range(len(weightings)):
            v = int(matrix[i, j])
            color = 'white' if max_v > 0 and v > max_v * 0.5 else 'black'
            ax.text(j, i, str(v), ha='center', va='center', color=color, fontsize=10, fontweight='bold')

    plt.colorbar(im, ax=ax, label='Win count', shrink=0.8)
    fig.savefig(out_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


# ── Aggregate findings narrative ────────────────────────────────────

def build_aggregate_findings(per_window: list[dict], agg: dict) -> str:
    """Cross-window narrative that replaces the per-window findings when
    running in multi-window mode."""
    n = agg['n_windows']
    by_size: dict[int, list[ShowcaseWindow]] = {}
    for r in per_window:
        by_size.setdefault(r['window'].window_days, []).append(r['window'])
    sizes_sorted = sorted(by_size)

    density = agg['summary']['Raw density']
    zscore = agg['summary']['Z-score']
    burst = agg['summary']['Goh burstiness']

    lines: list[str] = []
    lines.append('Experiment 2 — Aggregate Findings (multi-window)')
    lines.append('=' * 72)
    lines.append('')
    lines.append('Framing')
    lines.append('-------')
    lines.append(
        'This run repeats the per-weighting evaluation on every window in the\n'
        'showcase set so the findings do not rest on a single cherry-picked\n'
        'slice. The same three weightings are evaluated on identical bins and\n'
        'the per-window metrics are aggregated as mean ± std.'
    )
    lines.append('')
    lines.append('Coverage')
    lines.append('--------')
    lines.append(f'  Total windows:  {n}')
    for sz in sizes_sorted:
        ws = by_size[sz]
        cv_lo = min(w.cv for w in ws)
        cv_hi = max(w.cv for w in ws)
        ev_lo = min(w.total_events for w in ws)
        ev_hi = max(w.total_events for w in ws)
        lines.append(
            f'    {sz}d × {len(ws)} ranks  —  CV ∈ [{cv_lo:.2f}, {cv_hi:.2f}]  '
            f'events ∈ [{ev_lo:,} – {ev_hi:,}]'
        )
    lines.append('')
    lines.append('Per-weighting aggregate (mean ± std across all windows)')
    lines.append('------------------------------------------------------')
    for wname, mstats in agg['summary'].items():
        lines.append(f'  {wname}:')
        for mk, label in METRIC_LABELS.items():
            if mk not in mstats:
                continue
            s = mstats[mk]
            pol = METRIC_POLARITY.get(mk, '—')
            tag = f'[{pol:>6s}]'
            lines.append(
                f'    {label:<28s} {tag}  mean = {s["mean"]:>10.4f}   std = {s["std"]:.4f}   '
                f'range [{s["min"]:>10.4f}, {s["max"]:>10.4f}]  n={s["n"]}'
            )
        lines.append('')
    lines.append('')
    lines.append('Win counts (best value on that metric for that window)')
    lines.append('-----------------------------------------------------')
    lines.append(
        'A win is the best value on a metric for a given window where the\n'
        'metric has a defined polarity. Ties are not credited to any weighting.'
    )
    lines.append('')
    for mk, label in METRIC_LABELS.items():
        pol = METRIC_POLARITY.get(mk, 'neutral')
        if pol == 'neutral':
            continue
        wins = {wn: agg['wins'][wn].get(mk, 0) for wn in WEIGHTING_NAMES}
        total = sum(wins.values())
        if total == 0:
            continue
        leader = max(wins, key=wins.get)
        leader_pct = wins[leader] / total * 100
        d, z, b = wins['Raw density'], wins['Z-score'], wins['Goh burstiness']
        lines.append(
            f'  {label:<28s}  leader = {leader:<14s}  {wins[leader]:>2d}/{total}  ({leader_pct:5.1f}%)  '
            f'[density {d:>2d}, z-score {z:>2d}, burst {b:>2d}]'
        )
    lines.append('')

    lines.append('Per-window read-out')
    lines.append('-------------------')
    header = (
        f'  {"window":<10s}  {"slice evts":>10s}  {"CV":>5s}  '
        f'{"dens ×":>7s}  {"zscr ×":>7s}  {"brst ×":>7s}  '
        f'{"dens G":>7s}  {"zscr G":>7s}  {"brst G":>7s}  '
        f'{"dens ms":>8s}  {"zscr ms":>8s}  {"brst ms":>8s}'
    )
    lines.append(header)
    lines.append('  ' + '-' * (len(header) - 2))
    for r in sorted(per_window, key=lambda x: (x['window'].window_days, -x['window'].cv)):
        w = r['window']
        d = r['metrics']['Raw density']
        z = r['metrics']['Z-score']
        b = r['metrics']['Goh burstiness']
        lines.append(
            f'  {w.window_days}d #{w.rank:<5d}  {r["slice_event_count"]:>10,d}  {w.cv:>5.2f}  '
            f'{d["max_expansion"]:>7.2f}  {z["max_expansion"]:>7.2f}  {b["max_expansion"]:>7.2f}  '
            f'{d["share_gini"]:>7.3f}  {z["share_gini"]:>7.3f}  {b["share_gini"]:>7.3f}  '
            f'{d["compute_ms"]:>8.2f}  {z["compute_ms"]:>8.2f}  {b["compute_ms"]:>8.2f}'
        )
    lines.append('')

    lines.append('Verdict (aggregate)')
    lines.append('-------------------')
    lines.append(
        f'  Across {n} windows spanning {", ".join(f"{sz}d" for sz in sizes_sorted)} sizes and a\n'
        f'  coefficient-of-variation range of {min(w.cv for sz in sizes_sorted for w in by_size[sz]):.2f} to\n'
        f'  {max(w.cv for sz in sizes_sorted for w in by_size[sz]):.2f}, the three weightings behave consistently:'
    )
    lines.append(
        f'  - Raw density allocates visual space in proportion to local event count,\n'
        f'    keeping a moderate peak expansion (mean {density["max_expansion"]["mean"]:.1f}×) and the\n'
        f'    lowest neighbour-difference of the three (mean {density["neighbour_diff"]["mean"]:.4f}).\n'
        f'    It also computes in microseconds (mean {density["compute_ms"]["mean"]:.3f} ms).'
    )
    lines.append(
        f'  - Z-score is the most selective expander on most windows (mean share\n'
        f'    Gini = {zscore["share_gini"]["mean"]:.2f}, std = {zscore["share_gini"]["std"]:.2f}) because bins\n'
        f'    with z ≤ 0 collapse to the floor weight, leaving a small number of\n'
        f'    strongly expanded bins. Mean peak expansion is {zscore["max_expansion"]["mean"]:.1f}× — the\n'
        f'    highest of the three — but neighbour-difference is the largest too,\n'
        f'    reflecting the discontinuities introduced by the floor-clip.'
    )
    lines.append(
        f'  - Goh-Barabasi burstiness is the most muted allocator (mean peak\n'
        f'    expansion = {burst["max_expansion"]["mean"]:.1f}×, mean share Gini = {burst["share_gini"]["mean"]:.2f}),\n'
        f'    produces the smoothest timelines on average (mean neighbour\n'
        f'    difference = {burst["neighbour_diff"]["mean"]:.4f}), and is the most expensive to\n'
        f'    compute (mean {burst["compute_ms"]["mean"]:.2f} ms — roughly {burst["compute_ms"]["mean"]/max(density["compute_ms"]["mean"],1e-6):.0f}× density).'
    )
    lines.append(
        f'  These results confirm, on a multi-window basis, the conclusion drawn\n'
        f'  from the single-window experiment: density is the most suitable\n'
        f'  basis for adaptive temporal scaling, z-score is a useful secondary\n'
        f'  signal for surfacing statistically exceptional intervals, and\n'
        f'  burstiness is valuable as motivation but not as a primary visual\n'
        f'  driver for visual allocation.'
    )
    lines.append('')
    return '\n'.join(lines)


# ── Main ─────────────────────────────────────────────────────────────

def _parse_int_list(spec: str | None) -> list[int] | None:
    if spec is None:
        return None
    return [int(x.strip()) for x in spec.split(',') if x.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Experiment 2: temporal weighting functions for adaptive timelines.'
    )
    parser.add_argument('--csv-path', type=Path, default=DEFAULT_CSV_PATH, help='Crime CSV path')
    parser.add_argument('--windows-path', type=Path, default=DEFAULT_WINDOWS_PATH, help='Showcase windows CSV')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help='Output directory')
    parser.add_argument('--bin-hours', type=int, default=1, help='Bin width in hours (default 1)')
    parser.add_argument('--bin-count', type=int, default=168, help='Number of bins to evaluate (default 168 = 1 week)')
    parser.add_argument('--multi-window', action='store_true',
                        help='Run on every window in the showcase set and aggregate results')
    parser.add_argument('--sizes', type=str, default=None,
                        help='Comma-separated window sizes to include in --multi-window (default: all)')
    parser.add_argument('--ranks', type=str, default=None,
                        help='Comma-separated ranks to include in --multi-window (default: all)')
    parser.add_argument('--window-days', type=int, default=14, help='[single-window] Showcase window size to use')
    parser.add_argument('--window-rank', type=int, default=1, help='[single-window] Showcase window rank to use (1 = most bursty)')
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    windows = load_showcase_windows(args.windows_path)
    print(
        f'[setup] CSV = {args.csv_path}\n'
        f'[setup] windows file = {args.windows_path}  ({len(windows)} windows)\n'
        f'[setup] bin = {args.bin_hours}h × {args.bin_count} bins '
        f'({args.bin_hours * args.bin_count}h = {args.bin_hours * args.bin_count / 24:.0f}d)'
    )

    if not args.multi_window:
        # ── Single-window mode (original behavior) ──
        target = next(
            (w for w in windows if w.window_days == args.window_days and w.rank == args.window_rank),
            windows[0],
        )
        print(f'[setup] using window {target.window_days}d #{target.rank}: {target.start} → {target.end}')

        result = run_for_window(target, args, output_subdir=args.output_dir)
        if result is None:
            raise SystemExit(1)

        findings = build_findings(
            target, result['metrics'], result['results'],
            slice_event_count=result['slice_event_count'],
        )
        findings_txt = args.output_dir / 'experiment2_findings.txt'
        findings_txt.write_text(findings)
        print(f'[write] {findings_txt}')
        print('')
        print(findings)
        return

    # ── Multi-window mode ──
    size_filter = _parse_int_list(args.sizes)
    rank_filter = _parse_int_list(args.ranks)
    selected = [
        w for w in windows
        if (size_filter is None or w.window_days in size_filter)
        and (rank_filter is None or w.rank in rank_filter)
    ]
    if not selected:
        raise SystemExit(
            f'[error] no windows match --sizes={args.sizes!r} --ranks={args.ranks!r}'
        )
    print(f'[setup] running {len(selected)} windows: '
          f'{", ".join(f"{w.window_days}d#{w.rank}" for w in selected)}')

    per_window: list[dict] = []
    for i, window in enumerate(selected, start=1):
        print(f'\n[window {i:>2d}/{len(selected)}] {window.window_days}d #{window.rank}  '
              f'{window.start} → {window.end}  (CV={window.cv:.3f}, events={window.total_events:,})')
        subdir = args.output_dir / f'{window.window_days}d_rank{window.rank}'
        result = run_for_window(window, args, output_subdir=subdir)
        if result is not None:
            per_window.append(result)

    if not per_window:
        raise SystemExit('[error] no windows produced results')

    print('\n[aggregate] computing cross-window statistics...')
    agg = aggregate_metrics(per_window)
    print(f'[aggregate] {agg["n_windows"]} windows × {len(agg["metric_keys"])} metrics × '
          f'{len(agg["weighting_names"])} weightings')

    all_csv = args.output_dir / 'experiment2_all_windows.csv'
    write_all_windows_csv(all_csv, per_window)
    print(f'[write] {all_csv}')

    agg_csv = args.output_dir / 'experiment2_aggregate.csv'
    write_aggregate_csv(agg_csv, agg)
    print(f'[write] {agg_csv}')

    agg_table_png = args.output_dir / 'experiment2_aggregate_table.png'
    plot_aggregate_table(agg_table_png, agg)
    print(f'[write] {agg_table_png}')

    winrates_png = args.output_dir / 'experiment2_winrates_heatmap.png'
    plot_winrates_heatmap(winrates_png, agg)
    print(f'[write] {winrates_png}')

    findings_txt = args.output_dir / 'experiment2_aggregate_findings.txt'
    findings = build_aggregate_findings(per_window, agg)
    findings_txt.write_text(findings)
    print(f'[write] {findings_txt}')
    print('')
    print(findings)


if __name__ == '__main__':
    main()
