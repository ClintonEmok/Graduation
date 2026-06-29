#!/usr/bin/env python3
"""Render the multi-window experiment results as a single Markdown artifact.

Reads:
    scripts/output/experiment2_temporal_weighting/experiment2_all_windows.csv
    scripts/output/experiment2_temporal_weighting/experiment2_aggregate.csv

Writes:
    scripts/output/experiment2_temporal_weighting/experiment2_results.md

Usage:
    python3 scripts/experiment2_write_markdown.py
    python3 scripts/experiment2_write_markdown.py --output path/to/file.md
"""

from __future__ import annotations

import argparse
import csv
import math
import statistics
from pathlib import Path

DEFAULT_OUTPUT = Path(__file__).parent / "output" / "experiment2_temporal_weighting" / "experiment2_results.md"
ALL_WINDOWS_CSV = Path(__file__).parent / "output" / "experiment2_temporal_weighting" / "experiment2_all_windows.csv"
AGGREGATE_CSV = Path(__file__).parent / "output" / "experiment2_temporal_weighting" / "experiment2_aggregate.csv"

WEIGHTING_NAMES = ("Raw density", "Z-score", "Goh burstiness")
WEIGHTING_ORDER = ("Raw density", "Z-score", "Goh burstiness")

METRIC_HEADERS = [
    ("max_expansion",   "Max expansion (x)",   "neutral", "{:.2f}", "{:.2f}"),
    ("max_compression", "Max compression (x)", "neutral", "{:.3f}", "{:.3f}"),
    ("share_gini",      "Share Gini",          "higher",  "{:.3f}", "{:.3f}"),
    ("neighbour_diff",  "Neighbour diff",      "lower",   "{:.4f}", "{:.4f}"),
    ("compute_ms",      "Compute (ms)",        "lower",   "{:.2f}", "{:.2f}"),
]

WINDOW_MD = "experiment2_results.md"


METRIC_LOOKUP = {key: (label, polarity, win_fmt, val_fmt) for key, label, polarity, win_fmt, val_fmt in METRIC_HEADERS}


