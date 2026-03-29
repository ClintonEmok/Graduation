# Phase 66 Sign-off Protocol

## Scope

This protocol governs final sign-off for Phase 66 (`full-integration-testing`) in the unified `dashboard-v2` workflow.

## Blocker Journeys

1. **Generate → Review → Apply baseline journey**
   - Start from fresh dashboard-v2 session.
   - Configure generation inputs (crime type / neighbourhood / time window / granularity).
   - Generate bins and verify draft bins appear in review state.
   - Apply bins and verify applied slices become active workflow truth.

2. **Refine-after-apply journey**
   - With applied generated slices active, perform manual refinement actions.
   - Verify timeline/map/cube remain synchronized and no irreversible desync occurs.

3. **STKDE hotspot investigate journey**
   - Run STKDE from dashboard panel.
   - Select hotspot and verify committed temporal/spatial focus propagates.
   - Verify mismatch semantics remain explicit when hotspot time does not overlap applied slices.

4. **Empty / low-confidence / error-state journey**
   - Trigger no-data or narrow-range generation path.
   - Trigger low-confidence or warning path where available.
   - Trigger error path and verify user-facing guidance is understandable.

## Requirement Mapping

| Journey | FLOW-01 | FLOW-02 | FLOW-03 | FLOW-04 | FLOW-05 | FLOW-06 |
|--------|---------|---------|---------|---------|---------|---------|
| Generate → Review → Apply baseline | ✅ | ✅ | ✅ | ⚪ | ✅ | ✅ |
| Refine-after-apply | ⚪ | ✅ | ✅ | ⚪ | ✅ | ✅ |
| STKDE hotspot investigate | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ |
| Empty / low-confidence / error-state | ⚪ | ⚪ | ✅ | ⚪ | ✅ | ✅ |

## Two-Consecutive-Clean-Runs Rule

Sign-off requires **two consecutive clean runs** of every blocker journey above.

- A run is clean only when all journey checks pass and no critical confusion is observed for first-time analyst flow.
- Any failed blocker journey resets that journey’s consecutive counter.

## Blocking Policy

If any blocker journey fails in either required run, **sign-off is blocked**.

- Sign-off remains blocked until the failing journey passes twice consecutively.
- Record the failure and remediation notes in the evidence log before reattempting.

## Execution Instructions

1. Run `pnpm dev`.
2. Open `/dashboard-v2`.
3. Execute all four blocker journeys in sequence (Run A).
4. Repeat all four journeys in sequence immediately again (Run B).
5. Record each journey outcome in the evidence log.
6. Declare final status: `Approved` only if all Run A + Run B entries pass.

## Evidence Log

| run_id | journey | result | notes | evidence_ref | operator |
|--------|---------|--------|-------|--------------|----------|
| A-1 | Generate → Review → Apply baseline | pending |  |  |  |
| A-2 | Refine-after-apply | pending |  |  |  |
| A-3 | STKDE hotspot investigate | pending |  |  |  |
| A-4 | Empty / low-confidence / error-state | pending |  |  |  |
| B-1 | Generate → Review → Apply baseline | pending |  |  |  |
| B-2 | Refine-after-apply | pending |  |  |  |
| B-3 | STKDE hotspot investigate | pending |  |  |  |
| B-4 | Empty / low-confidence / error-state | pending |  |  |  |

## Final Sign-off Status

- **Status:** Pending
- **Decision rule:** Approved only after two clean runs for every blocker journey; otherwise sign-off remains blocked.
