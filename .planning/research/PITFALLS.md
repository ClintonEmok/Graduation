# Domain Pitfalls

**Domain:** Adaptive space-time cube / synchronized spatiotemporal analytics
**Project:** Adaptive Space-Time Cube Prototype
**Researched:** 2026-04-09

## Critical Pitfalls

### 1) Silent mock-data fallback masquerading as real analysis
**What goes wrong:** The app renders plausible-looking charts from mock data when DuckDB/API loading fails, so users trust outputs that are not grounded in the real dataset.
**Why it happens:** Graceful degradation is implemented, but provenance is not always surfaced in the UI.
**Consequences:** Wrong analytical conclusions, false confidence in hotspots/bursts, hard-to-reproduce bug reports.
**Warning signs:**
- Charts load “successfully” even when data ingestion fails
- `X-Data-Warning`/error logs exist but no visible banner or badge
- Screenshots/reports are produced without source provenance
**Prevention:**
- Show an always-visible data provenance badge (`real`, `mock`, `loading`, `partial`)
- Block “analysis-ready” states until real data is confirmed
- Treat fallback as an explicit mode with user acknowledgement
- Add tests that assert the UI surfaces fallback state
**Phase:** Phase 1 (data loading/provenance hardening)

### 2) Adaptive time warping changes meaning, not just scale
**What goes wrong:** Warp settings make dense intervals visually larger, but the product stops preserving the user’s mental model of time order, duration, and comparability.
**Why it happens:** Warp optimization focuses on emphasizing bursts and can over-correct sparse/dense regions.
**Consequences:** Misread event timing, distorted duration comparisons, incorrect identification of causal sequences.
**Warning signs:**
- Users can’t explain what the warped timeline represents
- Nearby slices appear to “jump” unpredictably when warp strength changes
- The same interval is interpreted differently across cube/map/timeline views
**Prevention:**
- Preserve monotonic ordering and display clear warp semantics
- Show both warped and unwarped reference cues (ticks, labels, overview band)
- Cap warp strength and require visible confidence/quality metadata
- Add dataset-level checks for extreme compression/expansion ratios
**Phase:** Phase 2 (adaptive scaling UX + invariants)

### 3) Multi-view synchronization drift between cube, map, and timeline
**What goes wrong:** Brush, selection, playback, and slice state diverge across views, so each panel tells a slightly different story.
**Why it happens:** Cross-store coordination and custom event dispatch are fragile under rapid interaction and async updates.
**Consequences:** Broken trust in the visualization, “ghost” selections, impossible-to-debug state mismatches.
**Warning signs:**
- Selected index/source changes without a matching brush range update
- One panel updates while another lags or resets
- Rapid brushing produces inconsistent highlights across views
**Prevention:**
- Define a single authoritative interaction contract for selection/brush/playback
- Enforce invariants like “one source of truth per selection state”
- Add integration tests for rapid brush/drag/play interactions
- Instrument sync status and log reconciliation failures
**Phase:** Phase 1–2 (coordination model before new features)

### 4) Large-data visualization bottlenecks freeze the UI
**What goes wrong:** Rendering, raycasting, texture updates, query aggregation, or warp generation execute on the main thread and block interaction.
**Why it happens:** The prototype favors rich visual effects and large in-memory transforms over incremental/streamed work.
**Consequences:** Janky brushing, delayed playback, browser tab hangs, unusable large datasets.
**Warning signs:**
- Timeline brush lags under large datasets
- Frame drops when warp map or density cutoff changes
- Long tasks appear during data load or panel sync
**Prevention:**
- Keep heavy transforms in workers and avoid repeated full recomputation
- Add performance budgets for load time, brush latency, and frame time
- Memoize expensive derived data and reuse textures/buffers when possible
- Test with worst-case dataset sizes, not just representative samples
**Phase:** Phase 2–3 (performance hardening)