def fmt_cell(value, fmt) -> str:
    if value is None or value == "" or (isinstance(value, float) and math.isnan(value)):
        return "—"
    if value == "inf":
        return "∞"
    try:
        return fmt.format(float(value))
    except (TypeError, ValueError):
        return str(value)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def write_table(out, headers: list[str], rows: list[list[str]]) -> None:
    out.append("| " + " | ".join(headers) + " |")
    out.append("|" + "|".join(["---"] * len(headers)) + "|")
    for row in rows:
        out.append("| " + " | ".join(row) + " |")
    out.append("")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--all-windows-csv", type=Path, default=ALL_WINDOWS_CSV)
    parser.add_argument("--aggregate-csv", type=Path, default=AGGREGATE_CSV)
    args = parser.parse_args()

    all_rows = read_csv(args.all_windows_csv)
    agg_rows = read_csv(args.aggregate_csv)

    by_weight_metric = {
        (r["weighting"], r["metric"]): r
        for r in agg_rows
    }

    win_counts: dict[tuple[str, str], int] = {
        (w, m): 0
        for w in WEIGHTING_ORDER
        for m, _label, polarity, _win_fmt, _val_fmt in METRIC_HEADERS
        if polarity != "neutral"
    }

    window_keys = sorted(
        {(r["window_days"], r["rank"]) for r in all_rows},
        key=lambda k: (int(k[0]), int(k[1])),
    )
    n_windows = len(window_keys)
    sizes = sorted({int(r["window_days"]) for r in all_rows})
    size_labels = ", ".join(f"{s} d" for s in sizes)
    cvs = [float(r["cv"]) for r in all_rows if r.get("cv") not in (None, "")]
    cv_range = f"{min(cvs):.3f}–{max(cvs):.3f}" if cvs else "—"
    for window_days, rank in window_keys:
        candidates = [
            r for r in all_rows
            if r["window_days"] == window_days and r["rank"] == rank
        ]
        if len(candidates) != len(WEIGHTING_ORDER):
            continue
        for metric_key, _label, polarity, _win_fmt, _val_fmt in METRIC_HEADERS:
            if polarity == "neutral":
                continue
            vals: dict[str, float] = {}
            for r in candidates:
                raw = r[metric_key]
                if raw in ("", "inf", None):
                    continue
                try:
                    vals[r["weighting"]] = float(raw)
                except ValueError:
                    continue
            if len(vals) != len(WEIGHTING_ORDER):
                continue
            if polarity == "lower":
                winner = min(vals, key=vals.get)
            else:
                winner = max(vals, key=vals.get)
            win_counts[(winner, metric_key)] += 1

    out: list[str] = []
    out.append("# Experiment 2 — Temporal Weighting Functions")
    out.append("")
    out.append("Cross-window evaluation of three temporal weighting schemes used to drive")
    out.append("the adaptive time-axis of the space-time cube:")
    out.append("")
    out.append("- **Raw density** — normalized event count per hour.")
    out.append("- **Z-score** — standardized density \\((x - \\mu) / \\sigma)\\) within the window.")
    out.append("- **Goh burstiness** — Goh–Barabási burstiness coefficient B = (σ − μ) / (σ + μ)")
    out.append("  computed on real inter-event times within each hour, then binned.")
    out.append("")
    out.append(
        f"All metrics computed on **{n_windows} windows** drawn from the showcase set "
        f"({size_labels}). Windows are binned at the scale appropriate to their span: "
        "1-day windows use 24 hourly bins; longer windows use one daily bin per day."
    )
    out.append("")
    out.append("| | |")
    out.append("|---|---|")
    out.append("| Dataset | Chicago Crimes 2001–2026 (full corpus) |")
    out.append("| Source CSV | `data/sources/Crimes_-_2001_to_Present_20260114.csv` |")
    out.append(f"| Windows | {n_windows} (CV range {cv_range}) |")
    out.append("| Bin size | 1d windows: 24 × 1 h; 14/30/90d windows: 1 × 24 h per day |")
    out.append("| Cleaning | drop NaT, drop duplicate `ID` (per-chunk) |")
    out.append("")

    # ------------------------------------------------------------------
    # Section 1: aggregate metrics
    # ------------------------------------------------------------------
    out.append(f"## 1. Aggregate metrics (mean ± std across {n_windows} windows)")
    out.append("")
    headers = ["Weighting"] + [_label for _key, _label, _p, _wf, _vf in METRIC_HEADERS]
    rows: list[list[str]] = []
    for w in WEIGHTING_ORDER:
        row = [w]
        for metric_key, _label, _p, win_fmt, val_fmt in METRIC_HEADERS:
            r = by_weight_metric.get((w, metric_key))
            if r is None:
                row.append("—")
                continue
            mean = float(r["mean"])
            std = float(r["std"])
            row.append(f"{val_fmt.format(mean)} ± {val_fmt.format(std)}")
        rows.append(row)
    write_table(out, headers, rows)
    out.append(
        "_Polarity is defined per metric in `scripts/experiment2_temporal_weighting.py:95` — "
        "see column 2 in §2 (win rates) for the direction that each cell rewards._"
    )
    out.append("")

    # ------------------------------------------------------------------
    # Section 2: win rates
    # ------------------------------------------------------------------
    out.append(f"## 2. Win rates (out of {n_windows} windows)")
    out.append("")
    headers = ["Weighting"] + [_label for _key, _label, _p, _wf, _vf in METRIC_HEADERS]
    rows = []
    for w in WEIGHTING_ORDER:
        row = [w]
        for metric_key, _label, _p, win_fmt, val_fmt in METRIC_HEADERS:
            if _p == "neutral":
                row.append("—")
            else:
                row.append(f"{win_counts.get((w, metric_key), 0)}/{n_windows}")
        rows.append(row)
    write_table(out, headers, rows)
    out.append(
        "For each (window, metric) we pick the best weighting in the metric's "
        f"preferred direction. A count of `{n_windows}/{n_windows}` means the weighting was the "
        "best on that metric for every single window in the cohort. "
        "Neutral metrics have no winner and are marked `—`."
    )
    out.append("")

    # ------------------------------------------------------------------
    # Section 3: per-size breakdown
    # ------------------------------------------------------------------
    out.append("## 3. Per-size breakdown (mean of key metrics)")
    out.append("")
    size_metrics = ["max_expansion", "share_gini", "neighbour_diff", "compute_ms"]
    headers = ["Weighting", "Size", "Windows"] + [
        METRIC_LOOKUP[m][0] for m in size_metrics
    ]
    rows = []
    for w in WEIGHTING_ORDER:
        for s in sizes:
            win_rows = [r for r in all_rows if r["window_days"] == str(s) and r["weighting"] == w]
            if not win_rows:
                continue
            row = [w, f"{s} d", str(len(win_rows))]
            for m in size_metrics:
                vals = [float(r[m]) for r in win_rows if r[m] not in ("", "inf")]
                if not vals:
                    row.append("—")
                else:
                    vf = METRIC_LOOKUP[m][3]
                    row.append(vf.format(statistics.fmean(vals)))
            rows.append(row)
    write_table(out, headers, rows)
    out.append("")

    # ------------------------------------------------------------------
    # Section 4: window roster
    # ------------------------------------------------------------------
    out.append("## 4. Window roster")
    out.append("")
    headers = ["Size", "Rank", "Start", "End", "CV", "Peak ratio", "Total events", "Analysed events"]
    rows = []
    seen = set()
    for r in all_rows:
        key = (r["window_days"], r["rank"], r["start"], r["end"])
        if key in seen:
            continue
        seen.add(key)
        rows.append([
            f"{r['window_days']} d",
            r["rank"],
            r["start"],
            r["end"],
            f"{float(r['cv']):.3f}",
            f"{float(r['peak_ratio']):.2f}",
            f"{int(float(r['total_events'])):,}",
            f"{int(float(r['slice_events'])):,}",
        ])
    rows.sort(key=lambda r: (r[0], int(r[1])))
    write_table(out, headers, rows)
    out.append("")

    # ------------------------------------------------------------------
    # Section 5: per-window per-weighting results
    # ------------------------------------------------------------------
    out.append("## 5. Per-window per-weighting results")
    out.append("")
    out.append("Each row is a (window, weighting) pair. Analysed events are the count of")
    out.append("events inside the analysed window at its native binning scale.")
    out.append("")
    headers = ["Size", "Rank", "Weighting", "Max expand", "Max compress", "Gini", "Neighbour", "Compute (ms)"]
    rows = []
    for r in all_rows:
        rows.append([
            f"{r['window_days']} d",
            r["rank"],
            r["weighting"],
            fmt_cell(r["max_expansion"], "{:.2f}"),
            fmt_cell(r["max_compression"], "{:.3f}"),
            fmt_cell(r["share_gini"], "{:.3f}"),
            fmt_cell(r["neighbour_diff"], "{:.4f}"),
            fmt_cell(r["compute_ms"], "{:.2f}"),
        ])
    rows.sort(key=lambda r: (int(r[0].split()[0]), int(r[1]), r[2]))
    write_table(out, headers, rows)
    out.append("")

    # ------------------------------------------------------------------
    # Section 6: summary text
    # ------------------------------------------------------------------
    out.append("## 6. Headline findings")
    out.append("")
    out.append(
        "- **Raw density provides the most balanced redistribution**: modest "
        "expansion (mean max expand ≈ 1.9×), usable compression (mean max "
        "compress ≈ 0.76×), low share concentration (mean Gini ≈ 0.08), and "
        "low roughness (neighbour Δ ≈ 0.06). It is also the cheapest to compute "
        "(≈0.006 ms/window)."
    )
    out.append(
        "- **Z-score is the strongest redistributor** on every window: mean "
        "max expand ≈ 10.1×, mean max compress = 0.00×, and mean share Gini "
        "≈ 0.74. That selectivity comes at the cost of the roughest timelines "
        "(neighbour Δ ≈ 0.18) because the z ≤ 0 floor-clip creates sharp day-" 
        "to-day discontinuities."
    )
    out.append(
        "- **Goh burstiness barely adapts the axis at all**: mean max expand "
        "≈ 1.08×, mean max compress ≈ 0.95×, and mean share Gini ≈ 0.015. "
        "It is the smoothest option (neighbour Δ ≈ 0.026) but also the slowest "
        "to compute (≈1.8 ms/window — roughly 300× density)."
    )
    out.append(
        "- **Burstiness is the wrong signal for visual allocation.** A "
        "weighting that is bounded near 1.0× in every window cannot "
        "redistribute temporal real-estate in a way users perceive as adaptive. "
        "It remains a useful diagnostic (e.g. *why* a count spike looks spikey) "
        "but should not drive the time-axis on its own."
    )
    out.append(
        "- **Recommended split for the prototype**: use **raw density** as the "
        "primary axis driver and surface a **z-score highlight overlay** to call "
        "out exceptional intervals. Treat **burstiness** as an internal annotation, "
        "not a layout weight."
    )
    out.append("")

    out.append("---")
    out.append("")
    out.append(
        "_Source data: "
        "[experiment2_all_windows.csv](experiment2_all_windows.csv), "
        "[experiment2_aggregate.csv](experiment2_aggregate.csv). "
        "Plots: "
        "[timelines (14 d #1)](14d_rank1/experiment2_timelines.png), "
        "[metrics table (14 d #1)](14d_rank1/experiment2_metrics_table.png), "
        "[aggregate table](experiment2_aggregate_table.png), "
        "[win-rate heatmap](experiment2_winrates_heatmap.png), "
        "[single-window findings](experiment2_findings.txt)._"
    )
    out.append("")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(out))
    print(f"wrote {args.output}  ({len(out)} lines)")


if __name__ == "__main__":
    main()
