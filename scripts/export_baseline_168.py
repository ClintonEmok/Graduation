#!/usr/bin/env python3
"""Phase 84 baseline exporter — parquet -> JSON.

Reads the Phase 83 168-cell baseline parquet (built by
``metrics/baseline.py``) and emits a JSON file consumable by the
dashboard-demo client. The JSON shape matches the ``Baseline168``
interface in ``src/lib/signal-sources/contract.ts``:

    {
      "header": {
        "nEvents":     <int>,
        "tsMin":       <int>,   // epoch seconds
        "tsMax":       <int>,   // epoch seconds
        "totalWeeks":  <float>,
        "fingerprint": "sha256:<16-hex-chars>",
        "builtAt":     "ISO-8601"
      },
      "cells": [
        {"h": 0..23, "d": 0..6, "c": <int>, "mu": <float>, "sig": <float>},
        ...  // 168 cells, sorted by (h, d)
      ]
    }

Usage:
    python scripts/export_baseline_168.py
    python scripts/export_baseline_168.py --source <parquet> --output <json>
    python scripts/export_baseline_168.py --help

Dependencies: ``pyarrow`` (installed in the Phase 83 venv at
``planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/.venv/``).
On a clean host, run ``make install`` from the Phase 83 directory first.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pyarrow.parquet as pq


# ── Paths ───────────────────────────────────────────────────────

# Project root: parent of the scripts/ directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_SOURCE = (
    PROJECT_ROOT
    / ".planning"
    / "phases"
    / "83-contextual-burstiness-vs-goh-barabasi-comparison"
    / "baselines"
    / "baseline_168.parquet"
)
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "baselines" / "baseline_168.json"
DEFAULT_META = (
    PROJECT_ROOT
    / ".planning"
    / "phases"
    / "83-contextual-burstiness-vs-goh-barabasi-comparison"
    / "baselines"
    / "baseline_168.meta.json"
)

# Schema constants — keep in sync with metrics/baseline.py:51-58.
EXPECTED_COLUMNS: tuple[str, ...] = (
    "hour",
    "dow",
    "count",
    "mean_per_sec",
    "sigma_per_sec",
    "count_cell_weeks",
)
N_CELLS = 24 * 7  # 168

# Required meta.json keys.
REQUIRED_META_KEYS: tuple[str, ...] = (
    "n_events",
    "ts_min",
    "ts_max",
    "total_weeks",
    "fingerprint",
)


# ── Argparse ─────────────────────────────────────────────────────


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI args."""
    parser = argparse.ArgumentParser(
        prog="export_baseline_168",
        description=(
            "Export the Phase 83 168-cell baseline parquet as a static JSON file "
            "consumable by the dashboard-demo density mapper."
        ),
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Path to baseline_168.parquet (default: {DEFAULT_SOURCE.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Path to write the JSON file (default: {DEFAULT_OUTPUT.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--meta",
        type=Path,
        default=DEFAULT_META,
        help=f"Path to baseline_168.meta.json (default: {DEFAULT_META.relative_to(PROJECT_ROOT)})",
    )
    return parser.parse_args(argv)


# ── Loaders ──────────────────────────────────────────────────────


def load_baseline_table(source: Path) -> dict[str, list]:
    """Read the parquet and return a column->list dict sorted by (hour, dow).

    The 84-02 contract uses ``h * 7 + d`` indexing (matches Python
    ``metrics/contextual.py:115`` ``cell_idx = h * 7 + d``). The parquet
    is already sorted by (hour, dow) on disk; we re-sort defensively in
    case the upstream pipeline changes the write order.
    """
    if not source.exists():
        raise SystemExit(f"Baseline parquet not found: {source}")

    table = pq.read_table(source).to_pydict()
    columns = set(table.keys())
    missing = [c for c in EXPECTED_COLUMNS if c not in columns]
    if missing:
        raise SystemExit(
            f"Baseline parquet missing required columns {missing}; "
            f"got {sorted(columns)}"
        )

    # Sort rows by (hour, dow) for stable cell-index ordering.
    rows = list(
        zip(
            table["hour"],
            table["dow"],
            table["count"],
            table["mean_per_sec"],
            table["sigma_per_sec"],
        )
    )
    rows.sort(key=lambda r: (int(r[0]), int(r[1])))
    if len(rows) != N_CELLS:
        raise SystemExit(
            f"Baseline must have {N_CELLS} cells, got {len(rows)}"
        )
    sorted_table = {
        "hour": [int(r[0]) for r in rows],
        "dow": [int(r[1]) for r in rows],
        "count": [int(r[2]) for r in rows],
        "mean_per_sec": [float(r[3]) for r in rows],
        "sigma_per_sec": [float(r[4]) for r in rows],
    }
    return sorted_table


def load_meta(meta_path: Path) -> dict[str, Any]:
    """Read the sidecar meta.json and validate required keys."""
    if not meta_path.exists():
        raise SystemExit(f"Baseline meta.json not found: {meta_path}")
    raw = json.loads(meta_path.read_text())
    missing = [k for k in REQUIRED_META_KEYS if k not in raw]
    if missing:
        raise SystemExit(
            f"Baseline meta.json missing required keys {missing}; "
            f"got {sorted(raw.keys())}"
        )
    return raw


# ── Fingerprint + payload builders ───────────────────────────────


def compute_fingerprint(source_bytes: bytes) -> str:
    """Stable sha256 of the raw parquet bytes (16 hex chars).

    Matches the existing meta.json fingerprint format
    ``sha256:793ccaa9c229c3a6`` which is 16 hex chars after the prefix.
    """
    return "sha256:" + hashlib.sha256(source_bytes).hexdigest()[:16]


def build_json_payload(
    table: dict[str, list],
    meta: dict[str, Any],
    fingerprint: str,
) -> dict[str, Any]:
    """Return the contract-shaped JSON payload."""
    cells: list[dict[str, float | int]] = [
        {"h": int(h), "d": int(d), "c": int(c), "mu": float(mu), "sig": float(sig)}
        for h, d, c, mu, sig in zip(
            table["hour"],
            table["dow"],
            table["count"],
            table["mean_per_sec"],
            table["sigma_per_sec"],
        )
    ]
    return {
        "header": {
            "nEvents": int(meta["n_events"]),
            "tsMin": int(meta["ts_min"]),
            "tsMax": int(meta["ts_max"]),
            "totalWeeks": float(meta["total_weeks"]),
            "fingerprint": fingerprint,
            "builtAt": meta.get(
                "built_at", datetime.now(timezone.utc).isoformat()
            ),
        },
        "cells": cells,
    }


# ── Main ────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    table = load_baseline_table(args.source)
    meta = load_meta(args.meta)
    fingerprint = compute_fingerprint(args.source.read_bytes())
    payload = build_json_payload(table, meta, fingerprint)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2))

    print(
        f"Wrote {len(payload['cells'])} cells to {args.output.resolve()} "
        f"(fingerprint {fingerprint})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
