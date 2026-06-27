"""
Ratio sweep experiment: visualize the prototype's adaptive temporal warp at
multiple burst-influence ratios (lambda) for a single representative window.

Goal: produce a thesis-ready figure showing what changes when the adaptive
scaling shifts from pure density (lambda = 0) to pure burstiness (lambda = 1).

Mirrors the prototype's algorithm:
  - Hourly count bins across the window.
  - Per-bin Goh-Barabasi burstiness coefficient from inter-event gaps.
  - Weight per bin: w_i = 1 + (1 - lambda) * d_i + lambda * B_i  (then * 5).
  - Cumulative warp map: y_k = (sum_{i<k} w_i) / (sum w_i) * span.

The ground-truth burst window (overlap with the strongest hourly spike) is
overlaid so a reader can see which lambda best aligns visual space with the
actual burst.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import Patch

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = REPO_ROOT / "scripts" / "output" / "ratio_sweep"

# Lambda values to sweep.
DEFAULT_LAMBDAS = [0.0, 0.25, 0.5, 0.75, 1.0]

# Default window: the isolated burst context window chosen in the
# EVALUATION_PROTOCOL.md walkthrough. Strong visual spike with quieter
# surrounding context, so the warp effect is visible at every lambda.
DEFAULT_WINDOW = ("2023-12-11", "2023-12-25")

# Multiplier used by the prototype weight formula.
WEIGHT_MULTIPLIER = 5.0


def to_chicago_epoch(date_str: str) -> int:
    """Convert a YYYY-MM-DD Chicago-local date to a UTC epoch second."""
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def load_hourly_counts(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Build an hourly count series over the window by reading the raw CSV in
    chunks. Only Date and ID are pulled.
    """
    csv_path = (
        REPO_ROOT
        / "data"
        / "sources"
        / "Crimes_-_2001_to_Present_20260114.csv"
    )
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Crime CSV not found at {csv_path}. Expected the Chicago corpus."
        )

    start_epoch = to_chicago_epoch(start_date)
    end_epoch = to_chicago_epoch(end_date) + 86400  # include the end day

    chunks = pd.read_csv(
        csv_path,
        usecols=["Date", "ID"],
        dtype={"ID": "int64"},
        chunksize=200_000,
        low_memory=False,
        on_bad_lines="skip",
    )

    frames = []
    for chunk in chunks:
        parsed = pd.to_datetime(
            chunk["Date"], format="%m/%d/%Y %I:%M:%S %p", errors="coerce"
        )
        valid = parsed.notna()
        if not valid.any():
            continue
        epoch = parsed[valid].astype("int64") // 10**9
        mask = (epoch >= start_epoch) & (epoch < end_epoch)
        if mask.any():
            frames.append(pd.DataFrame({"epoch": epoch[mask].values}))

    if not frames:
        return pd.DataFrame(columns=["epoch"])

    events = pd.concat(frames, ignore_index=True)
    events["hour"] = (events["epoch"] // 3600).astype("int64")
    counts = events.groupby("hour").size().rename("count").reset_index()
    return counts


def build_bins(counts: pd.DataFrame, start_epoch: int, end_epoch: int, bin_count: int):
    """
    Uniform-time binning into `bin_count` bins, with per-bin count, density,
    and Goh-Barabasi burstiness.
    """
    span = end_epoch - start_epoch
    bin_width = span / bin_count
    bin_edges = start_epoch + np.arange(bin_count + 1) * bin_width

    # Reconstruct per-event timestamps by repeating hours and splitting back
    # into a per-second stream. This lets us compute inter-event gaps inside
    # each bin (the worker's approach).
    events_per_bin: list[np.ndarray] = []
    for i in range(bin_count):
        lo, hi = bin_edges[i], bin_edges[i + 1]
        in_bin = counts[(counts["hour"] * 3600 >= lo) & (counts["hour"] * 3600 < hi)]
        # Expand each hour row to one event per count; jitter inside the hour
        # to approximate event distribution.
        if len(in_bin) == 0:
            events_per_bin.append(np.array([], dtype=np.float64))
            continue
        seconds = in_bin["hour"].to_numpy() * 3600
        counts_arr = in_bin["count"].to_numpy()
        sample_offsets = np.concatenate(
            [
                np.random.default_rng(seed=i).uniform(0, 3600, size=c)
                for c in counts_arr
            ]
        )
        all_seconds = np.concatenate(
            [np.full(c, s) + offsets for s, c, offsets in zip(seconds, counts_arr, [sample_offsets[sum(counts_arr[:j]):sum(counts_arr[:j + 1])] for j in range(len(counts_arr))])]
        ) if len(counts_arr) > 0 else np.array([], dtype=np.float64)
        # Filter to bin range and sort.
        mask = (all_seconds >= lo) & (all_seconds < hi)
        events_per_bin.append(np.sort(all_seconds[mask]))

    # Per-bin density (normalized to peak) and burstiness.
    bin_counts = np.array([len(e) for e in events_per_bin], dtype=np.float64)
    peak = bin_counts.max() if bin_counts.max() > 0 else 1.0
    density = bin_counts / peak

    burstiness = np.zeros(bin_count)
    for i, evs in enumerate(events_per_bin):
        if len(evs) < 2:
            continue
        gaps = np.diff(evs)
        mu = gaps.mean()
        sigma = gaps.std()
        if mu + sigma <= 0:
            continue
        raw = (sigma - mu) / (sigma + mu)
        burstiness[i] = float(np.clip((raw + 1) / 2, 0.0, 1.0))

    return bin_edges, bin_counts, density, burstiness


def compute_warp(
    density: np.ndarray,
    burstiness: np.ndarray,
    lam: float,
    span: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Return (weights, warp_offsets). warp_offsets[k] is the display position
    of bin k, in [0, span].
    """
    blended = (1.0 - lam) * density + lam * burstiness
    weights = 1.0 + blended * WEIGHT_MULTIPLIER
    total = weights.sum()
    if total <= 0:
        total = len(weights)
        weights = np.ones_like(weights)
    share = weights / total
    # Display width per bin (in seconds of original time, mapped to span).
    display_per_bin = share * span
    # Display positions: cumulative sum, but indexed by bin index.
    positions = np.concatenate([[0.0], np.cumsum(display_per_bin)])
    return weights, positions


def find_ground_truth_burst(bin_counts: np.ndarray) -> tuple[int, int]:
    """
    Define a ground-truth burst window as the contiguous run of bins around
    the peak whose counts are >= 50% of the peak (a simple peak-region rule).
    """
    if bin_counts.max() <= 0:
        return 0, 0
    peak_idx = int(np.argmax(bin_counts))
    threshold = 0.5 * bin_counts[peak_idx]
    start = peak_idx
    while start > 0 and bin_counts[start - 1] >= threshold:
        start -= 1
    end = peak_idx
    while end < len(bin_counts) - 1 and bin_counts[end + 1] >= threshold:
        end += 1
    return start, end + 1


def plot_ratio_sweep(
    start_date: str,
    end_date: str,
    bin_edges: np.ndarray,
    bin_counts: np.ndarray,
    density: np.ndarray,
    burstiness: np.ndarray,
    lambdas: list[float],
    output_path: Path,
) -> pd.DataFrame:
    """
    Draw a figure with one row per lambda. Each row shows the same time
    window with its hourly counts (left axis) and the warped visual position
    of each bin (right axis). The ground-truth burst window is shaded.
    """
    n_bins = len(bin_counts)
    span = bin_edges[-1] - bin_edges[0]
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
    start_epoch = bin_edges[0]
    end_epoch = bin_edges[-1]
    burst_start, burst_end = find_ground_truth_burst(bin_counts)

    fig, axes = plt.subplots(
        len(lambdas), 1, figsize=(11, 2.2 * len(lambdas)), sharex=True
    )
    if len(lambdas) == 1:
        axes = [axes]

    summary = []
    for ax, lam in zip(axes, lambdas):
        weights, positions = compute_warp(density, burstiness, lam, span)

        # Background shading for the ground-truth burst window.
        gt_start_time = bin_edges[burst_start]
        gt_end_time = bin_edges[burst_end]
        ax.axvspan(gt_start_time, gt_end_time, color="#fef3c7", alpha=0.6, zorder=0)
        ax.text(
            (gt_start_time + gt_end_time) / 2,
            bin_counts.max() * 0.95,
            "ground truth",
            ha="center",
            va="top",
            fontsize=8,
            color="#92400e",
        )

        # Hourly counts (left axis).
        bar_widths = (bin_edges[1:] - bin_edges[:-1]) * 0.85
        ax.bar(
            bin_centers,
            bin_counts,
            width=bar_widths,
            color="#94a3b8",
            edgecolor="white",
            linewidth=0.5,
            zorder=2,
        )
        ax.set_ylabel("events", fontsize=8, color="#475569")
        ax.tick_params(axis="y", labelsize=8, colors="#475569")
        ax.set_ylim(0, bin_counts.max() * 1.15)

        # Warped display position (right axis).
        ax2 = ax.twinx()
        ax2.step(
            bin_centers,
            positions[1:],
            where="mid",
            color="#7c3aed",
            linewidth=2.0,
            zorder=3,
        )
        ax2.set_ylim(0, span)
        ax2.set_ylabel("display position (s)", fontsize=8, color="#7c3aed")
        ax2.tick_params(axis="y", labelsize=8, colors="#7c3aed")

        # Visual-space allocated to the ground-truth burst window.
        gt_visual_share = (positions[burst_end] - positions[burst_start]) / span

        ax.set_title(
            f"lambda = {lam:.2f}  |  ground-truth visual share = {gt_visual_share:.1%}",
            fontsize=10,
            loc="left",
            color="#0f172a",
        )

        summary.append(
            {
                "lambda": lam,
                "gt_start_bin": burst_start,
                "gt_end_bin": burst_end,
                "gt_visual_share": float(gt_visual_share),
                "weight_gini": float(_gini(weights)),
                "peak_expansion": float(weights.max() / weights.mean()),
            }
        )

    # X-axis label on the bottom row.
    n_days = (end_epoch - start_epoch) / 86400
    tick_times = np.linspace(start_epoch, end_epoch, int(n_days) + 1)
    tick_labels = [
        datetime.fromtimestamp(t, tz=timezone.utc).strftime("%m-%d")
        for t in tick_times
    ]
    axes[-1].set_xticks(tick_times)
    axes[-1].set_xticklabels(tick_labels, fontsize=8, rotation=0)
    axes[-1].set_xlabel("time (UTC, day boundary)", fontsize=9)

    fig.suptitle(
        f"Ratio sweep: {start_date} -> {end_date}\n"
        "Bars = hourly event counts. Step = warped display position.\n"
        "Yellow band = ground-truth burst window (peak region).",
        fontsize=11,
        y=1.0,
    )

    legend_handles = [
        Patch(facecolor="#94a3b8", label="hourly count"),
        Patch(facecolor="#fef3c7", edgecolor="#92400e", label="ground truth burst"),
        plt.Line2D([0], [0], color="#7c3aed", linewidth=2, label="warped position"),
    ]
    fig.legend(handles=legend_handles, loc="upper right", fontsize=8, framealpha=0.9)
    fig.tight_layout()
    fig.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(fig)

    return pd.DataFrame(summary)


def _gini(values: np.ndarray) -> float:
    """Gini coefficient in [0, 1] for non-negative values."""
    v = np.asarray(values, dtype=np.float64)
    if v.sum() <= 0:
        return 0.0
    v = np.sort(v)
    n = len(v)
    cum = np.cumsum(v)
    return (2.0 * np.sum((np.arange(1, n + 1)) * v) - (n + 1) * cum[-1]) / (n * cum[-1])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default=DEFAULT_WINDOW[0])
    parser.add_argument("--end", default=DEFAULT_WINDOW[1])
    parser.add_argument("--bin-count", type=int, default=96, help="default 96 = ~3h bins over 14d")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--lambdas", nargs="+", type=float, default=DEFAULT_LAMBDAS)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading hourly counts for {args.start} -> {args.end}")
    counts = load_hourly_counts(args.start, args.end)
    print(f"Loaded {len(counts)} hourly bins; total events = {int(counts['count'].sum())}")

    start_epoch = to_chicago_epoch(args.start)
    end_epoch = to_chicago_epoch(args.end) + 86400
    bin_edges, bin_counts, density, burstiness = build_bins(
        counts, start_epoch, end_epoch, args.bin_count
    )
    print(
        f"Bins: {len(bin_counts)} | "
        f"peak count = {int(bin_counts.max())} | "
        f"peak burstiness = {burstiness.max():.3f}"
    )

    figure_path = output_dir / f"ratio_sweep_{args.start}_to_{args.end}.png"
    summary = plot_ratio_sweep(
        start_date=args.start,
        end_date=args.end,
        bin_edges=bin_edges,
        bin_counts=bin_counts,
        density=density,
        burstiness=burstiness,
        lambdas=args.lambdas,
        output_path=figure_path,
    )
    print(f"Wrote {figure_path}")

    csv_path = output_dir / f"ratio_sweep_{args.start}_to_{args.end}.csv"
    summary.to_csv(csv_path, index=False)
    print(f"Wrote {csv_path}")
    print()
    print(summary.to_string(index=False))


if __name__ == "__main__":
    main()
