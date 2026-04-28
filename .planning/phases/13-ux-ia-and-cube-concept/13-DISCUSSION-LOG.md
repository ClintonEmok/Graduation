# Phase 13: UX / IA Redesign + Cube Concept - Discussion Log

> Audit trail only. Decisions are captured in `13-CONTEXT.md`.

**Date:** 2026-04-23
**Phase:** 13-ux-ia-and-cube-concept
**Areas discussed:** Demo layout, Cube behavior, Workflow flow, View coupling

---

## Demo layout

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline-first | Make the temporal surface the main entry point. | ✓ |
| Map-first | Keep the map as the first thing users see. | |
| Cube-first | Lead with the cube. | |

**User's choice:** Timeline-first
**Notes:** Keep the shared viewport toggle, left workflow drawer, and fixed right rail.

---

## Cube behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Relational clusters | Show how bursts, slices, and hotspot groups relate. | ✓ |
| Density surface | Make the cube primarily show concentration. | |
| Compare mode | Make the cube mainly a comparison tool. | |

**User's choice:** Relational clusters
**Notes:** Hotspot clusters should be the focus, with linked highlights and hover-based explanations.

---

## Workflow flow

| Option | Description | Selected |
|--------|-------------|----------|
| Guided stepper | Visible progression with one current stage at a time. | ✓ |
| Question cards | Each stage as a card with prompt and summary. | |
| Checklist rail | Compact checklist that expands when needed. | |

**User's choice:** Guided stepper
**Notes:** Keep stages always visible, advance manually, and show a short recap at each step.

---

## View coupling

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline-led | Timeline drives the shared window. | ✓ |
| Shared peer state | Any view can change selection equally. | |
| Active-view led | Focused view becomes source of truth. | |

**User's choice:** Timeline-led
**Notes:** Update linked views live during drag, keep non-active views visible and highlighted, and use strong-but-quiet linkage.

---

## Data architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New files first | Build the redesign in parallel instead of rewriting core files in place. | ✓ |
| Canonical data layer | One shared dataset source of truth. | ✓ |
| Derived analysis layer | Precompute timeline/cube/slice summaries separately. | ✓ |
| View-model layer | Components consume UI-ready shapes only. | ✓ |
| UI layer | Components stay presentational and shell-focused. | ✓ |

**User's choice:** New files first
**Notes:** Keep old files as wrappers or compatibility layers until the new architecture proves parity.

---

## the agent's Discretion

- Exact transition styling.
- Exact copy tone inside the locked IA.

## Deferred Ideas

None.
