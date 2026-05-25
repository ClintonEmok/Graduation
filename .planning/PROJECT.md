# Adaptive Space-Time Cube Prototype

## What This Is

This is a Next.js prototype for bursty spatiotemporal crime analysis. It combines a 2D map, a 3D Space-Time Cube, and a staged workflow where users Detect bursts, review/apply slices in Slices, and Inspect them with immediate context and comparison controls — with the map, cube, and timeline staying synchronized around the active slice.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized exploration tool.

## Current Status

**v3.1 Workflow Finalization** is complete. The `dashboard-demo` route now reads as one obvious workflow: Detect scans and generates, Slices owns review and apply, Inspect provides immediate active-slice context with inline comparison, and all views stay synchronized.

## Requirements

### Validated

- ✓ **FLOW-07** — Detect is the obvious entry point for burst scanning and slice generation — v3.1
- ✓ **FLOW-08** — Slices is the obvious review/apply surface for pending and manual slices — v3.1
- ✓ **FLOW-09** — Inspect shows active slice state and comparison controls immediately — v3.1
- ✓ **FLOW-10** — Map, cube, and timeline stay synchronized with the active slice while chrome stays minimal — v3.1
- ✓ v3.0 Burstiness-Driven Adaptive Slicing — completed and validated
- ✓ All prior milestones through MVP Finale — completed and validated

### Active

None — all current requirements are validated.

### Out of Scope

- Authentication and accounts — this is an internal research prototype
- Real-time multi-user collaboration — not part of the exploration workflow
- Mobile-native app support — current focus is desktop web visualization
- Full case-management / incident workflow — not an operations system
- Generic BI dashboard features — would dilute the domain-specific exploration model
- Social sharing / public publishing — adds privacy and permissions complexity without core value

## Context

- Existing brownfield Next.js 16 App Router app with feature-based organization
- The active planning surface is `dashboard-demo`
- Core stack includes TypeScript, Zustand, Three.js, MapLibre, DuckDB, Apache Arrow, and Web Workers
- All v3.1 phases (72-75) complete: Workflow Clarity, Inspection Speed, Coordination Polish, Presentation Cleanup
- Known concerns include large components, excessive console logging, silent mock-data fallbacks, input validation gaps, and heavy data processing on the main thread
- Codebase analysis exists in `.planning/codebase/`, milestone history in `.planning/milestones/`

## Constraints

- **Tech stack**: Next.js 16, TypeScript, pnpm, and the existing visualization/data stack — avoid introducing a second frontend architecture
- **Data layer**: Local DuckDB + Apache Arrow pipeline — preserve the current offline analytics model
- **Performance**: Large crime datasets must not block the UI — keep heavy computation off the main thread where possible
- **Product scope**: Desktop-first internal prototype — avoid adding unrelated consumer features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the App Router modular monolith structure | Matches the existing codebase and keeps feature boundaries clear | ✓ Good |
| Pair 2D density with 3D STC views | Matches the paper's hybrid visualization design and supports overview + trace tasks | ✓ Good |
| Use non-uniform temporal scaling for burst analysis | Preserves metric duration while making burst order legible | ✓ Good |
| Use shared comparable-bin warp scoring for demo previews | Keeps same-granularity warp widths visible without reordering or collapsing bins | ✓ Good |
| Keep hotspot and guidance features as support features | They help analysis without becoming the main task model | ✓ Good |
| Run adaptive-time computation in Web Workers | Prevents expensive warp calculations from blocking interaction | ✓ Good |
| Recenter planning on `dashboard-demo` | The demo route is the actual workflow surface | ✓ Good |
| Detect-first workflow rail | Detect is the natural entry point for burst scanning and slice generation | ✓ Good |
| Slices owns review/apply | Separates draft-state from applied-state actions; pending drafts before applied slices | ✓ Good |
| Inspect immediacy | Active-slice context and comparison controls visible without extra clicks | ✓ Good |
| Minimal chrome | Shell stays quiet enough to support the analysis loop; auto-switch on apply, no stepper | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to the appropriate phase or support section
3. New requirements emerged? -> Add to the matching section
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after v3.1 Workflow Finalization*
