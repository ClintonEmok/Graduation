#!/usr/bin/env python3
"""Goh-Barabasi bursty synthetic crime data generator (Python reference).

Standalone sibling of ``src/lib/synthetic/goh-barabasi.ts``. Produces
the same CSV outputs the Next.js API serves, but as offline artifacts
useful for benchmarks, ground-truth files, and the adaptive-scaling
evaluation pipeline.

Algorithm
---------
Hybrid Goh-Barabasi model:

  1. A priority queue selects the event TYPE. Types with high priority
     fire repeatedly in short bursts, then go quiet for long stretches.
  2. Inter-event TIMESTAMPS are sampled from a power-law distribution
     P(tau) ~ tau**(-alpha) using inverse transform sampling, with
     per-type alpha. This produces bursty gaps in the global stream.

Same Lehmer LCG as the TypeScript implementation, so a given ``--seed``
yields the same event sequence in both runtimes (modulo float-rounding
in the JS path).

References
----------
  - Barabasi, A.-L. (2005). The origin of bursts and heavy tails in
    human dynamics. Nature 435, 207-211.
  - Goh, K.-I. and Barabasi, A.-L. (2008). Burstiness and memory in
    complex systems. EPL 81, 48002.

Usage
-----
    # Default run (10000 events, seed=42, year 2024)
    python generate_bursty.py

    # Custom
    python generate_bursty.py --seed 7 --count 20000 --alpha 1.2

    # Per-type alpha overrides (highlights one crime type)
    python generate_bursty.py --per-type-alpha THEFT=2.5,BURGLARY=1.5

    # Uniform type selection instead of frequency-weighted
    python generate_bursty.py --type-strategy uniform

    # Custom output directory and prefix
    python generate_bursty.py --out-dir ./data/synthetic --prefix trial

Output
------
    <out-dir>/<prefix>-seed<seed>-<iso-timestamp>_events.csv
    <out-dir>/<prefix>-seed<seed>-<iso-timestamp>_burstiness.csv

The event CSV columns are identical to the Next.js
``/api/synthetic/bursty?format=csv`` endpoint, so both runtimes feed
the same downstream consumers.
"""

import argparse
import csv
import json
import math
import os
import sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Constants — mirror src/lib/synthetic/goh-barabasi.ts exactly
# ---------------------------------------------------------------------------

# Chicago bounds (mirror src/lib/coordinate-normalization.ts)
CHICAGO_MIN_LON = -87.9
CHICAGO_MAX_LON = -87.5
CHICAGO_MIN_LAT = 41.6
CHICAGO_MAX_LAT = 42.1
NORMALIZED_MIN = -50.0
NORMALIZED_SPAN = 100.0

CHICAGO_LON_SPAN = CHICAGO_MAX_LON - CHICAGO_MIN_LON
CHICAGO_LAT_SPAN = CHICAGO_MAX_LAT - CHICAGO_MIN_LAT

# Approximate real Chicago crime-type frequency weights, normalized.
# Keys use underscores in place of spaces and hyphens; the lookup in
# the generator applies the same .replace(" ", "_") transform as TS.
CHICAGO_TYPE_WEIGHTS = {
    "THEFT": 0.22,
    "BATTERY": 0.17,
    "CRIMINAL_DAMAGE": 0.10,
    "ASSAULT": 0.09,
    "OTHER_OFFENSE": 0.07,
    "BURGLARY": 0.06,
    "MOTOR_VEHICLE_THEFT": 0.05,
    "DECEPTIVE_PRACTICE": 0.05,
    "ROBBERY": 0.04,
    "CRIMINAL_TRESPASS": 0.03,
    "WEAPONS_VIOLATION": 0.02,
    "PROSTITUTION": 0.02,
    "PUBLIC_PEACE_VIOLATION": 0.02,
    "OFFENSE_INVOLVING_CHILDREN": 0.015,
    "CRIM_SEXUAL_ASSAULT": 0.012,
    "SEX_OFFENSE": 0.01,
    "INTERFERENCE_WITH_PUBLIC_OFFICER": 0.008,
    "GAMBLING": 0.005,
    "LIQUOR_LAW_VIOLATION": 0.004,
    "ARSON": 0.003,
    "HOMICIDE": 0.002,
    "KIDNAPPING": 0.002,
    "INTIMIDATION": 0.002,
    "STALKING": 0.002,
    "OBSCENITY": 0.001,
    "CONCEALED_CARRY_LICENSE_VIOLATION": 0.001,
    "NON_CRIMINAL": 0.001,
    "PUBLIC_INDECENCY": 0.001,
    "HUMAN_TRAFFICKING": 0.001,
    "OTHER_NARCOTIC_VIOLATION": 0.001,
    "NON_CRIMINAL_SUBJECT_SPECIFIED": 0.0005,
    "RITUALISM": 0.0001,
}

