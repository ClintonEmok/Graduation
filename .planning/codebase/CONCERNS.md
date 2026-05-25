# Codebase Concerns

**Analysis Date:** 2026-05-22

## Top 5 Problematic UI Files

### 1. `src/app/timeslicing/components/SuggestionPanel.tsx` + `src/app/timeline-test-3d/components/SuggestionPanel.tsx` (765 + 641 lines) — Duplicated Monolithic Panel

- **Issue**: Two near-identical 600-700 line panel components that handle suggestion display, acceptance workflow, comparison mode, confidence display, diagnostics panels, and undo logic. These are duplicated across two route directories with minor variation (the timeline-test-3d version adds diagnostics section rendering, a few extra state variables). Seven total component files are forked identically across these two routes.
- **Files**:
  - `src/app/timeslicing/components/SuggestionPanel.tsx` (765 lines)
  - `src/app/timeline-test-3d/components/SuggestionPanel.tsx` (641 lines)
  - Plus 6 duplicated child components (see stale patterns below)
- **Impact**: ~4,259 lines of duplicated code across 7 component pairs. Bug fixes must be applied twice. Features diverge silently. The SuggestionPanel alone has 31+ imports and handles 10+ concerns (display, CRUD, comparison, diagnostics, confidence, history, undo, selection, filtering, keyboard shortcuts).
- **Fix approach**: Extract to `src/components/suggestions/` shared location. Parameterize the 3-5 differences (diagnostics section rendering, initial panel state, comparison mode variant). This is the highest-value refactor in the codebase.

### 2. `src/components/timeline/DemoDualTimeline.tsx` (858 lines) — Monolithic Timeline with 31 Imports

- **Issue**: Single file containing overview timeline rendering, detail timeline rendering, brush synchronization, density strip rendering, axis rendering, point rendering, adaptive scale transforms, zoom handling, and interaction guards. Directly imports from 31 modules including 5 stores, 3 hooks, 4 lib modules, and 5 visx/d3 libraries. Contains inline SVG rendering, D3 scale manipulation, and event handling all in one component.
- **Files**: `src/components/timeline/DemoDualTimeline.tsx`
- **Impact**: Nearly impossible to unit test. Every state/store subscription triggers re-renders of the entire 858-line tree. The `useEffect` for brush synchronization contains complex logic for clamping, debouncing, and cross-store coordination that is not independently testable.
- **Fix approach**: Split into sub-components mirroring the existing `DualTimeline.tsx` structure (overview track, detail track, axis, density strip, brush manager). Extract brush sync logic into a dedicated hook.

### 3. `src/components/dashboard-demo/` (15 files, ~5,500+ lines) — Parallel Dashboard Ecosystem

- **Issue**: A complete parallel implementation of the dashboard UI with its own shell (`DashboardDemoShell.tsx`), map (`DemoMapVisualization.tsx`), 3D view (`Demo3dSpatialView.tsx`), timeline (`DemoTimelinePanel.tsx` → `DemoDualTimeline.tsx`), stats panel (`DemoStatsPanel.tsx`), STKDE panel (`DemoStkdePanel.tsx`), slice panel (`DemoSlicePanel.tsx`), inspect panel (`DemoInspectPanel.tsx`), detect panel (`DemoDetectPanel.tsx`), configure panel (`DemoConfigurePanel.tsx`), and a separate 11-store ecosystem (`useDashboardDemo*` stores, ~2,030 lines). This runs alongside the main `dashboard-v2/` route (also 471 lines large).
- **Files**: 15 files in `src/components/dashboard-demo/`, 11 files in `src/store/useDashboardDemo*`, 3 dashboard routes in `src/app/dashboard*/`
- **Impact**: Three dashboard implementations competing for truth (original `dashboard/`, `dashboard-v2/`, `dashboard-demo/`). The demo stores are forks of the main stores with added complexity (e.g., `useDashboardDemoCoordinationStore.ts` has 290 lines vs `useCoordinationStore.ts` at 154 lines). CSS/layout decisions are duplicated. New features must be built 2-3 times.
- **Fix approach**: Identify which dashboard variant is canonical (likely `dashboard-v2` based on page size and test coverage). Archive `dashboard/` and `dashboard-demo/` after migrating any unique behavior. Delete the `useDashboardDemo*` stores that have no unique functionality.

