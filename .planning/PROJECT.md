# Adaptive Space-Time Cube Prototype

## What This Is

This is a Next.js prototype for bursty spatiotemporal crime analysis. It couples a 2D density projection with a 3D Space-Time Cube, plus a staged slice workflow and non-uniform temporal scaling so users can perceive overview patterns, trace trajectories, compare behaviors, detect anomalies, and recover metric duration.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized hybrid visualization environment.

## Requirements

### Core Tasks

- T1 - Obtain an overview of global trends, high-activity intervals, and spatial clusters.
- T2 - Trace the temporal evolution of selected incidents/records and aggregated clusters.
- T3 - Compare timing, duration, or spatial extent across multiple selections.
- T4 - Detect intersections, pauses, and abrupt changes in activity.
- T5 - Summarize recurring behaviors and periodic patterns.
- T6 - Discriminate the temporal order of rapid, concurrent events inside a burst.
- T7 - Identify burst pacing as a gradual escalation or instantaneous spike.
- T8 - Recover the true duration of a distorted interval.

### Supporting Visualization

- 2D density projection with opacity modulation for broad pattern reading.
- 3D Space-Time Cube with time on the vertical axis.
- Synchronized navigation, selection, and brushing/linking between 2D and 3D views.
- Timeline slider to define active temporal windows.
- Non-uniform temporal scaling to expand dense intervals without hiding metric duration.
- Hue for categorical discrimination and transparency for low-confidence events.

### Support Features

- Trust / provenance / loading states that make real, mock, partial, and degraded data explicit.
- Hotspot / STKDE analysis with confidence or rationale metadata.
- Suggested slices / proposals with explainable rationale.
- Large-dataset responsiveness and off-main-thread computation.

### Out of Scope

- Authentication and accounts - this is an internal research prototype
- Real-time multi-user collaboration - not part of the exploration workflow
- Mobile-native app support - current focus is desktop web visualization
- Full case-management / incident workflow - not an operations system
- Generic BI dashboard features - would dilute the domain-specific exploration model
- Social sharing / public publishing - adds privacy and permissions complexity without core value

## Context

- Existing brownfield Next.js 16 App Router app with feature-based organization
- Core stack includes TypeScript, Zustand, Three.js, MapLibre, DuckDB, Apache Arrow, and Web Workers
- The current README frames the product as a hybrid spatiotemporal exploration tool with brushing, playback, adaptive controls, and burst highlighting
- The current README frames the product as a hybrid spatiotemporal exploration tool with brushing, playback, adaptive controls, burst highlighting, and an isolated slice workflow that hands into a simplified dashboard
- Codebase analysis already exists in `.planning/codebase/`, and milestone history exists in `.planning/milestones/`
- Known concerns include large components, excessive console logging, silent mock-data fallbacks, input validation gaps, and heavy data processing on the main thread

## Constraints

- **Tech stack**: Next.js 16, TypeScript, pnpm, and the existing visualization/data stack - avoid introducing a second frontend architecture
- **Data layer**: Local DuckDB + Apache Arrow pipeline - preserve the current offline analytics model
- **Performance**: Large crime datasets must not block the UI - keep heavy computation off the main thread where possible
- **Product scope**: Desktop-first internal prototype - avoid adding unrelated consumer features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the App Router modular monolith structure | Matches the existing codebase and keeps feature boundaries clear | ✓ Good |
| Pair 2D density with 3D STC views | Matches the paper's hybrid visualization design and supports overview + trace tasks | ✓ Good |
| Use non-uniform temporal scaling for burst analysis | Preserves metric duration while making burst order legible | ✓ Good |
| Keep hotspot and guidance features as support features | They help analysis without becoming the main task model | ✓ Good |
| Run adaptive-time computation in Web Workers | Prevents expensive warp calculations from blocking interaction | ✓ Good |
| Keep generate, review, and apply isolated from the dashboard | Keeps the workflow focused and makes the conceptual tasks easier to test | ✓ Good |

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
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after paper-task remap*
