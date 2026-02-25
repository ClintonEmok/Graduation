# Phase 35: Semi-Automated Timeslicing - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

System generates warp profile and interval boundary suggestions for user confirmation. User can accept, modify, or reject suggestions. This is a workflow phase — the actual suggestion algorithms are in later phases (36-37). This phase establishes the trigger mechanism, review UI, and accept/modify/reject flow.

**Location:** `/timeline-test` route (existing experimental timeline harness)

</domain>

<decisions>
## Implementation Decisions

### Review UI
- Side panel with list of suggestions and detail controls
- NOT inline on timeline (side panel keeps timeline clean)
- NOT modal dialog (allows comparison while reviewing)

### Confidence Display
- Numerical percentage shown next to each suggestion
- Example: "87% confidence"
- NOT color coding or verbal labels — percentage is precise and actionable

### Location
- New dedicated route (separate from /timeline-test)
- All semi-automated timeslicing UI on its own route

### Claude's Discretion
- Suggestion trigger mechanism — automatic, manual button, or on-demand
- Modification flow — direct manipulation, parameter adjustment, or reject-and-recreate

</decisions>

<specifics>
## Specific Ideas

- Separate new route (not /timeline-test) for semi-automated timeslicing

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-semi-automated-timeslicing-workflows*
*Context gathered: 2026-02-25*
