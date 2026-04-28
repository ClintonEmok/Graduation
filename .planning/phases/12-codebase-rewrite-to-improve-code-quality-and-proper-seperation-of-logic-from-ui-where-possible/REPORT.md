# Phase 12: Codebase Architecture Audit Report

**Audit Date:** 2026-04-21
**Audited Against:** Finoit Software Architecture Best Practices (15 principles)
**Scope:** Full codebase — components, stores, hooks, lib modules

---

## Finoit Best Practices Reference

1. **Modular architecture** — break into discrete, independent modules
2. **Separation of concerns** — isolate UI, business logic, data storage
3. **Layered architecture** — presentation / business logic / data layers
4. **Domain decomposition** — isolate functional areas (user management, payments, etc.)
5. **Zero-trust** — not applicable (offline-first, no auth)
6. **Event-driven** — async communication via event bus
7. **Keep it simple** — avoid unnecessary complexity
8. **Performance parameters** — consider processing speed, memory, concurrency
9. **Scope creep management** — vigilant monitoring
10. **Microservices** — not applicable (Next.js monolith)
11. **Smart endpoints / dumb pipes** — keep pipes simple, make endpoints intelligent
12. **Load balancing** — N/A (single-node)
13. **Idempotence** — N/A (offline analytics)
14. **Event sourcing** — N/A (state-based, not event-sourced)
15. **Give attention to functional AND non-functional requirements**

---

## GOD FILES / MONOLITHS

### P0 — Critical (Immediate Refactor)

| File | Lines | Primary Responsibility | Violations |
|------|-------|------------------------|------------|
| `src/components/timeline/DemoDualTimeline.tsx` | 1583 | Dual timeline visualization with density warping | Data fetching + rendering + interaction + business logic all in one component |
| `src/components/timeline/DualTimeline.tsx` | 1322 | Dual timeline with slice/burst support | 18 Override props = too many responsibilities; 23 useMemos impossible to track |
| `src/store/useSuggestionStore.ts` | 768 | Suggestion state management | 6 concerns in 1 store: suggestions + presets + undo + history + comparison + full-auto |

### P1 — High Priority

| File | Lines | Primary Responsibility | Violations |
|------|-------|------------------------|------------|
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | 909 | Slice CRUD panel | Panel UI + slice editing + draft management + warp controls |
| `src/app/demo/non-uniform-time-slicing/showcase.tsx` | 880 | Demo showcase page | UI + scenario generation + warp comparison |
| `src/hooks/useSuggestionGenerator.ts` | 579 | Suggestion generation hook | Debounce + metadata building + lifecycle + generation all in one hook |
| `src/app/timeslicing/components/SuggestionPanel.tsx` | 767 | Suggestion display panel | List + history + comparison + full-auto views all in one component |
| `src/components/viz/DataPoints.tsx` | 687 | 3D crime point rendering | GPU rendering + filter logic + color mapping |

### P2 — Medium Priority

| File | Lines | Primary Responsibility | Violations |
|------|-------|------------------------|------------|
| `src/lib/queries.ts` | 530 | Crime data queries | Real queries + mock data + statistics + utils in one file |
| `src/app/timeline-test/page.tsx` | 672 | Timeline test page | Mock data + scales + rendering orchestration |
| `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` | 636 | Algorithm comparison route | Data fetching + URL state + visualization |
| `src/components/binning/BinningControls.tsx` | 551 | Binning controls UI | UI + generation inputs + bin operations |
| `src/store/useTimeslicingModeStore.ts` | 425 | Timeslicing mode state | Mode + presets + generation + bin manipulation |
| `src/lib/warp-generation.ts` | 350 | Warp profile generation | Density analysis + profile building + confidence |

---

## CONVOLUTED FILES

### P0 — Critical

**`src/components/timeline/DualTimeline.tsx`**
- 1322 lines, 23 useMemo hooks, 18 Override props, 26 imports
- Nesting depth 4+ in slice geometry computation (lines 684-761)
- Effect spaghetti: 2 useEffects with 8+ and 7+ dependencies
- Mental model requires tracking: adaptive warping, density computation, burst detection, slice visualization, brush/zoom sync, point selection simultaneously

**`src/lib/stkde/compute.ts`**
- 461 lines, 3-level nested kernel density loop (row → col → kernel radius)
- Duplicate hotspot sorting comparator at lines 327-333 and 426-433
- Two near-identical pipelines: `computeStkdeFromCrimes` and `computeStkdeFromAggregates`
- 29 local variables in `computeStkdeFromCrimes` function body

