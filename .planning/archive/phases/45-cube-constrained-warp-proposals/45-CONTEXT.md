# Phase 45: Cube-Constrained Warp Proposals - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a complete cube-constrained warp proposal loop in the sandbox: generate proposals from enabled spatial constraints, inspect rationale indicators, and apply one proposal to immediately update adaptive cube mapping. For this phase, proposal language and selection workflows must align with Chicago crime data geography rather than raw coordinate-first UX.

</domain>

<decisions>
## Implementation Decisions

### Proposal generation
- Generate proposals only from enabled cube spatial constraints.
- Proposal ranking must be deterministic for identical input state.
- Include rationale indicators in each proposal (density concentration and hotspot coverage minimum).

### Chicago geographic language
- Use a mixed Chicago geography model with one primary unit and optional secondary context.
- Proposal labels should default to region name plus code (example: `Englewood (CA 68)`).
- If a proposal spans multiple regions, show exact percentage breakdown across matched regions.
- If mapping is unknown, show city quadrant plus unknown tag (not raw coordinate labels by default).

### Proposal rationale wording
- Present rationale as plain-language sentence first, then metrics.
- Always include density and hotspot coverage metrics.
- Confidence display uses band plus numeric value (example: `High (82)`).
- No explicit baseline comparison is required in default proposal card content.

### Constraint input model
- Default creation starts from named Chicago regions, with templates available at start.
- Secondary input for this phase is search-and-select region.
- Multi-select should auto-create separate constraints rather than merging.
- Spatial extent units should support miles and kilometers with user-toggleable display.

### Proposal review and apply UX
- Keep proposal controls in the existing right-side sandbox context rail.
- Show rationale details inline without modal-only flows.
- Before apply, default view is minimal summary with expandable details.
- Apply flow is preview plus apply plus undo.
- Low-confidence proposals are still visible and can be applied normally.
- After apply, immediate feedback must show region/time impact plus expected-effect sentence.

### Apply behavior
- Applying a proposal updates adaptive state immediately in-session.
- Mark proposal source as proposal-driven for traceability in diagnostics.
- No persistence beyond session is required in this phase.

### Claude's Discretion
- Exact scoring formula and normalization details.
- Final proposal card visual layout and typography details.
- Whether apply action also updates warp slices in this phase or only adaptive runtime state.
- Choice of primary/secondary Chicago geographic unit pairing for first release defaults.

</decisions>

<specifics>
## Specific Ideas

- Prioritize understandable Chicago-region language over coordinate-centric labels.
- Keep raw coordinate details available only as secondary/advanced context if needed.

</specifics>

<deferred>
## Deferred Ideas

- Multi-strategy algorithm switcher (density-only vs event-driven vs hybrid).
- Cross-session proposal history and replay.
- Consumer-distilled simplified mode can follow after expert-aligned phase outcomes are validated.

</deferred>

---

*Phase: 45-cube-constrained-warp-proposals*
*Context gathered: 2026-03-05*