# Active types — preserve insertion order from CRIME_TYPE_MAP.
ACTIVE_TYPES = [
    "THEFT",
    "BATTERY",
    "CRIMINAL DAMAGE",
    "NARCOTICS",
    "ASSAULT",
    "OTHER OFFENSE",
    "BURGLARY",
    "MOTOR VEHICLE THEFT",
    "DECEPTIVE PRACTICE",
    "ROBBERY",
    "CRIMINAL TRESPASS",
    "WEAPONS VIOLATION",
    "PROSTITUTION",
    "PUBLIC PEACE VIOLATION",
    "OFFENSE INVOLVING CHILDREN",
    "CRIM SEXUAL ASSAULT",
    "SEX OFFENSE",
    "INTERFERENCE WITH PUBLIC OFFICER",
    "GAMBLING",
    "LIQUOR LAW VIOLATION",
    "ARSON",
    "HOMICIDE",
    "KIDNAPPING",
    "INTIMIDATION",
    "STALKING",
    "OBSCENITY",
    "CONCEALED CARRY LICENSE VIOLATION",
    "NON-CRIMINAL",
    "PUBLIC INDECENCY",
    "HUMAN TRAFFICKING",
    "OTHER NARCOTIC VIOLATION",
    "NON-CRIMINAL (SUBJECT SPECIFIED)",
    "RITUALISM",
]

ACTIVE_DISTRICTS = [str(i) for i in range(1, 26)]  # 1..25

# Default rolling window: 7 days.
DEFAULT_ROLLING_WINDOW_SEC = 7 * 24 * 60 * 60

# IET cap: 30 days. Prevents single heavy-tail outliers from
# swallowing the entire time range.
IET_CAP_SEC = 30 * 24 * 60 * 60

# Default time range: 2024 calendar year.
DEFAULT_START_EPOCH = int(datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp())
DEFAULT_END_EPOCH = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())

# CSV column order — must match src/lib/synthetic/csv-export.ts.
EVENT_COLUMNS = [
    "timestamp",
    "type",
    "district",
    "iucr",
    "lat",
    "lon",
    "x",
    "z",
    "year",
]

BURSTINESS_COLUMNS = [
    "startEpoch",
    "endEpoch",
    "burstinessParam",
    "eventCount",
    "typeBreakdown",
]


# ---------------------------------------------------------------------------
# Per-type alpha profile — matches TS logic
# ---------------------------------------------------------------------------

def _default_alpha_for_type(type_name):
    if type_name in ("HOMICIDE", "KIDNAPPING", "ARSON"):
        return 2.2
    if type_name in ("BURGLARY", "MOTOR VEHICLE THEFT", "ROBBERY"):
        return 1.8
    if type_name in ("THEFT", "BATTERY", "CRIMINAL DAMAGE"):
        return 1.3
    return 1.5


def _weight_for_type(type_name):
    """Mirror the TS lookup: type.replace(" ", "_") then CHICAGO_TYPE_WEIGHTS."""
    key = type_name.replace(" ", "_")
    return CHICAGO_TYPE_WEIGHTS.get(key, 0.001)


# ---------------------------------------------------------------------------
# PRNG — Lehmer / Park-Miller LCG matching src/lib/synthetic/prng.ts
# ---------------------------------------------------------------------------

def create_seeded_random(seed):
    """Returns a function that yields deterministic values in [0, 1)."""
    state = [seed & 0xFFFFFFFF]

    def rng():
        state[0] = (state[0] * 1664525 + 1013904223) & 0xFFFFFFFF
        return state[0] / 0x100000000

    return rng


def uniform_range(rng, lo, hi):
    return lo + rng() * (hi - lo)


# ---------------------------------------------------------------------------
# Power-law sampling — matches src/lib/synthetic/goh-barabasi.ts
# ---------------------------------------------------------------------------

