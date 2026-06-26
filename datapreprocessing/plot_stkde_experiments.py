#!/usr/bin/env python3
"""Generate thesis-ready visualizations for STKDE experiment sweeps."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
INPUT_CSV = ROOT / 'stkde_experiment_output' / 'all_experiment_results.csv'
OUTPUT_DIR = ROOT / 'stkde_experiment_output' / 'visualizations'

BG = '#ffffff'
INK = '#18202a'
SUBTLE = '#687482'
GRID = '#d8e0e8'
BLUE = '#3b6ea8'
BLUE_DARK = '#24486f'
BLUE_LIGHT = '#b8d1ea'
TEAL = '#76a9b7'
ACCENT = '#d9a441'
RED = '#d46c68'


def configure_matplotlib() -> None:
    plt.rcParams.update(
        {
            'figure.facecolor': BG,
            'axes.facecolor': BG,
            'savefig.facecolor': BG,
            'savefig.bbox': 'tight',
            'savefig.pad_inches': 0.04,
            'font.family': 'serif',
            'font.serif': ['DejaVu Serif', 'Times New Roman', 'Times'],
            'mathtext.fontset': 'stix',
            'axes.edgecolor': GRID,
            'axes.labelcolor': INK,
            'xtick.color': SUBTLE,
            'ytick.color': SUBTLE,
            'text.color': INK,
            'axes.spines.top': False,
            'axes.spines.right': False,
            'axes.spines.left': False,
            'axes.spines.bottom': False,
            'grid.color': GRID,
            'grid.linewidth': 0.8,
            'grid.alpha': 0.8,
        }
    )


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_fig(fig: plt.Figure, path: Path) -> Path:
    fig.savefig(path.with_suffix('.png'), dpi=320)
    plt.close(fig)
    return path.with_suffix('.png')


def load_results() -> pd.DataFrame:
    df = pd.read_csv(INPUT_CSV)
    numeric_cols = ['n_events', 'n_cells', 'grid_rows', 'grid_cols', 'n_active_cells', 'n_hotspot_candidates', 'n_hotspots', 'max_intensity', 'max_support', 'bandwidth_cells', 'compute_ms', 'spatial_bw_m', 'temporal_bw_h', 'grid_cell_m', 'min_support']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    return df


def plot_spatial_bandwidth(df: pd.DataFrame) -> Path:
    data = df[df['experiment'] == 'Exp1_SpatialBW'].copy().sort_values('spatial_bw_m')
    fig, ax1 = plt.subplots(figsize=(8.2, 4.8))
    ax2 = ax1.twinx()

    ax1.plot(data['spatial_bw_m'], data['compute_ms'], marker='o', lw=2.1, color=BLUE_DARK, label='compute (ms)')
    ax2.plot(data['spatial_bw_m'], data['max_intensity'], marker='s', lw=2.1, color=ACCENT, label='max intensity')

    ax1.set_xlabel('spatial bandwidth (m)')
    ax1.set_ylabel('compute time (ms)', color=BLUE_DARK)
    ax2.set_ylabel('max intensity', color=ACCENT)
    ax1.grid(True, axis='y')
    ax1.axvline(750, color=TEAL, lw=1.2, ls='--', alpha=0.8)
    ax1.text(750, ax1.get_ylim()[0], '  750m baseline', color=TEAL, fontsize=8.5, va='bottom')

    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(handles1 + handles2, labels1 + labels2, loc='upper left', frameon=False)
    return save_fig(fig, OUTPUT_DIR / 'stkde_spatial_bandwidth_tradeoff')


def plot_temporal_bandwidth(df: pd.DataFrame) -> Path:
    data = df[df['experiment'] == 'Exp2_TemporalBW'].copy().sort_values('temporal_bw_h')
    fig, ax1 = plt.subplots(figsize=(8.2, 4.8))
    ax2 = ax1.twinx()

    ax1.plot(data['temporal_bw_h'], data['compute_ms'], marker='o', lw=2.1, color=BLUE_DARK, label='compute (ms)')
    ax2.plot(data['temporal_bw_h'], data['max_intensity'], marker='s', lw=2.1, color=ACCENT, label='max intensity')

    ax1.set_xlabel('temporal bandwidth (h)')
    ax1.set_ylabel('compute time (ms)', color=BLUE_DARK)
    ax2.set_ylabel('max intensity', color=ACCENT)
    ax1.grid(True, axis='y')
    ax1.axvline(24, color=TEAL, lw=1.2, ls='--', alpha=0.8)
    ax1.text(24, ax1.get_ylim()[0], '  24h baseline', color=TEAL, fontsize=8.5, va='bottom')

    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(handles1 + handles2, labels1 + labels2, loc='upper left', frameon=False)
    return save_fig(fig, OUTPUT_DIR / 'stkde_temporal_bandwidth_tradeoff')


def plot_grid_resolution(df: pd.DataFrame) -> Path:
    data = df[df['experiment'] == 'Exp3_GridResolution'].copy().sort_values('grid_cell_m')
    fig, ax1 = plt.subplots(figsize=(8.8, 4.8))
    ax2 = ax1.twinx()

    ax1.plot(data['grid_cell_m'], data['compute_ms'], marker='o', lw=2.1, color=BLUE_DARK, label='compute (ms)')
    ax2.plot(data['grid_cell_m'], data['n_active_cells'], marker='s', lw=2.1, color=RED, label='active cells')

    ax1.set_xlabel('grid cell size (m)')
    ax1.set_ylabel('compute time (ms)', color=BLUE_DARK)
    ax2.set_ylabel('active cells', color=RED)
    ax1.grid(True, axis='y')
    ax1.axvline(500, color=TEAL, lw=1.2, ls='--', alpha=0.8)
    ax1.text(500, ax1.get_ylim()[0], '  500m baseline', color=TEAL, fontsize=8.5, va='bottom')

    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(handles1 + handles2, labels1 + labels2, loc='upper right', frameon=False)
    return save_fig(fig, OUTPUT_DIR / 'stkde_grid_resolution_tradeoff')


def plot_kernel_comparison(df: pd.DataFrame) -> Path:
    order = ['gaussian', 'epanechnikov', 'triangular', 'quartic', 'uniform']
    data = df[df['experiment'] == 'Exp4_Kernel'].copy()
    data['kernel'] = pd.Categorical(data['kernel'], categories=order, ordered=True)
    data = data.sort_values('kernel')

    fig, ax = plt.subplots(figsize=(8.6, 4.9))
    x = np.arange(len(data))
    width = 0.36

    bars1 = ax.bar(x - width / 2, data['compute_ms'], width=width, color=BLUE_DARK, label='compute (ms)')
    ax2 = ax.twinx()
    bars2 = ax2.bar(x + width / 2, data['max_intensity'], width=width, color=ACCENT, label='max intensity')

    ax.set_xticks(x)
    ax.set_xticklabels(data['kernel'].astype(str))
    ax.set_ylabel('compute time (ms)', color=BLUE_DARK)
    ax2.set_ylabel('max intensity', color=ACCENT)
    ax.grid(True, axis='y')
    for bar in bars1:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 8, f'{bar.get_height():.0f}', ha='center', va='bottom', fontsize=8, color=SUBTLE)
    for bar in bars2:
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 18, f'{bar.get_height():.0f}', ha='center', va='bottom', fontsize=8, color=SUBTLE)

    handles1, labels1 = ax.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(handles1 + handles2, labels1 + labels2, loc='upper left', frameon=False)
    return save_fig(fig, OUTPUT_DIR / 'stkde_kernel_comparison')


def plot_joint_sweep(df: pd.DataFrame) -> Path:
    data = df[df['experiment'] == 'Exp5_Sweep'].copy()
    data['spatial_bw_m'] = pd.to_numeric(data['spatial_bw_m'], errors='coerce')
    data['grid_cell_m'] = pd.to_numeric(data['grid_cell_m'], errors='coerce')

    compute = data.pivot_table(index='spatial_bw_m', columns='grid_cell_m', values='compute_ms', aggfunc='mean').sort_index().sort_index(axis=1)
    intensity = data.pivot_table(index='spatial_bw_m', columns='grid_cell_m', values='max_intensity', aggfunc='mean').sort_index().sort_index(axis=1)

    fig, axes = plt.subplots(1, 2, figsize=(12.6, 5.2), sharey=True)
    for ax, matrix, title, cmap in [
        (axes[0], compute, 'Compute time (ms)', 'Blues'),
        (axes[1], intensity, 'Max intensity', 'YlOrBr'),
    ]:
        im = ax.imshow(matrix.values, origin='lower', aspect='auto', cmap=cmap)
        ax.set_xticks(np.arange(len(matrix.columns)))
        ax.set_xticklabels([int(x) for x in matrix.columns])
        ax.set_yticks(np.arange(len(matrix.index)))
        ax.set_yticklabels([int(x) for x in matrix.index])
        ax.set_xlabel('grid cell size (m)')
        for i in range(matrix.shape[0]):
            for j in range(matrix.shape[1]):
                value = matrix.iloc[i, j]
                if pd.isna(value):
                    continue
                color = 'white' if im.norm(value) > 0.6 else INK
                label = f'{value:.0f}' if title == 'Compute time (ms)' else f'{value:.0f}'
                ax.text(j, i, label, ha='center', va='center', fontsize=7.5, color=color)
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.02)

    axes[0].set_ylabel('spatial bandwidth (m)')
    return save_fig(fig, OUTPUT_DIR / 'stkde_parameter_sweep_heatmap')


def plot_dashboard(df: pd.DataFrame) -> Path:
    fig, axes = plt.subplots(2, 3, figsize=(14.8, 8.5))
    axes = axes.ravel()

    # spatial bandwidth
    data = df[df['experiment'] == 'Exp1_SpatialBW'].copy().sort_values('spatial_bw_m')
    ax = axes[0]
    ax2 = ax.twinx()
    ax.plot(data['spatial_bw_m'], data['compute_ms'], marker='o', lw=1.9, color=BLUE_DARK)
    ax2.plot(data['spatial_bw_m'], data['max_intensity'], marker='s', lw=1.9, color=ACCENT)
    ax.set_xlabel('m'); ax.set_ylabel('ms', color=BLUE_DARK); ax2.set_ylabel('intensity', color=ACCENT)
    ax.axvline(750, color=TEAL, lw=1, ls='--', alpha=0.8)
    ax.grid(True, axis='y')

    # temporal bandwidth
    data = df[df['experiment'] == 'Exp2_TemporalBW'].copy().sort_values('temporal_bw_h')
    ax = axes[1]
    ax2 = ax.twinx()
    ax.plot(data['temporal_bw_h'], data['compute_ms'], marker='o', lw=1.9, color=BLUE_DARK)
    ax2.plot(data['temporal_bw_h'], data['max_intensity'], marker='s', lw=1.9, color=ACCENT)
    ax.set_xlabel('h'); ax.set_ylabel('ms', color=BLUE_DARK); ax2.set_ylabel('intensity', color=ACCENT)
    ax.axvline(24, color=TEAL, lw=1, ls='--', alpha=0.8)
    ax.grid(True, axis='y')

    # grid resolution
    data = df[df['experiment'] == 'Exp3_GridResolution'].copy().sort_values('grid_cell_m')
    ax = axes[2]
    ax2 = ax.twinx()
    ax.plot(data['grid_cell_m'], data['compute_ms'], marker='o', lw=1.9, color=BLUE_DARK)
    ax2.plot(data['grid_cell_m'], data['n_active_cells'], marker='s', lw=1.9, color=RED)
    ax.set_xlabel('m'); ax.set_ylabel('ms', color=BLUE_DARK); ax2.set_ylabel('active cells', color=RED)
    ax.axvline(500, color=TEAL, lw=1, ls='--', alpha=0.8)
    ax.grid(True, axis='y')

    # kernel comparison
    order = ['gaussian', 'epanechnikov', 'triangular', 'quartic', 'uniform']
    data = df[df['experiment'] == 'Exp4_Kernel'].copy()
    data['kernel'] = pd.Categorical(data['kernel'], categories=order, ordered=True)
    data = data.sort_values('kernel')
    ax = axes[3]
    ax2 = ax.twinx()
    x = np.arange(len(data))
    ax.bar(x, data['compute_ms'], color=BLUE_DARK, width=0.6)
    ax2.plot(x, data['max_intensity'], color=ACCENT, marker='o', lw=1.9)
    ax.set_xticks(x, data['kernel'].astype(str))
    ax.set_ylabel('ms', color=BLUE_DARK); ax2.set_ylabel('intensity', color=ACCENT)
    ax.grid(True, axis='y')

    # sweep heatmap
    data = df[df['experiment'] == 'Exp5_Sweep'].copy()
    data['spatial_bw_m'] = pd.to_numeric(data['spatial_bw_m'], errors='coerce')
    data['grid_cell_m'] = pd.to_numeric(data['grid_cell_m'], errors='coerce')
    matrix = data.pivot_table(index='spatial_bw_m', columns='grid_cell_m', values='compute_ms', aggfunc='mean').sort_index().sort_index(axis=1)
    ax = axes[4]
    im = ax.imshow(matrix.values, origin='lower', aspect='auto', cmap='Blues')
    ax.set_xlabel('grid'); ax.set_ylabel('spatial BW')
    ax.set_xticks(np.arange(len(matrix.columns)))
    ax.set_xticklabels([int(x) for x in matrix.columns], fontsize=8)
    ax.set_yticks(np.arange(len(matrix.index)))
    ax.set_yticklabels([int(x) for x in matrix.index], fontsize=8)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.02)

    # title / note
    ax = axes[5]
    ax.axis('off')

    for ax in axes[:5]:
        ax.grid(True, axis='y', alpha=0.35)

    fig.tight_layout(rect=(0, 0, 1, 0.98))
    return save_fig(fig, OUTPUT_DIR / 'stkde_parameter_dashboard')


def main() -> None:
    configure_matplotlib()
    ensure_dir(OUTPUT_DIR)
    df = load_results()

    outputs = [
        plot_dashboard(df),
        plot_spatial_bandwidth(df),
        plot_temporal_bandwidth(df),
        plot_grid_resolution(df),
        plot_kernel_comparison(df),
        plot_joint_sweep(df),
    ]

    for path in outputs:
        print(path)


if __name__ == '__main__':
    main()
