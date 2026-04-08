---
phase: 45-cube-constrained-warp-proposals
plan: 02
subsystem: ui
tags: [react, zustand, cube-sandbox, proposal-review, diagnostics-rail]

# Dependency graph
requires:
  - phase: 45-cube-constrained-warp-proposals
    provides: deterministic proposal engine and proposal state store from 45-01
provides:
  - Proposal generation and rationale inspection UI in the sandbox right rail
  - Proposal selection details linked to cube constraint labels and ids
  - Route-local cleanup behavior for proposal state on sandbox exit/reset
affects: [45-03, cube-sandbox-apply-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Rail-first proposal review UX with no modal dependency
    - Proposal controls wired to store actions from route-local composition
    - Reset orchestration clears proposal store alongside existing sandbox state

key-files:
  created:
    - src/app/cube-sandbox/components/WarpProposalPanel.tsx
  modified:
    - src/app/cube-sandbox/components/SandboxContextPanel.tsx
    - src/app/cube-sandbox/page.tsx
    - src/app/cube-sandbox/lib/resetSandboxState.ts
    - src/app/cube-sandbox/lib/resetSandboxState.test.ts

key-decisions:
  - "Keep proposal review in the existing diagnostics rail so users inspect rationale in the same context as constraints."
  - "Display proposal confidence as band plus numeric score with density/hotspot metrics visible in-card."
  - "Clear proposal state on hard reset and route unmount to prevent stale selections leaking across sandbox sessions."

patterns-established:
  - "Proposal Review Panel Pattern: generate, list, select, and inspect rationale in a compact scrollable rail section."
  - "Route Cleanup Pattern: clear route-local proposal store state in page unmount effect."

# Metrics
duration: 4m
completed: 2026-03-05
---

# Phase 45 Plan 02: Proposal Review Surface Summary

**Cube sandbox now exposes an always-on proposal review panel that generates ranked warp candidates, shows rationale metrics inline, and lets users inspect selected proposal-to-constraint linkage before apply.**

## Performance

- **Duration:** 4m
- **Started:** 2026-03-05T12:15:09Z
- **Completed:** 2026-03-05T12:18:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built `WarpProposalPanel` with generation controls, ranked proposal cards, confidence + metric display, and selected proposal details.
- Integrated proposal review into `SandboxContextPanel` while preserving existing spatial diagnostics and adding proposal count/selection cues.
- Wired route-local lifecycle cleanup in `/cube-sandbox` page so proposal state clears on route exit.
- Extended sandbox reset orchestrator + test coverage to clear proposal state during hard reset.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build proposal list and rationale inspector component** - `27846a0` (feat)
2. **Task 2: Integrate proposal panel into sandbox context rail** - `9cc4c43` (feat)

## Files Created/Modified
- `src/app/cube-sandbox/components/WarpProposalPanel.tsx` - Proposal generation, ranking list, rationale metrics, and selected proposal inspector.
- `src/app/cube-sandbox/components/SandboxContextPanel.tsx` - Context rail integration plus proposal count/selection diagnostics.
- `src/app/cube-sandbox/page.tsx` - Route-local proposal cleanup on unmount.
- `src/app/cube-sandbox/lib/resetSandboxState.ts` - Proposal store reset as part of hard reset orchestration.
- `src/app/cube-sandbox/lib/resetSandboxState.test.ts` - Regression assertion that proposal state clears on reset.

## Decisions Made
- Kept proposal review inline in the right rail to align with phase context and avoid modal-only inspection flows.
- Reused generated proposal metadata (`generatedAt`, source constraint ids) directly in UI to support traceable review context.
- Maintained compact card layout emphasizing plain-language rationale first, with metrics immediately below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleared stale proposal state during hard reset**
- **Found during:** Task 2 (Integrate proposal panel into sandbox context rail)
- **Issue:** `resetSandboxState` did not clear `useWarpProposalStore`, leaving stale proposals/selection after hard reset.
- **Fix:** Added proposal store `clear()` call in reset orchestrator and regression coverage in reset test.
- **Files modified:** `src/app/cube-sandbox/lib/resetSandboxState.ts`, `src/app/cube-sandbox/lib/resetSandboxState.test.ts`
- **Verification:** `npm run test -- src/app/cube-sandbox/lib/resetSandboxState.test.ts`
- **Committed in:** `9cc4c43` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was necessary to keep sandbox reset behavior consistent with proposal review workflow.

## Authentication Gates

None.

## Issues Encountered

- Local `npm run dev` startup in this workspace failed due existing `.next/dev/lock` from another running Next.js instance; verification continued via lint/tests and live HTTP check against active local server.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Proposal review UI is ready for proposal apply/undo and adaptive state wiring in 45-03.
- No blockers identified for implementing CWARP-03 behavior.

---
*Phase: 45-cube-constrained-warp-proposals*
*Completed: 2026-03-05*