### P1 — High

**`src/lib/full-auto-orchestrator.ts`**
- 320 lines, 5 scoring functions with overlapping concerns: `scoreWarpOnly` → `scoreWarpCoverage` → `scoreWarpRelevance` → `scoreWarpContinuity` → `scoreOverlapMinimization`
- Duplicate overlap detection logic: `hasOverlappingIntervals` (lines 238-257) and `scoreOverlapMinimization` (lines 259-296)
- Magic constants: `SCORE_WEIGHTS`, `OVERLAP_PENALTY_MULTIPLIER`, `MIN_CONFIDENCE_THRESHOLD`

**`src/lib/binning/engine.ts`**
- 459 lines, 10-branch switch in `generateBins` — violates Open/Closed Principle
- Duplicate daytime/nighttime filtering in `generateDaytimeHeavyBins` and `generateNighttimeHeavyBins`
- `postProcessBins` (lines 438-459) applies: validation → merge → filter → truncate — order is fragile

### P2 — Medium

| File | Complexity Indicators |
|------|----------------------|
| `src/store/slice-domain/createSliceCoreSlice.ts` | Cross-store reads inside pure state logic (temporal coupling antipattern), O(n²) overlap detection |
| `src/store/useAdaptiveStore.ts` | Module-level worker instantiation, activeRequestId counter for request deduplication, closure over set() in onmessage |
| `src/components/timeline/hooks/usePointSelection.ts` | 40-line handlePointerMove with divergent paths for points vs bins, 7 useCallbacks with 4-8 deps each |
| `src/lib/interval-detection.ts` | 3 detection methods with shared statistical boilerplate but separate implementations, fallback order-dependent |

---

## INTERFACE/TYPE FILES

### Tight Coupling (Central Domain Types)

| File | Type Count | Primary Domain | Used By |
|------|------------|----------------|---------|
| `src/types/crime.ts` | 6 | Crime data | 20+ files (hooks, lib, components, API) |
| `src/types/autoProposalSet.ts` | 10 | Adaptive proposals | useSuggestionStore, useSuggestionGenerator |
| `src/lib/binning/types.ts` | 8 + 5 re-exports | Time binning | slice-domain stores, binning store, engine |
| `src/store/slice-domain/types.ts` | 13 | Slice state | All slice-domain stores |
| `src/lib/stkde/contracts.ts` | 9 | STKDE computation | workers, API routes |

### Loose Coupling (Feature-Specific)

| File | Type Count | Primary Domain |
|------|------------|----------------|
| `src/types/index.ts` | 4 | Legacy/shared |
| `src/lib/queries/types.ts` | 7 | Query layer |
| `src/lib/data/types.ts` | 3 | Runtime data |
| `src/lib/neighbourhood/types.ts` | 8 | POI/neighbourhood |

---

---

## TYPE CONSOLIDATION (Single Interface File)

**Goal:** Collapse all domain types into `src/types/` as the single source of truth.

### Current State (Scattered)

