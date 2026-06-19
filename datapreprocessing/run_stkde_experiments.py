#!/usr/bin/env python3
"""STKDE Parameter Sensitivity Experiments — Headless Runner
Generates all thesis-ready figures to stkde_experiment_output/
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import time, json, sys
from collections import defaultdict

warnings = __import__('warnings')
warnings.filterwarnings('ignore')
sns.set_theme(style='whitegrid', context='notebook', palette='muted')
plt.rcParams.update({'figure.dpi': 150, 'savefig.dpi': 300, 'font.size': 10,
                      'axes.titlesize': 12, 'axes.labelsize': 10})

# ── Config ────────────────────────────────────────────────────
DATA_PATH = Path('data/Crimes_-_2001_to_Present_20260114.csv')
OUTPUT_DIR = Path('stkde_experiment_output')
OUTPUT_DIR.mkdir(exist_ok=True)

CITY_BOUNDS = {'lat_min': 41.644, 'lat_max': 42.023,
               'lon_min': -87.940, 'lon_max': -87.524}
METERS_PER_LAT_DEGREE = 111_320
TEMPORAL_BUCKET_SIZE_SEC = 3600

t0_total = time.time()

# ── 1. Load & Clean Data ─────────────────────────────────────
print('Loading data...')
DTYPES = {'ID': 'int64', 'Date': 'string', 'Primary Type': 'string',
          'District': 'Int64', 'Latitude': 'float64', 'Longitude': 'float64'}
df = pd.read_csv(DATA_PATH, dtype=DTYPES, usecols=list(DTYPES.keys()), na_values={'': None})
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df = df.dropna(subset=['Latitude', 'Longitude'])
df = df[(df['Latitude'] != 0) & (df['Longitude'] != 0)]
df = df[(df['Latitude'].between(CITY_BOUNDS['lat_min'], CITY_BOUNDS['lat_max'])) &
        (df['Longitude'].between(CITY_BOUNDS['lon_min'], CITY_BOUNDS['lon_max']))]
df = df[(df['Date'] >= '2020-01-01') & (df['Date'] <= '2020-12-31')]
df['epoch_sec'] = df['Date'].astype('int64') // 10**9
print(f'  Loaded {len(df):,} records')

# Sample for experiments
EXP_N = min(80000, len(df))
exp_df = df.sample(n=EXP_N, random_state=42)
exp_lons = exp_df['Longitude'].values
exp_lats = exp_df['Latitude'].values
exp_ts = exp_df['epoch_sec'].values
print(f'  Experiment sample: {EXP_N:,} events\n')

# ── 2. Kernel Functions ───────────────────────────────────────
def gaussian_kernel(distance, sigma):
    return np.exp(-0.5 * (distance / sigma) ** 2)

def epanechnikov_kernel(distance, bandwidth):
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, 0.75 * (1 - u ** 2), 0)

def uniform_kernel(distance, bandwidth):
    return np.where(np.abs(distance) <= bandwidth, 0.5, 0)

def quartic_biweight_kernel(distance, bandwidth):
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, (15/16) * (1 - u ** 2) ** 2, 0)

def triangular_kernel(distance, bandwidth):
    u = distance / bandwidth
    return np.where(np.abs(u) <= 1, 1 - np.abs(u), 0)

KERNEL_FNS = {'gaussian': gaussian_kernel, 'epanechnikov': epanechnikov_kernel,
              'uniform': uniform_kernel, 'quartic': quartic_biweight_kernel,
              'triangular': triangular_kernel}

# Kernel viz
x = np.linspace(-3, 3, 300)
fig, ax = plt.subplots(figsize=(10, 5))
for name, fn in KERNEL_FNS.items():
    if name == 'gaussian':
        y = fn(np.abs(x), 1.0)
    else:
        y = fn(np.abs(x), 1.0)
    ax.plot(x, y, label=name, linewidth=2)
ax.set_title('Kernel Function Comparison'); ax.set_xlabel('Distance (normalized)'); ax.set_ylabel('Weight')
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.savefig(OUTPUT_DIR / 'kernel_functions.png', bbox_inches='tight'); plt.close()

# ── 3. STKDE Engine ──────────────────────────────────────────
class STKDEConfig:
    def __init__(self, spatial_bw_m=750, temporal_bw_h=24, grid_cell_m=500,
                 top_k=12, min_support=5, time_window_h=24, kernel='gaussian',
                 bbox=None):
        self.spatial_bandwidth_m = spatial_bw_m
        self.temporal_bandwidth_h = temporal_bw_h
        self.grid_cell_m = grid_cell_m
        self.top_k = top_k
        self.min_support = min_support
        self.time_window_h = time_window_h
        self.kernel = kernel
        self.bbox = bbox or [CITY_BOUNDS['lon_min'], CITY_BOUNDS['lat_min'],
                              CITY_BOUNDS['lon_max'], CITY_BOUNDS['lat_max']]

def meters_to_lat_deg(m):
    return m / METERS_PER_LAT_DEGREE

def meters_to_lon_deg(m, lat):
    return m / (METERS_PER_LAT_DEGREE * np.cos(np.radians(lat)))

class STKDEEngine:
    def __init__(self, config):
        self.cfg = config
        self._grid = None
        self._support = None
        self._intensity = None

    def build_grid(self):
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
            'min_lon': min_lon, 'min_lat': min_lat,
            'max_lon': max_lon, 'max_lat': max_lat,
            'rows': rows, 'cols': cols,
            'lat_cell_deg': lat_span / rows, 'lon_cell_deg': lon_span / cols,
            'mean_lat': mean_lat,
        }

    def _cell_idx(self, lon, lat):
        g = self._grid
        c = int(np.clip((lon - g['min_lon']) / g['lon_cell_deg'], 0, g['cols'] - 1))
        r = int(np.clip((lat - g['min_lat']) / g['lat_cell_deg'], 0, g['rows'] - 1))
        return r * g['cols'] + c

    def _centroid(self, idx):
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
            idx = self._cell_idx(lon, lat)
            support[idx] += 1
            cell_ts[idx].append(ts)
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
        g = self._grid; c = self.cfg; n = g['rows'] * g['cols']
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
                        if cnt <= 0: continue
                        dist = np.sqrt((r - row)**2 + (cc - col)**2)
                        w = kernel_fn(dist, sigma_cells) if c.kernel == 'gaussian' else kernel_fn(dist, bw_cells)
                        intensity[ci] += cnt * w
        self._intensity = intensity
        self._max_int = intensity.max() or 1.0
        self._bw_cells = bw_cells
        self._temporal_signal = temporal_signal
        return intensity

    def extract_hotspots(self):
        g = self._grid; c = self.cfg; n = g['rows'] * g['cols']
        candidates = []
        ws = c.time_window_h * 3600
        for idx in range(n):
            sc = int(self._support[idx])
            if sc < c.min_support: continue
            lon, lat = self._centroid(idx)
            ni = float(self._intensity[idx] / self._max_int)
            ts_list = self._cell_ts[idx]
            best_s, best_cnt = ts_list[0] if ts_list else 0, 0
            si = 0
            sts = sorted(ts_list)
            for ei in range(len(sts)):
                while sts[ei] - sts[si] > ws: si += 1
                cnt = ei - si + 1
                if cnt > best_cnt: best_cnt, best_s = cnt, sts[si]
            pe = best_s + ws
            candidates.append({
                'id': f'hs-{idx}', 'lon': round(lon, 6), 'lat': round(lat, 6),
                'intensity': round(ni, 6), 'support': sc,
                'intensity_raw': float(self._intensity[idx]),
                'peak_start': best_s, 'peak_end': pe,
                'radius_m': c.spatial_bandwidth_m,
            })
        candidates.sort(key=lambda x: (x['intensity'], x['support']), reverse=True)
        return candidates[:c.top_k]

    def run(self, lons, lats, timestamps):
        t0 = time.time()
        self.compute_support(lons, lats, timestamps)
        self.smooth_intensity()
        hotspots = self.extract_hotspots()
        elapsed = (time.time() - t0) * 1000
        g = self._grid
        stats = {
            'n_events': len(lons), 'n_cells': g['rows']*g['cols'],
            'grid_rows': g['rows'], 'grid_cols': g['cols'],
            'n_active_cells': int((self._support > 0).sum()),
            'n_hotspot_candidates': int((self._intensity > 0).sum()),
            'n_hotspots': len(hotspots),
            'max_intensity': float(self._max_int),
            'max_support': int(self._support.max()),
            'bandwidth_cells': self._bw_cells,
            'compute_ms': round(elapsed, 1),
        }
        return hotspots, stats

def plot_hotspot_map(lons, lats, hotspots, config, ax=None, title=None):
    if ax is None: _, ax = plt.subplots(figsize=(8, 7))
    n = min(20000, len(lons))
    idx = np.random.choice(len(lons), n, replace=False)
    ax.scatter(lons[idx], lats[idx], s=1, alpha=0.15, c='#555555', rasterized=True)
    for i, h in enumerate(hotspots):
        rd = meters_to_lat_deg(h['radius_m'])
        ax.add_patch(plt.Circle((h['lon'], h['lat']), rd, facecolor='red',
                                 edgecolor='darkred', alpha=0.25, lw=1.5))
        ax.annotate(str(i+1), (h['lon'], h['lat']), fontsize=7, ha='center', va='center',
                   color='white', fontweight='bold',
                   bbox=dict(boxstyle='circle,pad=0.15', facecolor='darkred', alpha=0.9))
    ax.set_xlabel('Longitude'); ax.set_ylabel('Latitude')
    ax.set_aspect(1/np.cos(np.radians(np.mean(lats))))
    ax.set_title(title or f'STKDE (SBW={config.spatial_bandwidth_m}m, Grid={config.grid_cell_m}m)', fontweight='bold')
    return ax

def plot_comparison_grid(results, lons, lats, ncols=3, fw=6, fh=5):
    n = len(results)
    nrows = int(np.ceil(n / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(fw*ncols, fh*nrows))
    axes = np.atleast_1d(axes).flatten()
    for ax, (label, (hs, cfg)) in zip(axes, results.items()):
        plot_hotspot_map(lons, lats, hs, cfg, ax=ax, title=label)
    for ax in axes[n:]: ax.set_visible(False)
    plt.tight_layout()
    return fig

# ── 4. Experiments ────────────────────────────────────────────
all_exp_stats = []

def log(msg): print(f'  {msg}'); sys.stdout.flush()

# ── Exp 1: Spatial Bandwidth ──
print('\n=== Experiment 1: Spatial Bandwidth ===')
SBW_VALS = [200, 400, 750, 1200, 2000, 3000]
e1_res, e1_stats = {}, []
for sbw in SBW_VALS:
    cfg = STKDEConfig(spatial_bw_m=sbw, temporal_bw_h=24, grid_cell_m=500,
                      top_k=15, min_support=5, time_window_h=24, kernel='gaussian')
    hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
    st['spatial_bw_m'] = sbw; st['experiment'] = 'Exp1_SpatialBW'
    e1_res[f'SBW={sbw}m'] = (hs, cfg); e1_stats.append(st); all_exp_stats.append(st)
    log(f'  SBW={sbw}m: {len(hs)} hotspots, {st["n_active_cells"]} active, {st["compute_ms"]}ms')

fig = plot_comparison_grid(e1_res, exp_lons, exp_lats, ncols=3)
fig.suptitle('Experiment 1: Spatial Bandwidth Sensitivity', fontsize=14, fontweight='bold', y=1.01)
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp1_spatial_bw_hotspots.png', bbox_inches='tight'); plt.close()

# Exp 1 metrics
e1df = pd.DataFrame(e1_stats)
fig, axs = plt.subplots(2, 3, figsize=(16, 9)); axs = axs.flatten()
axs[0].plot(e1df['spatial_bw_m'], e1df['n_active_cells'], 'o-', color='steelblue', ms=8); axs[0].set_title('Active Cells vs SBW'); axs[0].set_xlabel('Spatial BW (m)')
axs[1].plot(e1df['spatial_bw_m'], e1df['n_hotspots'], 's-', color='coral', ms=8); axs[1].set_title('Hotspots vs SBW'); axs[1].set_xlabel('Spatial BW (m)')
axs[2].plot(e1df['spatial_bw_m'], e1df['max_intensity'], '^-', color='green', ms=8); axs[2].set_title('Max Intensity vs SBW'); axs[2].set_xlabel('Spatial BW (m)')
axs[3].plot(e1df['spatial_bw_m'], e1df['compute_ms'], 'D-', color='purple', ms=8); axs[3].set_title('Compute Time vs SBW'); axs[3].set_xlabel('Spatial BW (m)')
axs[4].plot(e1df['spatial_bw_m'], e1df['bandwidth_cells'], 'p-', color='brown', ms=8); axs[4].set_title('Kernel Radius vs SBW'); axs[4].set_xlabel('Spatial BW (m)')
axs[5].plot(e1df['spatial_bw_m'], e1df['max_support'], 'h-', color='teal', ms=8); axs[5].set_title('Max Support vs SBW'); axs[5].set_xlabel('Spatial BW (m)')
plt.suptitle('E1: Spatial Bandwidth Metrics', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp1_spatial_bw_metrics.png', bbox_inches='tight'); plt.close()

# Exp 1 stability (Jaccard)
def jaccard_sim(ha, hb, thresh_m=500):
    if not ha or not hb: return 0.0
    matched = 0
    for a in ha:
        for b in hb:
            dlat = (a['lat']-b['lat'])*METERS_PER_LAT_DEGREE
            dlon = (a['lon']-b['lon'])*METERS_PER_LAT_DEGREE*np.cos(np.radians((a['lat']+b['lat'])/2))
            if np.sqrt(dlat**2+dlon**2) < thresh_m: matched += 1; break
    return matched / (len(ha) + len(hb) - matched) if (len(ha)+len(hb)-matched) > 0 else 0.0

hlists = [v[0] for v in e1_res.values()]
sims = [jaccard_sim(hlists[i], hlists[i+1]) for i in range(len(hlists)-1)]
fig, ax = plt.subplots(figsize=(8,4))
labels = [f'{SBW_VALS[i]}->{SBW_VALS[i+1]}' for i in range(len(SBW_VALS)-1)]
ax.bar(labels, sims, color='steelblue', alpha=0.8); ax.set_ylabel('Jaccard Index')
ax.set_title('Hotspot Stability Between Adjacent Bandwidths'); ax.set_ylim(0,1)
ax.axhline(0.5, color='red', ls='--', alpha=0.5, label='Moderate'); ax.legend()
plt.xticks(rotation=45); plt.tight_layout()
fig.savefig(OUTPUT_DIR / 'exp1_stability.png', bbox_inches='tight'); plt.close()


# ── Exp 2: Temporal Bandwidth ──
print('\n=== Experiment 2: Temporal Bandwidth ===')
TBW_VALS = [4, 12, 24, 48, 72, 168]
e2_res, e2_stats = {}, []
for tbw in TBW_VALS:
    cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=tbw, grid_cell_m=500,
                      top_k=15, min_support=5, time_window_h=tbw, kernel='gaussian')
    hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
    st['temporal_bw_h'] = tbw; st['experiment'] = 'Exp2_TemporalBW'
    e2_res[f'TBW={tbw}h'] = (hs, cfg); e2_stats.append(st); all_exp_stats.append(st)
    log(f'  TBW={tbw}h: {len(hs)} hotspots, max_int={st["max_intensity"]:.0f}, {st["compute_ms"]}ms')

fig, axs = plt.subplots(2, 3, figsize=(16, 9)); axs = axs.flatten()
for ax, (label, (hs, cfg)) in zip(axs, e2_res.items()):
    pdur = [(h['peak_end']-h['peak_start'])/3600 for h in hs]
    intens = [h['intensity'] for h in hs]
    ax.scatter(pdur, intens, alpha=0.7, s=50, c=np.arange(len(hs) or 1), cmap='viridis')
    ax.set_title(f'{label} (n={len(hs)})'); ax.set_xlabel('Peak Duration (h)'); ax.set_ylabel('Intensity')
fig.suptitle('E2: Temporal Bandwidth Effects on Peak Windows', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp2_temporal_bw.png', bbox_inches='tight'); plt.close()


# ── Exp 3: Grid Resolution ──
print('\n=== Experiment 3: Grid Resolution ===')
GC_VALS = [100, 250, 500, 750, 1000, 1500, 2000]
e3_res, e3_stats = {}, []
for gcm in GC_VALS:
    cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=24, grid_cell_m=gcm,
                      top_k=15, min_support=5, time_window_h=24, kernel='gaussian')
    hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
    st['grid_cell_m'] = gcm; st['experiment'] = 'Exp3_GridResolution'
    e3_res[f'Grid={gcm}m'] = (hs, cfg); e3_stats.append(st); all_exp_stats.append(st)
    log(f'  Grid={gcm}m: {st["grid_rows"]}x{st["grid_cols"]} ({st["n_cells"]:,} cells), {st["n_hotspots"]} hs, {st["compute_ms"]}ms')

e3df = pd.DataFrame(e3_stats)
fig, axs = plt.subplots(2, 3, figsize=(16, 9)); axs = axs.flatten()
axs[0].plot(e3df['grid_cell_m'], e3df['n_cells'], 'o-', color='steelblue', ms=8); axs[0].set_title('Total Cells vs Grid'); axs[0].set_xlabel('Grid Cell (m)'); axs[0].set_yscale('log')
axs[1].plot(e3df['grid_cell_m'], e3df['n_active_cells'], 's-', color='coral', ms=8); axs[1].set_title('Active Cells vs Grid'); axs[1].set_xlabel('Grid Cell (m)')
axs[2].plot(e3df['grid_cell_m'], e3df['n_active_cells']/e3df['n_cells']*100, '^-', color='green', ms=8); axs[2].set_title('Cell Utilization %'); axs[2].set_xlabel('Grid Cell (m)')
axs[3].plot(e3df['grid_cell_m'], e3df['compute_ms'], 'D-', color='purple', ms=8); axs[3].set_title('Compute vs Grid'); axs[3].set_xlabel('Grid Cell (m)')
axs[4].plot(e3df['grid_cell_m'], e3df['bandwidth_cells'], 'p-', color='brown', ms=8); axs[4].set_title('Kernel Radius vs Grid'); axs[4].set_xlabel('Grid Cell (m)')
axs[5].plot(e3df['grid_cell_m'], e3df['n_hotspots'], 'h-', color='teal', ms=8); axs[5].set_title('Hotspots vs Grid'); axs[5].set_xlabel('Grid Cell (m)')
fig.suptitle('E3: Grid Resolution Effects', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp3_grid_resolution.png', bbox_inches='tight'); plt.close()

# Grid hotspot maps
top6 = dict(list(e3_res.items())[:6])
fig = plot_comparison_grid(top6, exp_lons, exp_lats, ncols=3)
fig.suptitle('E3: Hotspot Distribution by Grid Resolution', fontsize=14, fontweight='bold', y=1.01)
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp3_grid_hotspots.png', bbox_inches='tight'); plt.close()


# ── Exp 4: Kernel Functions ──
print('\n=== Experiment 4: Kernel Function Comparison ===')
KNAMES = ['gaussian', 'epanechnikov', 'uniform', 'quartic', 'triangular']
e4_res, e4_stats = {}, []
for kn in KNAMES:
    cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=24, grid_cell_m=500,
                      top_k=15, min_support=5, time_window_h=24, kernel=kn)
    hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
    st['kernel'] = kn; st['experiment'] = 'Exp4_Kernel'
    e4_res[kn.capitalize()] = (hs, cfg); e4_stats.append(st); all_exp_stats.append(st)
    log(f'  {kn:>15}: {len(hs)} hs, max_int={st["max_intensity"]:.0f}, {st["compute_ms"]}ms')

fig = plot_comparison_grid(e4_res, exp_lons, exp_lats, ncols=3)
fig.suptitle('E4: Kernel Function Comparison', fontsize=14, fontweight='bold', y=1.01)
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp4_kernel_hotspots.png', bbox_inches='tight'); plt.close()

e4df = pd.DataFrame(e4_stats)
fig, axs = plt.subplots(2, 2, figsize=(12, 8)); axs = axs.flatten()
axs[0].bar(e4df['kernel'], e4df['n_active_cells'], color='steelblue'); axs[0].set_title('Active Cells'); axs[0].tick_params(axis='x', rotation=45)
axs[1].bar(e4df['kernel'], e4df['max_intensity'], color='coral'); axs[1].set_title('Max Intensity'); axs[1].tick_params(axis='x', rotation=45)
axs[2].bar(e4df['kernel'], e4df['compute_ms'], color='green'); axs[2].set_title('Compute Time'); axs[2].tick_params(axis='x', rotation=45)
axs[3].bar(e4df['kernel'], e4df['n_hotspots'], color='purple'); axs[3].set_title('Hotspot Count'); axs[3].tick_params(axis='x', rotation=45)
fig.suptitle('E4: Kernel Function Metrics', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp4_kernel_metrics.png', bbox_inches='tight'); plt.close()


# ── Exp 5: Combined SBW x Grid Sweep ──
print('\n=== Experiment 5: Combined Parameter Sweep ===')
SW_SBW = [300, 500, 750, 1000, 1500, 2000, 3000]
SW_GRID = [200, 400, 600, 800, 1000, 1500]
smat = {k: np.full((len(SW_GRID), len(SW_SBW)), np.nan) for k in ['n_hotspots','n_active_cells','max_intensity','compute_ms','bandwidth_cells']}
total = len(SW_GRID)*len(SW_SBW); cnt = 0
for i, gcm in enumerate(SW_GRID):
    for j, sbw in enumerate(SW_SBW):
        if sbw < gcm * 0.5: continue
        cfg = STKDEConfig(spatial_bw_m=sbw, grid_cell_m=gcm, top_k=15, min_support=5)
        hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
        st['spatial_bw_m'] = sbw; st['grid_cell_m'] = gcm; st['experiment'] = 'Exp5_Sweep'
        all_exp_stats.append(st)
        for key in smat: smat[key][i, j] = st[key]
        cnt += 1
        print(f'  [{cnt}/{total}] SBW={sbw}m Grid={gcm}m: {st["n_hotspots"]}hs {st["compute_ms"]}ms', end='\r')
print()

met_labels = [('n_hotspots','Hotspots','YlOrRd'), ('n_active_cells','Active Cells','YlOrRd'),
              ('max_intensity','Max Intensity','viridis'), ('compute_ms','Compute (ms)','YlOrRd_r'),
              ('bandwidth_cells','Kernel Radius (cells)','YlOrRd')]
fig, axs = plt.subplots(2, 3, figsize=(18, 10)); axs = axs.flatten()
for ax, (mk, ml, cm) in zip(axs, met_labels):
    im = ax.pcolormesh(SW_SBW, SW_GRID, np.ma.masked_invalid(smat[mk]), cmap=cm, shading='auto')
    plt.colorbar(im, ax=ax, label=ml, shrink=0.8)
    ax.set_title(ml); ax.set_xlabel('Spatial BW (m)'); ax.set_ylabel('Grid Cell (m)')
axs[-1].set_visible(False)
fig.suptitle('E5: Parameter Interaction Heatmaps', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp5_parameter_sweep.png', bbox_inches='tight'); plt.close()


# ── Exp 6: minSupport Sensitivity ──
print('\n=== Experiment 6: minSupport Sensitivity ===')
MS_VALS = [1, 3, 5, 10, 20, 50, 100]
e6_stats = []
for ms in MS_VALS:
    cfg = STKDEConfig(spatial_bw_m=750, grid_cell_m=500, top_k=50, min_support=ms)
    hs, st = STKDEEngine(cfg).run(exp_lons, exp_lats, exp_ts)
    st['min_support'] = ms; st['experiment'] = 'Exp6_MinSupport'
    e6_stats.append(st); all_exp_stats.append(st)
    log(f'  minSup={ms}: {st["n_hotspot_candidates"]} candidates -> {len(hs)} filtered (top-K={50})')

e6df = pd.DataFrame(e6_stats)
fig, axs = plt.subplots(1, 2, figsize=(14, 5))
axs[0].plot(e6df['min_support'], e6df['n_hotspot_candidates'], 'o-', color='steelblue', ms=8, label='Candidates')
axs[0].plot(e6df['min_support'], e6df['n_hotspots'], 's-', color='coral', ms=8, label='Top-K')
axs[0].set_title('Hotspot Candidates vs minSupport'); axs[0].set_xlabel('minSupport'); axs[0].set_yscale('log')
axs[0].set_xscale('log'); axs[0].legend()
axs[1].plot(e6df['min_support'], e6df['max_intensity'], '^-', color='green', ms=8)
axs[1].set_title('Max Intensity vs minSupport'); axs[1].set_xlabel('minSupport'); axs[1].set_xscale('log')
fig.suptitle('E6: minSupport Sensitivity', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp6_minsupport.png', bbox_inches='tight'); plt.close()


# ── Exp 7: Bootstrap Stability ──
print('\n=== Experiment 7: Bootstrap Stability ===')
N_BOOT = 15
bstrap_hs = []
for i in range(N_BOOT):
    idx = np.random.choice(len(exp_lons), int(len(exp_lons)*0.8), replace=True)
    cfg = STKDEConfig(spatial_bw_m=750, grid_cell_m=500, top_k=10, min_support=5)
    hs, _ = STKDEEngine(cfg).run(exp_lons[idx], exp_lats[idx], exp_ts[idx])
    bstrap_hs.append(hs)
    print(f'  Bootstrap {i+1}/{N_BOOT}: {len(hs)} hotspots', end='\r')
print()

# Cluster centroids
all_cents = [(h['lon'], h['lat'], h['intensity']) for hsl in bstrap_hs for h in hsl]
sorted_cents = sorted(enumerate(all_cents), key=lambda x: x[1][2], reverse=True)
CLUSTER_R = 500
c_rad_deg = meters_to_lat_deg(CLUSTER_R)
clusters, assigned = [], set()
for idx, (lon, lat, intens) in sorted_cents:
    if idx in assigned: continue
    cl = [(lon, lat, intens)]; assigned.add(idx)
    for j, (lon2, lat2, intens2) in sorted_cents:
        if j in assigned: continue
        dlat = abs(lat-lat2)*METERS_PER_LAT_DEGREE
        dlon = abs(lon-lon2)*METERS_PER_LAT_DEGREE*np.cos(np.radians((lat+lat2)/2))
        if np.sqrt(dlat**2+dlon**2) < CLUSTER_R:
            cl.append((lon2, lat2, intens2)); assigned.add(j)
    clusters.append(cl)
clusters.sort(key=len, reverse=True)

stab_data = []
for i, cl in enumerate(clusters[:15]):
    lons = [c[0] for c in cl]; lats = [c[1] for c in cl]; intens = [c[2] for c in cl]
    stab_data.append({
        'cluster_id': i+1, 'count': len(cl), 'recurrence_rate': len(cl)/N_BOOT,
        'mean_lon': np.mean(lons), 'mean_lat': np.mean(lats),
        'std_m': np.sqrt((np.std(lons)*METERS_PER_LAT_DEGREE*np.cos(np.radians(np.mean(lats))))**2
                        + (np.std(lats)*METERS_PER_LAT_DEGREE)**2),
        'mean_intensity': np.mean(intens), 'std_intensity': np.std(intens),
    })
sdf = pd.DataFrame(stab_data)

fig, axs = plt.subplots(2, 2, figsize=(14, 10))
axs[0,0].bar(sdf['cluster_id'], sdf['recurrence_rate'], color='steelblue'); axs[0,0].axhline(0.5, color='red', ls='--', alpha=0.5, label='50%'); axs[0,0].set_title('Recurrence Rate'); axs[0,0].set_xlabel('Cluster ID'); axs[0,0].legend()
axs[0,1].scatter(sdf['recurrence_rate'], sdf['std_m'], s=sdf['count']*5, alpha=0.7, c='steelblue'); axs[0,1].set_title('Spatial Precision vs Recurrence'); axs[0,1].set_xlabel('Recurrence'); axs[0,1].set_ylabel('Std Dev (m)')
axs[1,0].errorbar(sdf['cluster_id'], sdf['mean_intensity'], yerr=sdf['std_intensity'], fmt='o', capsize=4, color='steelblue', ms=6); axs[1,0].set_title('Intensity Stability'); axs[1,0].set_xlabel('Cluster ID')
npt = min(20000, len(exp_lons)); ipt = np.random.choice(len(exp_lons), npt, replace=False)
axs[1,1].scatter(exp_lons[ipt], exp_lats[ipt], s=1, alpha=0.15, c='#888888')
colors = plt.cm.viridis(np.linspace(0,1,len(sdf.head(10))))
for i, row in sdf.head(10).iterrows():
    axs[1,1].scatter(row['mean_lon'], row['mean_lat'], s=row['count']*8, alpha=0.7, color=colors[i], ec='black', lw=0.5)
    axs[1,1].annotate(str(int(row['cluster_id'])), (row['mean_lon'], row['mean_lat']), fontsize=7, ha='center', va='center', fontweight='bold')
axs[1,1].set_title('Stable Hotspot Clusters'); axs[1,1].set_xlabel('Longitude'); axs[1,1].set_ylabel('Latitude')
fig.suptitle('E7: Bootstrap Stability Analysis', fontsize=14, fontweight='bold')
plt.tight_layout(); fig.savefig(OUTPUT_DIR / 'exp7_stability.png', bbox_inches='tight'); plt.close()


# ── 5. Thesis Summary Figure ──────────────────────────────────
print('\n=== Generating Thesis Summary Figure ===')
fig = plt.figure(figsize=(18, 12))
gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.35)

# (a) Spatial BW
ax = fig.add_subplot(gs[0,0])
ax.plot(e1df['spatial_bw_m'], e1df['n_hotspots'], 'o-', color='#2196F3', lw=2, ms=8)
ax.fill_between(e1df['spatial_bw_m'], 0, e1df['n_hotspots'], alpha=0.15, color='#2196F3')
ax.set_xlabel('Spatial Bandwidth (m)'); ax.set_ylabel('Hotspots'); ax.set_title('(a) SBW vs Hotspot Count', fontweight='bold')

# (b) Grid Resolution
ax = fig.add_subplot(gs[0,1])
ax.plot(e3df['grid_cell_m'], e3df['n_active_cells'], 's-', color='#FF5722', lw=2, ms=8)
ax.fill_between(e3df['grid_cell_m'], 0, e3df['n_active_cells'], alpha=0.15, color='#FF5722')
ax.set_xlabel('Grid Cell Size (m)'); ax.set_ylabel('Active Cells'); ax.set_title('(b) Grid Resolution vs Active Cells', fontweight='bold')

# (c) Kernel Comparison
ax = fig.add_subplot(gs[0,2])
kcolors = ['#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336']
ax.bar(range(len(e4df)), e4df['n_active_cells'], color=kcolors, edgecolor='white')
ax.set_xticks(range(len(e4df))); ax.set_xticklabels(e4df['kernel'], rotation=30, ha='right')
ax.set_ylabel('Active Cells'); ax.set_title('(c) Kernel Function Impact', fontweight='bold')

# (d) Parameter Sweep
ax = fig.add_subplot(gs[1,:])
im = ax.pcolormesh(SW_SBW, SW_GRID, np.ma.masked_invalid(smat['n_hotspots']), cmap='YlOrRd', shading='auto')
plt.colorbar(im, ax=ax, label='Hotspot Count', shrink=0.8)
ax.set_xlabel('Spatial Bandwidth (m)'); ax.set_ylabel('Grid Cell Size (m)')
ax.set_title('(d) Parameter Interaction: SBW x Grid Resolution', fontweight='bold')

# (e) Stability
ax = fig.add_subplot(gs[2,:2])
ax.bar(sdf['cluster_id'].head(12), sdf['recurrence_rate'].head(12), color='#607D8B', edgecolor='white')
ax.axhline(0.5, color='#F44336', ls='--', lw=2, alpha=0.7, label='50% threshold')
ax.set_xlabel('Hotspot Cluster ID'); ax.set_ylabel('Recurrence Rate')
ax.set_title('(e) Hotspot Stability (Bootstrap Recurrence)', fontweight='bold')
ax.legend(); ax.set_ylim(0,1)

# (f) Compute Cost
ax = fig.add_subplot(gs[2,2])
ax.plot(e3df['grid_cell_m'], e3df['compute_ms'], 'D-', color='#795548', lw=2, ms=8)
ax.set_xlabel('Grid Cell Size (m)'); ax.set_ylabel('Compute Time (ms)')
ax.set_title('(f) Computational Cost', fontweight='bold')

fig.suptitle('STKDE Parameter Sensitivity Analysis — Thesis Summary', fontsize=16, fontweight='bold', y=1.01)
fig.savefig(OUTPUT_DIR / 'thesis_summary_figure.png', dpi=300, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.close()

# ── 6. Save Results ──
summary_df = pd.DataFrame(all_exp_stats)
summary_df.to_csv(OUTPUT_DIR / 'all_experiment_results.csv', index=False)

elapsed = time.time() - t0_total
print(f'\n{"="*60}')
print(f'All experiments complete! ({elapsed:.0f}s total)')
print(f'Results saved to: {OUTPUT_DIR.resolve()}')
print(f'Figures generated:')
for f in sorted(OUTPUT_DIR.glob('*.png')):
    print(f'  {f.name} ({f.stat().st_size/1024:.0f} KB)')
print(f'CSV results: {summary_df.shape[0]} rows x {summary_df.shape[1]} columns')
print(f'{"="*60}')
