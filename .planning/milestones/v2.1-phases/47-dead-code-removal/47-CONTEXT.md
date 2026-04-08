# Phase 47 Context: Dead Code Removal

## Goal

Remove obsolete code paths with no behavior changes.

## Source

- `.planning/REFACTORING-PLAN.md` (Phase 1)

## Must Include

- Remove `src/hooks/useSuggestionTrigger.ts`.
- Confirm no imports remain.
- Ensure build/tests pass after removal.
