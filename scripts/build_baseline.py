"""Build the 168-cell (hour, dayOfWeek) baseline from the crime dataset.

Reads the full 8.5M-record Chicago crime dataset from DuckDB and
computes a stable 168-cell baseline of conditional rates. Writes:

    .planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/baselines/
        baseline_168.parquet       168-row data
        baseline_168.meta.json     build provenance (n_events, ts range,
                                   sha256 fingerprint, build date)

Idempotent: re-running overwrites the files. The fingerprint in the
sidecar JSON lets downstream consumers detect source data changes.

Usage:
    cd .planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/
    DUCKDB_PATH=/abs/data/cache/crime.duckdb .venv/bin/python ../../../scripts/build_baseline.py
    DUCKDB_PATH=... .venv/bin/python ../../../scripts/build_baseline.py --csv-out output/baseline_168.csv
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Make the phase83 metrics package importable.
PHASE_DIR = Path(__file__).resolve().parent.parent / ".planning" / "phases" / "83-contextual-burstiness-vs-goh-barabasi-comparison"
sys.path.insert(0, str(PHASE_DIR))

import duckdb  # noqa: E402
import pandas as pd  # noqa: E402

from metrics import baseline as baseline_mod  # noqa: E402


DEFAULT_DUCKDB_PATH = Path("data/cache/crime.duckdb")
DEFAULT_OUT_DIR = PHASE_DIR / "baselines"


def load_full_dataset(db_path: Path) -> pd.DataFrame:
    """Return the 4-col DataFrame for the full dataset (8.5M rows)."""
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
            """
        ).df()
    finally:
        con.close()
    df = df.dropna(subset=["ts"]).reset_index(drop=True)
    df["ts"] = df["ts"].astype("int64")
    df["hour"] = df["hour"].astype("int8")
    df["dow"] = df["dow"].astype("int8")
    df["month"] = df["month"].astype("int8")
    return df


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--db-path",
        type=Path,
        default=Path(os.environ.get("DUCKDB_PATH", DEFAULT_DUCKDB_PATH)),
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help="Directory for baseline_168.parquet + sidecar JSON.",
    )
    ap.add_argument(
        "--csv-out",
        type=Path,
        default=None,
        help="Optional: also write a CSV copy at this path (for figures.py "
        "which currently reads CSV).",
    )
    return ap.parse_args()


def main() -> int:
    args = parse_args()

    print(f"DuckDB: {args.db_path}")
    print(f"Output dir: {args.out_dir}")
    if args.csv_out:
        print(f"CSV copy: {args.csv_out}")

    print("Loading full dataset (8.5M rows) ...")
    df = load_full_dataset(args.db_path)
    print(f"  loaded {len(df):,} events  ts=[{df['ts'].min()} .. {df['ts'].max()}]")

    print("Building 168-cell baseline ...")
    baseline, meta = baseline_mod.build_from_dataframe(df)
    print(f"  cells: {len(baseline)}")
    print(f"  mu range: {baseline['mean_per_sec'].min():.6f} to {baseline['mean_per_sec'].max():.6f}")
    print(f"  fingerprint: {meta.fingerprint}")
    print(f"  n_events: {meta.n_events:,}  total_weeks: {meta.total_weeks:.1f}")

    print("Saving ...")
    parquet_path, json_path = baseline_mod.save(baseline, meta, args.out_dir)
    print(f"  {parquet_path}")
    print(f"  {json_path}")

    if args.csv_out:
        args.csv_out.parent.mkdir(parents=True, exist_ok=True)
        baseline.to_csv(args.csv_out, index=False)
        print(f"  {args.csv_out} (CSV copy)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