### 4. `src/app/demo/non-uniform-time-slicing/showcase.tsx` (891 lines) — Largest Single Component in the Codebase

- **Issue**: An 891-line showcase/demo page that is the single largest file in the entire project. Combines data loading, visualization rendering, interaction handling, state management, and presentation layout into one monolithic export. Contains inline CSS, direct DOM manipulation patterns, and tight coupling to the `non-uniform-time-slicing` demo route.
- **Files**: `src/app/demo/non-uniform-time-slicing/showcase.tsx`
- **Impact**: Extreme maintenance burden. The file is longer than many entire route directories. Cannot be tested or reasoned about as a unit. Likely contains dead code from multiple iterations of the demo.
- **Fix approach**: Break into sub-components for each visualization section. Extract data loading into a dedicated hook. If this is a one-off demo page, consider whether it can be deleted entirely.

### 5. `src/components/viz/DataPoints.tsx` (687 lines) + `src/components/viz/SimpleCrimePoints.tsx` (487 lines) — Competing Point Rendering Implementations

- **Issue**: Two separate point rendering components in the same directory with overlapping responsibilities. `DataPoints.tsx` handles instanced mesh rendering for the 3D cube scene (with LOD, color mapping, size scaling, world-space positioning). `SimpleCrimePoints.tsx` handles a simpler point cloud variant with category coloring, size variation, and selection highlighting. Neither is the canonical implementation — they use different spatial indexing approaches, different store subscriptions, and different optimization strategies.
- **Files**: `src/components/viz/DataPoints.tsx`, `src/components/viz/SimpleCrimePoints.tsx`
- **Impact**: ~1,174 lines of duplicated rendering logic that must stay in sync. Performance fixes applied to one (e.g., LOD in DataPoints) are missing from the other. Category color mapping is duplicated.
- **Fix approach**: Extract shared logic (color mapping, size calculation, LOD strategy) into shared utilities. Make one component a wrapper around the other with parameter-driven configuration.

## Stale or Redundant UI Patterns

### 1. Deleted / Orphaned Components
- **`src/components/ui/Overlay.tsx`** — NOT imported anywhere in the codebase. Uses `useUIStore` from `src/store/ui.ts`, which is also NOT imported anywhere. Both are dead code from an earlier UI iteration.
- **`src/lib/adaptive-utils.ts`** — Contains only 2 lines (`ADAPTIVE_BIN_COUNT = 1024`, `ADAPTIVE_KERNEL_WIDTH = 3`), essentially a stub. These constants may exist elsewhere or the module was abandoned mid-extraction.

### 2. Seven-Components Duplicated Across Two Routes
These 7 component files exist as near-identical copies in both `src/app/timeslicing/components/` and `src/app/timeline-test-3d/components/`:

| Component | timeslicing | timeline-test-3d | Diff |
|-----------|-------------|------------------|------|
| `SuggestionCard.tsx` | 723 lines | 720 lines | 3 lines different (ContextBadge props) |
| `SuggestionPanel.tsx` | 765 lines | 641 lines | ~120 lines diff (diagnostics panel in 3d version) |
| `ConfidenceBadge.tsx` | 27 lines | 27 lines | **Identical** |
| `ContextBadge.tsx` | 73 lines | 49 lines | ~24 lines diff (signal state props) |
| `AutoProposalSetCard.tsx` | 178 lines | 178 lines | **Identical** |
| `ComparisonView.tsx` | 260 lines | 260 lines | **Identical** (import order only) |
| `ProfileManager.tsx` | 179 lines | 179 lines | **Identical** |
| **Total** | **2,205 lines** | **2,054 lines** | **4,259 lines duplicated** |

