# Phase 66: Full Workflow Hardening and Validation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 66 validates and hardens the existing unified `dashboard-v2` workflow so it is stable and evaluation-ready.

This phase is a **lightweight gate phase**: prioritize workflow confidence, sign-off quality, and deterministic validation over major net-new capability work.

</domain>

<decisions>
## Implementation Decisions

### Phase Shape and Scope
- **D-01:** Phase 66 should be a **lightweight gate only**, not a heavy rework phase.
- **D-02:** Primary objective is to certify current v3.0 workflow quality in `dashboard-v2`, with only targeted fixes needed to pass blockers.

### Sign-off Priority and Quality Bar
- **D-03:** Sign-off must focus on blocker journeys, with emphasis on first-time analyst clarity.
- **D-04:** Blocker journeys require **2 consecutive clean runs** to pass sign-off.
- **D-05:** If any blocker journey fails near phase end, **sign-off is blocked** until it passes.

### Carried-forward Workflow Contracts (not reopened)
- **D-06:** Keep unified workflow shape: `generate -> review -> apply -> refine` in `dashboard-v2`.
- **D-07:** Keep synchronization authority contract from Phase 64 (`last interaction wins` with explicit no-match handling).
- **D-08:** Keep Phase 65 STKDE contract (manual run, stale signaling, explainable overlay semantics).

### the agent's Discretion
- Exact composition of blocker-journey suite (as long as it covers FLOW-01..FLOW-06).
- Exact test harness structure and naming.
- Exact evidence artifact formatting (screens/log snippets/table formatting) while preserving required sign-off clarity.

</decisions>

<specifics>
## Specific Ideas

- User concern: “does this phase still make sense to have” was resolved by reframing Phase 66 as a lightweight quality gate instead of a heavy build phase.
- User preference for this phase is confidence and clarity over additional complexity.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Requirement Contracts
- `.planning/PROJECT.md` - v3.0 unified-route objective and workflow non-negotiables.
- `.planning/ROADMAP.md` - Phase 66 scope, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` - `FLOW-01` through `FLOW-06` acceptance requirements.

### Current Phase Artifacts
- `.planning/phases/66-full-integration-testing/66-01-PLAN.md` - current plan scaffold to be refined for gate-first execution.
- `.planning/phases/66-full-integration-testing/66-QA-CHECKLIST-timeslicing-binning-quality.md` - detailed AC/TC matrix for binning quality and workflow reliability.

### Prior Phase Decisions to Carry Forward
- `.planning/phases/62-user-driven-timeslicing-manual-mode/62-CONTEXT.md` - generate/review/apply default contract.
- `.planning/phases/63-map-visualization/63-CONTEXT.md` - unified `dashboard-v2` route direction.
- `.planning/phases/64-dashboard-redesign/64-CONTEXT.md` - synchronization precedence and reconciliation behavior.
- `.planning/phases/65-stkde-integration/65-CONTEXT.md` - STKDE behavior and explainability contracts.

### Data Quality and Future-adjacent References
- `.planning/seeds/SEED-001-full-range-generation-data-pipeline.md` - full-range generation seed (future phase input, informs provenance checks).
- `.planning/seeds/SEED-002-bin-cap-skew-mitigation.md` - skew/cap mitigation seed (future phase input, informs quality diagnostics).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/dashboard-v2/page.tsx` - current unified workflow composition and sync status surface.
- `src/app/timeslicing/page.tsx` - generation/review behavior and provenance logging hooks used for QA verification.
- `src/store/useCoordinationStore.ts` + `src/store/useCoordinationStore.test.ts` - synchronization contract and deterministic invariants.
- `src/app/dashboard-v2/page.stkde.test.ts`, `src/app/dashboard-v2/hooks/useDashboardStkde.test.ts`, `src/store/useStkdeStore.test.ts` - existing STKDE and dashboard runtime coverage to extend.

### Established Patterns
- Workflow state is explicit (`generate`, `review`, `applied`, `refine`) and user-visible.
- Selector stability follows Zustand v5 guidance (`useShallow` for derived array/object selectors).
- Cross-view sync and no-match behavior rely on coordination-store policy, not ad-hoc component logic.

### Integration Points
- Gate-phase checks should validate transitions across `timeslicing` generation and `dashboard-v2` applied/refine/analyze flows.
- Evidence collection should link UI behavior to existing meta/provenance values already available from `useCrimeData` and generation metadata.
- Phase 66 should expand targeted integration tests and scenario-based QA rather than introducing route-level restructuring.

</code_context>

<deferred>
## Deferred Ideas

- Full-range generation pipeline expansion remains a separate future phase (seeded in `SEED-001`).
- Adaptive cap/skew algorithm redesign remains a separate future phase (seeded in `SEED-002`).

</deferred>

---

*Phase: 66-full-integration-testing*
*Context gathered: 2026-03-30*
