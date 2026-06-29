#!/usr/bin/env python3
"""Experiment 2 — Expert evaluation stimuli (A vs B).

Produces anonymized, two-row comparison figures for use as expert-interview
stimuli. Each figure shows the same window of events rendered with two
visualization strategies:

    A. Uniform       (linear time, equal-width bins)
    B. Raw density   (adaptive time, bin width ∝ event count)

The mapping between A/B and the underlying strategy is randomized per window
(with a fixed seed for reproducibility) and written to a private `mapping.txt`
file alongside the figure. The participant never sees the strategy names.

Each figure is composed of:

    Events:        | | || ||||| | |||||||  (rug plot, sub-sampled)
    Allocation:    [uniform | adaptive]   (bin-width bars)
    Label:         Visualization A / Visualization B

Plus a moderator-only `events_rug.png` showing the underlying event rug on the
linear time axis, and a `metadata.txt` with the window facts.

Outputs (under scripts/output/experiment2_expert_stimuli/):

    window_NN_<size>d_rank<R>/
        test_figure.png       # participant-facing stimulus
        events_rug.png        # moderator reference
        mapping.txt           # private key (A → uniform/density, B → …)
        metadata.txt          # window facts
    index_sheet.png           # 2×3 grid of all six test figures
    session_protocol.md       # the question prompts for the expert
    REVEAL_KEY.md             # master table mapping each window to its A/B order

Usage:
    python3 scripts/experiment2_expert_stimuli.py
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np


# ── Configuration ─────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / 'output' / 'experiment2_expert_stimuli'
DEFAULT_CSV_PATH = SCRIPT_DIR.parent / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'
DEFAULT_WINDOWS_PATH = SCRIPT_DIR / 'output' / 'showcase_windows.csv'

RAW_DATE_FORMAT = '%m/%d/%Y %I:%M:%S %p'
DPI = 200

# Fixed seed so re-runs are stable. The per-window A/B order is what
# this seed controls; the figure geometry is deterministic regardless.
RANDOM_SEED = 42

# Visual style. All figures use the same minimal palette.
TEXT_COLOR = '#0f172a'
EDGE_COLOR = '#1f1f1f'
FILL_COLOR = '#d8d8d8'
RUG_COLOR = '#475569'
MUTED_COLOR = '#64748b'
RUG_TARGET_TICKS = 500   # subsample large windows so the rug reads as texture


# Six windows chosen to span the archetypes recommended by the expert:
#   1. dominant burst,  2. multiple bursts,  3. gradual / steady,
#   4. sparse / low CV, 5. periodic,         6. competing hotspots
SELECTED_WINDOWS: list[tuple[int, int]] = [
    (14, 1),   # 2014-12-29 → 2015-01-12 — New Year dominant burst
    (30, 1),   # 2014-12-22 → 2015-01-21 — multiple bursts (NY + tail)
    (30, 5),   # 2024-07-08 → 2024-08-07 — gradual / steady summer
    (1, 5),    # 2024-11-17 → 2024-11-18 — sparse single day
    (90, 3),   # 2015-08-24 → 2015-11-22 — long-window periodic
    (90, 2),   # 2001-10-15 → 2002-01-13 — competing hotspots
]

STRATEGY_NAMES: tuple[str, str] = ('uniform', 'raw_density')
STRATEGY_LABELS: dict[str, str] = {
    'uniform':     'Uniform',
    'raw_density': 'Raw density',
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
class WindowData:
    window: ShowcaseWindow
    timestamps: np.ndarray        # datetime64[ns] inside the analysed slice
    bin_count: int
    bin_hours: int
    counts: np.ndarray            # per-bin event counts
    uniform_edges: np.ndarray     # length bin_count + 1, linear seconds
    density_edges: np.ndarray     # length bin_count + 1, adaptive seconds
    bin_seconds: float
    total_seconds: float


# ── Data loading (mirrors the original experiment) ───────────────────

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


def pd_read_clean_chunks(csv_path: Path, chunksize: int = 250_000):
    """Yield `(id, date, raw_count)` chunks for the temporal cleaning pipeline.

    Pandas is used here purely for fast CSV ingestion + duplicate removal;
    the script can fall back to a pure-numpy implementation (see git history)
    if pandas is unavailable, but on an 8M-row file pandas is required for
    acceptable runtime.
    """
    import pandas as pd
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


def build_timestamps_in_window(csv_path: Path, start: str, end: str) -> np.ndarray:
    start_ts = np.datetime64(f'{start}T00:00:00')
    end_ts = np.datetime64(f'{end}T00:00:00')
    timestamps = np.empty(0, dtype='datetime64[ns]')
    for _chunk_id, chunk_date, _raw in pd_read_clean_chunks(csv_path):
        valid = chunk_date[~np.isnat(chunk_date)]
        mask = (valid >= start_ts) & (valid < end_ts)
        if mask.any():
            timestamps = np.concatenate([timestamps, valid[mask]])
    return timestamps


# ── Window-aware binning (mirrors the original) ──────────────────────

def infer_window_bin_spec(window: ShowcaseWindow) -> tuple[int, int]:
    if window.window_days <= 1:
        return 24, 1
    return int(window.window_days), 24


def aggregate_hourly_counts(timestamps: np.ndarray, start: str, end: str,
                            bin_count: int, bin_hours: int) -> np.ndarray:
    start_ts = np.datetime64(f'{start}T00:00:00')
    hours_needed = int(bin_count * bin_hours)
    counts = np.zeros(hours_needed, dtype=np.int64)
    if timestamps.size == 0:
        return counts
    idx = ((timestamps - start_ts) / np.timedelta64(1, 'h')).astype(np.int64)
    mask = (idx >= 0) & (idx < hours_needed)
    np.add.at(counts, idx[mask], 1)
    if bin_hours == 1:
        return counts
    return counts.reshape(bin_count, bin_hours).sum(axis=1)


# ── Weighting ────────────────────────────────────────────────────────

def weight_density(counts: np.ndarray) -> np.ndarray:
    arr = counts.astype(float)
    peak = arr.max() if arr.size else 0.0
    return arr / peak if peak > 0 else np.zeros_like(arr)


def uniform_edges(bins: int, total_seconds: float) -> np.ndarray:
    return np.linspace(0.0, total_seconds, bins + 1)


def build_adaptive_edges(visual_weight: np.ndarray, total_seconds: float) -> np.ndarray:
    total = float(visual_weight.sum())
    if total <= 0:
        return np.linspace(0.0, total_seconds, visual_weight.size + 1)
    cumulative = np.cumsum(visual_weight) / total
    return np.concatenate(([0.0], cumulative)) * total_seconds


def density_edges(counts: np.ndarray, total_seconds: float,
                  weight_gain: float = 5.0, weight_floor: float = 1.0) -> np.ndarray:
    norm = weight_density(counts)
    visual = weight_floor + norm * weight_gain
    return build_adaptive_edges(visual, total_seconds)


# ── Event rug (subsampled to a target tick count) ────────────────────

def subsample_rug_seconds(timestamps: np.ndarray, start_ts: np.datetime64,
                          total_seconds: float, target_ticks: int) -> np.ndarray:
    if timestamps.size == 0:
        return np.empty(0)
    # Normalize both values to second precision before subtracting.
    seconds = timestamps.astype('datetime64[s]').astype('int64') - start_ts.astype('datetime64[s]').astype('int64')
    seconds = seconds[(seconds >= 0) & (seconds < total_seconds)]
    if seconds.size == 0:
        return np.empty(0)
    if seconds.size <= target_ticks:
        return seconds.astype(float)
    idx = np.linspace(0, seconds.size - 1, target_ticks).astype(int)
    return seconds[idx].astype(float)


# ── Per-window rendering ─────────────────────────────────────────────

def draw_rug(ax, x_seconds: np.ndarray, y_baseline: float, height: float) -> None:
    if x_seconds.size == 0:
        return
    for x in x_seconds:
        ax.vlines(x, y_baseline, y_baseline + height,
                  colors=RUG_COLOR, linewidth=0.4, alpha=0.55)


def draw_allocation_bars(ax, edges: np.ndarray, y_baseline: float, height: float) -> None:
    n = edges.size - 1
    if n <= 0:
        return
    widths = np.diff(edges)
    for i in range(n):
        ax.add_patch(mpatches.Rectangle(
            (edges[i], y_baseline),
            widths[i],
            height,
            facecolor=FILL_COLOR,
            edgecolor=EDGE_COLOR,
            linewidth=0.7,
        ))


def render_stimulus(
    fig_path: Path,
    window: ShowcaseWindow,
    counts: np.ndarray,
    uniform: np.ndarray,
    density: np.ndarray,
    total_seconds: float,
    rug_uniform: np.ndarray,
    rug_density: np.ndarray,
    label_uniform: str,
    label_density: str,
    n_events_uniform: int,
    n_events_density: int,
) -> None:
    """Two-row test figure with one shared event rug above both allocations."""
    total_hours = total_seconds / 3600.0
    is_daily_axis = window.window_days > 1

    fig = plt.figure(figsize=(13.0, 4.4))

    fig.text(
        0.5, 0.96,
        f'Window: {window.start} → {window.end}  ({window.window_days}d, rank {window.rank})',
        ha='center', va='top',
        fontsize=11, fontweight='bold', color=TEXT_COLOR,
    )
    fig.text(
        0.5, 0.91,
        'Both visualizations represent the same event sequence. Only the temporal allocation differs.',
        ha='center', va='top',
        fontsize=9, style='italic', color=MUTED_COLOR,
    )

    grid = fig.add_gridspec(
        3, 1, height_ratios=[0.9, 1.3, 1.3],
        hspace=0.34, top=0.84, bottom=0.14, left=0.03, right=0.92,
    )

    rug_ax = fig.add_subplot(grid[0])
    draw_rug(rug_ax, rug_uniform, y_baseline=0.15, height=0.70)
    rug_ax.set_xlim(0, total_seconds)
    rug_ax.set_ylim(0, 1.0)
    rug_ax.set_yticks([])
    for spine in ('top', 'right', 'left'):
        rug_ax.spines[spine].set_visible(False)
    rug_ax.spines['bottom'].set_color(EDGE_COLOR)
    rug_ax.tick_params(axis='x', labelbottom=False, bottom=False)
    rug_ax.text(
        1.012, 0.55, 'Shared event rug',
        transform=rug_ax.transAxes,
        ha='left', va='center',
        fontsize=11, fontweight='bold', color=TEXT_COLOR,
    )
    rug_ax.text(
        1.012, 0.20, f'{n_events_uniform:,} events',
        transform=rug_ax.transAxes,
        ha='left', va='center',
        fontsize=8, color=MUTED_COLOR, style='italic',
    )

    rows = [
        (label_uniform, uniform),
        (label_density, density),
    ]

    for i, (label, edges) in enumerate(rows, start=1):
        ax = fig.add_subplot(grid[i])
        draw_allocation_bars(ax, edges, y_baseline=0.08, height=0.62)
        ax.set_xlim(0, total_seconds)
        ax.set_ylim(0, 1.0)
        ax.set_yticks([])
        for spine in ('top', 'right', 'left'):
            ax.spines[spine].set_visible(False)
        ax.spines['bottom'].set_color(EDGE_COLOR)
        # Per-row label, placed to the right of the axes
        ax.text(1.012, 0.5, label,
                transform=ax.transAxes,
                ha='left', va='center',
                fontsize=13, fontweight='bold', color=TEXT_COLOR)
        uniform_ref = np.linspace(0, total_seconds, len(edges))
        is_adaptive = not np.allclose(np.diff(edges), np.diff(uniform_ref))
        if is_adaptive:
            if is_daily_axis:
                tick_days = list(range(0, window.window_days + 1, 4))
                if tick_days[-1] != window.window_days:
                    tick_days.append(window.window_days)
                xticks = edges[np.array(tick_days, dtype=int)]
                xtick_labels = [f'{d}d' for d in tick_days]
            else:
                tick_hours = list(range(0, int(total_hours) + 1, 6))
                if tick_hours[-1] != int(total_hours):
                    tick_hours.append(int(total_hours))
                xticks = edges[np.array(tick_hours, dtype=int)]
                xtick_labels = [f'{h}h' for h in tick_hours]
        elif is_daily_axis:
            step_days = max(1, int(np.ceil(window.window_days / 10)))
            tick_days = list(range(0, window.window_days + 1, step_days))
            if tick_days[-1] != window.window_days:
                tick_days.append(window.window_days)
            xticks = np.array(tick_days, dtype=float) * 24.0 * 3600.0
            xtick_labels = [f'{d}d' for d in tick_days]
        else:
            n_ticks = max(2, int(round(total_hours / 4.0)) + 1)
            xticks = np.linspace(0, total_seconds, n_ticks)
            xtick_labels = [f'{int(round(t / 3600)):d}h' for t in xticks]
        ax.set_xticks(xticks)
        ax.set_xticklabels(xtick_labels, fontsize=9, color=TEXT_COLOR)
        ax.tick_params(axis='x', colors=TEXT_COLOR, length=0, pad=2)

    fig.savefig(fig_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def render_rug_only(
    fig_path: Path,
    window: ShowcaseWindow,
    rug: np.ndarray,
    n_events: int,
    total_seconds: float,
) -> None:
    """Moderator reference: the underlying event rug on the linear time axis."""
    total_hours = total_seconds / 3600.0
    is_daily_axis = window.window_days > 1

    fig, ax = plt.subplots(figsize=(13.0, 1.6))
    draw_rug(ax, rug, y_baseline=0.05, height=0.90)
    ax.set_xlim(0, total_seconds)
    ax.set_ylim(0, 1.0)
    ax.set_yticks([])
    for spine in ('top', 'right', 'left'):
        ax.spines[spine].set_visible(False)
    ax.spines['bottom'].set_color(EDGE_COLOR)

    if is_daily_axis:
        step_days = max(1, int(np.ceil(window.window_days / 10)))
        tick_days = list(range(0, window.window_days + 1, step_days))
        if tick_days[-1] != window.window_days:
            tick_days.append(window.window_days)
        xticks = np.array(tick_days, dtype=float) * 24.0 * 3600.0
        xtick_labels = [f'{d}d' for d in tick_days]
    else:
        n_ticks = max(2, int(round(total_hours / 4.0)) + 1)
        xticks = np.linspace(0, total_seconds, n_ticks)
        xtick_labels = [f'{int(round(t / 3600)):d}h' for t in xticks]
    ax.set_xticks(xticks)
    ax.set_xticklabels(xtick_labels, fontsize=9, color=TEXT_COLOR)
    ax.tick_params(axis='x', colors=TEXT_COLOR, length=0)

    ax.set_title(
        f'Underlying events (linear time) — {n_events:,} events, '
        f'{rug.size:,} ticks shown\n'
        f'Window: {window.start} → {window.end}  ({window.window_days}d, rank {window.rank})',
        fontsize=10, loc='left', color=TEXT_COLOR,
    )
    fig.tight_layout()
    fig.savefig(fig_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


# ── Per-window driver ────────────────────────────────────────────────

def run_for_window(
    window: ShowcaseWindow,
    csv_path: Path,
    out_dir: Path,
    rng: random.Random,
) -> dict:
    timestamps = build_timestamps_in_window(csv_path, window.start, window.end)
    bin_count, bin_hours = infer_window_bin_spec(window)
    counts = aggregate_hourly_counts(timestamps, window.start, window.end,
                                     bin_count=bin_count, bin_hours=bin_hours)
    bin_seconds = float(bin_hours * 3600)
    total_seconds = float(counts.size * bin_seconds)

    uniform = uniform_edges(counts.size, total_seconds)
    density = density_edges(counts, total_seconds)

    # Event rug on the LINEAR time axis (same for both visualisations).
    start_ts = np.datetime64(f'{window.start}T00:00:00')
    rug_linear = subsample_rug_seconds(timestamps, start_ts, total_seconds, RUG_TARGET_TICKS)

    # Randomised A/B order
    order = list(STRATEGY_NAMES)
    rng.shuffle(order)
    label_a, label_b = 'Visualization A', 'Visualization B'

    rows = {
        label_a: order[0],
        label_b: order[1],
    }

    out_dir.mkdir(parents=True, exist_ok=True)

    render_stimulus(
        out_dir / 'test_figure.png',
        window, counts,
        uniform if rows[label_a] == 'uniform' else density,
        density if rows[label_b] == 'raw_density' else uniform,
        total_seconds,
        rug_linear,
        rug_linear,
        label_a, label_b,
        int(timestamps.size), int(timestamps.size),
    )

    render_rug_only(
        out_dir / 'events_rug.png',
        window, rug_linear, int(timestamps.size), total_seconds,
    )

    (out_dir / 'mapping.txt').write_text(
        f"{label_a} = {STRATEGY_LABELS[rows[label_a]]}\n"
        f"{label_b} = {STRATEGY_LABELS[rows[label_b]]}\n"
    )

    (out_dir / 'metadata.txt').write_text(
        f"Window:       {window.window_days}d #{window.rank}\n"
        f"Start:        {window.start}\n"
        f"End:          {window.end}\n"
        f"CV:           {window.cv:.3f}\n"
        f"Peak/mean:    {window.peak_ratio:.2f}x\n"
        f"Total events: {int(timestamps.size):,}\n"
        f"Bins:         {counts.size} x {bin_hours}h\n"
        f"Rug ticks shown: {rug_linear.size:,} (of {int(timestamps.size):,} events)\n"
    )

    return {
        'window': window,
        'mapping': rows,
        'n_events': int(timestamps.size),
    }


# ── Index sheet (2×3 thumbnail grid) ─────────────────────────────────

def render_index_sheet(out_path: Path, window_dirs: list[Path], n_cols: int = 3) -> None:
    from matplotlib.image import imread
    images = [imread(str(d / 'test_figure.png')) for d in window_dirs]
    n = len(images)
    n_rows = int(np.ceil(n / n_cols))
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(4.5 * n_cols, 2.6 * n_rows))
    axes_flat = np.atleast_1d(axes).ravel()
    for i, ax in enumerate(axes_flat):
        if i < n:
            ax.imshow(images[i])
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_visible(False)
        else:
            ax.axis('off')
    fig.suptitle(
        'Index sheet — all six stimuli (moderator reference)',
        fontsize=12, y=1.0,
    )
    fig.tight_layout()
    fig.savefig(out_path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)


# ── Session protocol + reveal key ────────────────────────────────────

SESSION_PROTOCOL = """# Expert Interview — Session Protocol