def sample_power_law_iet(rng, alpha, cap_sec=IET_CAP_SEC):
    """tau = (1 - u)**(-1/(alpha-1)), u ~ Uniform(0,1). Capped at cap_sec."""
    u = rng()
    if u <= 0:
        u = 1e-12
    exponent = -1.0 / (alpha - 1.0)
    tau = (1.0 - u) ** exponent
    return min(tau, cap_sec)


def fire_highest_priority(priorities, delta, rng):
    """Find index of max priority, increment it, return the index.

    Matches TS: linear scan, first-occurrence of max wins (uses ``>``).
    """
    max_val = -math.inf
    max_idx = 0
    for i, p in enumerate(priorities):
        if p > max_val:
            max_val = p
            max_idx = i
    if max_val == -math.inf:
        max_idx = int(rng() * len(priorities))
    priorities[max_idx] += delta
    return max_idx


# ---------------------------------------------------------------------------
# Burstiness metrics — matches src/lib/synthetic/goh-barabasi.ts
# ---------------------------------------------------------------------------

def compute_burstiness_metrics(iet):
    n = len(iet)
    if n < 2:
        return {
            "burstinessParam": 0,
            "memoryCoefficient": 0,
            "meanIET": 0,
            "stdIET": 0,
            "fittedAlpha": 1,
        }

    mean = sum(iet) / n
    variance = sum((v - mean) ** 2 for v in iet) / n
    std = math.sqrt(variance)
    if std == 0 and mean == 0:
        B = 0
    elif std == 0:
        B = -1
    else:
        B = (std - mean) / (std + mean)

    mem = 0
    if n > 2:
        m = n - 1
        sx = sum(iet[i] for i in range(m))
        sy = sum(iet[i + 1] for i in range(m))
        sxx = sum(iet[i] ** 2 for i in range(m))
        syy = sum(iet[i + 1] ** 2 for i in range(m))
        sxy = sum(iet[i] * iet[i + 1] for i in range(m))
        denom_sq = (m * sxx - sx * sx) * (m * syy - sy * sy)
        if denom_sq > 0:
            mem = (m * sxy - sx * sy) / math.sqrt(denom_sq)

    positive = [v for v in iet if v > 0]
    if positive:
        xmin = min(positive)
        log_sum = sum(math.log(v / xmin) for v in positive)
        if log_sum > 0:
            fitted_alpha = 1 + len(positive) / log_sum
        else:
            fitted_alpha = 1
    else:
        fitted_alpha = 1

    return {
        "burstinessParam": B,
        "memoryCoefficient": mem,
        "meanIET": mean,
        "stdIET": std,
        "fittedAlpha": fitted_alpha,
    }


def compute_rolling_burstiness(events, start_time, end_time, window_sec):
    if window_sec <= 0 or end_time <= start_time:
        return []

    sorted_events = sorted(events, key=lambda e: e["timestamp"])
    points = []
    num_windows = math.ceil((end_time - start_time) / window_sec)

    for w in range(num_windows):
        w_start = start_time + w * window_sec
        w_end = min(w_start + window_sec, end_time)

        in_window = [
            e for e in sorted_events
            if w_start <= e["timestamp"] < w_end
        ]
        type_breakdown = {}
        for e in in_window:
            type_breakdown[e["type"]] = type_breakdown.get(e["type"], 0) + 1

        if len(in_window) < 2:
            points.append({
                "startEpoch": w_start,
                "endEpoch": w_end,
                "burstinessParam": 0,
                "eventCount": len(in_window),
                "typeBreakdown": type_breakdown,
            })
            continue

        iet = [
            in_window[i]["timestamp"] - in_window[i - 1]["timestamp"]
            for i in range(1, len(in_window))
        ]
        metrics = compute_burstiness_metrics(iet)
        points.append({
            "startEpoch": w_start,
            "endEpoch": w_end,
            "burstinessParam": metrics["burstinessParam"],
            "eventCount": len(in_window),
            "typeBreakdown": type_breakdown,
        })

    return points


# ---------------------------------------------------------------------------
# Helpers — IUCR hash, coordinate normalization
# ---------------------------------------------------------------------------

def iucr_for_type(type_name):
    """Simple polynomial hash matching iucrForType() in goh-barabasi.ts."""
    h = 0
    for c in type_name:
        h = (h * 31 + ord(c)) & 0xFFFF
    return str(h).zfill(4)[:4]


