#!/usr/bin/env python3
"""Compare burst-detection outputs across spatial formulas.

This script is intentionally lightweight: it reads one JSON output per spatial
formula, then compares how much the spatial choice changes the bin scores and
the resulting slice allocation.

Usage:
  python compare_spatial_formulas.py \
    --input balanced=./outputs/balanced.json \
    --input entropy=./outputs/entropy.json \
    --input js=./outputs/js-divergence.json \
    --input ann=./outputs/ann.json
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Iterable


@dataclass(frozen=True)
class BinRecord:
    start_epoch: float
    end_epoch: float
    temporal_b: float
    spatial_b: float
    combined_b: float


@dataclass(frozen=True)
class FormulaRun:
    label: str
    path: Path
    target_slice_count: int
    bins: list[BinRecord]


def parse_input_spec(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("Expected LABEL=PATH")
    label, raw_path = value.split("=", 1)
    label = label.strip()
    if not label:
        raise argparse.ArgumentTypeError("Label cannot be empty")
    path = Path(raw_path).expanduser()
    return label, path


def load_run(label: str, path: Path) -> FormulaRun:
    data = json.loads(path.read_text())
    raw_bins = data.get("bins", [])
    bins: list[BinRecord] = []
    for item in raw_bins:
      bins.append(
          BinRecord(
              start_epoch=float(item["startEpoch"]),
              end_epoch=float(item["endEpoch"]),
              temporal_b=float(item.get("temporalB", 0.0)),
              spatial_b=float(item.get("spatialB", 0.0)),
              combined_b=float(item.get("combinedB", 0.0)),
          )
      )

    target_slice_count = int(data.get("targetSliceCount", len(bins)))
    return FormulaRun(label=label, path=path, target_slice_count=target_slice_count, bins=bins)


def bin_key(bin_record: BinRecord) -> tuple[float, float]:
    return (bin_record.start_epoch, bin_record.end_epoch)


def rank_desc(values: list[float]) -> list[int]:
    pairs = sorted(enumerate(values), key=lambda item: (-item[1], item[0]))
    ranks = [0] * len(values)
    for rank, (idx, _) in enumerate(pairs, start=1):
        ranks[idx] = rank
    return ranks


def spearman_rho(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or len(left) < 2:
        return float("nan")
    left_ranks = rank_desc(left)
    right_ranks = rank_desc(right)
    n = len(left)
    diff_sq_sum = sum((a - b) ** 2 for a, b in zip(left_ranks, right_ranks))
    return 1 - (6 * diff_sq_sum) / (n * (n * n - 1))


def allocate_proportionally(scores: list[float], target_count: int) -> list[int]:
    if not scores:
      return []
    total = sum(scores)
    if total <= 0:
      return [1 for _ in scores]

    raw = [(score / total) * target_count for score in scores]
    allocated = [max(1, round(value)) for value in raw]
    remaining = target_count - sum(allocated)

    # Match the app's intent: push toward the bins with the largest remainder.
    if remaining > 0:
        order = sorted(range(len(scores)), key=lambda i: raw[i] - allocated[i], reverse=True)
        idx = 0
        while remaining > 0 and order:
            allocated[order[idx % len(order)]] += 1
            remaining -= 1
            idx += 1
    elif remaining < 0:
        order = sorted(range(len(scores)), key=lambda i: allocated[i] - raw[i], reverse=True)
        idx = 0
        while remaining < 0 and order:
            candidate = order[idx % len(order)]
            if allocated[candidate] > 1:
                allocated[candidate] -= 1
                remaining += 1
            idx += 1
            if idx > len(order) * 4:
                break

    return allocated


def allocation_delta(left: list[int], right: list[int]) -> float:
    if len(left) != len(right) or not left:
        return float("nan")
    return sum(abs(a - b) for a, b in zip(left, right)) / len(left)


def compare_runs(runs: list[FormulaRun]) -> None:
    baseline = runs[0]
    baseline_scores = [b.combined_b for b in baseline.bins]
    baseline_alloc = allocate_proportionally(baseline_scores, baseline.target_slice_count)

    print(f"Baseline: {baseline.label} ({baseline.path})")
    print(f"  bins={len(baseline.bins)} targetSliceCount={baseline.target_slice_count}")
    print(f"  mean temporalB={mean(b.temporal_b for b in baseline.bins):.4f}")
    print(f"  mean spatialB={mean(b.spatial_b for b in baseline.bins):.4f}")
    print(f"  mean combinedB={mean(b.combined_b for b in baseline.bins):.4f}")
    print(f"  allocation={baseline_alloc}")
    print()

    for run in runs[1:]:
        index = {bin_key(b): b for b in run.bins}
        shared_left: list[float] = []
        shared_right: list[float] = []
        for base_bin in baseline.bins:
            match = index.get(bin_key(base_bin))
            if match is None:
                continue
            shared_left.append(base_bin.combined_b)
            shared_right.append(match.combined_b)

        run_alloc = allocate_proportionally([b.combined_b for b in run.bins], run.target_slice_count)

        print(f"Formula: {run.label} ({run.path})")
        print(f"  bins={len(run.bins)} targetSliceCount={run.target_slice_count}")
        print(f"  mean temporalB={mean(b.temporal_b for b in run.bins):.4f}")
        print(f"  mean spatialB={mean(b.spatial_b for b in run.bins):.4f}")
        print(f"  mean combinedB={mean(b.combined_b for b in run.bins):.4f}")
        if shared_left:
            deltas = [abs(a - b) for a, b in zip(shared_left, shared_right)]
            print(f"  shared-bin MAE(combinedB)={mean(deltas):.6f}")
            print(f"  shared-bin Spearman(combinedB)={spearman_rho(shared_left, shared_right):.6f}")
        else:
            print("  shared-bin MAE(combinedB)=N/A")
            print("  shared-bin Spearman(combinedB)=N/A")
        print(f"  allocation={run_alloc}")
        print(f"  allocation delta vs baseline={allocation_delta(baseline_alloc, run_alloc):.4f}")
        print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare spatial burst-formula outputs.")
    parser.add_argument(
        "--input",
        action="append",
        required=True,
        type=parse_input_spec,
        help="LABEL=PATH to a JSON output file",
    )
    args = parser.parse_args()

    runs = [load_run(label, path) for label, path in args.input]
    if len(runs) < 2:
        raise SystemExit("Need at least two inputs to compare")

    compare_runs(runs)


if __name__ == "__main__":
    main()