| File | Types Defined |
|------|---------------|
| `src/types/crime.ts` | CrimeRecord, CrimeRecordInput, CrimeViewport, UseCrimeDataOptions, UseCrimeDataResult, CrimeDataMeta |
| `src/types/autoProposalSet.ts` | AutoProposalScoreBreakdown, AutoProposalReasonMetadata, AutoProposalWarpInterval, AutoProposalWarpEmphasis, AutoProposalWarpProfile, AutoProposalBoundaryMethod, AutoProposalIntervalSet, AutoProposalSet, AutoProposalContext, RankedAutoProposalSets |
| `src/types/index.ts` | CrimeType, CrimeEvent, Bin, ColumnarData (legacy) |
| `src/lib/binning/types.ts` | TimeBin, BinGroup, BinModification, BinningState, SavedConfiguration + re-exports from rules.ts |
| `src/lib/binning/rules.ts` | BinningStrategy, BinningConstraint, BinningRule, BinningRuleParams, BinningConfig, BinningResult, PRESET_RULES |
| `src/lib/queries/types.ts` | QueryFragment, CrimeRecord (DUPLICATE), QueryCrimesOptions, QueryFilters, AdaptiveBinningMode (DUPLICATE), GlobalAdaptiveMaps, DensityBin |
| `src/lib/data/types.ts` | DataPoint, ColumnarData (DUPLICATE), FilteredPoint |
| `src/lib/neighbourhood/types.ts` | GeoBounds, OSMPOIResult, ChicagoBusiness, ChicagoLandUse, POICategoryCounts, NeighbourhoodSummaryAvailable, NeighbourhoodSummaryMissing, NeighbourhoodSummaryResult |
| `src/lib/stkde/contracts.ts` | StkdeScoreVersion, StkdeComputeMode, StkdeDomain, StkdeRequest, StkdeHeatmapCell, StkdeHotspot, StkdeResponse, StkdeRequestValidationResult |
| `src/store/slice-domain/types.ts` | TimeSliceSource, TimeSlice, SliceCoreState, SliceSelectionState, CreationMode, GhostPosition, PreviewFeedback, SliceCreationState, TooltipPayload, DragPayload, SliceAdjustmentState, SliceDomainState, SliceDomainStateCreator |
| `src/store/useSuggestionStore.ts` (inline) | SuggestionType, SuggestionStatus, BoundaryMethod, SnapToUnit, GenerationPreset, TimeScaleData, IntervalBoundaryData, SuggestionContextMetadata, Suggestion, HistoryEntry |
| `src/store/useCoordinationStore.ts` (inline) | SelectionSource, WorkflowPhase, SyncStatusToken, PanelName, SyncStatus, PanelNoMatchState, ReconcileSelectionInput |
| `src/store/useAdaptiveStore.ts` (inline) | AdaptiveBinningMode (DUPLICATE) |

### Target Structure

```
src/types/
├── index.ts                    # Re-exports ALL public types
├── crime.ts                    # CrimeRecord (canonical), CrimeRecordInput, CrimeViewport
├── auto-proposal.ts            # AutoProposalSet, RankedAutoProposalSets, warp profiles
├── binning.ts                  # TimeBin, BinGroup, BinningState, BinningConfig, BinningResult
├── binning-rules.ts            # BinningStrategy, BinningConstraint, BinningRule, PRESET_RULES
├── queries.ts                  # QueryCrimesOptions, QueryFilters, DensityBin, GlobalAdaptiveMaps
├── data.ts                     # DataPoint, FilteredPoint
├── neighbourhood.ts           # GeoBounds, OSMPOIResult, ChicagoBusiness, ChicagoLandUse, POICategoryCounts
├── stkde.ts                    # StkdeRequest, StkdeHotspot, StkdeResponse, validateAndNormalizeStkdeRequest
├── slice-domain.ts             # TimeSlice, SliceCoreState, SliceCreationState, SliceDomainState
├── suggestion.ts               # Suggestion, SuggestionType, SuggestionStatus, GenerationPreset
├── coordination.ts            # SelectionSource, WorkflowPhase, SyncStatus, PanelName
└── adaptive.ts                 # AdaptiveBinningMode (deduplicated)
```

### Deduplication Required

1. **CrimeRecord** — remove duplicate in `src/lib/queries/types.ts`, use `src/types/crime.ts` only
2. **ColumnarData** — remove duplicate in `src/lib/data/types.ts`, use `src/types/index.ts` (or move to `src/types/data.ts`)
3. **AdaptiveBinningMode** — remove duplicate in `src/lib/queries/types.ts` and `src/store/useAdaptiveStore.ts`, use single `src/types/adaptive.ts`

### Type Migration Order

1. Create `src/types/index.ts` as the single re-export point
2. Deduplicate CrimeRecord, ColumnarData, AdaptiveBinningMode
3. Move `src/types/autoProposalSet.ts` → `src/types/auto-proposal.ts`
4. Move binning types from `src/lib/binning/types.ts` → `src/types/binning.ts`
5. Move binning rules from `src/lib/binning/rules.ts` → `src/types/binning-rules.ts`
6. Move query types from `src/lib/queries/types.ts` → `src/types/queries.ts`
7. Move data types from `src/lib/data/types.ts` → `src/types/data.ts`
8. Move neighbourhood types from `src/lib/neighbourhood/types.ts` → `src/types/neighbourhood.ts`
9. Move STKDE contracts from `src/lib/stkde/contracts.ts` → `src/types/stkde.ts`
10. Move slice-domain types from `src/store/slice-domain/types.ts` → `src/types/slice-domain.ts`
11. Extract inline types from `src/store/useSuggestionStore.ts` → `src/types/suggestion.ts`
12. Extract inline types from `src/store/useCoordinationStore.ts` → `src/types/coordination.ts`
13. Update all imports across codebase

### Duplicate Type Fixes

