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

try:
    from metrics import contextual, goh_barabasi
except ImportError:
    contextual = goh_barabasi = None  # type: ignore[assignment]
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

    # Plans 02-05 will replace this block with the metric pipeline.
    if any(
        x is None
        for x in (contextual, goh_barabasi, compare, figures, decision_gate)
    ):
        print()
        print("(Plan 01 skeleton — metric stages not yet implemented.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
