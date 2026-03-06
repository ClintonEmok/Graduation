# Phase 48 Context: API Layer Stabilization

## Goal

Stabilize coordinate and buffering semantics before deeper decomposition.

## Source

- `.planning/REFACTORING-PLAN.md` (Phase 5)

## Must Include

- Create `src/lib/coordinate-normalization.ts` adapter.
- Remove double-buffering ownership drift (single source of truth).
- Keep endpoint behavior consistent with existing consumers.
