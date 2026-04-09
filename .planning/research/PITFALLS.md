# Domain Pitfalls

**Domain:** Adaptive space-time cube / synchronized spatiotemporal analytics
**Project:** Adaptive Space-Time Cube Prototype
**Researched:** 2026-04-09

## Critical Pitfalls

### 1) 2D density overviews hide burst order
**What goes wrong:** The overview surface makes clusters easy to see, but users miss the sequence inside a dense interval.
**Why it happens:** Density encodings summarize too aggressively when the underlying events are rapid and concurrent.
**Consequences:** The overview feels correct while the burst interpretation is wrong.
**Warning signs:**
- Users can describe clusters but not the order inside them
- Dense intervals look like a single blob
- The same burst looks identical before and after scaling
**Prevention:**
- Pair the overview with a traceable 3D STC
- Keep reference cues for the original interval ordering
- Add explicit burst-order tests for dense intervals
**Phase:** Phase 1 and Phase 3

### 2) The 3D STC adds depth ambiguity and navigation cost
**What goes wrong:** The cube shows trajectories, but users lose context when trying to interpret depth or move around the scene.
**Why it happens:** 3D projection is powerful but not self-explanatory.
**Consequences:** Users misread paths, pause longer than necessary, or avoid the 3D view entirely.
**Warning signs:**
- Users need repeated reorientation after zoom/pan
- Selected trajectories are hard to relocate
- Hover highlights do not make the 2D footprint obvious
**Prevention:**
- Keep synchronized navigation between the 2D and 3D views
- Use brushing/linking so the footprint is always visible
- Preserve object constancy with stable camera and selection rules
**Phase:** Phase 2

### 3) Non-uniform temporal scaling changes meaning, not just layout
**What goes wrong:** Warping reveals bursts, but the product stops preserving metric duration and comparability.
**Why it happens:** Scaling logic emphasizes dense intervals without enough reference cues.
**Consequences:** Misread event timing, distorted duration comparisons, incorrect burst classification.
**Warning signs:**
- Users cannot explain what the warped timeline represents
- Nearby slices jump when warp strength changes
- Burst pacing appears inconsistent across views
**Prevention:**
- Preserve monotonic ordering and show warp semantics clearly
- Keep metric-duration reference cues visible
- Cap warp strength and require confidence metadata
**Phase:** Phase 3

### 4) Cross-view synchronization drift breaks the analysis loop
**What goes wrong:** Overview, trace, and burst views tell slightly different stories after rapid interaction.
**Why it happens:** Cross-store coordination and ad hoc messaging are fragile under async updates.
**Consequences:** Broken trust in the visualization, ghost selections, and impossible-to-debug state mismatches.
**Warning signs:**
- Selection changes without matching brush/window updates
- One panel updates while another lags or resets
- Rapid brushing produces inconsistent highlights
**Prevention:**
- Define a single authoritative interaction contract
- Enforce invariants like one source of truth per selection state
- Add integration tests for rapid brush/drag/play flows
**Phase:** Phase 2

### 5) Support overlays look like ground truth
**What goes wrong:** Hotspot/STKDE layers, guidance proposals, or rationale text are read as the primary answer rather than support signals.
**Why it happens:** The UI does not clearly distinguish core analysis from supporting interpretation.
**Consequences:** Users over-trust suggestions or conflate inference with evidence.
**Warning signs:**
- Suggestions are applied without review
- Hotspot overlays dominate the screen
- Provenance metadata is hidden or easy to miss
**Prevention:**
- Make support overlays visually distinct from primary analysis
- Require rationale and provenance metadata to stay visible
- Keep guidance optional and reversible
**Phase:** Phase 4

### 6) Large-data rendering freezes the UI
**What goes wrong:** Rendering, raycasting, scaling, or texture updates run on the main thread and block interaction.
**Why it happens:** The prototype favors rich visual effects and large in-memory transforms over incremental work.
**Consequences:** Janky brushing, delayed playback, browser tab hangs, unusable large datasets.
**Warning signs:**
- Timeline brush lags under large datasets
- Frame drops when scaling changes
- Long tasks appear during data load or panel sync
**Prevention:**
- Keep heavy transforms in workers and avoid repeated full recomputation
- Add performance budgets for load time, brush latency, and frame time
- Memoize derived data and reuse textures/buffers when possible
**Phase:** Phase 3 and Phase 4

### 7) Trust/provenance ambiguity creates false confidence
**What goes wrong:** The app looks ready even when it is still loading, partially degraded, or backed by mock data.
**Why it happens:** Graceful degradation is implemented, but provenance is not always surfaced in the UI.
**Consequences:** Wrong analytical conclusions and hard-to-reproduce bug reports.
**Warning signs:**
- Charts load successfully even when data ingestion fails
- Warning logs exist but no visible banner or badge
- Screenshots are produced without source provenance
**Prevention:**
- Show an always-visible data provenance badge
- Distinguish loading, real, mock, partial, and degraded states
- Add tests that assert the UI surfaces fallback state
**Phase:** Phase 4

## Moderate Pitfalls

### 8) Input validation gaps become analytical bugs
**What goes wrong:** Malformed ranges or filters silently coerce into bad queries or misleading empty states.
**Why it happens:** Visualization apps often trust UI state and only lightly validate API inputs.
**Consequences:** Empty charts, wrong aggregations, confusing "no data" results, brittle query generation.
**Prevention:**
- Validate all route params and filter objects with schemas
- Distinguish invalid input from valid but empty results in the UI
- Reject impossible ranges before they reach query builders
**Phase:** Phase 4

### 9) Store sprawl and custom events hide coupling
**What goes wrong:** Cross-store dependencies and `CustomEvent`-based communication make it hard to reason about state transitions.
**Why it happens:** Feature slices grow independently, then require coordination later.
**Consequences:** Regression-prone refactors, duplicated state, brittle acceptance flows.
**Prevention:**
- Keep a strict ownership model for each piece of shared state
- Replace ad hoc event signaling with typed actions/contracts where feasible
- Document state transitions and allowed source/target updates
**Phase:** Phase 2

### 10) Hardcoded burst thresholds do not travel across datasets
**What goes wrong:** Percentiles, density cutoffs, and warp defaults work on one dataset but fail on another city/time span.
**Why it happens:** Parameters are tuned visually rather than calibrated against data distributions.
**Consequences:** Over-highlighting noise or missing real bursts.
**Prevention:**
- Derive defaults from dataset statistics
- Show parameter impact previews
- Preserve per-dataset calibration metadata
**Phase:** Phase 3

### 11) "No data" states are conflated with "bad data" states
**What goes wrong:** Empty results, loading, invalid filters, and backend failure all look the same.
**Why it happens:** Visualization UIs often collapse multiple failure modes into one empty panel.
**Consequences:** Slow debugging and poor operator confidence.
**Prevention:**
- Separate empty/loading/error/invalid states in the UI
- Emit distinct diagnostics for each state
**Phase:** Phase 4

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Overview / summary | Burst order lost in density view | Pair density projection with traceable 3D cues |
| Trace / compare | 3D depth ambiguity and sync drift | Synchronized navigation, brushing, and stable selection rules |
| Burst decoding | Meaning distortion from aggressive scaling | Clamp warp strength and keep metric-duration references visible |
| Support overlays | Support signals mistaken for ground truth | Distinct styling, rationale metadata, and reversible guidance |
| Rendering / performance | Main-thread stalls and texture churn | Workerize heavy work, memoize derived data, dispose resources |

## Sources

- `.planning/PROJECT.md`
- `README.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
