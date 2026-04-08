# Adaptive Space-Time Cube Prototype

## What This Is

This is a Next.js prototype for exploring crime patterns with an adaptive space-time cube. It connects a 3D cube, a 2D map, and a dual timeline so users can brush time, inspect points, and see bursty intervals expand or compress as the time resolution changes.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## Requirements

### Validated

- ✓ User can inspect crime data across synchronized 3D cube, 2D map, and dual timeline views — existing
- ✓ User can brush the timeline and select points for detail inspection — existing
- ✓ User can change time resolution and see the detail window adjust — existing
- ✓ User can play and step through the timeline at the selected resolution — existing
- ✓ User can adjust adaptive warp settings to emphasize bursty intervals — existing
- ✓ User can see bursty intervals highlighted in both the cube and map — existing

### Active

- [ ] User can tell when the app falls back to mock data or is still loading real data
- [ ] User can keep working smoothly on large datasets without the visualization freezing
- [ ] User can rely on clear validation and error feedback when requests or filters are malformed

### Out of Scope

- Authentication and accounts — this is an internal research prototype
- Real-time multi-user collaboration — not part of the exploration workflow
- Mobile-native app support — current focus is desktop web visualization

## Context

- Existing brownfield Next.js 16 App Router app with feature-based organization
- Core stack includes TypeScript, Zustand, Three.js, MapLibre, DuckDB, Apache Arrow, and Web Workers
- Current README frames the product as an adaptive space-time cube for crime analysis with timeline brushing, playback, adaptive controls, and burst highlighting
- Codebase analysis already exists in `.planning/codebase/`, and milestone history exists in `.planning/milestones/`
- Known concerns include large components, excessive console logging, silent mock-data fallbacks, input validation gaps, and heavy data processing on the main thread

## Constraints

- **Tech stack**: Next.js 16, TypeScript, pnpm, and the existing visualization/data stack — avoid introducing a second frontend architecture
- **Data layer**: Local DuckDB + Apache Arrow pipeline — preserve the current offline analytics model
- **Performance**: Large crime datasets must not block the UI — keep heavy computation off the main thread where possible
- **Product scope**: Desktop-first internal prototype — avoid adding unrelated consumer features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the App Router modular monolith structure | Matches the existing codebase and keeps feature boundaries clear | ✓ Good |
| Use DuckDB + Arrow for local analytics | Supports large datasets without external infrastructure | ✓ Good |
| Run adaptive-time computation in Web Workers | Prevents expensive warp calculations from blocking interaction | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
