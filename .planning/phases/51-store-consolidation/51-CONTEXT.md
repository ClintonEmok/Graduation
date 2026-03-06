# Phase 51 Context: Store Consolidation

## Goal

Consolidate slice-related stores and remove deprecated data store paths.

## Source

- `.planning/REFACTORING-PLAN.md` (Phase 4)

## Must Include

- Audit `src/store/` dependencies for tightly coupled groups.
- Consolidate slice stores into a coherent domain store.
- Remove `src/store/useDataStore.ts` after migration verification.
