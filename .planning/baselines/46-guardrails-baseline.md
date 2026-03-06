# Phase 46 Guardrails Baseline (Plan 01)

This baseline captures refactor-sensitive metrics before decomposition work starts.

## Scope

- File-size metrics for:
  - `src/components/timeline/DualTimeline.tsx`
  - `src/hooks/useCrimeData.ts`
  - `src/lib/queries.ts`
- Timing metrics for deterministic hot-path helpers:
  - `selection.nearestIndexByTime.linearScan`
  - `timeDomain.epochSecondsToNormalized`
  - `timeDomain.normalizedToEpochSeconds`

## Capture command

```bash
node scripts/capture-refactor-baseline.mjs --write
```

This command recalculates all metrics and writes a fresh snapshot to:

- `.planning/baselines/46-guardrails-baseline.json`

## Quick compare mode

```bash
node scripts/capture-refactor-baseline.mjs
```

Without `--write`, the script prints current measurements and compares them against the latest saved snapshot.

## Collection details

- File metrics: UTF-8 byte size plus physical line count (newline-delimited).
- Selection benchmark dataset: 50,000 synthetic timestamps over Chicago dataset epoch domain, 1,200 deterministic lookup targets.
- Time-domain benchmarks: deterministic conversion loops over fixed iteration counts.
- Timing output: median wall-clock duration across 7 runs plus `nsPerIteration` for stable trend checks.

## How to use in refactor phases (47-51)

1. Run baseline capture before your change set.
2. Apply refactor changes.
3. Re-run `node scripts/capture-refactor-baseline.mjs` to compare against stored baseline.
4. If changes are intentional, rerun with `--write` in the phase that explicitly updates benchmark baselines.
