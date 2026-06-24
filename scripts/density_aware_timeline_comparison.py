#!/usr/bin/env python3
"""Render a uniform vs density-aware timeline comparison as SVG.

Usage:
  python scripts/density_aware_timeline_comparison.py
  python scripts/density_aware_timeline_comparison.py --output scripts/output/density-aware-timeline-comparison.svg

The output is a self-contained SVG so the script runs with the Python standard
library only.
"""

from __future__ import annotations

import argparse
from pathlib import Path


DEFAULT_OUTPUT = Path('scripts/output/density-aware-timeline-comparison.svg')
WIDTH = 1200
HEIGHT = 520
MARGIN_X = 80
LINE_START_X = 220
LINE_END_X = 1120
TOP_Y = 165
BOTTOM_Y = 355
LABEL_COLOR = '#111827'
ACCENT_COLOR = '#6b7280'
UNIFORM_FILL = '#e5e7eb'
ADAPTIVE_FILL = '#d1d5db'
BG_COLOR = '#ffffff'


def build_bursty_events() -> list[float]:
    return [
        2.0,
        9.5,
        11.8, 12.0, 12.15, 12.3, 12.45, 12.65, 12.8, 13.0, 13.15, 13.3,
        24.5,
        32.0,
        38.2, 38.4, 38.55, 38.7, 38.9, 39.15, 39.35, 39.55, 39.8,
        52.0,
        61.0,
        72.1, 72.3, 72.45, 72.6, 72.8, 73.0, 73.25,
        83.0,
        96.0,
    ]


def warp_event_positions(events: list[float], exponent: float = 0.45) -> list[float]:
    if len(events) < 2:
        return events[:]

    warped = [events[0]]
    for previous, current in zip(events, events[1:]):
        gap = max(current - previous, 1e-6)
        warped.append(warped[-1] + gap ** exponent)

    source_span = events[-1] - events[0]
    warped_span = warped[-1] - warped[0]
    scale = source_span / warped_span if warped_span else 1.0
    return [events[0] + (value - warped[0]) * scale for value in warped]


def map_to_x_positions(values: list[float]) -> list[float]:
    domain_min = min(values)
    domain_max = max(values)
    span = domain_max - domain_min
    if span == 0:
        return [LINE_START_X for _ in values]

    pixel_span = LINE_END_X - LINE_START_X
    return [LINE_START_X + ((value - domain_min) / span) * pixel_span for value in values]


def rect(x: float, y: float, width: float, height: float, fill: str, opacity: float) -> str:
    return (
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" '
        f'fill="{fill}" fill-opacity="{opacity:.2f}" rx="4" ry="4" />'
    )


def line(x1: float, y1: float, x2: float, y2: float, stroke: str, width: float) -> str:
    return (
        f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
        f'stroke="{stroke}" stroke-width="{width:.2f}" stroke-linecap="round" />'
    )


def text(x: float, y: float, value: str, size: int, fill: str, weight: str = '400', anchor: str = 'start') -> str:
    escaped = (
        value.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
    )
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" fill="{fill}" font-size="{size}" '
        f'font-weight="{weight}" font-family="Inter, Helvetica, Arial, sans-serif" '
        f'text-anchor="{anchor}">{escaped}</text>'
    )


def build_timeline_group(y: float, label: str, note: str, x_positions: list[float], fill: str) -> str:
    parts: list[str] = []
    parts.append(text(MARGIN_X, y - 18, label, 24, LABEL_COLOR, weight='600'))
    parts.append(text(LINE_END_X, y + 52, note, 15, ACCENT_COLOR, anchor='end'))
    parts.append(line(LINE_START_X, y, LINE_END_X, y, LABEL_COLOR, 2.2))

    burst_windows = [(2, 11), (14, 22), (25, 31)]
    for start_index, end_index in burst_windows:
        start_x = x_positions[start_index] - 4
        end_x = x_positions[end_index] + 4
        parts.append(rect(start_x, y - 24, end_x - start_x, 48, fill, 0.85))

    for x in x_positions:
        parts.append(line(x, y - 18, x, y + 18, LABEL_COLOR, 2.0))

    return '\n'.join(parts)


def build_svg() -> str:
    events = build_bursty_events()
    warped_events = warp_event_positions(events)
    uniform_x = map_to_x_positions(events)
    adaptive_x = map_to_x_positions(warped_events)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
        '<title id="title">Uniform versus density-aware timeline comparison</title>',
        '<desc id="desc">Two timelines for the same bursty crime event sequence. The density-aware view allocates more display space to dense bursts and compresses sparse gaps.</desc>',
        rect(0, 0, WIDTH, HEIGHT, BG_COLOR, 1.0),
        text(MARGIN_X, 70, 'Comparing Uniform and Density-Aware Timelines for the Same Event Sequence', 28, LABEL_COLOR, weight='600'),
        text(MARGIN_X, 102, 'Same events, different allocation of display space across time.', 17, ACCENT_COLOR),
        build_timeline_group(
            TOP_Y,
            'Uniform',
            'Dense bursts collapse into narrow bands',
            uniform_x,
            UNIFORM_FILL,
        ),
        build_timeline_group(
            BOTTOM_Y,
            'Density-aware',
            'Dense periods receive more display space',
            adaptive_x,
            ADAPTIVE_FILL,
        ),
        text((LINE_START_X + LINE_END_X) / 2, HEIGHT - 36, 'Time', 18, LABEL_COLOR, anchor='middle'),
        '</svg>',
    ]
    return '\n'.join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description='Render a density-aware timeline comparison SVG.')
    parser.add_argument(
        '--output',
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f'Output SVG path (default: {DEFAULT_OUTPUT})',
    )
    args = parser.parse_args()

    svg = build_svg()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(svg, encoding='utf-8')
    print(f'Saved figure to {args.output}')


if __name__ == '__main__':
    main()
