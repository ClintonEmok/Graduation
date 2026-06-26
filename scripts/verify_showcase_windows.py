#!/usr/bin/env python3
"""Verify showcase windows against the live burst API.

Reads `scripts/output/showcase_windows.csv`, queries `/api/adaptive/bursts`
for each window, and writes a verification CSV with the returned burst metrics.
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
from urllib.request import urlopen


CHICAGO_TZ = ZoneInfo('America/Chicago')
DEFAULT_INPUT = Path('scripts/output/showcase_windows.csv')
DEFAULT_OUTPUT = Path('scripts/output/showcase_windows_verified.csv')
DEFAULT_BASE_URL = 'http://localhost:3000'


@dataclass(frozen=True)
class WindowRow:
    window_days: int
    rank: int
    start: str
    end: str
    cv: float
    peak_ratio: float
    total_events: int


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


def date_to_epoch(date_str: str) -> int:
    dt = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=CHICAGO_TZ)
    return int(dt.timestamp())


def query_burst_window(base_url: str, start: str, end: str) -> dict[str, float]:
    params = urlencode({
        'startEpoch': date_to_epoch(start),
        'endEpoch': date_to_epoch(end),
        'granularity': 'daily',
        'spatialFormula': 'balanced',
    })
    url = f'{base_url.rstrip("/")}/api/adaptive/bursts?{params}'
    with urlopen(url, timeout=120) as response:
        payload = json.loads(response.read().decode('utf-8'))

    bins = payload.get('bins', []) or []
    if not bins:
      return {
        'totalB': 0.0,
        'maxCombinedB': 0.0,
        'maxTemporalB': 0.0,
        'maxSpatialB': 0.0,
      }

    return {
        'totalB': float(payload.get('totalB', 0.0)),
        'maxCombinedB': max(float(bin_['combinedB']) for bin_ in bins),
        'maxTemporalB': max(float(bin_['temporalB']) for bin_ in bins),
        'maxSpatialB': max(float(bin_['spatialB']) for bin_ in bins),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Verify showcase windows against the burst API.')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT, help=f'Input CSV (default: {DEFAULT_INPUT})')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT, help=f'Output CSV (default: {DEFAULT_OUTPUT})')
    parser.add_argument('--base-url', default=DEFAULT_BASE_URL, help=f'Next.js base URL (default: {DEFAULT_BASE_URL})')
    args = parser.parse_args()

    with args.input.open(newline='') as f:
        rows = list(csv.DictReader(f))

    verified_rows: list[dict[str, str]] = []
    for row in rows:
        window = parse_window_row(row)
        burst = query_burst_window(args.base_url, window.start, window.end)
        verified_rows.append({
            'window_days': str(window.window_days),
            'rank': str(window.rank),
            'start': window.start,
            'end': window.end,
            'cv': f'{window.cv:.3f}',
            'peak_ratio': f'{window.peak_ratio:.3f}',
            'total_events': str(window.total_events),
            'totalB': f'{burst["totalB"]:.3f}',
            'maxCombinedB': f'{burst["maxCombinedB"]:.3f}',
            'maxTemporalB': f'{burst["maxTemporalB"]:.3f}',
            'maxSpatialB': f'{burst["maxSpatialB"]:.3f}',
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', newline='') as f:
        fieldnames = [
            'window_days', 'rank', 'start', 'end', 'cv', 'peak_ratio', 'total_events',
            'totalB', 'maxCombinedB', 'maxTemporalB', 'maxSpatialB',
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(verified_rows)

    print(f'Wrote verification results to {args.output}')
    for row in verified_rows:
        print(
            f"{row['window_days']:>2}d #{row['rank']}: {row['start']} -> {row['end']} | "
            f"CV={row['cv']} | peak_ratio={row['peak_ratio']} | totalB={row['totalB']} | "
            f"maxCombinedB={row['maxCombinedB']}"
        )


if __name__ == '__main__':
    main()
