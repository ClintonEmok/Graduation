# Future Work — Contextual Burstiness Sensitivity Analysis

**Status:** Parked 2026-06-27
**Owner:** Phase 83 follow-up (no current phase; not in v3.4 roadmap)
**Estimated effort if resumed:** ~3h for full sensitivity, ~1h for cutoff-only

## Why this is parked

The contextual z burstiness metric is a **methodological thesis contribution**, not a prototype deployment. The existing burstiness-driven adaptive scaling (Goh-Barabási B at the 1h/6h/1d/1w sweep) is already the default in the prototype, the dashboard-demo, and the 3D warp visualization. Phase 79-80 shipped it, the evaluation route is locked against it, and the pilot is in scope. The contextual z finding — 56.7× CV ratio vs median reference, 10.9× range ratio vs max reference, GO verdict at 1d — is publishable as a metric-comparison chapter. Replacing the prototype's burstiness driver is a separate question and not needed for the thesis to pass.

The **cutoff protocol** would be a defense for an argument that doesn't exist yet. The argument will exist when the burstiness chapter is being written, at which point the sensitivity analysis can be done in one pass (global, cutoff, expanding) with the chapter outline in hand. Doing it now produces one extra defensibility row in a table that doesn't exist yet.

## What was done (Phase 83)

The full Phase 83 pipeline is complete and committed. Summary:

- **4-metric comparison** at 1h/6h/1d/1w on the 8.5M-record Chicago crime dataset
- **Decision gate** at 1d: GO (CV ratio 56.7×, range ratio 10.9×, absolute floor 9.18, all pass)
- **Reproducible end-to-end** from `python run.py` (20.5s on 8.5M events with cached baseline)
- **Baseline build/save/load contract** at `metrics/baseline.py` + `scripts/build_baseline.py` + `baselines/baseline_168.parquet` (sha256 fingerprint, 8,476,869 events, 1,305 weeks)
- **Thesis note** at `docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md` with the median-CV defense (Huber 1981, Rousseeuw & Leroy 1987, Maronna et al. 2019)
- **Single-week experiment** at `scripts/single_week_comparison.py` showing the four metrics at 1h over the busiest week (2002-07-15, 10,613 events)

The single global protocol used the full 8.5M events to build the 168-cell baseline. This is the upper bound on the CV ratio.

## The methodological concern: look-ahead bias

The global baseline is fit on the same 8.5M events that are then scored. This means:

- For a window at time t, the baseline that produces its z-score has already seen all events before t
- The "expected" count at (h, d) is computed using events that occurred at the same (h, d) in the test window
- This is **leakage**: the baseline has access to information from the test period

In ML terms, the global protocol is "train on full data, test on full data" — the most biased possible protocol. The 56.7× CV ratio is an **upper bound**, not a fair comparison. The fair comparison requires the baseline to be built without seeing the test windows.

## Three protocols to compare when this is resumed

| Protocol | Baseline | Scored | Bias | Cost |
|---|---|---|---|---|
| **A. Global** (current) | All 8.5M events | All windows | Upper bound | Cheap (1 build) |
| **B. Single cutoff** | `ts < T` (one date) | `ts ≥ T` | None after T | Cheap (1 build) |
| **C. Expanding** | `ts < window_start` (per window) | Each window | None | Expensive (~36K lookups) |

Protocol A is what Phase 83 ships. Protocols B and C are the methodological fix. The full sensitivity analysis is "compute z and the comparison table under each protocol, report the verdict for each."

## Why Protocol B (single cutoff) is the right next step

When this work is resumed, the recommended first move is **Protocol B only** (~1h, ~3h if all three protocols).

**Three reasons:**

1. **Conceptual clarity** — "training set" vs "test set" is the standard ML framing. Easy to defend in a thesis methods section.
2. **Computational efficiency** — build the baseline once, score all subsequent windows. The expanding protocol rebuilds 36K times; the cutoff protocol builds once.
3. **Realism for the warp demo** — the prototype could "lock" the baseline at a date and show how contextual z responds to *new* data the baseline hasn't seen. That's a strong thesis narrative: "what does the metric say about events that happened after the model was built?"

