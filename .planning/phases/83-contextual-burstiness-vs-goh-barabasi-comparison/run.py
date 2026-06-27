"""Phase 83 single-command entry point.

Loads the 8.5M-record Chicago crime dataset, computes the contextual
and Goh-Barabasi burstiness metrics over 1h/6h/1d/1w windows, writes
comparison_table.csv, renders thesis figures, and writes DECISION-GATE.md.

Usage:
    python run.py                                    # uses defaults
    python run.py --output-dir <path>                # custom output
    DUCKDB_PATH=/abs/path/to/crime.duckdb python run.py

The venv at ./.venv must exist (created via `make install`).
Run from the phase root directory.
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from db import load_crimes
from metrics import goh_barabasi

try:
    from metrics import contextual
except ImportError:
    contextual = None  # type: ignore[assignment]
try:
    import compare, figures  # type: ignore[import-not-found]
except ImportError:
    compare = figures = None  # type: ignore[assignment]
try:
    from metrics import decision_gate
except ImportError:
    decision_gate = None  # type: ignore[assignment]

DEFAULT_OUTPUT_DIR = Path("output")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--db-path",
        type=Path,
        default=None,
        help="Path to DuckDB cache. Defaults to DUCKDB_PATH env or "
        "data/cache/crime.duckdb (relative to project root).",
    )
    ap.add_argument(
        "--csv-path",
        type=Path,
        default=None,
        help="Path to the source CSV fallback. Defaults to "
        "data/sources/Crimes_-_2001_to_Present_20260114.csv.",
    )
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for output artifacts (default: output/).",
    )
    return ap.parse_args()


def _summarize(values, label: str) -> str:
    """Render n_windows / mean / std / min / max / cv / range for a series."""
    import numpy as np

    if values is None or len(values) == 0:
        return f"  {label}: (no windows)"
    arr = np.asarray(values, dtype=np.float64)
    n = arr.size
    mean = float(arr.mean())
    std = float(arr.std())  # population std (ddof=0), mirrors burstiness_sweep.py
    vmin = float(arr.min())
    vmax = float(arr.max())
    cv = std / abs(mean) if mean != 0 else float("inf")
    rng = vmax - vmin
    return (
        f"  {label}: n={n:,}  mean={mean:+.4f}  std={std:.4f}  "
        f"min={vmin:+.4f}  max={vmax:+.4f}  cv={cv:.4f}  range={rng:.4f}"
    )


def main() -> int:
    args = parse_args()
    print(f"Phase 83 — output directory: {args.output_dir.resolve()}")
    print()

    t0 = time.perf_counter()
    df = load_crimes(db_path=args.db_path, csv_path=args.csv_path)

    min_ts = int(df["ts"].min())
    max_ts = int(df["ts"].max())
    min_str = datetime.fromtimestamp(min_ts, tz=timezone.utc).strftime("%Y-%m-%d")
    max_str = datetime.fromtimestamp(max_ts, tz=timezone.utc).strftime("%Y-%m-%d")
    print(
        f"Loaded {len(df):,} events  "
        f"(ts range: {min_str}  →  {max_str})"
    )
    print(f"Elapsed: {time.perf_counter() - t0:.1f}s")
    print(f"Output directory: {args.output_dir.resolve()}")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    # ── Plan 03 stage: Goh-Barabasi B (CBP-02) ─────────────────────
    t1 = time.perf_counter()
    timestamps = df["ts"].to_numpy()
    full_gaps = None if timestamps.size < 2 else __import__("numpy").diff(
        timestamps.astype("float64")
    )
    b_full = goh_barabasi.goh_barabasi_b(full_gaps) if full_gaps is not None else None
    if b_full is not None:
        print(f"Full-series Goh-Barabasi B (IEI): {b_full:.4f}  (expected ≈ 0.30)")
        if not (0.20 <= b_full <= 0.40):
            print(
                "  WARNING: full-series B is outside expected range [0.20, 0.40]",
                file=sys.stderr,
            )
    else:
        print("Full-series Goh-Barabasi B (IEI): (degenerate)")

    all_b = []
    for window_sec in goh_barabasi.WINDOWS_SEC:
        step = max(1, window_sec // 4)
        b_series = goh_barabasi.compute_goh_barabasi_series(timestamps, window_sec, step)
        b_series["window_sec"] = window_sec
        all_b.append(b_series)
        print(
            _summarize(
                b_series["B"].to_numpy() if len(b_series) else None,
                goh_barabasi.WINDOW_LABELS[window_sec],
            )
        )
    full_b = (
        __import__("pandas").concat(all_b, ignore_index=True) if all_b else __import__("pandas").DataFrame()
    )
    goh_barabasi.write_goh_barabasi_parquet(
        full_b, args.output_dir / "goh_barabasi_metric.parquet"
    )
    print(f"Goh-Barabasi metric: {time.perf_counter() - t1:.1f}s")
    print()

    # ── Future plans (02 contextual, 04 comparison, 05 decision) ────
    if any(x is None for x in (contextual, compare, figures, decision_gate)):
        print("(Phase 83 Plan 03 stage complete — B metric written. ")
        print(" Plans 02 / 04 / 05 stages not yet implemented.)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
