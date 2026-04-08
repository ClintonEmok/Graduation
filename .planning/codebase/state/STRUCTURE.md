# Store Directory Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
src/
├── store/                    # Main store directory
│   ├── ui.ts                 # Simple UI state
│   ├── useThemeStore.ts      # Theme preferences
│   ├── useLayoutStore.ts     # Panel layout
│   ├── useFilterStore.ts    # Crime data filters
│   ├── useCoordinationStore.ts  # Cross-panel sync
│   ├── useSliceDomainStore.ts    # Slice management (root)
│   ├── useSliceStore.ts      # Slice store (re-exports + helpers)
│   ├── useAdaptiveStore.ts  # Adaptive computation
│   ├── useTimelineDataStore.ts  # Timeline data
│   ├── useBinningStore.ts   # Binning strategy
│   ├── useTimeslicingModeStore.ts  # Generate workflow
│   ├── useStkdeStore.ts     # STKDE computation
│   ├── useClusterStore.ts  # Clustering
│   ├── useHeatmapStore.ts  # Heatmap
│   ├── useAggregationStore.ts  # Aggregations
│   ├── useTrajectoryStore.ts   # Trajectories
│   ├── useWarpSliceStore.ts    # Warp slices
│   ├── useStatsStore.ts    # Statistics
│   ├── useSuggestionStore.ts  # Suggestions
│   ├── useContextProfileStore.ts  # Context profiles
│   ├── useMapLayerStore.ts  # Map layers
│   ├── useFeatureFlagsStore.ts  # Feature flags
│   ├── useTimeStore.ts     # Time state
│   ├── useStudyStore.ts    # Study settings
│   ├── useSliceSelectionStore.ts  # Slice selection
│   ├── useSliceCreationStore.ts  # Slice creation
│   ├── useSliceAdjustmentStore.ts  # Slice adjustment
│   ├── useSliceDomainStore.ts     # Domain slices
│   │
│   ├── slice-domain/       # Slice store modules
│   │   ├── types.ts       # Type definitions
│   │   ├── selectors.ts   # Memoized selectors
│   │   ├── createSliceCoreSlice.ts    # Core slice logic
│   │   ├── createSliceSelectionSlice.ts  # Selection logic
│   │   ├── createSliceCreationSlice.ts   # Creation logic
│   │   └── createSliceAdjustmentSlice.ts # Adjustment logic
│   │
│   ├── *.test.ts          # Store unit tests (colocated)
│
└── lib/
    └── stores/
        └── viewportStore.ts  # Viewport store (separate location)
```

## Store Categories by Location

### Primary Store Location: `src/store/`

All main application stores are in `src/store/`, organized by domain:
- **Domain stores**: Filter, Slice, Binning, Timeline, Adaptive, STKDE
- **UI stores**: Layout, UI, Theme, FeatureFlags
- **Coordination**: Coordination store for cross-panel sync

### Secondary Store Location: `src/lib/stores/**

Utility stores that are more generic:
- `viewportStore.ts` - Timeline viewport (shared between pages)

## File Organization Patterns

### Single-File Stores
Simple stores in a single file:
- `useThemeStore.ts` - 20 lines
- `useUIStore.ts` - 25 lines
- `useClusterStore.ts` - 30 lines

### Multi-File Stores (Slices)
Complex stores split across multiple files:
- `useSliceDomainStore.ts` + `slice-domain/` directory
- Uses Zustand's slice pattern to combine multiple state creators

### Store + Helper Pattern
Store with additional logic in separate file:
- `useSliceDomainStore.ts` - Store definition
- `useSliceStore.ts` - React hooks + auto-creation logic

## Where to Add New Stores

### For New Domain State
1. Create `src/store/use[Domain]Store.ts`
2. Define interface with `State` suffix
3. Implement with `create<State>()`
4. Add tests: `src/store/use[Domain]Store.test.ts`

### For New UI State
1. Determine if persistence is needed
2. If yes, use `persist()` middleware with proper `name` and `partialize`
3. Keep in `src/store/`

### For Shared/Utility State
1. Consider if it belongs in `src/lib/stores/`
2. Example: `viewportStore.ts` - used across multiple pages

## Test File Location

Tests are **colocated** with stores:
```
src/store/useSliceStore.ts
src/store/useSliceStore.test.ts
```

This pattern:
- Keeps tests close to implementation
- Makes it easy to find corresponding tests
- Allows running tests with store file changes

## Special Patterns

### Re-export Store
```typescript
// useSliceStore.ts
export const useSliceStore = noNewRootGuard(useSliceDomainStore);
```
Wraps or re-exports another store with additional helpers.

### Type Exports
Stores export types for use elsewhere:
```typescript
export type { TimeSlice, SliceDomainState } from './slice-domain/types';
export { select, selectSlices, ... } from './slice-domain/selectors';
```

---

*Structure analysis: 2026-03-30*