**Cutoff date options** (pick one when resumed):
- **2010-01-01** — ≈3.0M train / ≈5.5M test. Balanced. *Recommended default.*
- **2015-01-01** — ≈5M train / ≈3.5M test. Closer to "present", smaller test.
- **2005-01-01** — ≈1.5M train / ≈7M test. Long test, sparse early baseline (per-cell counts ~1,200 → 3% sigma error, still usable).

## Implementation sketch (when resumed)

**New file: `metrics/temporal_baseline.py`**

```python
def compute_baseline_with_protocol(
    df: pd.DataFrame,
    protocol: str,                    # "global" | "cutoff" | "expanding"
    cutoff_ts: int | None = None,     # for "cutoff"
    **kwargs,
) -> tuple[pd.DataFrame, "BaselineMeta"]:
    """Dispatch on protocol name. Returns the 168-row baseline + provenance."""
    if protocol == "global":
        return build_from_dataframe(df)
    if protocol == "cutoff":
        train = df[df["ts"] < cutoff_ts]
        return build_from_dataframe(train, ts_min=train["ts"].min(), ts_max=cutoff_ts)
    if protocol == "expanding":
        # Precompute cumulative (h, d) -> count up to each week index.
        # Lookup is O(1) per window; total cost is one full scan + N queries.
        ...
```

**Changes to `run.py`:**
- Add `--protocol={global,cutoff,expanding}` flag (default `cutoff` when this is resumed)
- Add `--cutoff-ts=2010-01-01` flag
- Route contextual stage to `compute_baseline_with_protocol(...)`
- Comparison table gets a `protocol` column
- DECISION-GATE.md header reports the protocol

**Changes to `scripts/build_baseline.py`:**
- Accept `--protocol` and `--cutoff-ts` flags
- Save to `baselines/baseline_168_{protocol}.parquet` (one file per protocol)

**New script: `scripts/run_sensitivity.py`**
- Runs all three protocols back-to-back
- Writes one combined comparison table (3 × 16 = 48 rows)
- Writes one combined DECISION-GATE.md (3 verdicts)

**Thesis note updates (`docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md`):**
- New §10: "Temporal baseline protocols" — define global/cutoff/expanding
- New §11: "Sensitivity analysis" — three-protocol table

## What this is *not*

- **Not a prototype integration**. Phase 84 (Burstiness Signal Contract + Density Fallback) is the prototype integration work. It wires contextual z into the dashboard-demo timeline as a runtime option. That is a separate ~3-5 plan effort, unblocked but not started.
- **Not a replacement for the existing burstiness driver**. The Goh-Barabási B implementation in `src/lib/burst-detection.ts` is the prototype's default. The contextual z finding is a thesis-side alternative.
- **Not a correctness issue with Phase 83**. The global-protocol result is correct *as a metric definition* — it just has an upper-bound bias that needs to be characterized for thesis defensibility. The 56.7× CV ratio stands as a finding.

## Estimated cost when resumed

| Scope | Effort | Output |
|---|---|---|
| **Cutoff only** | ~1h | One extra comparison row; thesis has 2-protocol sensitivity |
| **Cutoff + expanding** | ~2.5h | Full 3-protocol sensitivity; thesis has full methods section |
| **Full sensitivity + thesis update + Phase 84** | ~3-4h | Deployable contextual z + defended metric chapter |

The cutoff-only path is the minimum viable sensitivity analysis. The full path produces thesis-ready material for the burstiness chapter.

## Resume checklist

When this is resumed:

1. [ ] Read `docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md` for current state
2. [ ] Decide cutoff date (recommended: 2010-01-01)
3. [ ] Decide scope: cutoff-only or cutoff + expanding
4. [ ] Create `metrics/temporal_baseline.py`
5. [ ] Update `run.py` to accept `--protocol` and `--cutoff-ts`
6. [ ] Update `scripts/build_baseline.py` to write per-protocol baselines
7. [ ] Run pipeline under cutoff protocol
8. [ ] Re-apply decision gate
9. [ ] Update thesis note §10 and §11
10. [ ] Commit and update STATE.md