### 3. Three Dashboard Routes Competing
- `src/app/dashboard/page.tsx` (32 lines) — Old thin shell, likely superseded
- `src/app/dashboard-v2/page.tsx` (471 lines) — Current main dashboard with 47 store references
- `src/app/dashboard-demo/page.tsx` (5 lines) → `DashboardDemoShell.tsx` (170 lines) → 15 demo-specific components + 11 demo-specific stores

### 4. Route-Sibling Duplication (Paired Routes)
Multiple feature areas have two route implementations with overlapping but diverged components:
- `timeline-test/` ↔ `timeline-test-3d/` (half the components duplicated)
- `timeslicing/` ↔ `timeslicing-algos/` (different lib organization)
- `stkde/` ↔ `stkde-3d/` (2D vs 3D STKDE views — legitimate but no shared base)
- `dashboard/` ↔ `dashboard-v2/` ↔ `dashboard-demo/` (three-way fork)

### 5. Store Split Across Two Directories
- `src/store/` — 58 store files (8,620 total lines)
- `src/lib/stores/viewportStore.ts` — Orphaned outside the store directory
This inconsistency will cause confusion when adding new stores.

### 6. Duplicate Filtering Code in Viz Components
`FilterOverlay.tsx` (477 lines), `MapLayerManager.tsx`, `PresetManager.tsx`, and `DashboardHeader.tsx` all independently implement filter UI logic (type selection, district selection, time range) with different layouts and slightly different UX. Filter state management is shared (in `useFilterStore`) but the UI rendering is not.

## Recommended Cleanup Sequence for UI/Components

### Priority 1 (Immediate, Safe):
1. **Delete dead code**: Remove `src/components/ui/Overlay.tsx` and `src/store/ui.ts` — zero imports, guaranteed safe.
2. **Delete `src/lib/adaptive-utils.ts`** — 2-line stub, inline constants where used.
3. **Archive `src/app/dashboard/page.tsx`** — Superseded by `dashboard-v2/`, 32-line wrapper can be removed.

### Priority 2 (High value, moderate effort):
4. **Extract shared suggestion components**: Move `SuggestionCard`, `SuggestionPanel`, `ConfidenceBadge`, `ContextBadge`, `AutoProposalSetCard`, `ComparisonView`, `ProfileManager` to `src/components/suggestions/`. Parameterize the 3-5 known differences. This eliminates ~4,259 lines of duplication.
5. **Consolidate `src/lib/stores/viewportStore.ts`** into `src/store/useViewportStore.ts` for consistency.

### Priority 3 (Medium effort, architectural):
6. **Reconcile dashboard-demo**: Determine if `dashboard-demo` is a prototype that can be archived, or if it contains features not in `dashboard-v2`. If the latter, merge unique features into `dashboard-v2` and remove demo-specific stores. Delete `useDashboardDemo*` stores that have no unique behavior.
7. **Extract DataPoints/SimpleCrimePoints shared logic**: Create `src/components/viz/point-utils.ts` for shared color mapping, size calculation, and LOD strategy. This is safe because it's pure extraction.
8. **Break down `DemoDualTimeline.tsx`** (858 lines): Extract brush synchronization into `useBrushSync` hook. Extract axis rendering, density strip, and point rendering into sub-components following the pattern already established in `layers/`.

### Priority 4 (Long-term, route consolidation):
9. **Unify route-sibling pairs**: Merge `timeline-test` / `timeline-test-3d` into parameterized routes or shared components. Same for `stkde` / `stkde-3d`.
10. **Reduce per-page store surface**: `dashboard-v2/page.tsx` imports from 47 stores. Extract coordinated data-access hooks to reduce page-level coupling.

## Low-Risk Extraction / Refactor Ideas

1. **Extract `demo-burst-generation.ts` burst types**: The burst generation types/interfaces in `src/components/dashboard-demo/lib/demo-burst-generation.ts` overlap with `src/lib/burst-detection.ts`. Aligning the type interfaces is a pure type-level refactor with zero runtime impact.

