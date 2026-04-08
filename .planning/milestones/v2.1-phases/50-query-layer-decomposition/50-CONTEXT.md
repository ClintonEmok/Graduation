# Phase 50 Context: Query Layer Decomposition

## Goal

Modularize query construction and improve SQL safety.

## Source

- `.planning/REFACTORING-PLAN.md` (Phase 3)

## Must Include

- Split `src/lib/queries.ts` into `src/lib/queries/` modules.
- Separate filters, aggregations, sanitization, and builders.
- Prefer parameterized queries over string interpolation.
