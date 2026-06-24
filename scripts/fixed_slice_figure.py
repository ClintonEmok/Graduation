#!/usr/bin/env python3
"""Render a thesis-style conceptual equal-bin diagram.

Usage:
  /Users/clintonemok/miniconda3/bin/python3 scripts/fixed_slice_figure.py
  /Users/clintonemok/miniconda3/bin/python3 scripts/fixed_slice_figure.py --output-dir scripts/output/conceptual-equal-bin-diagram

The figure is intentionally minimal: no title, no annotations, no legend.
It writes one SVG and one PNG for a single landscape diagram.
"""

from __future__ import annotations

import argparse
from pathlib import Path


DEFAULT_OUTPUT_DIR = Path('scripts/output/conceptual-equal-bin-diagram')
FIGURE_SIZE = (11.0, 4.8)
FIGURE_DPI = 300
BG = '#ffffff'
BIN_FILL = '#f5f7fb'
BIN_EDGE = '#c7cfdb'
DOT = '#4c78a8'
DOT_LIGHT = '#9db4cf'
DOT_DARK = '#2f4f73'


def build_diagram():
    import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle

    fig, ax = plt.subplots(figsize=FIGURE_SIZE)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # Equal-width bins with varying event density.
    bin_loads = [28, 4, 22, 1, 12, 40, 5, 18]
    n_bins = len(bin_loads)
    max_dots = max(bin_loads)

    def dot_positions(load: int, x0: float, width: float, idx: int) -> list[tuple[float, float, str]]:
        cols = 5
        rows = 8
        points: list[tuple[float, float, str]] = []
        count = 0
        for row in range(rows):
            for col in range(cols):
                if count >= load:
                    return points
                x = x0 + width * ((col + 0.5) / cols)
                y = 0.16 + 0.68 * ((row + 0.5) / rows)
                shade = DOT_DARK if load > 24 and idx in {0, 5} else DOT
                shade = DOT_LIGHT if load <= 5 else shade
                points.append((x, y, shade))
                count += 1
        return points

    # Draw equal bins.
    for i, load in enumerate(bin_loads):
        x0 = i
        ax.add_patch(Rectangle((x0, 0), 1, 1, facecolor=BIN_FILL, edgecolor=BIN_EDGE, linewidth=1.4))
        for x, y, color in dot_positions(load, x0, 1.0, i):
            ax.scatter(x, y, s=22, color=color, linewidths=0)

    # Add subtle structure lines only.
    ax.axhline(0, color='#92a0b3', linewidth=1.0)
    ax.axhline(1, color='#92a0b3', linewidth=1.0)

    ax.set_xlim(0, n_bins)
    ax.set_ylim(-0.02, 1.02)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    plt.subplots_adjust(left=0.03, right=0.995, top=0.98, bottom=0.05)
    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description='Render a conceptual equal-bin diagram.')
    parser.add_argument(
        '--output-dir',
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f'Output directory for the diagram (default: {DEFAULT_OUTPUT_DIR})',
    )
    args = parser.parse_args()

    try:
        import matplotlib
    except ImportError as error:
        raise RuntimeError(
            'Matplotlib is required. Run this script with a Python environment that has Matplotlib installed, e.g. /Users/clintonemok/miniconda3/bin/python3.'
        ) from error

    matplotlib.use('Agg')

    fig = build_diagram()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    png_path = args.output_dir / 'conceptual-equal-bin-diagram.png'
    svg_path = args.output_dir / 'conceptual-equal-bin-diagram.svg'

    fig.savefig(png_path, dpi=FIGURE_DPI, bbox_inches='tight', facecolor=BG)
    fig.savefig(svg_path, bbox_inches='tight', facecolor=BG)
    print(f'Saved {png_path}')
    print(f'Saved {svg_path}')


if __name__ == '__main__':
    main()
