#!/usr/bin/env python3
"""Smoke tests for generate_bursty.py — pure stdlib unittest.

Run from the repo root:
    python scripts/synthetic/test_generate_bursty.py
or via unittest discovery:
    python -m unittest scripts.synthetic.test_generate_bursty
"""

import csv
import json
import os
import sys
import tempfile
import unittest

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, THIS_DIR)

from generate_bursty import (  # noqa: E402
    ACTIVE_TYPES,
    CHICAGO_MAX_LAT,
    CHICAGO_MAX_LON,
    CHICAGO_MIN_LAT,
    CHICAGO_MIN_LON,
    DEFAULT_END_EPOCH,
    DEFAULT_START_EPOCH,
    compute_burstiness_metrics,
    compute_rolling_burstiness,
    create_seeded_random,
    fire_highest_priority,
    generate_bursty_sequence,
    iucr_for_type,
    lon_lat_to_normalized,
    parse_per_type_alpha,
    sample_power_law_iet,
    write_burstiness_csv,
    write_events_csv,
)


class TestPrng(unittest.TestCase):
    def test_deterministic_for_same_seed(self):
        a = create_seeded_random(42)
        b = create_seeded_random(42)
        for _ in range(100):
            self.assertEqual(a(), b())

    def test_different_seeds_produce_different_sequences(self):
        a = create_seeded_random(1)
        b = create_seeded_random(2)
        self.assertNotEqual(a(), b())

    def test_values_in_unit_interval(self):
        rng = create_seeded_random(7)
        for _ in range(1000):
            v = rng()
            self.assertGreaterEqual(v, 0.0)
            self.assertLess(v, 1.0)


class TestFireHighestPriority(unittest.TestCase):
    def test_picks_argmax_incrementally(self):
        rng = create_seeded_random(0)
        priorities = [0.1, 0.9, 0.4, 0.8]
        idx = fire_highest_priority(priorities, delta=1.0, rng=rng)
        self.assertEqual(idx, 1)
        self.assertAlmostEqual(priorities[1], 1.9, places=6)

    def test_first_occurrence_wins_on_ties(self):
        rng = create_seeded_random(0)
        priorities = [0.5, 0.5, 0.5]
        idx = fire_highest_priority(priorities, delta=0.0, rng=rng)
        self.assertEqual(idx, 0)


class TestPowerLawIet(unittest.TestCase):
    def test_caps_at_max(self):
        rng = create_seeded_random(0)
        # Pathological very small u -> huge tau, must be capped
        tau = sample_power_law_iet(lambda: 1e-15, alpha=1.5, cap_sec=100.0)
        self.assertLessEqual(tau, 100.0)

    def test_zero_u_guard(self):
        # u exactly zero would NaN — guard returns a finite value
        rng = create_seeded_random(0)
        tau = sample_power_law_iet(lambda: 0.0, alpha=1.5, cap_sec=1e9)
        self.assertGreater(tau, 0.0)
        self.assertLessEqual(tau, 1e9)


class TestBurstinessMetrics(unittest.TestCase):
    def test_degenerate_input(self):
        m = compute_burstiness_metrics([])
        self.assertEqual(m["burstinessParam"], 0)
        self.assertEqual(m["meanIET"], 0)
        self.assertEqual(m["fittedAlpha"], 1)

    def test_highly_bursty_input_positive_b(self):
        bursty = [1] * 29 + [1_000_000]
        bursty *= 70  # 2100 events
        m = compute_burstiness_metrics(bursty)
        self.assertGreater(m["burstinessParam"], 0.5)

    def test_regular_uniform_negative_b(self):
        uniform = [50] * 1000
        m = compute_burstiness_metrics(uniform)
        self.assertLess(m["burstinessParam"], -0.5)

    def test_fitted_alpha_above_one(self):
        rng = create_seeded_random(12345)
        samples = []
        for _ in range(5000):
            u = rng()
            samples.append((1 - u) ** (-1 / 0.5))
        m = compute_burstiness_metrics(samples)
        self.assertGreater(m["fittedAlpha"], 1.0)
        self.assertLess(m["fittedAlpha"], 2.5)


class TestHelpers(unittest.TestCase):
    def test_iucr_returns_4char_string(self):
        self.assertEqual(len(iucr_for_type("THEFT")), 4)
        self.assertTrue(iucr_for_type("THEFT").isdigit())

    def test_iucr_deterministic(self):
        self.assertEqual(iucr_for_type("THEFT"), iucr_for_type("THEFT"))

    def test_iucr_different_per_type(self):
        self.assertNotEqual(iucr_for_type("THEFT"), iucr_for_type("BATTERY"))

    def test_lon_lat_to_normalized_corners(self):
        x, z = lon_lat_to_normalized(CHICAGO_MIN_LON, CHICAGO_MIN_LAT)
        self.assertAlmostEqual(x, -50.0, places=4)
        self.assertAlmostEqual(z, -50.0, places=4)

        x, z = lon_lat_to_normalized(CHICAGO_MAX_LON, CHICAGO_MAX_LAT)
        self.assertAlmostEqual(x, 50.0, places=4)
        self.assertAlmostEqual(z, 50.0, places=4)

    def test_active_types_has_thirty_three_entries(self):
        self.assertEqual(len(ACTIVE_TYPES), 33)