## Stimuli

Six figures, each comparing two visualizations of the same time window:

- **Visualization A** and **Visualization B** are anonymous. They are
  randomization-keyed (see `REVEAL_KEY.md` for the mapping).
- The vertical ticks above each bar are the underlying events.
- The bar below is the time allocation: how much horizontal space each
  bin gets under that visualization.

Show one figure at a time. Do not name the visualizations or hint at
which is "adaptive" or "uniform".

## Per-figure questions

1. **Identification.** *Which visualization would allow you to most
   quickly identify the period with the highest operational activity?*
2. **Comparison.** *Which visualization would you use to compare
   periods of increased activity?*
3. **Attention.** *What attracts your attention first when you look at
   this figure?*
4. **Confusion.** *Is anything confusing or hard to read?*
5. **Choice.** *Which representation would you choose? Which would you
   avoid? What becomes easier or harder to see?*
6. **Decision-making.** *Would this representation change the way you
   make a decision about this data?*

For each answer, ask **"why?"** and encourage the expert to think aloud.

## Think-aloud prompts

While the expert is looking at the figure:

- *What are you looking at first?*
- *What attracts your attention?*
- *What makes this easier or harder?*
- *Is anything confusing?*

## Closing bridge to the prototype

After all six figures have been discussed:

> "Now that you've seen the underlying visualization concept, here's
>  how it is integrated into the interactive prototype."