def lon_lat_to_normalized(lon, lat):
    """Mirror lonLatToNormalized() from src/lib/coordinate-normalization.ts."""
    x = ((lon - CHICAGO_MIN_LON) / CHICAGO_LON_SPAN) * NORMALIZED_SPAN + NORMALIZED_MIN
    z = ((lat - CHICAGO_MIN_LAT) / CHICAGO_LAT_SPAN) * NORMALIZED_SPAN + NORMALIZED_MIN
    return x, z


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def resolve_config(args):
    """Validate and apply defaults to argparse Namespace."""
    if args.alpha <= 1:
        raise ValueError(
            f"alpha must be > 1 (got {args.alpha}); a power-law with "
            f"alpha <= 1 is not normalizable."
        )
    if args.delta <= 0:
        raise ValueError(f"delta must be > 0 (got {args.delta}).")
    if args.count < 1:
        raise ValueError(f"count must be >= 1 (got {args.count}).")
    if args.end <= args.start:
        raise ValueError("end must be > start.")


def generate_bursty_sequence(config):
    """Generate a bursty event sequence. Returns (events, metrics, rolling)."""
    rng = create_seeded_random(config["seed"])

    types = ACTIVE_TYPES
    n = len(types)
    priorities = []
    alpha_by_type = []
    for type_name in types:
        if config["typeStrategy"] == "weighted":
            priorities.append(_weight_for_type(type_name) * 1000.0)
        else:
            priorities.append(1.0)
        base_alpha = _default_alpha_for_type(type_name)
        alpha_by_type.append(
            config["perTypeAlpha"].get(type_name, base_alpha)
        )

    raw_iet = [0.0] * config["count"]
    type_seq = [0] * config["count"]
    for i in range(config["count"]):
        idx = fire_highest_priority(priorities, config["delta"], rng)
        type_seq[i] = idx
        raw_iet[i] = sample_power_law_iet(rng, alpha_by_type[idx])

    total_raw_time = sum(raw_iet)
    target_span = config["end"] - config["start"]
    scale = target_span / total_raw_time if total_raw_time > 0 else 1.0

    raw_ts = [0.0] * config["count"]
    acc = 0.0
    for i in range(config["count"]):
        acc += raw_iet[i]
        raw_ts[i] = config["start"] + acc * scale

    events = []
    for i in range(config["count"]):
        type_name = types[type_seq[i]]
        district = ACTIVE_DISTRICTS[int(rng() * len(ACTIVE_DISTRICTS))]
        lon = uniform_range(rng, CHICAGO_MIN_LON, CHICAGO_MAX_LON)
        lat = uniform_range(rng, CHICAGO_MIN_LAT, CHICAGO_MAX_LAT)
        x, z = lon_lat_to_normalized(lon, lat)
        ts = int(raw_ts[i])
        year = datetime.fromtimestamp(ts, tz=timezone.utc).year
        events.append({
            "id": f"synthetic-{i}",
            "timestamp": ts,
            "lat": lat,
            "lon": lon,
            "x": x,
            "z": z,
            "type": type_name,
            "district": district,
            "year": year,
            "iucr": iucr_for_type(type_name),
        })

    metrics = compute_burstiness_metrics(raw_iet)
    rolling = compute_rolling_burstiness(
        events, config["start"], config["end"], config["windowSec"]
    )
    return events, metrics, rolling


# ---------------------------------------------------------------------------
# CSV writers — match src/lib/synthetic/csv-export.ts schema
# ---------------------------------------------------------------------------

def write_events_csv(events, path):
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=EVENT_COLUMNS, quoting=csv.QUOTE_MINIMAL
        )
        writer.writeheader()
        for e in events:
            writer.writerow({k: e[k] for k in EVENT_COLUMNS})


def write_burstiness_csv(points, path):
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=BURSTINESS_COLUMNS, quoting=csv.QUOTE_MINIMAL
        )
        writer.writeheader()
        for p in points:
            row = {k: p[k] for k in BURSTINESS_COLUMNS}
            row["burstinessParam"] = f"{p['burstinessParam']:.6f}"
            row["typeBreakdown"] = json.dumps(p["typeBreakdown"])
            writer.writerow(row)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_per_type_alpha(value):
    """Parse 'THEFT=1.7,BURGLARY=2.0' into {'THEFT': 1.7, 'BURGLARY': 2.0}."""
    if not value:
        return {}
    out = {}
    for pair in value.split(","):
        if "=" not in pair:
            raise ValueError(
                f"per-type alpha pair must be TYPE=ALPHA, got: {pair!r}"
            )
        k, v = pair.split("=", 1)
        out[k.strip()] = float(v.strip())
    return out


