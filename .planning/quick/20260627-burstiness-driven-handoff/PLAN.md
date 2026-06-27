# Plan: Burstiness-Driven Adaptive Scaling (default λ=1.0, adjustable)

## Goal
Switch the prototype's adaptive temporal scaling from a density-led hybrid
(default λ=0.25) to a pure burstiness-driven model (default λ=1.0), and
align the thesis and in-repo docs with that framing.

## Sections (atomic commits)

### S1. Code: default λ=1.0 in adaptive-utils.ts
- `src/lib/adaptive-utils.ts:3` — `ADAPTIVE_BURST_INFLUENCE = 0.25` → `1.0`
- `src/workers/adaptiveTime.worker.test.ts:82-109` — update test to use
  `burstInfluence: 1` and burstiness-driven expected formula

### S1b. Code: fix `computeBurstinessWeights` in `adaptive-scale.ts`
- Current implementation uses pairwise adjacent-bin metric that returns
  `burstiness[0] = 0` and is too weak for λ=1.0 — fails the existing
  `getAdaptiveScaleConfig` and `computeAdaptiveY` tests.
- Replace with proper Goh-Barabási burstiness computed from inter-event
  gaps within each bin (mirror the worker's `computeBurstinessPerBin`).

### S2. Thesis math core
- `5.5_adaptive_temporal_scaling.tex`
  - Delete §"Density normalisation" (uses `D_max`).
  - Weight formula `w_i = 1 + M((1-λ) d̂_i + λ B_i)` → `w_i = 1 + M·B_i`
    (default λ=1.0, parameter retained).
  - Update rationale (burstiness-driven justification).
  - Update worked example to a 5-bin case where density and burstiness
    disagree so the example actually demonstrates the divergence claim.

- `5.8_algorithm.tex` (or whatever the current file is named)
  - Remove `D_max` from inputs.
  - Delete density normalization line.
  - Update weight line to λ=1.0 default.

- `5.2_formal_problem_definition.tex`
  - Keep density definition for characterisation.
  - Remove density from the problem statement (it is no longer an input).

### S3. Thesis framing
- `5.1_overview_of_the_approach.tex` — line 3 "density-led" → "burstiness-driven".
- `5.3_burstiness_quantification.tex` — reframe lines 3, 7.

### S4. Terminology propagation
- abstract.tex, 01_introduction, 02_state_of_the_art, 03_data_description,
  04_problem_analysis, 06_visual_design_and_interaction, 08_evaluation,
  09_discussion_and_conclusion, appendices, BURST_AWARE_THESIS_EDIT_PLAN.md.
- Grep for "density-aware", "density-led", "burstiness-aware",
  "burstiness-driven" and decide per occurrence.

### S5. In-repo docs
- `METHODOLOGY.md` — already uses "burst" terminology; minor cleanup.
- `TEMPORAL_SCALING_CHARACTERIZATION.md` — change `wᵢ = 1 + (cᵢ/max(c))·5`
  to burstiness-driven formulation.
- `ALGORITHM_ANALYSIS.md` — update D1/D2 narrative, line refs in 5.5.

### S6. Verification
- `rtk vitest src/workers/adaptiveTime.worker.test.ts src/lib/adaptive-scale.test.ts`
- `rtk tsc --noEmit`
- Recompile LaTeX (`pnpm latexmk` or equivalent) to confirm the chapter still builds.
- Final grep for stale terms.

## Locked decisions
- Confidence: (b) diagnostic only — no change to 5.7's integral form.
- User study: deferred (not part of this handoff).

## Open items
- Worked example in 5.5: need to construct a 5-bin table where density and
  burstiness pick different winners.