Show the prototype demo (`/dashboard-demo`) and discuss:

- the **timeline**,
- the **2D map**,
- the **space-time cube**,
- the **linked interaction** between them.

Then ask:

- *How does the prototype change your evaluation of the static figures?*
- *What did the static figures fail to capture?*
- *What would you add to the prototype to make the temporal
  allocation more legible?*
"""


def write_reveal_key(out_path: Path, results: list[dict]) -> None:
    lines = [
        '# Reveal key — A/B mapping per window',
        '',
        '| Window | Start → End | Visualization A | Visualization B |',
        '|---|---|---|---|',
    ]
    for r in results:
        w = r['window']
        m = r['mapping']
        lines.append(
            f"| {w.window_days}d #{w.rank} | {w.start} → {w.end} | "
            f"{STRATEGY_LABELS[m['Visualization A']]} | "
            f"{STRATEGY_LABELS[m['Visualization B']]} |"
        )
    out_path.write_text('\n'.join(lines) + '\n')


# ── Main ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Experiment 2: anonymized A/B evaluation stimuli.'
    )
    parser.add_argument('--csv-path', type=Path, default=DEFAULT_CSV_PATH)
    parser.add_argument('--windows-path', type=Path, default=DEFAULT_WINDOWS_PATH)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument('--seed', type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)

    windows_by_key = {
        (w.window_days, w.rank): w
        for w in load_showcase_windows(args.windows_path)
    }

    print(f'[setup] output = {args.output_dir}')
    print(f'[setup] seed   = {args.seed}')
    print(f'[setup] {len(SELECTED_WINDOWS)} windows selected')

    results: list[dict] = []
    window_dirs: list[Path] = []
    for i, (size, rank) in enumerate(SELECTED_WINDOWS, start=1):
        window = windows_by_key[(size, rank)]
        out_dir = args.output_dir / f'window_{i:02d}_{size}d_rank{rank}'
        print(f'\n[window {i}/6] {size}d #{rank}  {window.start} → {window.end}')
        result = run_for_window(window, args.csv_path, out_dir, rng)
        results.append(result)
        window_dirs.append(out_dir)
        print(f'  [write] {out_dir}/test_figure.png')
        print(f'  [write] {out_dir}/events_rug.png')
        print(f'  [write] {out_dir}/mapping.txt')
        print(f'  [write] {out_dir}/metadata.txt')
        print(f'  A = {STRATEGY_LABELS[result["mapping"]["Visualization A"]]}, '
              f'B = {STRATEGY_LABELS[result["mapping"]["Visualization B"]]}')

    index_path = args.output_dir / 'index_sheet.png'
    render_index_sheet(index_path, window_dirs)
    print(f'\n[write] {index_path}')

    protocol_path = args.output_dir / 'session_protocol.md'
    protocol_path.write_text(SESSION_PROTOCOL)
    print(f'[write] {protocol_path}')

    reveal_path = args.output_dir / 'REVEAL_KEY.md'
    write_reveal_key(reveal_path, results)
    print(f'[write] {reveal_path}')

    print('\nDone.')


if __name__ == '__main__':
    main()