def build_arg_parser():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--count", type=int, default=10000)
    p.add_argument(
        "--alpha", type=float, default=1.5,
        help="Base power-law exponent (must be > 1).",
    )
    p.add_argument("--delta", type=float, default=1.0)
    p.add_argument(
        "--start", type=int, default=DEFAULT_START_EPOCH,
        help="Start epoch seconds (default 2024-01-01 UTC).",
    )
    p.add_argument(
        "--end", type=int, default=DEFAULT_END_EPOCH,
        help="End epoch seconds (default 2025-01-01 UTC).",
    )
    p.add_argument(
        "--type-strategy", choices=("weighted", "uniform"), default="weighted",
    )
    p.add_argument(
        "--per-type-alpha", default="",
        help="Per-type alpha overrides, e.g. THEFT=1.7,BURGLARY=2.0.",
    )
    p.add_argument(
        "--window-sec", type=int, default=DEFAULT_ROLLING_WINDOW_SEC,
        help="Rolling B window in seconds (default 7 days).",
    )
    p.add_argument(
        "--out-dir", default="./out",
        help="Output directory (default ./out).",
    )
    p.add_argument(
        "--prefix", default="bursty",
        help="Filename prefix (default 'bursty').",
    )
    p.add_argument(
        "--events-only", action="store_true",
        help="Skip the burstiness CSV.",
    )
    p.add_argument(
        "--burstiness-only", action="store_true",
        help="Skip the events CSV.",
    )
    p.add_argument(
        "--max-count", type=int, default=100000,
        help="Cap on event count (default 100000).",
    )
    p.add_argument(
        "--quiet", action="store_true",
        help="Suppress per-run progress on stderr.",
    )
    return p


def main(argv=None):
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    try:
        resolve_config(args)
    except ValueError as exc:
        parser.error(str(exc))

    if args.count > args.max_count:
        if not args.quiet:
            print(
                f"Clamping count from {args.count} to {args.max_count}",
                file=sys.stderr,
            )
        args.count = args.max_count

    per_type_alpha = parse_per_type_alpha(args.per_type_alpha)

    os.makedirs(args.out_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    events_path = os.path.join(
        args.out_dir, f"{args.prefix}-seed{args.seed}-{ts}_events.csv"
    )
    burst_path = os.path.join(
        args.out_dir, f"{args.prefix}-seed{args.seed}-{ts}_burstiness.csv"
    )

    config = {
        "seed": args.seed,
        "count": args.count,
        "alpha": args.alpha,
        "delta": args.delta,
        "start": args.start,
        "end": args.end,
        "typeStrategy": args.type_strategy,
        "perTypeAlpha": per_type_alpha,
        "windowSec": args.window_sec,
    }

    if not args.quiet:
        print(
            f"Generating {args.count} events "
            f"(seed={args.seed}, alpha={args.alpha}, "
            f"strategy={args.type_strategy})...",
            file=sys.stderr,
        )

    events, metrics, rolling = generate_bursty_sequence(config)

    if not args.quiet:
        print(
            f"  Global B = {metrics['burstinessParam']:.3f}, "
            f"mean IET = {metrics['meanIET']:.1f}s, "
            f"fitted alpha = {metrics['fittedAlpha']:.2f}",
            file=sys.stderr,
        )
        print(f"  Rolling windows: {len(rolling)}", file=sys.stderr)

    if not args.burstiness_only:
        write_events_csv(events, events_path)
        if not args.quiet:
            print(
                f"  Wrote {len(events)} events -> {events_path}",
                file=sys.stderr,
            )

    if not args.events_only:
        write_burstiness_csv(rolling, burst_path)
        if not args.quiet:
            print(
                f"  Wrote {len(rolling)} burstiness points -> {burst_path}",
                file=sys.stderr,
            )

    # Machine-readable summary on stdout
    summary = {
        "events": len(events),
        "metrics": metrics,
        "rollingWindows": len(rolling),
        "eventsPath": events_path if not args.burstiness_only else None,
        "burstinessPath": burst_path if not args.events_only else None,
        "config": config,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
