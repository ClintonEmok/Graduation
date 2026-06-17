#!/usr/bin/env python3
"""Focused burst-aware scaling experiments for thesis figures.

Generates only the useful figures for the adaptive temporal allocation method.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import math
import warnings

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.patches import Rectangle


warnings.filterwarnings('ignore')

sns.set_theme(style='whitegrid', context='notebook', palette='muted')
plt.rcParams['figure.dpi'] = 150
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10

DATA_PATH = Path('data/Crimes_-_2001_to_Present_20260114.csv')
OUTPUT_DIR = Path('burst_aware_experiment_output')
OUTPUT_DIR.mkdir(exist_ok=True)
ADAPTIVE_BURST_INFLUENCE = 0.25
TIMELINE_FIGURE_WARP_FACTOR = 2.0

CITY_BOUNDS = {
  'lat_min': 41.644,
  'lat_max': 42.023,
  'lon_min': -87.940,
  'lon_max': -87.524,
}


@dataclass
class AdaptiveResult:
  bin_edges: np.ndarray
  count_map: np.ndarray
  density_map: np.ndarray
  burstiness_map: np.ndarray
  weight_map: np.ndarray
  adaptive_edges: np.ndarray
  binning_mode: str
  kernel_width: int
  bin_count: int


def clamp_to_bin(index: int, bin_count: int) -> int:
  if index < 0:
    return 0
  if index >= bin_count:
    return bin_count - 1
  return index


def ensure_strictly_monotonic(boundaries: np.ndarray, domain_start: float, domain_end: float) -> np.ndarray:
  result = boundaries.copy()
  result[0] = domain_start
  for i in range(1, len(result)):
    if not np.isfinite(result[i]) or result[i] <= result[i - 1]:
      result[i] = result[i - 1] + 1e-6
  result[-1] = max(domain_end, result[-2] + 1e-6)
  return result


def compute_adaptive_maps(
  timestamps: np.ndarray,
  domain: tuple[float, float],
  *,
  bin_count: int = 64,
  kernel_width: int = 3,
  binning_mode: str = 'uniform-time',
  burst_influence: float = ADAPTIVE_BURST_INFLUENCE,
  warp_factor: float = 1.0,
) -> AdaptiveResult:
  t_start, t_end = domain
  safe_bin_count = max(1, int(bin_count))
  t_span = max(1.0, float(t_end - t_start))
  valid = np.asarray([t for t in timestamps if np.isfinite(t) and t_start <= t <= t_end], dtype=float)

  if valid.size == 0:
    bin_edges = np.linspace(t_start, t_end, safe_bin_count + 1)
    adaptive_edges = np.linspace(t_start, t_end, safe_bin_count + 1)
    zero = np.zeros(safe_bin_count, dtype=float)
    return AdaptiveResult(bin_edges, zero, zero, zero, np.ones(safe_bin_count), adaptive_edges, binning_mode, kernel_width, safe_bin_count)

  sorted_ts = np.sort(valid)
  count_map = np.zeros(safe_bin_count, dtype=float)
  density_input = np.zeros(safe_bin_count, dtype=float)

  if binning_mode == 'uniform-events':
    boundaries = np.zeros(safe_bin_count + 1, dtype=float)
    boundaries[0] = t_start
    boundaries[-1] = t_end
    for edge_index in range(1, safe_bin_count):
      target = (edge_index * len(sorted_ts)) / safe_bin_count
      sample_index = min(len(sorted_ts) - 1, int(math.floor(target)))
      boundaries[edge_index] = sorted_ts[sample_index]
    boundaries = ensure_strictly_monotonic(boundaries, t_start, t_end)
    bin_edges = boundaries

    for t in sorted_ts:
      boundary_index = np.searchsorted(boundaries, t, side='right') - 1
      idx = clamp_to_bin(int(boundary_index), safe_bin_count)
      count_map[idx] += 1

    for i in range(safe_bin_count):
      width = max(1e-6, boundaries[i + 1] - boundaries[i])
      density_input[i] = count_map[i] / width
  else:
    bin_edges = np.linspace(t_start, t_end, safe_bin_count + 1)
    for t in sorted_ts:
      norm = (t - t_start) / t_span
      idx = clamp_to_bin(int(math.floor(norm * safe_bin_count)), safe_bin_count)
      count_map[idx] += 1
    density_input = count_map.copy()

  smoothed_density = density_input.copy()
  if kernel_width > 1:
    smoothed_density = np.zeros_like(density_input)
    for i in range(safe_bin_count):
      start = max(0, i - kernel_width)
      end = min(safe_bin_count, i + kernel_width + 1)
      smoothed_density[i] = np.mean(density_input[start:end]) if end > start else 0

  max_density = max(float(np.max(smoothed_density)), 1.0)
  density_map = np.clip(smoothed_density / max_density, 0, 1)
  weight_map = np.zeros(safe_bin_count, dtype=float)

  burst_counts = np.zeros(safe_bin_count, dtype=float)
  burst_sum = np.zeros(safe_bin_count, dtype=float)
  burst_sum_sq = np.zeros(safe_bin_count, dtype=float)
  if len(sorted_ts) > 1:
    for i in range(1, len(sorted_ts)):
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
    mean = burst_sum[i] / count
    variance = max(0.0, burst_sum_sq[i] / count - mean * mean)
    sigma = math.sqrt(variance)
    denom = sigma + mean
    burstiness = (sigma - mean) / denom if denom > 0 else 0.0
    burstiness_map[i] = max(0.0, min(1.0, (burstiness + 1.0) / 2.0))

  safe_burst_influence = max(0.0, min(1.0, float(burst_influence)))
  # For experiments we allow overshooting beyond the UI's normal 0..1 blend
  # so the visible impact of the mapping can be studied more clearly.
  safe_warp_factor = max(0.0, float(warp_factor))
  for i in range(safe_bin_count):
    blended = ((1 - safe_burst_influence) * density_map[i]) + (safe_burst_influence * burstiness_map[i])
    adaptive_weight = 1 + blended * 5
    weight_map[i] = 1 + (adaptive_weight - 1) * safe_warp_factor

  total_weight = float(np.sum(weight_map)) if np.sum(weight_map) > 0 else float(safe_bin_count)

  adaptive_edges = np.zeros(safe_bin_count + 1, dtype=float)
  adaptive_edges[0] = t_start
  accumulated = 0.0
  for i in range(safe_bin_count):
    accumulated += weight_map[i]
    adaptive_edges[i + 1] = t_start + (accumulated / total_weight) * t_span

  return AdaptiveResult(
    bin_edges=bin_edges,
    count_map=count_map,
    density_map=density_map,
    burstiness_map=burstiness_map,
    weight_map=weight_map,
    adaptive_edges=adaptive_edges,
    binning_mode=binning_mode,
    kernel_width=kernel_width,
    bin_count=safe_bin_count,
  )


def build_timestamps_from_hourly_counts(counts: Iterable[int], start_epoch_sec: int, hour_sec: int = 3600) -> np.ndarray:
  timestamps: list[float] = []
  for hour_index, count in enumerate(counts):
    base = start_epoch_sec + hour_index * hour_sec
    if count <= 0:
      continue
    step = hour_sec / max(count, 1)
    for k in range(count):
      timestamps.append(base + min(hour_sec - 1, (k + 0.5) * step))
  return np.asarray(timestamps, dtype=float)


def plot_uniform_vs_adaptive(ax_uniform, ax_adaptive, result: AdaptiveResult, title: str) -> None:
  linear_widths = np.diff(result.bin_edges)
  adaptive_widths = np.diff(result.adaptive_edges)

  ax_uniform.bar(result.bin_edges[:-1], result.count_map, width=linear_widths, align='edge', color='#64748b', edgecolor='white', linewidth=0.2)
  ax_uniform.set_title(f'{title} | uniform')
  ax_uniform.set_ylabel('Count')

  ax_adaptive.bar(result.adaptive_edges[:-1], result.count_map, width=adaptive_widths, align='edge', color='#0f766e', edgecolor='white', linewidth=0.2)
  ax_adaptive.set_title(f'{title} | adaptive')


def load_2020_hourly_series() -> pd.Series:
  dtypes = {
    'Date': 'string',
    'Latitude': 'float64',
    'Longitude': 'float64',
  }
  chunks = []
  for chunk in pd.read_csv(DATA_PATH, usecols=list(dtypes.keys()), dtype=dtypes, chunksize=250_000, na_values={'': None}):
    chunk['Date'] = pd.to_datetime(chunk['Date'], errors='coerce')
    chunk = chunk.dropna(subset=['Date', 'Latitude', 'Longitude'])
    chunk = chunk[(chunk['Latitude'] != 0) & (chunk['Longitude'] != 0)]
    chunk = chunk[
      chunk['Latitude'].between(CITY_BOUNDS['lat_min'], CITY_BOUNDS['lat_max'])
      & chunk['Longitude'].between(CITY_BOUNDS['lon_min'], CITY_BOUNDS['lon_max'])
    ]
    chunk = chunk[(chunk['Date'] >= '2020-01-01') & (chunk['Date'] <= '2020-12-31 23:59:59')]
    chunks.append(chunk[['Date']])

  df = pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame({'Date': []})
  hourly = df.set_index('Date').resample('1h').size()
  full_index = pd.date_range('2020-01-01', '2020-12-31 23:00:00', freq='1h')
  return hourly.reindex(full_index, fill_value=0)


def load_2020_hourly_series_for_type(primary_type: str) -> pd.Series:
  dtypes = {
    'Date': 'string',
    'Latitude': 'float64',
    'Longitude': 'float64',
    'Primary Type': 'string',
  }
  chunks = []
  for chunk in pd.read_csv(DATA_PATH, usecols=list(dtypes.keys()), dtype=dtypes, chunksize=250_000, na_values={'': None}):
    chunk['Date'] = pd.to_datetime(chunk['Date'], errors='coerce')
    chunk = chunk.dropna(subset=['Date', 'Latitude', 'Longitude', 'Primary Type'])
    chunk = chunk[(chunk['Latitude'] != 0) & (chunk['Longitude'] != 0)]
    chunk = chunk[
      chunk['Latitude'].between(CITY_BOUNDS['lat_min'], CITY_BOUNDS['lat_max'])
      & chunk['Longitude'].between(CITY_BOUNDS['lon_min'], CITY_BOUNDS['lon_max'])
    ]
    chunk = chunk[(chunk['Date'] >= '2020-01-01') & (chunk['Date'] <= '2020-12-31 23:59:59')]
    chunk = chunk[chunk['Primary Type'] == primary_type]
    chunks.append(chunk[['Date']])

  df = pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame({'Date': []})
  hourly = df.set_index('Date').resample('1h').size()
  full_index = pd.date_range('2020-01-01', '2020-12-31 23:00:00', freq='1h')
  return hourly.reindex(full_index, fill_value=0)


def load_top_crime_types(limit: int = 3) -> list[tuple[str, int]]:
  dtypes = {
    'Date': 'string',
    'Latitude': 'float64',
    'Longitude': 'float64',
    'Primary Type': 'string',
  }
  totals: dict[str, int] = {}
  for chunk in pd.read_csv(DATA_PATH, usecols=list(dtypes.keys()), dtype=dtypes, chunksize=250_000, na_values={'': None}):
    chunk['Date'] = pd.to_datetime(chunk['Date'], errors='coerce')
    chunk = chunk.dropna(subset=['Date', 'Latitude', 'Longitude', 'Primary Type'])
    chunk = chunk[(chunk['Latitude'] != 0) & (chunk['Longitude'] != 0)]
    chunk = chunk[
      chunk['Latitude'].between(CITY_BOUNDS['lat_min'], CITY_BOUNDS['lat_max'])
      & chunk['Longitude'].between(CITY_BOUNDS['lon_min'], CITY_BOUNDS['lon_max'])
    ]
    chunk = chunk[(chunk['Date'] >= '2020-01-01') & (chunk['Date'] <= '2020-12-31 23:59:59')]
    counts = chunk['Primary Type'].value_counts()
    for label, count in counts.items():
      totals[label] = totals.get(label, 0) + int(count)
  return sorted(totals.items(), key=lambda item: item[1], reverse=True)[:limit]


def collect_real_windows(hourly: pd.Series, window_hours: int = 24 * 14, step_hours: int = 24 * 7):
  windows = []
  values = hourly.values.astype(float)
  index = hourly.index
  for start in range(0, len(values) - window_hours + 1, step_hours):
    segment = values[start:start + window_hours]
    if np.sum(segment) <= 0:
      continue
    mean = float(np.mean(segment))
    std = float(np.std(segment))
    cv = std / mean if mean > 0 else 0.0
    peak_ratio = float(np.max(segment) / mean) if mean > 0 else 0.0
    windows.append({
      'start': index[start],
      'end': index[start + window_hours - 1] + pd.Timedelta(hours=1),
      'cv': cv,
      'peak_ratio': peak_ratio,
      'total': float(np.sum(segment)),
      'counts': segment,
    })
  return windows


def pick_distinct_windows(windows: list[dict], target_indices: list[int], *, min_gap_hours: int) -> list[dict]:
  if not windows:
    return []

  ranked_by_cv = sorted(windows, key=lambda row: (row['cv'], row['peak_ratio']))
  selected: list[dict] = []
  window_hours = len(ranked_by_cv[0]['counts']) if ranked_by_cv else 0

  def far_enough(candidate: dict) -> bool:
    candidate_start = candidate['start']
    for existing in selected:
      delta_hours = abs((candidate_start - existing['start']).total_seconds()) / 3600
      if delta_hours < max(min_gap_hours, window_hours // 2):
        return False
    return True

  for target_index in target_indices:
    clamped_index = max(0, min(len(ranked_by_cv) - 1, target_index))
    candidate = ranked_by_cv[clamped_index]
    if far_enough(candidate):
      selected.append(candidate)
      continue

    for offset in range(1, len(ranked_by_cv)):
      lower = clamped_index - offset
      upper = clamped_index + offset
      for probe in (lower, upper):
        if 0 <= probe < len(ranked_by_cv):
          alternative = ranked_by_cv[probe]
          if far_enough(alternative):
            selected.append(alternative)
            break
      else:
        continue
      break

  return selected


def select_real_windows(hourly: pd.Series, window_hours: int = 24 * 14, step_hours: int = 24 * 7):
  windows = collect_real_windows(hourly, window_hours=window_hours, step_hours=step_hours)
  if not windows:
    raise ValueError('No real windows available for burst-aware experiments.')

  median_cv = np.median([w['cv'] for w in windows])
  bursty_window = max(windows, key=lambda row: (row['cv'], row['peak_ratio']))
  moderate_window = min(windows, key=lambda row: abs(row['cv'] - median_cv))
  flat_window = min(windows, key=lambda row: (row['cv'], row['peak_ratio']))
  return bursty_window, moderate_window, flat_window


def select_representative_windows(hourly: pd.Series, *, window_hours: int, step_hours: int, count: int) -> list[dict]:
  windows = collect_real_windows(hourly, window_hours=window_hours, step_hours=step_hours)
  if not windows:
    raise ValueError('No representative windows available for burst-aware experiments.')
  ranked = sorted(windows, key=lambda row: (row['cv'], row['peak_ratio']))
  if count <= 1:
    return [ranked[len(ranked) // 2]]
  target_indices = [round(i * (len(ranked) - 1) / (count - 1)) for i in range(count)]
  return pick_distinct_windows(ranked, target_indices, min_gap_hours=step_hours)


def select_seasonal_windows(hourly: pd.Series, *, window_hours: int = 24 * 30, step_hours: int = 24 * 7) -> list[dict]:
  windows = collect_real_windows(hourly, window_hours=window_hours, step_hours=step_hours)
  if not windows:
    raise ValueError('No seasonal windows available for burst-aware experiments.')

  seasonal_specs = [
    ('Winter', {1, 2, 12}),
    ('Summer', {6, 7, 8}),
  ]
  selected = []
  for season_label, months in seasonal_specs:
    season_windows = [window for window in windows if window['start'].month in months]
    if not season_windows:
      continue
    chosen = max(season_windows, key=lambda row: (row['cv'], row['peak_ratio'], row['total']))
    selected.append({
      **chosen,
      'display_label': f"{season_label} 30-day window\n{chosen['start'].date()} to {chosen['end'].date()} | CV={chosen['cv']:.2f}, peak/mean={chosen['peak_ratio']:.2f}",
    })
  return selected


def build_window_from_period(hourly: pd.Series, start: pd.Timestamp, end: pd.Timestamp) -> dict:
  counts = hourly[(hourly.index >= start) & (hourly.index < end)].values.astype(float)
  if counts.size == 0 or np.sum(counts) <= 0:
    raise ValueError('No events available in the requested time window.')

  mean = float(np.mean(counts))
  std = float(np.std(counts))
  cv = std / mean if mean > 0 else 0.0
  peak_ratio = float(np.max(counts) / mean) if mean > 0 else 0.0
  return {
    'start': start,
    'end': end,
    'cv': cv,
    'peak_ratio': peak_ratio,
    'total': float(np.sum(counts)),
    'counts': counts,
  }


def select_crime_type_windows(*, top_n: int = 3, window_hours: int = 24 * 30, step_hours: int = 24 * 14, shared_window: dict | None = None) -> list[dict]:
  selected = []
  for primary_type, total in load_top_crime_types(limit=top_n):
    hourly = load_2020_hourly_series_for_type(primary_type)
    if shared_window is not None:
      try:
        chosen = build_window_from_period(hourly, shared_window['start'], shared_window['end'])
      except ValueError:
        continue
    else:
      windows = collect_real_windows(hourly, window_hours=window_hours, step_hours=step_hours)
      if not windows:
        continue
      chosen = max(windows, key=lambda row: (row['cv'], row['peak_ratio'], row['total']))
    selected.append({
      **chosen,
      'primary_type': primary_type,
      'event_total': total,
      'display_label': f"{primary_type.title()}\n{chosen['start'].date()} to {chosen['end'].date()} | CV={chosen['cv']:.2f}, total={int(chosen['total'])}",
    })
  return selected


def plot_component_diagnostics(ax_counts, ax_density, ax_burst, ax_weight, counts: np.ndarray, result: AdaptiveResult, label: str) -> None:
  x = np.arange(len(counts))
  width = 0.9
  adaptive_widths = np.diff(result.adaptive_edges)
  adaptive_share = adaptive_widths / np.sum(adaptive_widths)

  ax_counts.bar(x, counts, width=width, color='#64748b', edgecolor='white', linewidth=0.15)
  ax_counts.set_title(f'{label}\nHourly counts')
  ax_counts.set_ylabel('Count')

  ax_density.bar(x, result.density_map, width=width, color='#0f766e', edgecolor='white', linewidth=0.15)
  ax_density.set_title('Normalized density')
  ax_density.set_ylim(0, 1.05)

  ax_burst.bar(x, result.burstiness_map, width=width, color='#7c3aed', edgecolor='white', linewidth=0.15)
  ax_burst.set_title('Normalized burstiness')
  ax_burst.set_ylim(0, 1.05)

  ax_weight.bar(x, adaptive_share, width=width, color='#dc2626', edgecolor='white', linewidth=0.15)
  ax_weight.set_title('Final visual-space share')
  ax_weight.set_ylim(0, max(0.03, adaptive_share.max() * 1.1))

  for ax in (ax_counts, ax_density, ax_burst, ax_weight):
    ax.set_xlim(-1, len(counts))
    ax.set_xticks([0, len(counts) // 2, len(counts) - 1])
    ax.set_xticklabels(['start', 'mid', 'end'])


def save_window_diagnostic_figure(window: dict, output_name: str, *, figsize: tuple[float, float], title: str) -> None:
  counts = window['counts'].astype(int)
  timestamps = build_timestamps_from_hourly_counts(counts, 0)
  result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
  label = f"{window['start'].date()} to {window['end'].date()}\nCV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"

  fig, axes = plt.subplots(1, 4, figsize=figsize, sharex=False)
  plot_component_diagnostics(
    axes[0],
    axes[1],
    axes[2],
    axes[3],
    counts,
    result,
    label,
  )
  fig.suptitle(title, fontsize=14, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / output_name, bbox_inches='tight')
  plt.close(fig)


def plot_visual_impact(ax_counts, ax_share, ax_change, ax_curve, counts: np.ndarray, result: AdaptiveResult, label: str) -> None:
  x = np.arange(len(counts))
  width = 0.9
  linear_widths = np.diff(result.bin_edges)
  adaptive_widths = np.diff(result.adaptive_edges)
  linear_share = linear_widths / np.sum(linear_widths)
  adaptive_share = adaptive_widths / np.sum(adaptive_widths)
  share_ratio = adaptive_share / np.maximum(linear_share, 1e-12)

  ax_counts.bar(x, counts, width=width, color='#64748b', edgecolor='white', linewidth=0.15)
  ax_counts.set_title(f'{label}\nHourly counts')
  ax_counts.set_ylabel('Count')

  ax_share.bar(x, linear_share, width=width, color='#cbd5e1', edgecolor='white', linewidth=0.15, label='linear')
  ax_share.bar(x, adaptive_share, width=width * 0.55, color='#dc2626', edgecolor='white', linewidth=0.15, label='adaptive')
  ax_share.set_title('Visual-space share')
  ax_share.set_ylabel('Share')
  ax_share.legend(fontsize=8, loc='upper right')

  ax_change.bar(x, share_ratio, width=width, color='#0f766e', edgecolor='white', linewidth=0.15)
  ax_change.axhline(1.0, color='#111827', linestyle='--', linewidth=1)
  ax_change.set_title('Width change vs linear')
  ax_change.set_ylabel('adaptive / linear')

  normalized_linear = np.linspace(0, 1, len(linear_share) + 1)
  normalized_adaptive = np.concatenate([[0.0], np.cumsum(adaptive_share)])
  ax_curve.plot(normalized_linear, normalized_linear, color='#94a3b8', linewidth=2, linestyle='--', label='linear')
  ax_curve.plot(normalized_linear, normalized_adaptive, color='#7c3aed', linewidth=2.2, label='adaptive')
  ax_curve.set_title('Cumulative warp curve')
  ax_curve.set_xlabel('Original time position')
  ax_curve.set_ylabel('Visual time position')
  ax_curve.set_xlim(0, 1)
  ax_curve.set_ylim(0, 1)
  ax_curve.legend(fontsize=8, loc='upper left')

  for ax in (ax_counts, ax_share, ax_change):
    ax.set_xlim(-1, len(counts))
    ax.set_xticks([0, len(counts) // 2, len(counts) - 1])
    ax.set_xticklabels(['start', 'mid', 'end'])


def plot_warp_factor_sweep(ax, counts: np.ndarray, domain: tuple[float, float], warp_factors: list[float], label: str) -> None:
  linear_x = np.linspace(0, 1, len(counts) + 1)
  ax.plot(linear_x, linear_x, color='#111827', linewidth=2.2, linestyle='--', label='linear')
  colors = ['#c2410c', '#ea580c', '#d97706', '#7c3aed', '#0f766e']
  for color, warp_factor in zip(colors, warp_factors):
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(
      timestamps,
      domain,
      bin_count=len(counts),
      kernel_width=3,
      warp_factor=warp_factor,
    )
    adaptive_share = np.diff(result.adaptive_edges)
    adaptive_share = adaptive_share / np.sum(adaptive_share)
    normalized_adaptive = np.concatenate([[0.0], np.cumsum(adaptive_share)])
    ax.plot(linear_x, normalized_adaptive, color=color, linewidth=2, label=f'w={warp_factor:.2f}')
  ax.set_title(label)
  ax.set_xlabel('Original time position')
  ax.set_ylabel('Visual time position')
  ax.set_xlim(0, 1)
  ax.set_ylim(0, 1)
  ax.legend(fontsize=8, ncol=3, loc='upper left')


def map_timestamps_to_edges(timestamps: np.ndarray, source_edges: np.ndarray, target_edges: np.ndarray) -> np.ndarray:
  positions = np.zeros(len(timestamps), dtype=float)
  if len(source_edges) < 2 or len(target_edges) < 2:
    return positions

  for i, timestamp in enumerate(timestamps):
    source_index = np.searchsorted(source_edges, timestamp, side='right') - 1
    source_index = clamp_to_bin(int(source_index), len(source_edges) - 1)
    source_start = source_edges[source_index]
    source_end = source_edges[source_index + 1]
    target_start = target_edges[source_index]
    target_end = target_edges[source_index + 1]
    source_width = max(source_end - source_start, 1e-9)
    offset = (timestamp - source_start) / source_width
    positions[i] = target_start + offset * (target_end - target_start)
  return positions


def compute_burst_mask(counts: np.ndarray, result: AdaptiveResult) -> np.ndarray:
  adaptive_share = np.diff(result.adaptive_edges)
  adaptive_share = adaptive_share / max(np.sum(adaptive_share), 1e-9)
  linear_share = np.diff(result.bin_edges)
  linear_share = linear_share / max(np.sum(linear_share), 1e-9)
  share_ratio = adaptive_share / np.maximum(linear_share, 1e-12)
  count_threshold = float(np.quantile(counts, 0.8)) if len(counts) > 0 else 0.0
  return (counts >= count_threshold) & ((share_ratio >= 1.2) | (result.density_map >= 0.7))


def compute_peak_expansion_ratio(result: AdaptiveResult) -> float:
  adaptive_share = np.diff(result.adaptive_edges)
  adaptive_share = adaptive_share / max(np.sum(adaptive_share), 1e-9)
  linear_share = np.diff(result.bin_edges)
  linear_share = linear_share / max(np.sum(linear_share), 1e-9)
  share_ratio = adaptive_share / np.maximum(linear_share, 1e-12)
  return float(np.max(share_ratio)) if share_ratio.size > 0 else 1.0


def render_timeline_strip(
  ax,
  counts: np.ndarray,
  edges: np.ndarray,
  event_positions: np.ndarray,
  title: str,
  *,
  burst_mask: np.ndarray,
) -> None:
  burst_color = '#dc2626'
  context_color = '#d1d5db'
  event_color = '#475569'
  highlight_event_color = '#f8fafc'

  for i, count in enumerate(counts):
    left = edges[i]
    width = edges[i + 1] - edges[i]
    color = burst_color if burst_mask[i] else context_color
    ax.add_patch(Rectangle((left, 0.22), width, 0.56, facecolor=color, edgecolor='white', linewidth=0.12))

  if event_positions.size > 0:
    bin_indices = np.searchsorted(edges, event_positions, side='right') - 1
    bin_indices = np.clip(bin_indices, 0, len(counts) - 1)
    burst_events = burst_mask[bin_indices]
    order = np.arange(event_positions.size)
    y_positions = 0.08 + (order % 9) * 0.09
    ax.scatter(event_positions[~burst_events], y_positions[~burst_events], s=4, color=event_color, alpha=0.45, linewidths=0)
    ax.scatter(event_positions[burst_events], y_positions[burst_events], s=4, color=highlight_event_color, alpha=0.9, linewidths=0)

  ax.set_title(title)
  ax.set_xlim(edges[0], edges[-1])
  ax.set_ylim(0, 1)
  ax.set_yticks([])
  ax.set_xticks([edges[0], (edges[0] + edges[-1]) / 2, edges[-1]])
  ax.set_xticklabels(['start', 'mid', 'end'])
  for spine in ax.spines.values():
    spine.set_visible(False)


def plot_before_after(ax_before, ax_after, counts: np.ndarray, result: AdaptiveResult, label: str) -> None:
  linear_widths = np.diff(result.bin_edges)
  adaptive_widths = np.diff(result.adaptive_edges)

  ax_before.bar(result.bin_edges[:-1], result.count_map, width=linear_widths, align='edge', color='#94a3b8', edgecolor='white', linewidth=0.15)
  ax_before.set_title(f'{label}\nBefore: linear time')
  ax_before.set_ylabel('Count')

  ax_after.bar(result.adaptive_edges[:-1], result.count_map, width=adaptive_widths, align='edge', color='#dc2626', edgecolor='white', linewidth=0.15)
  ax_after.set_title('After: adaptive time')


def plot_timeline_before_after(ax_before, ax_after, counts: np.ndarray, result: AdaptiveResult, timestamps: np.ndarray, label: str) -> None:
  linear_positions = map_timestamps_to_edges(timestamps, result.bin_edges, result.bin_edges)
  adaptive_positions = map_timestamps_to_edges(timestamps, result.bin_edges, result.adaptive_edges)
  burst_mask = compute_burst_mask(counts, result)
  render_timeline_strip(ax_before, counts, result.bin_edges, linear_positions, f'{label}\nBefore: linear timeline', burst_mask=burst_mask)
  render_timeline_strip(ax_after, counts, result.adaptive_edges, adaptive_positions, 'After: adaptive timeline', burst_mask=burst_mask)


def save_before_after_grid(windows: list[dict], output_name: str, title: str, *, figsize: tuple[float, float], warp_factor: float = 1.0) -> None:
  fig, axes = plt.subplots(len(windows), 2, figsize=figsize, sharex=False)
  if len(windows) == 1:
    axes = np.asarray([axes])

  for row_index, window in enumerate(windows):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3, warp_factor=warp_factor)
    label = f"{window['start'].date()} to {window['end'].date()} | CV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"
    plot_before_after(axes[row_index, 0], axes[row_index, 1], counts, result, label)

  fig.suptitle(title, fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / output_name, bbox_inches='tight')
  plt.close(fig)


def save_timeline_before_after_grid(windows: list[dict], output_name: str, title: str, *, figsize: tuple[float, float], warp_factor: float = TIMELINE_FIGURE_WARP_FACTOR) -> None:
  fig, axes = plt.subplots(len(windows), 2, figsize=figsize, sharex=False)
  if len(windows) == 1:
    axes = np.asarray([axes])

  for row_index, window in enumerate(windows):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3, warp_factor=warp_factor)
    label = window.get('display_label', f"{window['start'].date()} to {window['end'].date()} | CV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}")
    plot_timeline_before_after(axes[row_index, 0], axes[row_index, 1], counts, result, timestamps, label)

  fig.suptitle(title, fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / output_name, bbox_inches='tight')
  plt.close(fig)


def save_timeline_warp_factor_compare(window: dict, output_name: str, title: str, *, warp_factors: list[float], figsize: tuple[float, float]) -> None:
  counts = window['counts'].astype(int)
  timestamps = build_timestamps_from_hourly_counts(counts, 0)
  base_result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3, warp_factor=1.0)
  burst_mask = compute_burst_mask(counts, base_result)

  fig, axes = plt.subplots(1, len(warp_factors) + 1, figsize=figsize, sharex=False)
  linear_positions = map_timestamps_to_edges(timestamps, base_result.bin_edges, base_result.bin_edges)
  render_timeline_strip(axes[0], counts, base_result.bin_edges, linear_positions, 'Linear baseline', burst_mask=burst_mask)
  axes[0].text(0.02, 0.94, 'x1.0 visual width', transform=axes[0].transAxes, fontsize=9, color='#475569', va='top')

  for ax, warp_factor in zip(axes[1:], warp_factors):
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3, warp_factor=warp_factor)
    adaptive_positions = map_timestamps_to_edges(timestamps, result.bin_edges, result.adaptive_edges)
    render_timeline_strip(ax, counts, result.adaptive_edges, adaptive_positions, f'Adaptive w={warp_factor:.1f}', burst_mask=burst_mask)
    peak_expansion = compute_peak_expansion_ratio(result)
    ax.text(0.02, 0.94, f'x{peak_expansion:.1f} peak width', transform=ax.transAxes, fontsize=9, color='#475569', va='top')

  fig.suptitle(title, fontsize=14, fontweight='bold')
  fig.text(
    0.5,
    0.90,
    f"{window['start'].date()} to {window['end'].date()} | CV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}",
    ha='center',
    fontsize=10.5,
    color='#475569',
  )
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / output_name, bbox_inches='tight')
  plt.close(fig)


def main() -> None:
  # Experiment 1: canonical patterns
  patterns = {
    'Uniform activity': [4] * 48,
    'Single sharp burst': [1] * 48,
    'Repeated daily peaks': [1,1,1,1,2,3,5,7,9,8,6,4] * 4,
    'Unequal multi-burst': [1] * 48,
  }
  single = patterns['Single sharp burst']
  for i in range(18, 22):
    single[i] = 16
  unequal = patterns['Unequal multi-burst']
  for i in range(8, 12):
    unequal[i] = 10
  for i in range(30, 34):
    unequal[i] = 20

  fig, axes = plt.subplots(len(patterns), 2, figsize=(14, 12), sharex=False)
  for row_index, (label, counts) in enumerate(patterns.items()):
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
    plot_uniform_vs_adaptive(axes[row_index, 0], axes[row_index, 1], result, label)
  fig.suptitle('Canonical burst-aware scaling cases', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_canonical_patterns.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 2: real data windows
  hourly = load_2020_hourly_series()
  bursty_window, moderate_window, flat_window = select_real_windows(hourly)
  seasonal_30d = select_seasonal_windows(hourly, window_hours=24 * 30, step_hours=24 * 7)
  representative_14d = select_representative_windows(hourly, window_hours=24 * 14, step_hours=24 * 7, count=4)
  representative_30d = select_representative_windows(hourly, window_hours=24 * 30, step_hours=24 * 14, count=3)
  representative_90d = select_representative_windows(hourly, window_hours=24 * 90, step_hours=24 * 30, count=2)
  citywide_windows_30d = collect_real_windows(hourly, window_hours=24 * 30, step_hours=24 * 14)
  shared_crime_type_window = max(citywide_windows_30d, key=lambda row: (row['cv'], row['peak_ratio'], row['total']))
  crime_type_windows = select_crime_type_windows(top_n=3, window_hours=24 * 30, step_hours=24 * 14, shared_window=shared_crime_type_window)
  fig, axes = plt.subplots(2, 2, figsize=(14, 8))
  for row_index, window in enumerate([bursty_window, flat_window]):
    timestamps = build_timestamps_from_hourly_counts(window['counts'].astype(int), 0)
    result = compute_adaptive_maps(timestamps, (0, len(window['counts']) * 3600), bin_count=len(window['counts']), kernel_width=3)
    label = f"{window['start'].date()} to {window['end'].date()} | CV={window['cv']:.2f}"
    plot_uniform_vs_adaptive(axes[row_index, 0], axes[row_index, 1], result, label)
  fig.suptitle('Real-data temporal windows: linear versus adaptive allocation', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_real_windows_comparison.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 2a: explicit before/after examples across more 14-day windows
  save_before_after_grid(
    representative_14d,
    'burst_before_after_14d.png',
    'Before and after adaptive scaling across representative 14-day windows',
    figsize=(16, 10),
  )

  save_timeline_before_after_grid(
    representative_14d,
    'burst_timeline_before_after_14d.png',
    'Timeline view before and after adaptive scaling across representative 14-day windows (exaggerated for legibility)',
    figsize=(16, 8.6),
  )

  # Experiment 2a-large: larger-period before/after examples
  save_before_after_grid(
    representative_30d,
    'burst_before_after_30d.png',
    'Before and after adaptive scaling across representative 30-day windows',
    figsize=(16, 8.5),
  )

  save_timeline_before_after_grid(
    representative_30d,
    'burst_timeline_before_after_30d.png',
    'Timeline view before and after adaptive scaling across representative 30-day windows (exaggerated for legibility)',
    figsize=(16, 6.9),
  )

  save_timeline_before_after_grid(
    seasonal_30d,
    'burst_timeline_seasonal_30d.png',
    'Seasonal comparison of timeline-space reallocation (exaggerated for legibility)',
    figsize=(16, 5.2),
  )

  save_timeline_before_after_grid(
    representative_90d,
    'burst_timeline_before_after_90d.png',
    'Timeline view before and after adaptive scaling across representative 90-day windows (exaggerated for legibility)',
    figsize=(16, 5.0),
  )

  if crime_type_windows:
    save_timeline_before_after_grid(
      crime_type_windows,
      'burst_timeline_crime_types_30d.png',
      'Timeline view before and after adaptive scaling on top crime types in the same 30-day window (exaggerated for legibility)',
      figsize=(16, 6.8),
    )

  # Experiment 2b: real data diagnostics for hybrid weighting components
  fig, axes = plt.subplots(3, 4, figsize=(18, 11), sharex=False)
  for row_index, window in enumerate([bursty_window, moderate_window, flat_window]):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
    label = f"{window['start'].date()} to {window['end'].date()}\nCV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"
    plot_component_diagnostics(
      axes[row_index, 0],
      axes[row_index, 1],
      axes[row_index, 2],
      axes[row_index, 3],
      counts,
      result,
      label,
    )
  fig.suptitle('Hybrid burst-aware allocation on real data: density, burstiness, and final space allocation', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_real_windows_diagnostics.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 2c: individual real data diagnostics for thesis callouts/appendix use
  save_window_diagnostic_figure(
    bursty_window,
    'burst_window_bursty_diagnostics.png',
    figsize=(16, 3.8),
    title='Bursty real-data window: hybrid density, burstiness, and final allocation',
  )
  save_window_diagnostic_figure(
    moderate_window,
    'burst_window_moderate_diagnostics.png',
    figsize=(16, 3.8),
    title='Moderately variable real-data window: hybrid density, burstiness, and final allocation',
  )
  save_window_diagnostic_figure(
    flat_window,
    'burst_window_flat_diagnostics.png',
    figsize=(16, 3.8),
    title='Flatter real-data window: hybrid density, burstiness, and final allocation',
  )

  # Experiment 2d: focused contrast figure for the strongest two use cases
  fig, axes = plt.subplots(2, 4, figsize=(18, 7.5), sharex=False)
  for row_index, window in enumerate([bursty_window, flat_window]):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
    label = f"{window['start'].date()} to {window['end'].date()}\nCV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"
    plot_component_diagnostics(
      axes[row_index, 0],
      axes[row_index, 1],
      axes[row_index, 2],
      axes[row_index, 3],
      counts,
      result,
      label,
    )
  fig.suptitle('Contrasting real-data windows: irregular burst versus flatter temporal structure', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_real_windows_contrast_2x4.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 2e: direct visual impact of the warp on contrasting windows
  fig, axes = plt.subplots(2, 4, figsize=(18, 7.8), sharex=False)
  for row_index, window in enumerate([bursty_window, flat_window]):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
    label = f"{window['start'].date()} to {window['end'].date()}\nCV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"
    plot_visual_impact(
      axes[row_index, 0],
      axes[row_index, 1],
      axes[row_index, 2],
      axes[row_index, 3],
      counts,
      result,
      label,
    )
  fig.suptitle('Direct visual impact of the adaptive mapping: expansion and compression versus linear time', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_visual_impact_2x4.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 2f: warp-factor sweep to show visible strength control
  fig, axes = plt.subplots(1, 2, figsize=(14, 5.5))
  warp_factors = [0.0, 0.5, 1.0, 2.0, 3.0]
  plot_warp_factor_sweep(
    axes[0],
    bursty_window['counts'].astype(int),
    (0, len(bursty_window['counts']) * 3600),
    warp_factors,
    'Bursty window: warp-factor sweep',
  )
  plot_warp_factor_sweep(
    axes[1],
    flat_window['counts'].astype(int),
    (0, len(flat_window['counts']) * 3600),
    warp_factors,
    'Flatter window: warp-factor sweep',
  )
  fig.suptitle('Visible strength of the adaptive mapping under different warp factors', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_warp_factor_sweep.png', bbox_inches='tight')
  plt.close(fig)

  save_timeline_warp_factor_compare(
    bursty_window,
    'burst_timeline_warp_factor_compare.png',
    'Same bursty window under increasing warp factors',
    warp_factors=[1.0, 2.0, 3.0],
    figsize=(16, 3.8),
  )

  # Experiment 2g: direct impact on larger 30-day windows
  fig, axes = plt.subplots(len(representative_30d), 4, figsize=(18, 10), sharex=False)
  if len(representative_30d) == 1:
    axes = np.asarray([axes])
  for row_index, window in enumerate(representative_30d):
    counts = window['counts'].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=len(counts), kernel_width=3)
    label = f"{window['start'].date()} to {window['end'].date()}\n30-day window | CV={window['cv']:.2f}, peak/mean={window['peak_ratio']:.2f}"
    plot_visual_impact(
      axes[row_index, 0],
      axes[row_index, 1],
      axes[row_index, 2],
      axes[row_index, 3],
      counts,
      result,
      label,
    )
  fig.suptitle('Direct visual impact of the adaptive mapping on larger 30-day windows', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_visual_impact_30d.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 3: bin-count sensitivity
  bursty_counts = bursty_window['counts'].astype(int)
  bursty_ts = build_timestamps_from_hourly_counts(bursty_counts, 0)
  bin_counts = [24, 48, 96, 192]
  rows = []
  for bin_count in bin_counts:
    result = compute_adaptive_maps(bursty_ts, (0, len(bursty_counts) * 3600), bin_count=bin_count, kernel_width=3)
    width_shares = np.diff(result.adaptive_edges) / (result.adaptive_edges[-1] - result.adaptive_edges[0])
    rows.append({
      'bin_count': bin_count,
      'max_width_share': float(np.max(width_shares)),
      'min_width_share': float(np.min(width_shares)),
      'width_ratio': float(np.max(width_shares) / max(np.min(width_shares), 1e-9)),
      'entropy': float(-np.sum(width_shares * np.log(np.clip(width_shares, 1e-12, None)))),
    })
  sensitivity = pd.DataFrame(rows)
  fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
  axes[0].plot(sensitivity['bin_count'], sensitivity['width_ratio'], marker='o', color='#0f766e')
  axes[0].set_title('Compression ratio by bin count')
  axes[0].set_xlabel('Bin count')
  axes[0].set_ylabel('Max/min visual-width ratio')
  axes[1].plot(sensitivity['bin_count'], sensitivity['entropy'], marker='o', color='#7c3aed')
  axes[1].set_title('Allocation entropy by bin count')
  axes[1].set_xlabel('Bin count')
  axes[1].set_ylabel('Entropy of visual allocation')
  fig.suptitle('Bin-count sensitivity on a bursty real-data window', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_bin_count_sensitivity.png', bbox_inches='tight')
  plt.close(fig)

  # Experiment 4: window-shift stability
  base_start = hourly.index.get_loc(bursty_window['start'])
  window_hours = len(bursty_window['counts'])
  shift_offsets = [-24, -12, 0, 12, 24]
  fig, axes = plt.subplots(2, 1, figsize=(14, 7), sharex=False)
  for offset in shift_offsets:
    start_index = max(0, min(len(hourly) - window_hours, base_start + offset))
    counts = hourly.values[start_index:start_index + window_hours].astype(int)
    timestamps = build_timestamps_from_hourly_counts(counts, 0)
    result = compute_adaptive_maps(timestamps, (0, len(counts) * 3600), bin_count=96, kernel_width=3)
    width_shares = np.diff(result.adaptive_edges)
    normalized = width_shares / np.sum(width_shares)
    axes[0].plot(normalized, label=f'{offset:+}h')
    axes[1].plot(result.density_map, label=f'{offset:+}h')
  axes[0].set_title('Visual-space allocation under small window shifts')
  axes[0].set_ylabel('Normalized bin width')
  axes[0].legend(ncol=5, fontsize=8)
  axes[1].set_title('Normalized density under small window shifts')
  axes[1].set_ylabel('Density')
  axes[1].set_xlabel('Adaptive bin index')
  fig.suptitle('Local stability of the adaptive allocation', fontsize=15, fontweight='bold')
  fig.tight_layout()
  fig.savefig(OUTPUT_DIR / 'burst_window_stability.png', bbox_inches='tight')
  plt.close(fig)

  # Save summary
  summary = pd.DataFrame([
    {
      'bursty_window_start': bursty_window['start'].isoformat(),
      'bursty_window_end': bursty_window['end'].isoformat(),
      'bursty_window_cv': bursty_window['cv'],
      'moderate_window_start': moderate_window['start'].isoformat(),
      'moderate_window_end': moderate_window['end'].isoformat(),
      'moderate_window_cv': moderate_window['cv'],
      'flat_window_start': flat_window['start'].isoformat(),
      'flat_window_end': flat_window['end'].isoformat(),
      'flat_window_cv': flat_window['cv'],
      'rep14_first_start': representative_14d[0]['start'].isoformat(),
      'rep14_last_start': representative_14d[-1]['start'].isoformat(),
      'rep30_first_start': representative_30d[0]['start'].isoformat(),
      'rep30_last_start': representative_30d[-1]['start'].isoformat(),
      'rep90_first_start': representative_90d[0]['start'].isoformat(),
      'rep90_last_start': representative_90d[-1]['start'].isoformat(),
      'winter_30d_start': seasonal_30d[0]['start'].isoformat() if seasonal_30d else None,
      'summer_30d_start': seasonal_30d[-1]['start'].isoformat() if seasonal_30d else None,
      'crime_type_1': crime_type_windows[0]['primary_type'] if len(crime_type_windows) > 0 else None,
      'crime_type_2': crime_type_windows[1]['primary_type'] if len(crime_type_windows) > 1 else None,
      'crime_type_3': crime_type_windows[2]['primary_type'] if len(crime_type_windows) > 2 else None,
    }
  ])
  summary.to_csv(OUTPUT_DIR / 'burst_experiment_summary.csv', index=False)


if __name__ == '__main__':
  main()