2. **Move `layers/` up to shared components**: `src/components/timeline/layers/AxisLayer.tsx`, `HistogramLayer.tsx`, `MarkerLayer.tsx` are only consumed by the old `Timeline.tsx` which is itself mostly unused (the main timeline is now `DualTimeline` in `TimelinePanel.tsx`). If `Timeline.tsx` can be deprecated, these layers can be removed.

3. **Inline `src/lib/adaptive/route-binning-mode.ts`** (24 lines): Single module with one exported function `applyRouteBinningMode`. If used in only one place, inline it; if not used, delete it.

4. **Consolidate 5 slice-related stores**: `useSliceStore.ts`, `useSliceDomainStore.ts`, `useSliceSelectionStore.ts`, `useSliceCreationStore.ts`, `useSliceAdjustmentStore.ts` all manage aspects of time slices. Consider whether these can be merged into ~2 stores (data vs UI) once the dashboard reconciliation is done.

5. **Reunite `src/lib/queries.ts` with `src/lib/queries/` barrel**: `queries.ts` (530 lines) is already a client of the `queries/` barrel but also contains inline logic. Extract the inline functions into the appropriate `queries/` sub-modules so `queries.ts` becomes a pure barrel re-export.

---

## Top 5 Problematic Files (Backend / Library)

### 1. `src/lib/queries.ts` (530 lines) — God File with Mixed Concerns

- **Issue**: Serves as both a barrel re-export for queries modules AND contains ~200 lines of inline mock data generation (`generateMockCrimeRecords`, `mockCrimeCount`, `MOCK_CRIME_TYPES`, `MOCK_HOTSPOTS`, `MOCK_DISTRICTS`), plus adaptive map computation logic (`getOrCreateGlobalAdaptiveMaps` ~185 lines), plus helper utilities (`normalizeRange`, `clamp`, `ensureStrictlyMonotonicBoundaries`, `findBoundaryBin`, `createSeededRandom`, `weightedPick`, `gaussianish`), plus duplicated DB wrapper functions (`executeAll`, `executeRun`).
- **Files**: `src/lib/queries.ts`
- **Impact**: Hard to reason about which code is production vs test scaffolding. The mock generation uses seeded randomness to produce realistic-looking crime patterns that could mask real query bugs during development. The helper functions cannot be reused without importing the entire file.
- **Fix approach**: 
  1. Extract `executeAll`/`executeRun` to a shared `src/lib/db-helpers.ts`
  2. Move mock data logic to `src/lib/mockData.ts` or remove if no longer needed
  3. Split `getOrCreateGlobalAdaptiveMaps` into `src/lib/adaptive/` with a dedicated compute module

### 2. `src/lib/binning/engine.ts` (513 lines) + `src/lib/binning/rules.ts` (328 lines) — Orphaned Binning System

- **Issue**: A sophisticated 14-strategy binning engine with `daytime-heavy`, `nighttime-heavy`, `burstiness`, `crime-type-specific`, `weekday-weekend`, `quarter-hourly`, `hourly`, `daily`, `weekly`, `monthly`, `auto-adaptive`, etc. — plus a full constraint validation system, preset configs, and bin merging. Yet only `src/store/useBinningStore.ts` imports it as a consumer. The phase-annotated tests (`monthly-contract.phase1.test.ts`) suggest this was built incrementally but never integrated with the main adaptive time-scaling pipeline.
- **Files**: `src/lib/binning/engine.ts`, `src/lib/binning/rules.ts`, `src/lib/binning/types.ts`, `src/lib/binning/warp-scaling.ts`
- **Impact**: 841 lines of dead-or-nearly-dead code that must be maintained. Creates confusion about which binning system is canonical (this one vs the adaptive binning in `src/app/timeslicing-algos/lib/` vs the DuckDB-based binning in `src/lib/queries/aggregations.ts`).
- **Fix approach**: Audit all consumers. If unused, deprecate and remove in a cleanup phase. If needed, reconcile with the adaptive binning path and remove duplication.