| Type | Keep | Remove |
|------|------|--------|
| CrimeRecord | `src/types/crime.ts` | `src/lib/queries/types.ts` |
| ColumnarData | `src/types/index.ts` | `src/lib/data/types.ts` |
| AdaptiveBinningMode | `src/types/adaptive.ts` | `src/lib/queries/types.ts`, `src/store/useAdaptiveStore.ts` |

---

---

## LOGIC EXTRACTION CANDIDATES

### High Priority

| Current Location | Logic | Target Location |
|-----------------|-------|-----------------|
| `DualTimeline.tsx` lines 551-601 | Tick calculation switch/case | `src/lib/time-domain.ts` |
| `DualTimeline.tsx` lines 602-630 | Date formatting by resolution | `src/lib/date-formatting.ts` |
| `DualTimeline.tsx` lines 684-790 | Slice geometry computation | `src/lib/slice-geometry.ts` |
| `DualTimeline.tsx` lines 322-346 | Point downsampling | `src/lib/downsample.ts` |
| `useSuggestionGenerator.ts` lines 146-160 | useDebounce hook | `src/hooks/useDebounce.ts` |
| `useSuggestionGenerator.ts` lines 162-184 | Bounds derivation | `src/lib/spatial/bounds.ts` |

### Medium Priority

| Current Location | Logic | Target Location |
|-----------------|-------|-----------------|
| `useSuggestionGenerator.ts` lines 102-114 | State machine | `src/lib/state-machine.ts` |
| `useDensityStripDerivation.ts` lines 7-55 | Density computation | `src/lib/binning/density.ts` |
| `demo-burst-generation.ts` lines 143-202 | Statistics (mean, stddev, burstiness) | `src/lib/stats.ts` |
| `components/timeline/lib/*` | Timeline-specific libs | `src/lib/*` |
| `useSliceStore.ts` lines 13-43 | Range normalization | `src/lib/range-normalization.ts` |

### Low Priority

| Current Location | Logic | Target Location |
|-----------------|-------|-----------------|
| `DashboardHeader.tsx` lines 27-32 | Badge styling | `src/lib/styling.ts` |
| `BurstList.tsx` lines 14-19 | Duration formatting | `src/lib/formatting.ts` |
| `usePointSelection.ts` lines 25-28 | Threshold calculation | `src/lib/time-domain.ts` |

---

## MISSING UTILITY FILES

| Missing Utility | Purpose | Locations Where Needed |
|-----------------|---------|------------------------|
| `src/lib/date-formatting.ts` | Date/time formatting by resolution | DualTimeline, tick-ux |
| `src/lib/stats.ts` | Mean, stddev, burstiness formulas | demo-burst-generation, burst-taxonomy |
| `src/lib/downsample.ts` | Point reduction/limiting | DualTimeline, useCrimeData |
| `src/lib/bounds.ts` | Geographic bounds calculation | useSuggestionGenerator, spatial diagnostics |
| `src/lib/formatting.ts` | Duration, interval formatting | BurstList, DualTimeline |
| `src/lib/math.ts` | Clamping, rounding helpers | Multiple files |
| `src/lib/state-machine.ts` | Auto-run lifecycle states | useSuggestionGenerator |

---

## REINVENTED HELPERS ACROSS FILES

| Pattern | Files Using It | Recommendation |
|---------|----------------|----------------|
| `Math.min(1, Math.max(0, value))` clamp 0-1 | Multiple | Extract `clamp01()` to `src/lib/math.ts` |
| `Math.round(value * 100) / 100` round 2 decimals | Multiple | Extract `round2()` to `src/lib/math.ts` |
| Epoch detection (`value > 1e11`) | Multiple | Already in `time-domain.ts`, use consistently |
| `formatInterval` (ms to human) | BurstList, demo-burst-generation | Consolidate into `src/lib/formatting.ts` |

---

## IMPORT TANGLES

| File | Import Count | Sources |
|------|-------------|---------|
| `src/components/timeline/DualTimeline.tsx` | 26 | 6 stores, 6 hooks, 5 lib utils, 4 component libs, 4 internal utils |
| `src/components/viz/CubeVisualization.tsx` | 18 | 7 stores, 5 viz components, 4 hooks, 2 lib |

---

## EFFECT SPAGHETTI

| File | Effect Count | Problem |
|------|-------------|---------|
| `DualTimeline.tsx` | 2 major effects | 8 and 7 dependencies respectively — impossible to reason about |
| `useAdaptiveStore.ts` | 1 (hidden) | Module-level onmessage callback calling set() — effectively a hidden effect |

