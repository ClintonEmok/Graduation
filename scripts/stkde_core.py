from __future__ import annotations

import csv
import math
import time
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


METERS_PER_LAT_DEGREE = 111_320
TEMPORAL_BUCKET_SIZE_SEC = 3600
CITY_BOUNDS = {
    'lat_min': 41.644,
    'lat_max': 42.023,
    'lon_min': -87.940,
    'lon_max': -87.524,
}

BG = '#ffffff'
INK = '#18202a'
SUBTLE = '#687482'
GRID = '#d8e0e8'
RED = '#b22222'
RED_DARK = '#7d1717'


def gaussian_kernel(distance: np.ndarray, sigma: float) -> np.ndarray:
    return np.exp(-0.5 * (distance / sigma) ** 2)


def epanechnikov_kernel(distance: np.ndarray, bandwidth: float) -> np.ndarray:
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, 0.75 * (1 - u ** 2), 0)


def uniform_kernel(distance: np.ndarray, bandwidth: float) -> np.ndarray:
    return np.where(np.abs(distance) <= bandwidth, 0.5, 0)


def quartic_biweight_kernel(distance: np.ndarray, bandwidth: float) -> np.ndarray:
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, (15 / 16) * (1 - u ** 2) ** 2, 0)


def triangular_kernel(distance: np.ndarray, bandwidth: float) -> np.ndarray:
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, 1 - np.abs(u), 0)


KERNEL_FNS = {
    'gaussian': gaussian_kernel,
    'epanechnikov': epanechnikov_kernel,
    'uniform': uniform_kernel,
    'quartic': quartic_biweight_kernel,
    'triangular': triangular_kernel,
}


def meters_to_lat_deg(meters: float) -> float:
    return meters / METERS_PER_LAT_DEGREE


def meters_to_lon_deg(meters: float, lat: float) -> float:
    return meters / (METERS_PER_LAT_DEGREE * np.cos(np.radians(lat)))


def parse_full_date_parts(date_str: str) -> tuple[int, int, float]:
    month = int(date_str[0:2])
    day = int(date_str[3:5])
    year = int(date_str[6:10])
    hour12 = int(date_str[11:13])
    minute = int(date_str[14:16])
    second = int(date_str[17:19])
    is_pm = date_str[20:22] == 'PM'
    hour24 = (hour12 % 12) + (12 if is_pm else 0)
    timestamp = time.mktime((year, month, day, hour24, minute, second, 0, 0, -1))
    return year, hour24, timestamp