### 3. `src/lib/stkde/compute.ts` (500 lines) — Monolithic STKDE Pipeline

- **Issue**: A single file containing grid config building, intensity computation with O(n×m×k²) Gaussian kernel convolution, peak window detection, hotspot candidate generation, response payload size guarding, and recursive slice processing. The two entry points (`computeStkdeFromCrimes` and `computeStkdeFromAggregates`) share ~70% of cell creation and hotspot sorting code via duplication rather than extraction.
- **Files**: `src/lib/stkde/compute.ts`, `src/lib/stkde/full-population-pipeline.ts`
- **Impact**: Performance-critical O(n×m×k²) kernel runs on the main thread. The `cellTimestamps` array-of-arrays (`Array.from({ length: cellCount }, () => [] as number[])`) is memory-intensive for large grids. Slice processing is recursive and creates a new request for each slice.
- **Fix approach**: 
  1. Extract `buildIntensityFromSupport` to a separate module that can be imported by both the main-thread code and the worker
  2. Move kernel convolution to `stkdeHotspot.worker.ts`
  3. Extract shared cell/hotspot creation into pure functions

### 4. `src/store/useSuggestionStore.ts` (539 lines) — Overloaded Store

- **Issue**: Manages individual suggestion CRUD (add/accept/reject/modify/undo), bulk selection (selectAll/deselectAll/acceptSelected/rejectSelected), filtering state (warpCount, intervalCount, snapToUnit, boundaryMethod, minConfidence), panel UI state (isPanelOpen, activeSuggestionId, hoveredSuggestionId), full-auto proposal package state (proposalSets, selectedSetId, recommendedSetId, lowConfidence), history delegation, and context mode. Imports from 5+ other stores creating an implicit dependency graph.
- **Files**: `src/store/useSuggestionStore.ts`, `src/hooks/useSuggestionGenerator.ts` (537 lines)
- **Impact**: Components subscribing to any selection of this state re-render when unrelated state changes. The 20+ action methods make testing and reasoning difficult. The store delegates to `useSuggestionHistoryStore`, `useSuggestionComparisonStore`, and `usePresetStore`, making the data flow hard to trace.
- **Fix approach**: Split into focused stores: `useSuggestionPanelStore` (UI state), `useSuggestionDataStore` (CRUD + selection), `useSuggestionConfigStore` (filters, warp/interval config).

### 5. `src/hooks/useSuggestionGenerator.ts` (537 lines) — Orchestration God Hook

- **Issue**: Orchestrates the entire suggestion lifecycle including auto-run timer, debounced context signature detection, stale-request cancellation, warp profile generation, boundary detection, full-auto proposal generation, context diagnostics, and a 4-state auto-run state machine. Imports directly from 8+ modules including `useCrimeData`, `useViewportStore`, `useFilterStore`, `useContextExtractor`, `useSmartProfiles`, `warp-generation`, `interval-detection`, `full-auto-orchestrator`, `context-diagnostics`.
- **Files**: `src/hooks/useSuggestionGenerator.ts`
- **Impact**: Nearly impossible to unit-test (requires mocking 10+ dependencies). The `generateSuggestions` callback is wrapped in `useCallback` with 10 dependencies. The `autoRunSignature` uses `JSON.stringify` on a composite object for change detection — fragile and slow.
- **Fix approach**: 
  1. Extract auto-run lifecycle management (debounce, stale detection) into a reusable `useAutoRun` hook
  2. Split generation logic into smaller composable functions
  3. Move diagnostics orchestration into the context-diagnostics module

## Duplicated & Stale Logic

### Triple Warp Scaling Implementation

The `weight = 1 + normalizedDensity * 5` formula (with minor variations) appears independently in 4 places:

| File | Function | Variation |
|------|----------|-----------|
| `src/lib/queries/aggregations.ts:50` | `computeWarpMap` | `1 + normalizedDensity[i] * 5` |
| `src/workers/adaptiveTime.worker.ts:175` | `computeAdaptiveMaps` | `1 + finiteNormalized * 5` |
| `src/lib/adaptive-scale.ts:64,127,221` | 3 functions | `1 + (density / maxDensity) * 5` (redundantly computed 3x in same file) |
| `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts:368` | inline | `1 + normalizeDensity(resolvedDensityMap[index]) * 5` |

Each implementation computes the same density-to-weight mapping with slightly different type handling and edge cases.

### Duplicate DB Wrappers

`executeAll` and `executeRun` are identically re-implemented in:

- `src/lib/queries.ts:233-257`
- `src/lib/stkde/full-population-pipeline.ts:9-18`

Both use the same callback-based DuckDB `db.all()` / `db.run()` pattern wrapped in Promise.

### Duplicate `toNumber`

Three separate bigint-to-number coercions:
- `src/lib/queries/aggregations.ts:19` (exported)
- `src/lib/stkde/full-population-pipeline.ts:56` (module-private)
- Multiple inline `typeof === 'bigint'` checks throughout `src/lib/queries.ts`

### Duplicate Entropy Calculations

- `src/lib/burst-detection.ts:95` — `normalizedEntropy()` full implementation with KL-divergence support
- `src/lib/confidence-scoring.ts:207` — inline `entropy` and `normalizedEntropy` calculation (simpler, different formula)

### Ad-Hoc Binning Duplicated Across 5 Modules

Each of these files independently re-implements time-based crime counting into bins:

- `src/lib/interval-detection.ts:250-260` (detectBoundaries)
- `src/lib/warp-generation.ts:100-122` (analyzeDensity)
- `src/lib/confidence-scoring.ts:60-73` (calculateDataClarity), `:136-148` (calculateCoverage), `:250-263` (inline in calculateConfidence)
- `src/lib/adaptive-scale.ts:47-55` (getAdaptiveScaleConfig), `:111-118` (getAdaptiveScaleConfigColumnar), `:205-212` (computeAdaptiveYColumnar)
- `src/lib/stats/temporal-pulses.ts`

All do: iterate through crimes, compute `(timestamp - rangeStart) / rangeSpan`, floor to bin index, increment counter.

### Duplicate Filtering Pathways

`src/lib/selection.ts` and `src/lib/data/selectors.ts` both filter crime data by type/district/time. One uses epoch timestamps, the other uses normalized coordinates. The same filtering logic exists in multiple query builders. There is no single canonical filter function.

### Duplicate Mock Data Systems

- `src/lib/queries.ts:148-221` — 74-line `generateMockCrimeRecords` with temporal peaks, spatial hotspots, and seeded randomness
- `src/lib/mockData.ts` — Separate mock data file (size unknown but exists as a distinct module)

## Performance-Risk Hotspots

### 1. Main-Thread Gaussian Kernel in STKDE

`src/lib/stkde/compute.ts:117-154` — `buildIntensityFromSupport` runs an O(rows×cols×kernelRadius²) nested loop on the main thread. For a 100×100 grid with bandwidth of 500m (≈3-5 cell radius), this is ~10000×81 ≈ 810K iterations, each doing sqrt, exp, and floating-point math. The nearby `stkdeHotspot.worker.ts` only does 67 lines of light work and could absorb this.

### 2. Float32Array ↔ JSON Round-Trip in Adaptive Cache

`src/lib/queries.ts:359-364` and `:472-475` deserialize/serialize Float32Array through `JSON.parse(JSON.stringify(Array.from(...)))` on every cache read/write. For 1000-bin maps, this creates 3-5 intermediate array allocations per operation.

### 3. LIMIT/OFFSET Degradation in Full-Population Pipeline

`src/lib/stkde/full-population-pipeline.ts:154` uses `LIMIT ? OFFSET ?` pagination. DuckDB must scan and skip rows on each page, so performance degrades as offset grows. For large datasets this will produce increasingly slow pages toward the end.

### 4. Array Method Spreading in Binning Engine