### 5) Initialization races create partially valid app state
**What goes wrong:** DuckDB, data fetches, workers, and store hydration race during startup, leaving the app in a state that looks initialized but is not fully ready.
**Why it happens:** Several async subsystems boot independently with module-level/shared state.
**Consequences:** Empty panels, duplicate queries, stale stores, intermittent first-load bugs.
**Warning signs:**
- Problems only occur on cold start or hard refresh
- Repeated initialization logs or duplicate worker starts
- Interactions work after a delay but not immediately on first render
**Prevention:**
- Introduce explicit boot phases (`uninitialized → loading → ready → degraded`)
- Gate interactions on readiness checks for data, worker, and store hydration
- Make startup idempotent and safe to retry
- Add cold-start integration tests
**Phase:** Phase 1 (startup contract) and Phase 3 (resilience)

## Moderate Pitfalls

### 6) Input validation gaps become analytical bugs, not just security bugs
**What goes wrong:** Malformed time ranges, filters, or parameters silently coerce into bad queries or misleading empty states.
**Why it happens:** Visualization apps often trust UI state and only lightly validate API inputs.
**Consequences:** Empty charts, wrong aggregations, confusing “no data” results, brittle query generation.
**Prevention:**
- Validate all route params and filter objects with schemas
- Distinguish “invalid input” from “valid but empty result” in the UI
- Reject impossible ranges before they reach DuckDB/query builders
**Detection:**
- Track validation failures separately from query misses
- Add tests for out-of-order dates, null bounds, and unsupported enums
**Phase:** Phase 1 (API and query validation)

### 7) Store sprawl and custom events hide coupling
**What goes wrong:** Cross-store dependencies and `CustomEvent`-based communication make it hard to reason about state transitions.
**Why it happens:** Feature slices grow independently, then require coordination later.
**Consequences:** Regression-prone refactors, duplicated state, brittle acceptance flows.
**Prevention:**
- Keep a strict ownership model for each piece of shared state
- Replace ad hoc event signaling with typed actions/contracts where feasible
- Document state transitions and allowed source/target updates
**Detection:**
- A change in one store requires edits in several unrelated files
- Tests need to mock browser events to cover core flows
**Phase:** Phase 2 (state architecture cleanup)

### 8) Resource churn in WebGL textures and Three.js objects
**What goes wrong:** Recreating data textures, geometries, or materials on every warp/map update causes memory leaks or GPU churn.
**Why it happens:** The visualization is data-driven and update-heavy, so object lifecycle is easy to overlook.
**Consequences:** Rising memory usage, degraded frame rate, eventual context loss.
**Prevention:**
- Make disposal mandatory in component lifecycles
- Reuse textures/buffers when warp inputs change incrementally
- Add smoke tests for repeated warp changes and panel remounts
**Detection:**
- GPU memory climbs after repeated interactions
- Performance worsens over time without a reload
**Phase:** Phase 3 (render lifecycle and cleanup)

## Minor Pitfalls

### 9) Hardcoded burst thresholds don’t travel across datasets
**What goes wrong:** Percentiles, density cutoffs, and warp defaults work on one crime dataset but fail on another city/time span.
**Why it happens:** Parameters are tuned visually rather than calibrated against data distributions.
**Consequences:** Over-highlighting noise or missing real hotspots.
**Prevention:**
- Derive defaults from dataset statistics
- Show parameter impact previews
- Preserve per-dataset calibration metadata
**Phase:** Phase 2 (adaptive parameter calibration)

### 10) “No data” states are conflated with “bad data” states
**What goes wrong:** Empty results, loading, invalid filters, and backend failure all look the same.
**Why it happens:** Visualization UIs often collapse multiple failure modes into one empty panel.
**Consequences:** Slow debugging and poor operator confidence.
**Prevention:**
- Separate empty/loading/error/invalid states in the UI
- Emit distinct diagnostics for each state
**Phase:** Phase 1 (state taxonomy)

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data loading / startup | Silent fallback and init races | Explicit readiness states, provenance badge, cold-start tests |
| API / query layer | Validation gaps and invalid ranges | Schema validation, typed query builders, clear error states |
| Coordination layer | Multi-view drift and store coupling | Single interaction contract, integration tests, sync invariants |
| Adaptive warp layer | Meaning distortion from aggressive warping | Clamp warp strength, preserve monotonicity, show reference cues |
| Rendering / performance | Main-thread stalls and texture churn | Workerize heavy work, memoize derived data, dispose resources |

## Sources

- `.planning/PROJECT.md`
- `README.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