class TestGenerateBurstySequence(unittest.TestCase):
    def _config(self, **overrides):
        cfg = {
            "seed": 42,
            "count": 500,
            "alpha": 1.5,
            "delta": 1.0,
            "start": DEFAULT_START_EPOCH,
            "end": DEFAULT_END_EPOCH,
            "typeStrategy": "weighted",
            "perTypeAlpha": {},
            "windowSec": 7 * 24 * 60 * 60,
        }
        cfg.update(overrides)
        return cfg

    def test_event_count_matches_request(self):
        events, _, _ = generate_bursty_sequence(self._config(count=500))
        self.assertEqual(len(events), 500)

    def test_event_shape_is_complete(self):
        events, _, _ = generate_bursty_sequence(self._config(count=50))
        required = {"id", "timestamp", "lat", "lon", "x", "z", "type",
                    "district", "year", "iucr"}
        for e in events:
            self.assertTrue(required.issubset(e.keys()))

    def test_events_have_valid_crime_types(self):
        events, _, _ = generate_bursty_sequence(self._config(count=200))
        valid = set(ACTIVE_TYPES)
        for e in events:
            self.assertIn(e["type"], valid)

    def test_timestamps_in_range(self):
        events, _, _ = generate_bursty_sequence(
            self._config(count=500, start=DEFAULT_START_EPOCH, end=DEFAULT_END_EPOCH)
        )
        for e in events:
            self.assertGreaterEqual(e["timestamp"], DEFAULT_START_EPOCH)
            self.assertLessEqual(e["timestamp"], DEFAULT_END_EPOCH)

    def test_coordinates_in_chicago_bounds(self):
        events, _, _ = generate_bursty_sequence(self._config(count=500))
        for e in events:
            self.assertGreaterEqual(e["lon"], CHICAGO_MIN_LON)
            self.assertLessEqual(e["lon"], CHICAGO_MAX_LON)
            self.assertGreaterEqual(e["lat"], CHICAGO_MIN_LAT)
            self.assertLessEqual(e["lat"], CHICAGO_MAX_LAT)
            self.assertGreaterEqual(e["x"], -50.0)
            self.assertLessEqual(e["x"], 50.0)
            self.assertGreaterEqual(e["z"], -50.0)
            self.assertLessEqual(e["z"], 50.0)

    def test_districts_in_1_to_25(self):
        events, _, _ = generate_bursty_sequence(self._config(count=500))
        valid = {str(i) for i in range(1, 26)}
        for e in events:
            self.assertIn(e["district"], valid)

    def test_deterministic_for_same_seed(self):
        a_events, a_metrics, _ = generate_bursty_sequence(self._config(seed=99))
        b_events, b_metrics, _ = generate_bursty_sequence(self._config(seed=99))
        self.assertEqual(
            [e["timestamp"] for e in a_events],
            [e["timestamp"] for e in b_events],
        )
        self.assertEqual(
            [e["type"] for e in a_events],
            [e["type"] for e in b_events],
        )
        self.assertAlmostEqual(
            a_metrics["burstinessParam"], b_metrics["burstinessParam"], places=6
        )

    def test_different_seeds_yield_different_sequences(self):
        a_events, _, _ = generate_bursty_sequence(self._config(seed=1))
        b_events, _, _ = generate_bursty_sequence(self._config(seed=2))
        self.assertNotEqual(
            [e["timestamp"] for e in a_events],
            [e["timestamp"] for e in b_events],
        )

    def test_burstiness_param_positive_for_default_alpha(self):
        _, metrics, _ = generate_bursty_sequence(
            self._config(count=2000, alpha=1.5, seed=10)
        )
        self.assertGreater(metrics["burstinessParam"], 0.3)

    def test_lower_alpha_higher_burstiness(self):
        samples = 3
        low = []
        high = []
        for i in range(samples):
            _, m_low, _ = generate_bursty_sequence(
                self._config(count=2000, alpha=1.2, seed=100 + i)
            )
            _, m_high, _ = generate_bursty_sequence(
                self._config(count=2000, alpha=2.5, seed=200 + i)
            )
            low.append(m_low["burstinessParam"])
            high.append(m_high["burstinessParam"])
        self.assertGreater(
            sorted(low)[len(low) // 2], sorted(high)[len(high) // 2]
        )

    def test_weighted_strategy_favors_common_types(self):
        events, _, _ = generate_bursty_sequence(
            self._config(count=5000, typeStrategy="weighted", seed=13)
        )
        theft = sum(1 for e in events if e["type"] == "THEFT")
        hom = sum(1 for e in events if e["type"] == "HOMICIDE")
        self.assertGreater(theft, hom)
        self.assertLess(hom, theft / 10)

    def test_per_type_alpha_override(self):
        # Override THEFT to alpha=1.0 (max burstiness) and verify alpha flips
        events, metrics, _ = generate_bursty_sequence(self._config(
            count=2000, alpha=1.5, seed=42,
            perTypeAlpha={"THEFT": 1.05},
        ))
        # With override THEFT should be the dominant type
        theft = sum(1 for e in events if e["type"] == "THEFT")
        hom = sum(1 for e in events if e["type"] == "HOMICIDE")
        self.assertGreater(theft, hom)

    def test_rolling_burstiness_is_nonempty_and_smooth(self):
        _, _, rolling = generate_bursty_sequence(
            self._config(count=2000, windowSec=7 * 24 * 60 * 60, seed=14)
        )
        self.assertGreater(len(rolling), 0)
        valid = [p for p in rolling if p["eventCount"] >= 2]
        self.assertGreater(len(valid), 0)
        b_values = [p["burstinessParam"] for p in valid]
        self.assertGreater(max(b_values) - min(b_values), 0.1)


class TestRollingBurstiness(unittest.TestCase):
    def test_invalid_window_returns_empty(self):
        self.assertEqual(compute_rolling_burstiness([], 0, 100, 0), [])
        self.assertEqual(compute_rolling_burstiness([], 100, 50, 10), [])

    def test_one_point_per_window(self):
        events = [
            {
                "timestamp": DEFAULT_START_EPOCH + i * 86400,
                "type": "THEFT",
            }
            for i in range(10)
        ]
        points = compute_rolling_burstiness(
            events, DEFAULT_START_EPOCH, DEFAULT_START_EPOCH + 10 * 86400, 86400
        )
        self.assertEqual(len(points), 10)
        for p in points:
            self.assertEqual(p["endEpoch"] - p["startEpoch"], 86400)


class TestCsvWriters(unittest.TestCase):
    def _events(self):
        return [
            {
                "id": "synthetic-0",
                "timestamp": 1704067200,
                "lat": 41.8,
                "lon": -87.6,
                "x": 50.0,
                "z": 0.0,
                "type": "THEFT",
                "district": "1",
                "year": 2024,
                "iucr": "0001",
            },
            {
                "id": "synthetic-1",
                "timestamp": 1704067500,
                "lat": 41.9,
                "lon": -87.7,
                "x": 25.0,
                "z": 60.0,
                "type": "BATTERY",
                "district": "2",
                "year": 2024,
                "iucr": "0002",
            },
        ]

    def test_events_csv_header_and_row_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "events.csv")
            write_events_csv(self._events(), path)
            with open(path) as f:
                lines = f.read().strip().split("\n")
            self.assertEqual(lines[0],
                "timestamp,type,district,iucr,lat,lon,x,z,year")
            self.assertEqual(len(lines), 3)  # header + 2 rows

    def test_events_csv_roundtrip_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "events.csv")
            write_events_csv(self._events(), path)
            with open(path) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["type"], "THEFT")
            self.assertEqual(rows[0]["district"], "1")
            self.assertEqual(rows[0]["timestamp"], "1704067200")
            self.assertEqual(rows[0]["lat"], "41.8")
            self.assertEqual(rows[0]["x"], "50.0")
            self.assertEqual(rows[0]["year"], "2024")

    def test_burstiness_csv_uses_json_typebreakdown(self):
        points = [{
            "startEpoch": 100,
            "endEpoch": 200,
            "burstinessParam": 0.42,
            "eventCount": 5,
            "typeBreakdown": {"THEFT": 3, "BATTERY": 2},
        }]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "burst.csv")
            write_burstiness_csv(points, path)
            with open(path) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["startEpoch"], "100")
            self.assertEqual(rows[0]["eventCount"], "5")
            # typeBreakdown is JSON-encoded
            self.assertEqual(json.loads(rows[0]["typeBreakdown"]),
                             {"THEFT": 3, "BATTERY": 2})


class TestParsePerTypeAlpha(unittest.TestCase):
    def test_empty_string_returns_empty_dict(self):
        self.assertEqual(parse_per_type_alpha(""), {})

    def test_single_pair(self):
        self.assertEqual(parse_per_type_alpha("THEFT=1.7"), {"THEFT": 1.7})

    def test_multiple_pairs(self):
        self.assertEqual(
            parse_per_type_alpha("THEFT=1.7,BURGLARY=2.0"),
            {"THEFT": 1.7, "BURGLARY": 2.0},
        )

    def test_invalid_pair_raises(self):
        with self.assertRaises(ValueError):
            parse_per_type_alpha("THEFT-1.7")


if __name__ == "__main__":
    unittest.main(verbosity=2)
