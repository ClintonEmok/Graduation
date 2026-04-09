# Phase 66: Full Workflow Hardening and Validation - Research

**Phase:** 66
**Created:** 2026-03-30
**Status:** Research Complete

---

## Research Objective

Answer: "What do I need to know to PLAN this phase well?"

---

## 1. What This Phase Delivers

Phase 66 is a **quality gate** for the already-built unified workflow (`generate -> review -> apply -> refine -> investigate`) in `dashboard-v2`.

The phase should optimize for:
- deterministic blocker-journey verification,
- targeted hardening fixes only when tests/journeys fail,
- explicit sign-off evidence (including two consecutive clean runs).

It should avoid large capability expansion or route restructuring.

---

## 2. Existing Infrastructure We Should Reuse

### Unified workflow + synchronization backbone (Phases 62-64)
- `src/app/dashboard-v2/page.tsx` already drives workflow phase transitions and cross-panel sync signaling.
- `src/store/useCoordinationStore.ts` + `src/store/useCoordinationStore.test.ts` already enforce workflow-phase contracts and no-match reconciliation semantics.

### STKDE integration already in-route (Phase 65)
- `src/components/stkde/DashboardStkdePanel.tsx` and dashboard STKDE wiring tests exist.
- `src/store/useStkdeStore.ts` + tests already encode manual-run, stale-state, and provenance behavior.

### Existing QA anchors in this phase
- `.planning/phases/66-full-integration-testing/66-QA-CHECKLIST-timeslicing-binning-quality.md` already contains acceptance criteria + matrix for generation quality and edge-state behavior.

### Practical implication
Phase 66 planning should center on **test/evidence hardening** and **small blocker fixes** in existing files instead of introducing new architectural surfaces.

---

## 3. Locked Decisions from Context

From `66-CONTEXT.md`:
- Phase is lightweight gate only (not heavy hardening).
- Sign-off is blocker-journey-first and first-time-analyst oriented.
- Pass bar is **2 consecutive clean runs** for blocker journeys.
- Sign-off is blocked on any blocker journey failure.
- Core contracts from prior phases are carried forward, not reopened.

Planning consequence: each plan must map cleanly to FLOW-01..FLOW-06 and produce objective verification outputs.

---

## 4. Risks and Mitigations

1. **Risk: superficial verification (green tests but unclear user journey).**
   - Mitigation: include explicit blocker journey script + human verification checkpoint for first-time analyst clarity.

2. **Risk: FLOW requirements drift from plan coverage.**
   - Mitigation: make `requirements_addressed` explicit per plan and keep a sign-off artifact that references FLOW-01..FLOW-06 one by one.

3. **Risk: regressions hidden by broad suite noise.**
   - Mitigation: define targeted fast commands for dashboard-v2/timeslicing integration checks, then run full suite per wave.

4. **Risk: this phase accidentally becomes feature work.**
   - Mitigation: constrain scope to test additions, blocker fixes, and evidence artifacts only.

---

## 5. Recommended Plan Structure

### Plan 66-01 (Wave 1): Automated blocker-journey hardening
- Add/extend targeted integration tests for FLOW-01/FLOW-02/FLOW-03/FLOW-05 paths.
- Implement minimal code fixes only where tests expose blockers.
- Keep changes inside existing dashboard-v2/timeslicing/store contracts.

### Plan 66-02 (Wave 2): Sign-off evidence + performance/readiness gate
- Produce explicit gate checklist/runbook tied to FLOW-01..FLOW-06.
- Execute deterministic command-based checks for performance baselines and stability.
- Run two consecutive blocker journeys with human verification and block sign-off on failure.

---

## Validation Architecture

Phase 66 should validate continuously with low-latency checks first, then wider confirmation:

1. **Fast targeted integration loop (per task):**
   - `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts src/store/useCoordinationStore.test.ts src/store/useStkdeStore.test.ts --run`

2. **Timeslicing + workflow QA loop (per plan):**
   - `pnpm vitest src/app/timeslicing/page.timeline-qa.test.ts src/app/timeslicing/page.binning-mode.test.ts --run`

3. **Global safety loop (per wave / before verify-work):**
   - `pnpm -s tsc --noEmit`
   - `pnpm vitest --run`

4. **Interactive readiness checks (manual):**
   - Run blocker journeys in `dashboard-v2` twice consecutively.
   - Confirm first-time analyst clarity for empty/low-confidence/error states.

---

*Research completed: 2026-03-30*
