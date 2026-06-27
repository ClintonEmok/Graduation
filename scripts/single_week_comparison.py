"""Single-week four-metric comparison experiment.

Picks the highest-activity week from the 8.5M-record Chicago crime
dataset and computes all four burstiness metrics (contextual z,
Goh-Barabasi B, density, CV) at 1h windows over that week. Renders
thesis-ready figures: per-metric time series, normalized overlay,
and a contrast table.

Reuses the metric modules from
.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/
so the math is identical to the Phase 83 full-dataset comparison.
The single-week view shows visually what the 1d-window CV/range
numbers measure numerically: contextual z swings through the full
range while the reference metrics stay close to their mean.

Usage:
    cd .planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/
    DUCKDB_PATH=/abs/data/cache/crime.duckdb .venv/bin/python ../../../scripts/single_week_comparison.py

Outputs:
    burst_aware_experiment_output/single_week/
        single_week_timeseries.png     # 4-panel per-metric
        single_week_overlay.png        # all 4 normalized
        single_week_contrast_table.png # 4-metric summary
        single_week_summary.csv        # the numbers
        single_week_data.parquet       # raw per-window values
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Reuse the metric modules from the Phase 83 comparison.
PHASE83_DIR = Path(__file__).resolve().parent.parent / ".planning" / "phases" / "83-contextual-burstiness-vs-goh-barabasi-comparison"
sys.path.insert(0, str(PHASE83_DIR))

from metrics.contextual import (  # noqa: E402
    WINDOWS_SEC,
    WINDOW_LABELS,
    compute_contextual_z_series,
)
from metrics.goh_barabasi import compute_goh_barabasi_series  # noqa: E402
from metrics.density import compute_density_series  # noqa: E402
from metrics.cv import compute_cv_series  # noqa: E402
from metrics import baseline as baseline_mod  # noqa: E402

PHASE83_BASELINES_DIR = PHASE83_DIR / "baselines"

# Reuse the chapter3 thesis palette.
BG = "#ffffff"
INK = "#18202a"
SUBTLE = "#5b6675"
GRID = "#d8e0e8"
BLUE = "#3b6ea8"
BLUE_DARK = "#1f3f63"
TEAL = "#3a8a8a"
ACCENT = "#d9a441"
RED = "#d46c68"
FIGURE_DPI = 320

SOURCE_CAPTION = (
    "Source: Chicago crime dataset (2001-2026); single-week experiment."
)


# ── Week selection ───────────────────────────────────────────────


def pick_highest_week(db_path: Path) -> tuple[pd.Timestamp, int]:
    """Return the (week_start, n_events) for the busiest week."""
    con = duckdb.connect(str(db_path), read_only=True)
    try:
        row = con.execute(
            """
            SELECT DATE_TRUNC('week', "Date") AS wk, COUNT(*) AS n
            FROM crimes_sorted
            GROUP BY 1
            ORDER BY n DESC
            LIMIT 1
            """
        ).fetchone()
    finally:
        con.close()
    return pd.Timestamp(row[0]), int(row[1])


def load_week(db_path: Path, week_start: pd.Timestamp) -> pd.DataFrame:
    """Return the 4-col DataFrame for the 7-day window starting at week_start."""
    week_end = week_start + pd.Timedelta(days=7)
    con = duckdb.connect(str(db_path), read_only=True)
    try:
        df = con.execute(
            """
            SELECT
                CAST(EPOCH("Date") AS BIGINT) AS ts,
                CAST(EXTRACT(HOUR FROM "Date") AS TINYINT) AS hour,
                CAST(((EXTRACT(DOW FROM "Date") + 1) % 7) AS TINYINT) AS dow,
                CAST(EXTRACT(MONTH FROM "Date") - 1 AS TINYINT) AS month
            FROM crimes_sorted
            WHERE "Date" >= ? AND "Date" < ?
            ORDER BY "Date"
            """,
            [week_start.to_pydatetime(), week_end.to_pydatetime()],
        ).df()
    finally:
        con.close()
    df = df.dropna(subset=["ts"]).reset_index(drop=True)
    df["ts"] = df["ts"].astype("int64")
    df["hour"] = df["hour"].astype("int8")
    df["dow"] = df["dow"].astype("int8")
    df["month"] = df["month"].astype("int8")
    return df


# ── Per-metric computation (1h windows) ──────────────────────────


def compute_all_metrics(
    week_df: pd.DataFrame,
    baseline: pd.DataFrame,
) -> dict[str, pd.DataFrame]:
    """Compute 4 metric series at 1h windows over the week.

    ``baseline`` must be derived from a *long* history (e.g., the
    full 8.5M-record dataset) so the 168-cell conditional rates are
    stable. Using only the week's data to build the baseline gives
    noisy per-cell rates that inflate the z-scores by 100x+.

    Returns dict mapping metric name -> DataFrame with columns
    [window_start, window_end, n_events, <value>].
    """
    timestamps = week_df["ts"].to_numpy()
    window_sec = 3600  # 1h
    step = max(1, window_sec // 4)  # 15-min step

    ctx = compute_contextual_z_series(timestamps, baseline, window_sec, step)
    b = compute_goh_barabasi_series(timestamps, window_sec, step)
    den = compute_density_series(timestamps, window_sec, step)
    cv = compute_cv_series(timestamps, window_sec, step)

    return {
        "contextual": ctx.rename(columns={"z": "value"})[
            ["window_start", "window_end", "n_events", "value"]
        ],
        "B": b.rename(columns={"B": "value"})[
            ["window_start", "window_end", "n_events", "value"]
        ],
        "density": den.rename(columns={"density": "value"})[
            ["window_start", "window_end", "n_events", "value"]
        ],
        "CV": cv.rename(columns={"CV": "value"})[
            ["window_start", "window_end", "n_events", "value"]
        ],
    }


def load_full_baseline() -> tuple[pd.DataFrame, "baseline_mod.BaselineMeta"]:
    """Load the precomputed baseline from disk.

    The baseline is built once via ``scripts/build_baseline.py`` and
    cached at ``.planning/.../baselines/baseline_168.parquet`` with
    a sidecar JSON. Loading it is ~10000x faster than rebuilding
    from DuckDB (which would re-scan 8.5M rows).

    Raises FileNotFoundError if the baseline has not been built yet.
    """
    return baseline_mod.load(PHASE83_BASELINES_DIR)


def summarize(values: np.ndarray) -> dict[str, float]:
    n = int(values.size)
    if n == 0:
        return {"n": 0, "mean": np.nan, "std": np.nan, "min": np.nan,
                "max": np.nan, "cv": np.nan, "range": np.nan}
    mean = float(values.mean())
    std = float(values.std(ddof=0))
    vmin = float(values.min())
    vmax = float(values.max())
    cv_val = std / abs(mean) if mean != 0 else 0.0
    return {
        "n": n,
        "mean": mean,
        "std": std,
        "min": vmin,
        "max": vmax,
        "cv": cv_val,
        "range": vmax - vmin,
    }


# ── Figure rendering ─────────────────────────────────────────────


def _ts_to_label(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%a %H:%M")


def render_timeseries(
    metrics: dict[str, pd.DataFrame],
    week_start: pd.Timestamp,
    output_path: Path,
) -> None:
    """4-panel time series: one panel per metric, 1h windows."""
    fig, axes = plt.subplots(4, 1, figsize=(10, 8), sharex=True,
                             facecolor=BG)
    palette = {"contextual": BLUE_DARK, "B": ACCENT, "density": TEAL, "CV": RED}
    titles = {
        "contextual": "Contextual z (deviation from hour×dayOfWeek baseline)",
        "B": "Goh-Barabasi B (inter-event-time burstiness)",
        "density": "Density (events / sec)",
        "CV": "CV (στ / μτ of inter-event times)",
    }

    for ax, (name, df) in zip(axes, metrics.items()):
        starts = df["window_start"].to_numpy()
        # Map epoch -> hours from week_start for x-axis
        x_hours = (starts - int(week_start.timestamp())) / 3600.0
        y = df["value"].to_numpy()
        ax.plot(x_hours, y, color=palette[name], linewidth=1.2,
                marker="o", markersize=2.5, alpha=0.85)
        ax.set_facecolor(BG)
        ax.set_title(titles[name], fontsize=10, color=INK, loc="left")
        ax.grid(True, color=GRID, linewidth=0.5, alpha=0.7)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(GRID)
        ax.spines["bottom"].set_color(GRID)
        ax.tick_params(colors=SUBTLE, labelsize=8)

    axes[-1].set_xlabel("Hours from week start (UTC)", fontsize=9, color=INK)
    axes[-1].set_xticks(np.arange(0, 168 + 1, 24))
    axes[-1].set_xticklabels(
        [(week_start + pd.Timedelta(days=i)).strftime("%a")
         for i in range(8)],
        fontsize=8,
    )

    week_label = week_start.strftime("%Y-%m-%d")
    fig.suptitle(
        f"Single-week burstiness time series — week of {week_label} (1h windows)",
        fontsize=12, color=INK, y=0.995,
    )
    fig.text(0.01, 0.005, SOURCE_CAPTION, fontsize=6.5, color=SUBTLE,
             ha="left", va="bottom", style="italic")
    fig.tight_layout(rect=(0, 0.02, 1, 0.98))
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote {output_path}")


def render_overlay(
    metrics: dict[str, pd.DataFrame],
    week_start: pd.Timestamp,
    output_path: Path,
) -> None:
    """All 4 metrics on one axis, each min-max normalized to [0, 1]."""
    fig, ax = plt.subplots(figsize=(10, 5), facecolor=BG)
    palette = {"contextual": BLUE_DARK, "B": ACCENT, "density": TEAL, "CV": RED}

    # Use the union of all window_starts as the x-axis (some metrics
    # drop windows, e.g. CV drops windows with n < 5).
    all_starts = sorted(set().union(*[set(df["window_start"]) for df in metrics.values()]))
    all_starts_arr = np.array(all_starts, dtype=np.int64)
    x_hours = (all_starts_arr - int(week_start.timestamp())) / 3600.0

    for name, df in metrics.items():
        # Min-max normalize the values.
        v = df["value"].to_numpy()
        if v.size == 0 or v.max() == v.min():
            continue
        v_norm = (v - v.min()) / (v.max() - v.min())
        starts = df["window_start"].to_numpy()
        x = (starts - int(week_start.timestamp())) / 3600.0
        # Sort by x so the line draws cleanly.
        order = np.argsort(x)
        ax.plot(x[order], v_norm[order], color=palette[name], linewidth=1.2,
                label=f"{name} (min-max normalized)", alpha=0.85,
                marker="o", markersize=2)

    ax.set_facecolor(BG)
    ax.set_title(
        "Single-week burstiness — min-max normalized overlay (1h windows)",
        fontsize=11, color=INK, loc="left",
    )
    ax.set_xlabel("Hours from week start (UTC)", fontsize=9, color=INK)
    ax.set_ylabel("normalized value ∈ [0, 1]", fontsize=9, color=INK)
    ax.set_xticks(np.arange(0, 168 + 1, 24))
    ax.set_xticklabels(
        [(week_start + pd.Timedelta(days=i)).strftime("%a")
         for i in range(8)],
        fontsize=8,
    )
    ax.grid(True, color=GRID, linewidth=0.5, alpha=0.7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(GRID)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=SUBTLE, labelsize=8)
    ax.legend(loc="upper right", fontsize=8, frameon=False)

    fig.text(0.01, 0.005, SOURCE_CAPTION, fontsize=6.5, color=SUBTLE,
             ha="left", va="bottom", style="italic")
    fig.tight_layout(rect=(0, 0.02, 1, 1))
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote {output_path}")


def render_contrast_table(
    summaries: dict[str, dict[str, float]],
    week_start: pd.Timestamp,
    output_path: Path,
) -> None:
    """4-metric contrast table saved as a PNG via matplotlib."""
    fig, ax = plt.subplots(figsize=(8.5, 2.4), facecolor=BG)
    ax.axis("off")

    cols = ["metric", "n", "mean", "std", "min", "max", "cv", "range"]
    rows: list[list[str]] = []
    for name, s in summaries.items():
        rows.append([
            name,
            f"{s['n']:,}",
            f"{s['mean']:+.3f}",
            f"{s['std']:.3f}",
            f"{s['min']:+.3f}",
            f"{s['max']:+.3f}",
            f"{s['cv']:.3f}",
            f"{s['range']:.3f}",
        ])

    table = ax.table(
        cellText=rows,
        colLabels=cols,
        loc="center",
        cellLoc="center",
        colColours=[BLUE_DARK] * len(cols),
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.4)

    for i, _ in enumerate(cols):
        cell = table[(0, i)]
        cell.set_text_props(color="white", weight="bold")

    week_label = week_start.strftime("%Y-%m-%d")
    ax.set_title(
        f"Single-week contrast table — week of {week_label}, 1h windows",
        fontsize=11, color=INK, loc="left", pad=14,
    )
    fig.text(0.01, 0.02, SOURCE_CAPTION, fontsize=6.5, color=SUBTLE,
             ha="left", va="bottom", style="italic")
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(output_path, dpi=FIGURE_DPI, facecolor=BG)
    plt.close(fig)
    print(f"Wrote {output_path}")


# ── Driver ───────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--db-path",
        type=Path,
        default=Path(os.environ.get("DUCKDB_PATH", "data/cache/crime.duckdb")),
    )
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=Path("burst_aware_experiment_output/single_week"),
    )
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print("Picking highest-activity week ...")
    week_start, n_total = pick_highest_week(args.db_path)
    print(f"  week: {week_start.date()}  ({n_total:,} events)")

    print("Loading week ...")
    df = load_week(args.db_path, week_start)
    print(f"  loaded {len(df):,} events  ts=[{df['ts'].min()} .. {df['ts'].max()}]")

    print("Loading 168-cell baseline from disk ...")
    baseline, baseline_meta = load_full_baseline()
    print(f"  baseline cells: {len(baseline)}  mu range: "
          f"{baseline['mean_per_sec'].min():.6f} to {baseline['mean_per_sec'].max():.6f}")
    print(f"  fingerprint: {baseline_meta.fingerprint}  "
          f"n_events: {baseline_meta.n_events:,}  built: {baseline_meta.built_at}")

    print("Computing 4 metrics at 1h windows ...")
    metrics = compute_all_metrics(df, baseline)
    for name, m in metrics.items():
        s = summarize(m["value"].to_numpy())
        print(
            f"  {name:>11}: n={s['n']:>3}  mean={s['mean']:+.4f}  "
            f"std={s['std']:.4f}  range={s['range']:.4f}"
        )

    # Save the raw per-window data
    raw = pd.concat(
        [df.assign(metric=name) for name, df in metrics.items()],
        ignore_index=True,
    )
    raw.to_parquet(args.output_dir / "single_week_data.parquet", index=False)

    # Save the summary CSV
    summaries = {
        name: summarize(m["value"].to_numpy()) for name, m in metrics.items()
    }
    summary_df = pd.DataFrame(
        [
            {"metric": name, **s}
            for name, s in summaries.items()
        ]
    )
    summary_df.to_csv(args.output_dir / "single_week_summary.csv", index=False)

    print("Rendering figures ...")
    render_timeseries(metrics, week_start, args.output_dir / "single_week_timeseries.png")
    render_overlay(metrics, week_start, args.output_dir / "single_week_overlay.png")
    render_contrast_table(summaries, week_start, args.output_dir / "single_week_contrast_table.png")

    return 0


if __name__ == "__main__":
    sys.exit(main())
