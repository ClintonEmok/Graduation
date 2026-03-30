# Phase 66 QA Checklist: Timeslicing Binning Quality

Use this checklist to validate long-window bin generation quality, strategy clarity, and cap-handling behavior in `timeslicing` and `dashboard-v2`.

## Acceptance Criteria

- [ ] **AC-01 Data Provenance Visibility**
  - Generation UI shows whether run used sampled input or full-range input.
  - Generation UI shows returned count, totalMatches, and events used for generation.
  - Pass condition: user can always audit input population for generated bins.

- [ ] **AC-02 Strategy vs Granularity Clarity**
  - `selectedStrategy` remains stable after generation.
  - `effectiveStrategy` is captured separately for each run.
  - Granularity behavior is clearly documented in UI copy/tooltips.
  - Pass condition: no silent strategy mode switches after clicking generate.

- [ ] **AC-03 Cap-Hit Transparency**
  - If `maxBins` is hit, UI shows explicit cap-hit warning (`condensed at maxBins=N`).
  - Metadata includes raw candidate count and final count.
  - Pass condition: capped runs are always visible and explainable.

- [ ] **AC-04 Time-Local Merge Integrity**
  - Merge/downsample logic only merges adjacent bins in time.
  - No global merge that combines distant time periods.
  - Pass condition: timeline shape remains chronologically interpretable.

- [ ] **AC-05 Skew Guardrail**
  - Detect dominant-bin pathology (for example, one bin containing a large majority).
  - Trigger fallback strategy or explicit warning when skew threshold is exceeded.
  - Pass condition: one-giant-bin patterns are prevented or clearly flagged.

- [ ] **AC-06 Adaptive Cap Policy**
  - `maxBins` adapts to span and selected granularity.
  - Hard upper limit remains for performance safety.
  - Pass condition: long windows do not collapse under fixed low caps.

- [ ] **AC-07 Workflow Compatibility**
  - `generate -> review -> apply` still works without regressions.
  - Applied slices stay synchronized across timeline, map, cube, and STKDE context.
  - Pass condition: no Phase 62-65 behavior regressions.

- [ ] **AC-08 Edge-State Robustness**
  - Empty-result, narrow-range, and invalid-range paths show deterministic user feedback.
  - No stuck loading states or runtime errors.
  - Pass condition: all edge states remain stable and understandable.

## Validation Matrix

- [ ] **TC-01 Long Window Stress**
  - Range: `2001-01-01` to `2024-12-31`, all crime types.
  - Run: weekly and daily.
  - Record: final bins, largest bin count, warning shown, capHit metadata.
  - Expected: no unexplained mega-bin collapse.

- [ ] **TC-02 Granularity Matrix**
  - Same range with hourly/daily/weekly.
  - Record: candidate bins, final bins, largest bin share.
  - Expected: granularity changes shape predictably.

- [ ] **TC-03 Strategy Matrix**
  - Compare auto-adaptive, burstiness, uniform-distribution, weekly.
  - Record: selectedStrategy and effectiveStrategy.
  - Expected: strategy intent and execution are transparent.

- [ ] **TC-04 Narrow Filter Sanity**
  - Single district + single crime type over multi-year range.
  - Expected: distribution is still interpretable and less skewed.

- [ ] **TC-05 Provenance Audit**
  - Verify sampled/full-range signal and returned/totalMatches/events-used are visible.
  - Expected: user can trust run provenance without opening devtools.

- [ ] **TC-06 Apply/Sync Regression**
  - Apply generated bins, then verify state in `dashboard-v2` timeline/map/cube panels.
  - Expected: synchronized state remains stable.

- [ ] **TC-07 Empty/Low-Data Handling**
  - Very narrow time window likely to have no data.
  - Expected: clear warning, no crash, no spinner lock.

## Evidence Template

Use one line per test run:

`test_id | range | strategy(selected/effective) | granularity | returned/totalMatches | events_used | candidate_bins | final_bins | largest_bin | warning`

Example:

`TC-01 | 2001-01-01..2024-12-31 | auto-adaptive/weekly | weekly | 50000/182344 | 13259 | 1240 | 40 | 31580 | cap-hit`

## Notes

- Known observed issue from live QA: long windows can produce highly skewed bins (one very large bin, many tiny bins) under current cap/merge behavior.
- Related seeds:
  - `.planning/seeds/SEED-001-full-range-generation-data-pipeline.md`
  - `.planning/seeds/SEED-002-bin-cap-skew-mitigation.md`