def load_chicago_subset(csv_path: Path, sample_size: int = 10_000, year: int = 2020, seed: int = 42):
    rng = np.random.default_rng(seed)
    rows: list[tuple[float, float, int]] = []
    seen = 0

    with csv_path.open(newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx_date = header.index('Date')
        idx_lat = header.index('Latitude')
        idx_lon = header.index('Longitude')

        for row in reader:
            try:
                lat = float(row[idx_lat])
                lon = float(row[idx_lon])
                if not (CITY_BOUNDS['lat_min'] <= lat <= CITY_BOUNDS['lat_max'] and CITY_BOUNDS['lon_min'] <= lon <= CITY_BOUNDS['lon_max']):
                    continue
                year_val, _, ts = parse_full_date_parts(row[idx_date])
                if year_val != year:
                    continue
            except (ValueError, IndexError):
                continue

            seen += 1
            record = (lon, lat, int(ts))
            if len(rows) < sample_size:
                rows.append(record)
            else:
                j = int(rng.integers(0, seen))
                if j < sample_size:
                    rows[j] = record

    if not rows:
        raise ValueError(f'No Chicago crime events found in {csv_path} for year={year}')

    sample = np.asarray(rows, dtype=np.float64)
    lons = sample[:, 0]
    lats = sample[:, 1]
    timestamps = sample[:, 2].astype(np.int64)
    return lons, lats, timestamps


@dataclass
class STKDEConfig:
    spatial_bw_m: int = 750
    temporal_bw_h: int = 24
    grid_cell_m: int = 500
    top_k: int = 12
    min_support: int = 5
    time_window_h: int = 24
    kernel: str = 'gaussian'
    bbox: list[float] | None = None

    def __post_init__(self) -> None:
        if self.bbox is None:
            self.bbox = [CITY_BOUNDS['lon_min'], CITY_BOUNDS['lat_min'], CITY_BOUNDS['lon_max'], CITY_BOUNDS['lat_max']]

    @property
    def spatial_bandwidth_m(self) -> int:
        return self.spatial_bw_m

    @property
    def temporal_bandwidth_h(self) -> int:
        return self.temporal_bw_h


class STKDEEngine:
    def __init__(self, config: STKDEConfig):
        self.cfg = config
        self._grid = None
        self._support = None
        self._intensity = None

    def build_grid(self) -> None:
        c = self.cfg
        min_lon, min_lat, max_lon, max_lat = c.bbox
        mean_lat = (min_lat + max_lat) / 2
        lat_cell = meters_to_lat_deg(c.grid_cell_m)
        lon_cell = meters_to_lon_deg(c.grid_cell_m, mean_lat)
        lat_span = max(1e-6, max_lat - min_lat)
        lon_span = max(1e-6, max_lon - min_lon)
        rows = max(1, int(np.ceil(lat_span / lat_cell)))
        cols = max(1, int(np.ceil(lon_span / lon_cell)))
        self._grid = {
            'min_lon': min_lon,
            'min_lat': min_lat,
            'max_lon': max_lon,
            'max_lat': max_lat,
            'rows': rows,
            'cols': cols,
            'lat_cell_deg': lat_span / rows,
            'lon_cell_deg': lon_span / cols,
            'mean_lat': mean_lat,
        }

    def _cell_idx(self, lon: float, lat: float) -> int:
        g = self._grid
        c = int(np.clip((lon - g['min_lon']) / g['lon_cell_deg'], 0, g['cols'] - 1))
        r = int(np.clip((lat - g['min_lat']) / g['lat_cell_deg'], 0, g['rows'] - 1))
        return r * g['cols'] + c

    def _centroid(self, idx: int) -> tuple[float, float]:
        g = self._grid
        r, c = divmod(idx, g['cols'])
        return g['min_lon'] + (c + 0.5) * g['lon_cell_deg'], g['min_lat'] + (r + 0.5) * g['lat_cell_deg']

    def compute_support(self, lons, lats, timestamps):
        if self._grid is None:
            self.build_grid()
        n = self._grid['rows'] * self._grid['cols']
        support = np.zeros(n, dtype=np.float64)
        cell_ts = [[] for _ in range(n)]
        for lon, lat, ts in zip(lons, lats, timestamps):
            idx = self._cell_idx(float(lon), float(lat))
            support[idx] += 1
            cell_ts[idx].append(int(ts))
        self._support = support
        self._cell_ts = cell_ts
        return support

    def _bucketize_timestamps(self, timestamps):
        if not timestamps:
            return []
        counts = {}
        for ts in timestamps:
            bucket = int(ts // TEMPORAL_BUCKET_SIZE_SEC) * TEMPORAL_BUCKET_SIZE_SEC
            counts[bucket] = counts.get(bucket, 0) + 1
        return sorted(counts.items())

    def _temporal_peak_support(self, timestamps):
        buckets = self._bucketize_timestamps(timestamps)
        if not buckets:
            return 0.0
        if len(buckets) == 1:
            return float(buckets[0][1])

        bandwidth_sec = max(TEMPORAL_BUCKET_SIZE_SEC, self.cfg.temporal_bandwidth_h * 3600)
        peak = 0.0
        for center, _ in buckets:
            weighted = 0.0
            for bucket_start, count in buckets:
                delta = bucket_start - center
                weight = np.exp(-0.5 * (delta / bandwidth_sec) ** 2)
                weighted += count * weight
            peak = max(peak, weighted)
        return peak

    def smooth_intensity(self):
        g = self._grid
        c = self.cfg
        n = g['rows'] * g['cols']
        bw_cells = max(1, int(np.ceil(c.spatial_bandwidth_m / c.grid_cell_m)))
        sigma_cells = max(0.5, bw_cells / 2)
        krad = max(1, int(np.ceil(3 * sigma_cells)))
        intensity = np.zeros(n, dtype=np.float64)
        kernel_fn = KERNEL_FNS.get(c.kernel, gaussian_kernel)
        temporal_signal = np.zeros(n, dtype=np.float64)

        for idx in range(n):
            temporal_signal[idx] = self._temporal_peak_support(self._cell_ts[idx])

        for row in range(g['rows']):
            for col in range(g['cols']):
                ci = row * g['cols'] + col
                r0, r1 = max(0, row - krad), min(g['rows'], row + krad + 1)
                c0, c1 = max(0, col - krad), min(g['cols'], col + krad + 1)
                for r in range(r0, r1):
                    for cc in range(c0, c1):
                        ni = r * g['cols'] + cc
                        cnt = temporal_signal[ni]
                        if cnt <= 0:
                            continue
                        dist = np.sqrt((r - row) ** 2 + (cc - col) ** 2)
                        w = kernel_fn(dist, sigma_cells) if c.kernel == 'gaussian' else kernel_fn(dist, bw_cells)
                        intensity[ci] += cnt * w
        self._intensity = intensity
        self._max_int = intensity.max() or 1.0
        self._bw_cells = bw_cells
        self._temporal_signal = temporal_signal
        return intensity

    def extract_hotspots(self):
        g = self._grid
        c = self.cfg
        n = g['rows'] * g['cols']
        candidates = []
        ws = c.time_window_h * 3600
        for idx in range(n):
            sc = int(self._support[idx])
            if sc < c.min_support:
                continue
            lon, lat = self._centroid(idx)
            ni = float(self._intensity[idx] / self._max_int)
            ts_list = self._cell_ts[idx]
            if not ts_list:
                continue
            best_s = ts_list[0]
            best_cnt = 0
            si = 0
            sts = sorted(ts_list)
            for ei in range(len(sts)):
                while sts[ei] - sts[si] > ws:
                    si += 1
                cnt = ei - si + 1
                if cnt > best_cnt:
                    best_cnt = cnt
                    best_s = sts[si]
            pe = best_s + ws
            candidates.append(
                {
                    'id': f'hs-{idx}',
                    'lon': round(lon, 6),
                    'lat': round(lat, 6),
                    'intensity': round(ni, 6),
                    'support': sc,
                    'intensity_raw': float(self._intensity[idx]),
                    'peak_start': best_s,
                    'peak_end': pe,
                    'radius_m': c.spatial_bandwidth_m,
                }
            )
        candidates.sort(key=lambda x: (x['intensity'], x['support']), reverse=True)
        return candidates[: c.top_k]

    def run(self, lons, lats, timestamps):
        t0 = time.time()
        self.compute_support(lons, lats, timestamps)
        self.smooth_intensity()
        hotspots = self.extract_hotspots()
        elapsed = (time.time() - t0) * 1000
        g = self._grid
        stats = {
            'n_events': len(lons),
            'n_cells': g['rows'] * g['cols'],
            'grid_rows': g['rows'],
            'grid_cols': g['cols'],
            'n_active_cells': int((self._support > 0).sum()),
            'n_hotspot_candidates': int((self._intensity > 0).sum()),
            'n_hotspots': len(hotspots),
            'max_intensity': float(self._max_int),
            'max_support': int(self._support.max()),
            'bandwidth_cells': self._bw_cells,
            'compute_ms': round(elapsed, 1),
        }
        return hotspots, stats


def plot_hotspot_map(lons, lats, hotspots, config: STKDEConfig, ax=None, label: str | None = None):
    if ax is None:
        _, ax = plt.subplots(figsize=(8, 7))
    n = min(8000, len(lons))
    rng = np.random.default_rng(13)
    idx = rng.choice(len(lons), n, replace=False)
    ax.scatter(lons[idx], lats[idx], s=1, alpha=0.12, c='#555555', rasterized=True)
    for i, h in enumerate(hotspots):
        rd = meters_to_lat_deg(h['radius_m'])
        ax.add_patch(plt.Circle((h['lon'], h['lat']), rd, facecolor=RED, edgecolor=RED_DARK, alpha=0.22, lw=1.4))
        ax.annotate(
            str(i + 1),
            (h['lon'], h['lat']),
            fontsize=7,
            ha='center',
            va='center',
            color='white',
            fontweight='bold',
            bbox=dict(boxstyle='circle,pad=0.15', facecolor=RED_DARK, alpha=0.95),
        )
    ax.set_xlim(CITY_BOUNDS['lon_min'], CITY_BOUNDS['lon_max'])
    ax.set_ylim(CITY_BOUNDS['lat_min'], CITY_BOUNDS['lat_max'])
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.set_aspect(1 / np.cos(np.radians(np.mean(lats))))
    if label:
        ax.text(0.02, 0.98, label, transform=ax.transAxes, ha='left', va='top', fontsize=10, color=INK, fontweight='bold')
    ax.text(
        0.02,
        0.03,
        f'SBW {config.spatial_bandwidth_m}m | Grid {config.grid_cell_m}m | TBW {config.temporal_bandwidth_h}h',
        transform=ax.transAxes,
        ha='left',
        va='bottom',
        fontsize=8,
        color=SUBTLE,
    )
    return ax


def plot_comparison_grid(results, lons, lats, ncols: int = 3, fw: float = 6, fh: float = 5):
    n = len(results)
    nrows = int(np.ceil(n / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(fw * ncols, fh * nrows))
    axes = np.atleast_1d(axes).flatten()
    for ax, (label, (hs, cfg)) in zip(axes, results.items()):
        plot_hotspot_map(lons, lats, hs, cfg, ax=ax, label=label)
    for ax in axes[n:]:
        ax.set_visible(False)
    plt.tight_layout()
    return fig
