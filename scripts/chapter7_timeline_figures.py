#!/usr/bin/env python3
"""Render Chapter 7 expert-evaluation timeline figures.

Usage:
  python scripts/chapter7_timeline_figures.py
  python scripts/chapter7_timeline_figures.py --limit 3
  python scripts/chapter7_timeline_figures.py --burst-influence 0.75

The script reads showcase windows, rebuilds the hourly count series, and renders
per-window figures plus a compact summary sheet comparing fixed and adaptive
timelines for the same windows.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from compare_density_burstiness_weights import (
    DEFAULT_CSV_PATH,
    WindowRow,
    build_hourly_series,
    build_timestamps_from_hourly_counts,
    compute_adaptive_maps,
    parse_window_row,
    slice_window,
)


DEFAULT_WINDOWS_PATH = Path('scripts/output/showcase_windows.csv')
DEFAULT_VERIFIED_WINDOWS_PATH = Path('scripts/output/showcase_windows_verified.csv')
DEFAULT_OUTPUT_DIR = Path('scripts/output/chapter7-timelines')
FIGURE_DPI = 240
SUMMARY_COLUMNS = 2
TIMELINE_HEIGHT = 0.28
MAX_HIGHLIGHT_SEGMENTS = 3

BG = '#ffffff'
TEXT = '#0f172a'
MUTED = '#64748b'
GRID = '#e2e8f0'
COUNTS_FILL = '#cbd5e1'
COUNTS_LINE = '#475569'
UNIFORM_FILL = '#dbeafe'
ADAPTIVE_FILL = '#c4b5fd'
UNIFORM_LINE = '#1d4ed8'
ADAPTIVE_LINE = '#7c3aed'


def resolve_default_windows_path() -> Path:
    if DEFAULT_VERIFIED_WINDOWS_PATH.exists():
        return DEFAULT_VERIFIED_WINDOWS_PATH
    return DEFAULT_WINDOWS_PATH


def slugify_window(window: WindowRow) -> str:
    return f'{window.window_days:02d}d-r{window.rank}-{window.start}-to-{window.end}'


def hour_offsets(segment: pd.Series) -> np.ndarray:
    return np.arange(len(segment), dtype=float)


def compute_timeline_layout(
    segment: pd.Series,
    *,
    burst_influence: float,
    kernel_width: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    counts = segment.to_numpy(dtype=float)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    bin_count = len(counts)
    domain = (0.0, float(bin_count * 3600))

    density_map, burstiness_map, adaptive_edges, count_map = compute_adaptive_maps(
        timestamps,
        domain,
        bin_count=bin_count,
        kernel_width=kernel_width,
        burst_influence=burst_influence,
    )

    uniform_edges = np.linspace(domain[0], domain[1], bin_count + 1, dtype=float)
    uniform_positions = uniform_edges[:-1] / 3600.0
    adaptive_positions = adaptive_edges[:-1] / 3600.0
    adaptive_widths = np.diff(adaptive_edges) / 3600.0
    return uniform_positions, adaptive_positions, adaptive_widths, count_map, density_map, burstiness_map


def merge_adjacent_segments(indices: list[int]) -> list[tuple[int, int]]:
    if not indices:
        return []

    segments: list[tuple[int, int]] = []
    start = indices[0]
    end = indices[0]
    for index in indices[1:]:
        if index == end + 1:
            end = index
            continue
        segments.append((start, end))
        start = index
        end = index
    segments.append((start, end))
    return segments


def pick_highlight_segments(count_map: np.ndarray, adaptive_widths: np.ndarray) -> list[tuple[int, int]]:
    if count_map.size == 0:
        return []

    normalized_counts = count_map / max(float(np.max(count_map)), 1.0)
    normalized_widths = adaptive_widths / max(float(np.max(adaptive_widths)), 1e-9)
    emphasis = 0.65 * normalized_widths + 0.35 * normalized_counts
    threshold = float(np.quantile(emphasis, 0.82)) if emphasis.size >= 4 else float(np.max(emphasis))
    selected = [idx for idx, value in enumerate(emphasis) if value >= threshold and value > 0]

    segments = merge_adjacent_segments(selected)
    segments.sort(key=lambda item: float(np.max(emphasis[item[0]:item[1] + 1])), reverse=True)
    return segments[:MAX_HIGHLIGHT_SEGMENTS]


def draw_timeline_row(
    ax: plt.Axes,
    positions: np.ndarray,
    *,
    y: float,
    color: str,
    label: str,
    segments: list[tuple[int, int]],
    is_adaptive: bool,
    adaptive_widths: np.ndarray,
) -> None:
    ax.hlines(y, xmin=float(positions[0]), xmax=float(positions[-1] if len(positions) > 1 else positions[0] + 1), color=TEXT, linewidth=1.3)

    for start, end in segments:
        if is_adaptive:
            x0 = float(positions[start])
            x1 = float(positions[end] + adaptive_widths[end])
        else:
            x0 = float(positions[start])
            x1 = float(positions[end] + 1.0)
        ax.axvspan(x0, x1, ymin=max(0.0, y - TIMELINE_HEIGHT), ymax=min(1.0, y + TIMELINE_HEIGHT), color=color, alpha=0.16)

    for idx, x in enumerate(positions):
        tick_height = 0.16 if idx % 6 else 0.22
        ax.vlines(float(x), y - tick_height, y + tick_height, color=color, linewidth=1.1)

    ax.text(float(positions[0]), y + 0.28, label, color=TEXT, fontsize=10, fontweight='600', ha='left', va='bottom')


def format_window_title(window: WindowRow) -> str:
    return f'{window.window_days}d #{window.rank}  {window.start} to {window.end}'


def render_window_figure(
    window: WindowRow,
    segment: pd.Series,
    output_path: Path,
    *,
    burst_influence: float,
    kernel_width: int,
) -> None:
    uniform_positions, adaptive_positions, adaptive_widths, count_map, density_map, burstiness_map = compute_timeline_layout(
        segment,
        burst_influence=burst_influence,
        kernel_width=kernel_width,
    )
    highlights = pick_highlight_segments(count_map, adaptive_widths)
    x = hour_offsets(segment)

    fig = plt.figure(figsize=(13.4, 6.8), facecolor=BG)
    grid = fig.add_gridspec(2, 1, height_ratios=[2.3, 1.3], hspace=0.16)
    ax_counts = fig.add_subplot(grid[0])
    ax_timeline = fig.add_subplot(grid[1])

    ax_counts.fill_between(x, count_map, color=COUNTS_FILL, alpha=0.95)
    ax_counts.plot(x, count_map, color=COUNTS_LINE, linewidth=1.4)
    if count_map.size:
        scale = float(np.max(count_map))
        ax_counts.plot(x, density_map * scale, color=UNIFORM_LINE, linewidth=1.5, alpha=0.85)
        ax_counts.plot(x, burstiness_map * scale, color=ADAPTIVE_LINE, linewidth=1.5, alpha=0.85)
    for start, end in highlights:
        ax_counts.axvspan(start, end + 1, color=ADAPTIVE_FILL, alpha=0.12)

    ax_counts.set_title(format_window_title(window), loc='left', fontsize=15, fontweight='600', color=TEXT)
    ax_counts.text(
        1.0,
        1.03,
        f'CV={window.cv:.3f}  peak/mean={window.peak_ratio:.3f}  events={window.total_events}',
        transform=ax_counts.transAxes,
        ha='right',
        va='bottom',
        fontsize=10,
        color=MUTED,
    )
    ax_counts.set_ylabel('Hourly events')
    ax_counts.grid(axis='y', color=GRID, linewidth=0.8)
    ax_counts.set_axisbelow(True)
    ax_counts.spines['top'].set_visible(False)
    ax_counts.spines['right'].set_visible(False)

    ax_timeline.set_facecolor(BG)
    draw_timeline_row(
        ax_timeline,
        uniform_positions,
        y=0.70,
        color=UNIFORM_FILL,
        label='Uniform timeline',
        segments=highlights,
        is_adaptive=False,
        adaptive_widths=adaptive_widths,
    )
    draw_timeline_row(
        ax_timeline,
        adaptive_positions,
        y=0.28,
        color=ADAPTIVE_FILL,
        label=f'Adaptive timeline (burst influence {burst_influence:.2f})',
        segments=highlights,
        is_adaptive=True,
        adaptive_widths=adaptive_widths,
    )
    ax_timeline.text(
        1.0,
        0.98,
        'Highlighted spans mark the most expanded intervals under adaptive scaling.',
        transform=ax_timeline.transAxes,
        ha='right',
        va='top',
        fontsize=9,
        color=MUTED,
    )
    ax_timeline.set_xlim(0, max(float(len(segment)), float(adaptive_positions[-1] + adaptive_widths[-1]) if len(adaptive_positions) else 1.0))
    ax_timeline.set_ylim(0, 1)
    ax_timeline.set_xticks([])
    ax_timeline.set_yticks([])
    for spine in ax_timeline.spines.values():
        spine.set_visible(False)

    fig.savefig(output_path.with_suffix('.png'), dpi=FIGURE_DPI, bbox_inches='tight', facecolor=BG)
    fig.savefig(output_path.with_suffix('.svg'), bbox_inches='tight', facecolor=BG)
    plt.close(fig)


def render_summary_sheet(
    windows: list[WindowRow],
    segments: dict[str, pd.Series],
    output_path: Path,
    *,
    burst_influence: float,
    kernel_width: int,
) -> None:
    if not windows:
        return

    rows = int(np.ceil(len(windows) / SUMMARY_COLUMNS))
    fig, axes = plt.subplots(rows, SUMMARY_COLUMNS, figsize=(14, max(3.4 * rows, 4.2)), squeeze=False, facecolor=BG)
    flat_axes = axes.ravel()

    for ax, window in zip(flat_axes, windows):
        segment = segments[slugify_window(window)]
        uniform_positions, adaptive_positions, adaptive_widths, count_map, _, _ = compute_timeline_layout(
            segment,
            burst_influence=burst_influence,
            kernel_width=kernel_width,
        )
        highlights = pick_highlight_segments(count_map, adaptive_widths)

        ax.set_facecolor(BG)
        draw_timeline_row(
            ax,
            uniform_positions,
            y=0.68,
            color=UNIFORM_FILL,
            label='Uniform',
            segments=highlights,
            is_adaptive=False,
            adaptive_widths=adaptive_widths,
        )
        draw_timeline_row(
            ax,
            adaptive_positions,
            y=0.30,
            color=ADAPTIVE_FILL,
            label='Adaptive',
            segments=highlights,
            is_adaptive=True,
            adaptive_widths=adaptive_widths,
        )
        ax.text(0.0, 1.06, format_window_title(window), transform=ax.transAxes, ha='left', va='bottom', fontsize=10, fontweight='600', color=TEXT)
        ax.text(1.0, 1.06, f'CV={window.cv:.2f}  peak/mean={window.peak_ratio:.2f}', transform=ax.transAxes, ha='right', va='bottom', fontsize=9, color=MUTED)
        ax.set_xlim(0, max(float(len(segment)), float(adaptive_positions[-1] + adaptive_widths[-1]) if len(adaptive_positions) else 1.0))
        ax.set_ylim(0, 1)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

    for ax in flat_axes[len(windows):]:
        ax.axis('off')

    fig.suptitle('Chapter 7 expert-evaluation timelines', x=0.06, ha='left', fontsize=15, fontweight='600', color=TEXT)
    fig.tight_layout()
    fig.savefig(output_path.with_suffix('.png'), dpi=FIGURE_DPI, bbox_inches='tight', facecolor=BG)
    fig.savefig(output_path.with_suffix('.svg'), bbox_inches='tight', facecolor=BG)
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description='Render Chapter 7 expert-evaluation timeline figures.')
    parser.add_argument('--csv-path', type=Path, default=DEFAULT_CSV_PATH, help=f'Input CSV (default: {DEFAULT_CSV_PATH})')
    parser.add_argument('--windows-path', type=Path, default=resolve_default_windows_path(), help='Window shortlist CSV. Defaults to the verified shortlist when present.')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help=f'Output directory (default: {DEFAULT_OUTPUT_DIR})')
    parser.add_argument('--burst-influence', type=float, default=1.0, help='Blend weight for adaptive scaling from 0.0 (density) to 1.0 (burstiness).')
    parser.add_argument('--kernel-width', type=int, default=3, help='Smoothing kernel width passed to the adaptive map builder.')
    parser.add_argument('--limit', type=int, default=None, help='Optional limit on the number of windows to render.')
    args = parser.parse_args()

    with args.windows_path.open(newline='') as handle:
        windows = [parse_window_row(row) for row in csv.DictReader(handle)]

    if args.limit is not None:
        windows = windows[:max(args.limit, 0)]
    if not windows:
        raise RuntimeError(f'No windows found in {args.windows_path}')

    hourly = build_hourly_series(args.csv_path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    cached_segments: dict[str, pd.Series] = {}
    for window in windows:
        segment = slice_window(hourly, window.start, window.end)
        slug = slugify_window(window)
        cached_segments[slug] = segment
        render_window_figure(
            window,
            segment,
            args.output_dir / slug,
            burst_influence=args.burst_influence,
            kernel_width=args.kernel_width,
        )
        print(f'Rendered {slug}.png and {slug}.svg')

    render_summary_sheet(
        windows,
        cached_segments,
        args.output_dir / 'chapter7-timeline-summary',
        burst_influence=args.burst_influence,
        kernel_width=args.kernel_width,
    )
    print(f'Rendered summary sheet to {args.output_dir / "chapter7-timeline-summary.png"}')


if __name__ == '__main__':
    main()