`src/lib/binning/engine.ts:37` uses `Math.min(...data.map(d => d.timestamp))` which creates two intermediate arrays per call and risks stack overflow for large datasets.

### 5. No Caching in Adaptive Scale Computation

`src/lib/adaptive-scale.ts` — `getAdaptiveScaleConfig`, `getAdaptiveScaleConfigColumnar`, and `computeAdaptiveYColumnar` all recompute the full binning + weighting + mapping on every call. If multiple components call these with the same domain/binCount within a frame, the work is repeated.

### 6. Redundant Re-binning in Confidence Scoring

`src/lib/confidence-scoring.ts` — `calculateConfidence` calls `calculateDataClarity` and `calculateCoverage` sequentially. Each independently bins the crime data into arrays, then calculates statistics. If `densityBins` is not provided, `calculateConfidence` bins a third time. This is 2-3x the necessary work.

## Fragile Areas

### `src/lib/queries.ts` — Adaptive Cache Key Construction

Line 329: ``const cacheKey = `global:${safeBinCount}:${safeKernelWidth}:${safeBinningMode}` `` — The cache key does not include the dataset or filter parameters. If the underlying data changes (e.g., different DuckDB file), stale cached results are returned.

### `src/hooks/useSuggestionGenerator.ts` — Stale Request Cancellation

Lines 391-401 use an `isStaleRequest()` closure comparing `requestIdRef.current` with the closure's captured `requestId`. This pattern is fragile and does not handle async race conditions where an earlier request resolves after a later one.

### Phase-Annotated Test Files

9 test files use the pattern `*.phase{N}.test.ts` (e.g., `monthly-contract.phase1.test.ts`, `slice-stkde.phase2.test.ts`). This convention suggests incremental delivery that may not reflect final integration state. These tests may pass in isolation but fail when run together, or may test behaviors that have been superseded.

## Security Considerations

| Area | Risk | Files | Mitigation |
|------|------|-------|------------|
| DuckDB SQL Injection | Table names sanitized via `sanitizeTableName`, but column names in query builders are hardcoded | `src/lib/queries/`, `src/lib/stkde/full-population-pipeline.ts` | Current approach is adequate since DuckDB is local and filters are parameterized |
| Large Payload | No size limits on adaptive cache JSON columns — could grow unbounded | `src/lib/queries/aggregations.ts:86-99` | STKDE has a response guard; adaptive cache does not |

## Recommended Cleanup Sequence

### Phase 1: Shared Utilities (Low risk, high value)
1. Create `src/lib/db-helpers.ts` — extract `executeAll`, `executeRun`, `toNumber`
2. Consolidate `normalizeRange`, `clamp`, `EPSILON` into a math utility

### Phase 2: Consolidate Warp Scaling (Medium risk, removes duplication)
1. Extract the core `weight = 1 + normalizedDensity * 5` logic into a single `computeWarpWeights` function
2. Make `src/workers/adaptiveTime.worker.ts` import shared modules (not possible directly — use a shared lib that both worker and main thread can import)
3. Replace the 3 copies in `src/lib/adaptive-scale.ts` with calls to the shared function

### Phase 3: Split God Files (Medium risk, improves maintainability)
1. Move mock data from `queries.ts` to `mockData.ts`
2. Split `getOrCreateGlobalAdaptiveMaps` into `src/lib/adaptive/global-cache.ts`
3. Extract intensity convolution from `stkde/compute.ts` into a separate module callable from the worker

### Phase 4: Resolve Binning Duality (Higher risk, requires domain knowledge)
1. Audit whether `src/lib/binning/engine.ts` is actively consumed beyond `useBinningStore`
2. If alive, reconcile strategy names and behavior with the adaptive binning path
3. Deprecate orphaned strategies

### Phase 5: Performance (Medium risk, targeted)
1. Cache adaptive scale results by `domain+binCount` key
2. Avoid redundant re-binning in confidence scoring by passing shared bin arrays
3. Replace `LIMIT/OFFSET` window function in `full-population-pipeline.ts`

---

*Concerns audit: 2026-05-22*
