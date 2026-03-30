# Phase 71: Dashboard-v2 Flow Consolidation - Context

**Gathered:** 2026-03-30
**Status:** Stub ready for planning

## Phase Boundary

Consolidate all core investigation tasks into one coherent `dashboard-v2` page with explicit user flows and scenario-driven interaction design.

## Key Principle

**Less is more.**

- One primary workflow: `generate -> review -> apply -> refine -> analyze`.
- No duplicate controls across panels.
- Progressive disclosure for advanced options.
- Each visible control must map to at least one user scenario.

## Dashboard-v2 Design Scope (What it should contain)

- Workflow rail/header with one primary call-to-action per step.
- Slice generation panel (intent inputs + provenance).
- Draft review panel (burst labels, cap warnings, edit tools).
- Synchronized analysis canvas (timeline + map + cube).
- STKDE panel integrated as contextual analysis, not a separate route.
- Scenario bookmarks/presets for recurring conceptual tasks.

## Core User Scenario Types

- Investigate prolonged burst windows.
- Compare isolated spikes vs valleys.
- Refine generated slices for narrative clarity.
- Validate hypotheses across filters/time windows.
- Reproduce saved analysis for presentation or reporting.

## Canonical References

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `src/app/dashboard-v2/page.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/binning/BinningControls.tsx`
- `src/components/timeline/DualTimeline.tsx`

---

*Phase: 71-dashboard-v2-flow-consolidation*
*Context gathered: 2026-03-30*
