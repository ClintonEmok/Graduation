# State Management Concerns

**Analysis Date:** 2026-03-30

## State Synchronization Issues

### Cross-Store Coordination

**Issue:** Selection state is spread across multiple stores without clear ownership
- `useCoordinationStore` tracks `selectedIndex`, `selectedSource`
- `useSliceDomainStore` tracks `activeSliceId`, selection state
- `useBinningStore` tracks `selectedBinId`

**Risk:** Inconsistent selection between components
- Components may read from different stores
- No single source of truth for "current selection"

**Recommendation:** Consolidate selection state or establish clear ownership:
- Either `useCoordinationStore` is the source for all selection
- Or each domain store owns its own selection with sync events

### Sync Status Complexity

**Issue:** `useCoordinationStore` has complex `syncStatus` tracking:
- `status: 'syncing' | 'synchronized' | 'partial'`
- `panelNoMatch` tracking per-panel state
- `reconcileSelection` logic with conditional updates

**Risk:** Hard to debug when sync breaks
- Multiple state fields need to stay in sync
- Edge cases in reconciliation logic

**Recommendation:** Add logging/monitoring for sync transitions

## Persistence Concerns

### Merge Function Safety

**Issue:** Custom merge functions in persist middleware may lose data
- `useLayoutStore` uses custom merge:
  ```typescript
  merge: (persistedState, currentState) => {
    return {
      ...currentState,
      ...typedPersisted,
      panels: { ...currentState.panels, ...(typedPersisted?.panels ?? {}) },
    };
  }
  ```
- If schema changes, old persisted data may not merge correctly

**Risk:** Users lose panel visibility settings after updates
- Schema versioning not implemented

**Recommendation:** Add schema versioning to persistence:
```typescript
const PERSIST_VERSION = 3;
merge: (persisted, current) => {
  const typed = persisted as PersistedState & { version?: number };
  if (typed.version !== PERSIST_VERSION) {
    // Migration logic
  }
}
```

### Storage Limits

**Issue:** Large slice arrays persist to localStorage
- `useSliceDomainStore` persists all slices
- No limit on slice count
- localStorage has ~5MB limit

**Risk:** Storage quota exceeded for users with many slices
- `partialize` only stores `slices`, not other state

**Recommendation:** Add slice count limits or pagination

## Performance Concerns

### Selector Granularity

**Issue:** Some components subscribe to entire state slices
- Found 886 matches for `useStore` patterns
- Not all use fine-grained selectors

**Risk:** Unnecessary re-renders when unrelated state changes

**Recommendation:** 
- Audit high-frequency components
- Ensure they use specific selectors
- Consider using `useShallow` for object subscriptions

### Large State Objects

**Issue:** Some stores hold large data:
- `useTimeslicingModeStore.pendingGeneratedBins` - array of TimeBin objects
- `useBinningStore.bins` - potentially large array
- `useStkdeStore.response` - heatmap data

**Risk:** 
- Serialization/deserialization on persist/unpersist
- Memory pressure in long sessions

**Recommendation:** Consider lazy-loading large data or excluding from persistence

## Architectural Concerns

### Store Dependencies

**Issue:** Store actions read from other stores via `getState()`
```typescript
// useSliceDomainStore.ts
const { mapDomain } = useAdaptiveStore.getState();
```

**Risk:** 
- Hard to test in isolation
- Implicit coupling between stores
- Race conditions if store order changes

**Recommendation:** 
- Pass dependencies as parameters where possible
- Use dependency injection for testing
- Document cross-store dependencies

### Missing Store Reset

**Issue:** No unified way to reset stores to defaults
- Each store has different reset patterns
- Some have `reset()`, others don't

**Risk:** State pollution between tests or sessions

**Recommendation:** Standardize reset pattern:
```typescript
reset: () => set(initialState);
```

### Type Safety Gaps

**Issue:** Some `any` types in store code
- Worker message handling in `useAdaptiveStore`
- Dynamic data from external sources

**Risk:** Runtime errors from type mismatches

## Testing Gaps

### Store Isolation

**Issue:** Tests may fail due to cross-store dependencies
```typescript
// Tests need to reset multiple stores
beforeEach(() => {
  useSliceStore.getState().clearSlices();
  useTimeslicingModeStore.setState({...});
});
```

**Risk:** Tests are brittle
- Order of resets matters
- New stores may break existing tests

### Async State Testing

**Issue:** Async operations in stores (computeBins, etc.) use setTimeout
```typescript
setTimeout(() => {
  const result = generateBins(data, config);
  set({ bins: result.bins, ... });
}, 0);
```

**Risk:** Race conditions in tests
- Timing-dependent assertions may flake

**Recommendation:** Use fake timers or test at correct abstraction level

---

*Concerns audit: 2026-03-30*
