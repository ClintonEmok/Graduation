from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import PatchCollection
from matplotlib.colors import LinearSegmentedColormap, Normalize


BG = '#ffffff'
INK = '#18202a'
SUBTLE = '#687482'
GRID = '#d8e0e8'
BLUE = '#3b6ea8'
BLUE_DARK = '#24486f'
BLUE_LIGHT = '#b8d1ea'
TEAL = '#76a9b7'
ACCENT = '#d9a441'


def _polygon_area(coords: np.ndarray) -> float:
    x = coords[:, 0]
    y = coords[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def _polygon_centroid(coords: np.ndarray) -> tuple[float, float]:
    x = coords[:, 0]
    y = coords[:, 1]
    cross = x * np.roll(y, -1) - np.roll(x, -1) * y
    area = cross.sum() / 2.0
    if abs(area) < 1e-12:
        return float(x.mean()), float(y.mean())
    cx = ((x + np.roll(x, -1)) * cross).sum() / (6.0 * area)
    cy = ((y + np.roll(y, -1)) * cross).sum() / (6.0 * area)
    return float(cx), float(cy)


def _load_counts(csv_path: Path, column: str) -> dict[int, int]:
    counts: dict[int, int] = {}
    with csv_path.open(newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx = header.index(column)

        for row in reader:
            try:
                value = row[idx].strip()
                if not value:
                    continue
                area_num = int(float(value))
            except (ValueError, IndexError):
                continue
            if area_num <= 0:
                continue
            counts[area_num] = counts.get(area_num, 0) + 1
    return counts


def build_spatial_distribution(outdir: Path, csv_path: Path, geojson_path: Path) -> Path:
    counts = _load_counts(csv_path, 'Community Area')
    total = sum(counts.values())

    with geojson_path.open('r', encoding='utf-8') as f:
        geojson = json.load(f)

    features = geojson.get('features', [])
    ordered = sorted(features, key=lambda feature: int(float(feature.get('properties', {}).get('area_numbe', 0) or 0)))

    shares = {area_num: (count / total) * 100.0 for area_num, count in counts.items() if total}
    fig = plt.figure(figsize=(9.8, 8.6))
    ax_map = fig.add_subplot(111)

    cmap = LinearSegmentedColormap.from_list('chicago_concentration', ['#eef4fa', '#c7d9eb', '#88a8d1', '#4f79aa', '#24486f'])
    max_share = max(shares.values(), default=1.0)
    norm = Normalize(vmin=0.0, vmax=max_share)

    polygon_patches = []
    polygon_colors = []
    all_rings = []

    for feature in ordered:
        geometry = feature.get('geometry', {})
        properties = feature.get('properties', {})
        area_num = int(float(properties.get('area_numbe', 0) or 0))
        share = shares.get(area_num, 0.0)
        color = '#edf2f7' if share <= 0 else cmap(norm(share))

        if geometry.get('type') == 'MultiPolygon':
            polygons = geometry.get('coordinates', [])
        elif geometry.get('type') == 'Polygon':
            polygons = [geometry.get('coordinates', [])]
        else:
            polygons = []

        for polygon in polygons:
            if not polygon:
                continue
            exterior = polygon[0]
            polygon_patches.append(patches.Polygon(exterior, closed=True))
            polygon_colors.append(color)
            coords = np.asarray(exterior, dtype=float)
            all_rings.append(coords)

    collection = PatchCollection(polygon_patches, facecolor=polygon_colors, edgecolor='#f7fbff', linewidth=0.85)
    collection.set_zorder(2)
    ax_map.add_collection(collection)

    if all_rings:
        all_coords = np.concatenate(all_rings)
        min_lon, min_lat = all_coords.min(axis=0)
        max_lon, max_lat = all_coords.max(axis=0)
        pad_x = (max_lon - min_lon) * 0.03
        pad_y = (max_lat - min_lat) * 0.03
        ax_map.set_xlim(min_lon - pad_x, max_lon + pad_x)
        ax_map.set_ylim(min_lat - pad_y, max_lat + pad_y)

    ax_map.set_aspect('equal')
    ax_map.axis('off')

    sm = plt.cm.ScalarMappable(norm=norm, cmap=cmap)
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax_map, fraction=0.036, pad=0.02)
    cbar.set_label('share of incidents (%)', color=SUBTLE, fontsize=9)
    cbar.ax.tick_params(colors=SUBTLE, labelsize=8)

    out = outdir / 'chapter3_spatial_distribution'
    fig.savefig(out.with_suffix('.png'), dpi=320)
    plt.close(fig)
    return out.with_suffix('.png')


def build_district_map(outdir: Path) -> Path:
    geojson_path = Path(__file__).resolve().parents[2] / 'public' / 'data' / 'chicago-police-districts.geojson'

    with geojson_path.open('r', encoding='utf-8') as f:
        geojson = json.load(f)

    features = geojson.get('features', [])
    ordered = sorted(features, key=lambda feature: int(feature.get('properties', {}).get('dist_num', 0)))

    fig = plt.figure(figsize=(8.8, 9.8))
    ax = fig.add_subplot(111)
    polygon_patches = []
    polygon_colors = []
    label_points = []
    all_rings = []
    fill_palette = ['#dfe8f2', '#cfdceb']

    for index, feature in enumerate(ordered):
        geometry = feature.get('geometry', {})
        properties = feature.get('properties', {})
        district = str(properties.get('dist_num', ''))
        color = fill_palette[index % len(fill_palette)]

        if geometry.get('type') == 'MultiPolygon':
            polygons = geometry.get('coordinates', [])
        elif geometry.get('type') == 'Polygon':
            polygons = [geometry.get('coordinates', [])]
        else:
            polygons = []

        label_ring = None
        label_area = -1.0
        for polygon in polygons:
            if not polygon:
                continue
            exterior = polygon[0]
            polygon_patches.append(patches.Polygon(exterior, closed=True))
            polygon_colors.append(color)
            coords = np.asarray(exterior, dtype=float)
            all_rings.append(coords)
            area = _polygon_area(coords)
            if area > label_area:
                label_area = area
                label_ring = coords

        if label_ring is not None:
            cx, cy = _polygon_centroid(label_ring)
            label_points.append((cx, cy, district))

    collection = PatchCollection(polygon_patches, facecolor=polygon_colors, edgecolor='#f8fbfe', linewidth=1.1)
    ax.add_collection(collection)

    all_coords = np.concatenate(all_rings)
    min_lon, min_lat = all_coords.min(axis=0)
    max_lon, max_lat = all_coords.max(axis=0)
    pad_x = (max_lon - min_lon) * 0.03
    pad_y = (max_lat - min_lat) * 0.03
    ax.set_xlim(min_lon - pad_x, max_lon + pad_x)
    ax.set_ylim(min_lat - pad_y, max_lat + pad_y)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.text(0.01, 0.99, 'chicago police districts', transform=ax.transAxes, fontsize=11, color=SUBTLE, va='top')

    for x, y, district in label_points:
        ax.text(x, y, district, ha='center', va='center', fontsize=8.3, color=INK, fontweight='bold')

    out = outdir / 'chapter3_district_map'
    fig.savefig(out.with_suffix('.png'), dpi=320)
    plt.close(fig)
    return out.with_suffix('.png')
