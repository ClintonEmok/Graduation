# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.1 — Workflow Finalization

**Shipped:** 2026-05-26
**Phases:** 4 | **Plans:** 5

### What Was Built
- Detect-first workflow rail with scan/generate actions and prerequisite guidance
- Slices as the review/apply surface with pending-first ordering
- Inspect with immediate active-slice context, focus-on-entry, and inline comparison controls (Add to compare, Set left/right, Swap, Clear, pairwise metric cards)
- Cross-view synchronization: bridge effect for timeline sync, immediate index on apply, map filtering by slice, 3D refetch guard
- STKDE eager init on page load (no Configure tab required)
- Presentation cleanup: removed academic jargon, confusing copy, simplified labels
- Coordination audit fixes: shell generate respects user granularity, detect panel routes to Slices after generation

### What Worked
- **Targeted gap analysis first**: Researching coordination gaps before planning Phase 74 produced precise fixes — 8 gaps identified, 4 closed directly, no scope creep
- **Minimal-change approach**: The bridge effect in DemoInspectPanel (6 lines) fixed the timeline sync issue that had been latent since v3.0
- **Plan-then-build discipline**: Even for small phases, having a written plan prevented accidental scope expansion
- **Isolated test suite**: The shell test (`page.shell.test.tsx`) caught label regressions during Phase 75 text changes

### What Was Inefficient
- **Summary files without YAML frontmatter**: Phases 74 and 75 summaries lacked structured frontmatter, causing gaps in the milestone audit's 3-source cross-reference. Would have been caught if the template was followed strictly.
- **Artifact location inconsistency**: Phase 74 and 75 artifacts placed at `.planning/` root instead of `.planning/phases/` directories, breaking the gsd-tools roadmap analyzer's ability to detect them.
- **VERIFICATION.md wasn't created during execute-phase**: Integration was verified manually but the formal verification artifact was only created during the milestone audit, adding extra work.

### Patterns Established
- **Bridge pattern** for cross-store synchronization: a single effect in the consuming component that propagates coordination store values to the domain store
- **Workflow handoff**: generation routes to Slices, apply routes to Inspect — each step lands in the correct next surface
- **STKDE trigger pattern**: small component in parent shell that fires the computation hook eagerly, keeping it separate from any tab-mounted panel

### Key Lessons
1. Always create VERIFICATION.md during execute-phase — not during the audit. Saves re-verification work.
2. Follow the YAML frontmatter convention for SUMMARY.md files — the 3-source cross-reference depends on `requirements-completed` fields.
3. Phase directories under `.planning/phases/` are the canonical location — root-level planning files bypass tooling detection.
4. The bridge pattern (effect in consumer → set on foreign store) is lightweight and avoids middleware complexity. Don't over-engineer coordination.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v3.0 | 6 | Pipeline pattern (research → plan → execute-phase) established |
| v3.1 | 4 | Audit-milestone workflow caught missing VERIFICATION artifacts |

### Top Lessons (Verified Across Milestones)

1. Research before planning — gap analysis in Phase 74 produced precise, bounded tasks
2. Write VERIFICATION.md during execute-phase, not retroactively during audit