---

## TOP 5 PRIORITY REFACTORS

### 1. `src/store/useSuggestionStore.ts` (768 lines)
**Why first:** Most severe SRP violation — 6 different concerns in one store, plus it accesses 3 other stores inside state updaters (anti-pattern).

**Extract into:**
- `src/store/useSuggestionStore.ts` — core suggestion CRUD
- `src/store/usePresetStore.ts` — preset management + persistence
- `src/store/useSuggestionHistoryStore.ts` — undo/redo with middleware
- `src/store/useSuggestionComparisonStore.ts` — comparison state
- `src/lib/suggestion/events.ts` — custom event dispatching as a service

### 2. `src/components/timeline/DualTimeline.tsx` (1322 lines)
**Why second:** Largest component with nearly identical twin `DemoDualTimeline.tsx`. Duplication suggests extraction opportunities.

**Extract into:**
- `src/hooks/useDualTimelineScales.ts` — scale transforms
- `src/lib/timeline/slice-geometry.ts` — slice geometry computation
- `src/lib/timeline/store-contract.ts` — applyRangeToStoresContract
- `src/lib/date-formatting.ts` — date formatting by resolution
- `TimelineOverview` and `TimelineDetail` sub-components

### 3. `src/hooks/useSuggestionGenerator.ts` (579 lines)
**Why third:** Hook doing too much — debouncing, metadata building, state machine, statistics, and generation.

**Extract into:**
- `src/hooks/useDebounce.ts` — move useDebounce
- `src/lib/context-diagnostics/formatters.ts` — buildSuggestionDiagnosticsMetadata
- `src/lib/state-machine.ts` — transitionAutoRunLifecycle
- `src/lib/spatial/bounds.ts` — deriveBoundsFromCrimes
- `useSuggestionLifecycle` and `useSuggestionGeneration` split

### 4. `src/lib/queries.ts` (530 lines)
**Why fourth:** Mixes query building with mock data generation and statistics utilities. Clean query separation is critical for offline-first architecture.

**Extract into:**
- `src/lib/mock/crime-generator.ts` — generateMockCrimeRecords
- `src/lib/math/utils.ts` — random/statistics utilities
- `src/lib/queries/builders.ts` — keep query builders
- `src/lib/queries/aggregations.ts` — (already exists, verify)

### 5. `src/components/dashboard-demo/DemoSlicePanel.tsx` (909 lines)
**Why fifth:** Large panel with multiple responsibilities enabling reusable slice editing components.

**Extract into:**
- `src/components/timeslicing/SliceEditor.tsx` — inline slice editing
- `src/components/timeslicing/DraftBinManager.tsx` — pending bin state
- `src/lib/slice/formatting.ts` — formatting utilities
- `WarpModeSelector` component — warp controls

---

## SUMMARY

| Category | Count | High Priority |
|----------|-------|---------------|
| God Files / Monoliths | 12 | 3 P0, 5 P1, 4 P2 |
| Convolution Issues | 8 | 2 P0, 3 P1, 3 P2 |
| Type/Interface Files | 12 | 5 tight, 7 loose |
| Type Duplications | 3 | 2 critical, 1 medium |
| Fat Interfaces | 3 | 2 need decomposition |
| Logic Extraction Candidates | 13 | 6 high, 5 medium, 2 low |
| Missing Utilities | 7 | All should be created |
| Import Tangles | 2 | DualTimeline, CubeVisualization |
| Effect Spaghetti | 2 | DualTimeline, useAdaptiveStore |

**Total refactor candidates: 50+ individual issues across all categories.**

---

## RECOMMENDED EXECUTION ORDER

1. **Consolidate all types into `src/types/`** — move all type definitions scattered across `src/lib/` and `src/store/` into `src/types/`, deduplicate `CrimeRecord`, `ColumnarData`, `AdaptiveBinningMode`, establish `src/types/index.ts` as single re-export point
2. **Create missing utilities** — date-formatting, stats, downsample, bounds, formatting, math, state-machine
3. **Extract logic from hooks** — useDebounce, bounds derivation, state machine
4. **Refactor P0 god stores** — useSuggestionStore
5. **Refactor P0 god components** — DualTimeline, DemoDualTimeline
6. **Refactor P1 files** — full-auto-orchestrator, binning/engine, queries
7. **Address P2 issues** — remaining files