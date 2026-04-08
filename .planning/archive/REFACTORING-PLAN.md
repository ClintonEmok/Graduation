# Refactoring Plan: Codebase Decomposition

**Created:** 2026-03-06

This plan outlines how to break down the largest, most problematic files in the codebase.

---

## Phase 0: Guardrails and Baselines (High Priority)

Goal: lock down behavior before structural changes so regressions are caught early.

### 0.1 Capture baseline metrics
- Record baseline file sizes and hot-path timings for timeline interactions.
- Track current behavior for buffering and coordinate scales.

### 0.2 Add regression coverage for known fragile paths
- Add contract tests for `useCrimeData` <-> `/api/crimes/range` buffering semantics.
- Add API contract tests to verify coordinate scale parity across range/stream endpoints.
- Add timeline interaction tests for brush/zoom sync and point selection.

### 0.3 Add rollout safety checks
- Add a small refactor checklist to each PR template: behavior unchanged, tests added, logs removed.
- Ensure each phase ships behind passing tests before moving to next phase.

---

## Phase 1: Remove Dead Code (Low Risk)

### 1.1 Remove `useSuggestionTrigger.ts`
- **File:** `src/hooks/useSuggestionTrigger.ts`
- **Action:** Delete - legacy mock hook replaced by `useSuggestionGenerator.ts`
- **Verification:** Search for imports, should return 0 results

---

## Phase 2: Extract DualTimeline.tsx (High Impact)

**Current:** 1,465 lines - holds rendering + interaction + store sync + data selection

### 2.1 Create hooks directory structure
```
src/components/timeline/
├── hooks/
│   ├── useScaleTransforms.ts
│   ├── useBrushZoomSync.ts
│   ├── usePointSelection.ts
│   └── useDensityStripDerivation.ts
```

### 2.2 Extract `useScaleTransforms.ts`
- Move scale calculation logic (domain/range transforms, adaptive inversion)
- Input: raw domain, output: transformed scales
- Pure functions, easily testable

### 2.3 Extract `useBrushZoomSync.ts`
- Move brush/zoom synchronization logic
- Handle bi-directional sync between timeline and visualization
- Input: brush state, output: synchronized view bounds

### 2.4 Extract `usePointSelection.ts`
- Move point selection, hovering, clicking logic
- Input: data points, output: selected/hovered point state

### 2.5 Extract `useDensityStripDerivation.ts`
- Move density strip calculation (histogram binning, aggregation)
- Input: raw data, output: density bins for rendering

### 2.6 Simplify DualTimeline.tsx
- Import and compose the new hooks
- Component becomes orchestrator, not implementation
- Target: ~300 lines

---

## Phase 3: Decompose lib/queries.ts (Medium Impact)

**Current:** 689 lines - SQL string building mixed with logic

### 3.1 Create queries subdirectory
```
src/lib/queries/
├── index.ts          # Re-exports
├── filters.ts        # WHERE clause builders
├── aggregations.ts   # Aggregation queries
├── sanitization.ts   # Input escaping/validation
└── builders.ts       # Parameterized query builders
```

### 3.2 Extract filter builders
- Move all `buildXxxFilter()` functions
- Convert string interpolation to parameterized queries

### 3.3 Extract aggregations
- Move count/sum/groupby queries
- Separate into well-named functions

### 3.4 Add sanitization layer
- Centralize input validation
- Replace direct interpolation with parameterized queries

---

## Phase 4: Consolidate Stores (Medium Impact)

**Current:** 20+ stores in `src/store/`

### 4.1 Audit store dependencies
- Map which stores import which
- Identify tightly-coupled groups

### 4.2 Consolidate slice-related stores
Candidates for merge:
- `useSliceStore.ts`
- `useSliceSelectionStore.ts`
- `useSliceCreationStore.ts`
- `useSliceAdjustmentStore.ts`

→ Merge into: `useSliceDomainStore.ts`

### 4.3 Remove deprecated useDataStore
- Verify all consumers migrated to React Query + useAdaptiveStore
- Delete `src/store/useDataStore.ts`

---

## Phase 5: Clean Up API Layer (Low Risk)

### 5.1 Create coordinate normalization adapter
- **File:** `src/lib/coordinate-normalization.ts`
- Single function to handle x/z scale differences between APIs
- All consumers use adapter, not direct API responses

### 5.2 Fix double-buffering bug
- Choose one authoritative buffer layer (hook OR API, not both)
- Set `bufferDays: 0` in hook, let API handle it

---

## Verification Checklist

- [ ] Phase 0: Baselines captured and regression tests added for buffering/coordinates/timeline interactions
- [ ] Phase 1: `useSuggestionTrigger.ts` removed, no import errors
- [ ] Phase 2: DualTimeline < 400 lines, all hooks have tests
- [ ] Phase 3: queries.ts < 200 lines, all queries parameterized
- [ ] Phase 4: Stores consolidated, no duplicate state
- [ ] Phase 5: Coordinate normalization adapter in use

---

## Order of Execution

1. **Phase 0** - Add guardrails and baselines first (safe refactor foundation)
2. **Phase 1** - Remove dead code first (instant improvement)
3. **Phase 5** - Quick wins (coordinate adapter, double-buffer fix)
4. **Phase 2** - Highest impact refactor (DualTimeline)
5. **Phase 3** - Decompose query layer with tests in place
6. **Phase 4** - Consolidate stores after dependency mapping
