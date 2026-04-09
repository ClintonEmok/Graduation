# Project Research Summary

**Project:** Adaptive Space-Time Cube Prototype
**Domain:** Adaptive spatiotemporal visualization / crime analytics
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Executive Summary

This is a brownfield analytical visualization product, not a greenfield platform. The paper's conceptual tasks make the target shape clearer: a hybrid environment that couples a 2D density overview with a 3D Space-Time Cube, then adds non-uniform temporal scaling so users can see both broad patterns and burst-level order. The right move is to keep the current Next.js + React + TypeScript modular-monolith shape and harden it around the task vocabulary T1-T8 rather than replace it.

The main risks are interpretive: density summaries can hide burst order, 3D can create depth ambiguity, temporal scaling can distort metric duration, and support overlays can be mistaken for ground truth. Mitigate those first with typed contracts, synchronized navigation, visible duration cues, and worker boundaries before adding more feature depth.

## Key Findings

### Recommended Stack

Keep the current stack; add only targeted hardening. Next.js 16 + React 19 + TypeScript is the correct app shell, Zustand/TanStack Query is the right state split, and Three.js/R3F + MapLibre is the right visualization combo for a custom adaptive cube plus geographic context. DuckDB + Arrow + Web Workers should remain the analytics core; add zod and Comlink to close validation and typed-worker gaps. Keep density-clustering if hotspot/STKDE remains a supported analysis feature.

**Core technologies:**
- Next.js 16 / React 19 / TypeScript - keep the app shell and shared type safety.
- Zustand + TanStack Query - separate cross-panel coordination from async server state.
- Three.js + React Three Fiber + MapLibre - support custom 3D cube rendering and a 2D map without extra abstraction layers.
- DuckDB + Arrow + Web Workers - enable local analytics and keep heavy transforms off the main thread.
- zod + Comlink - add schema validation and typed worker contracts.

### Conceptual Task Map

The paper's tasks are the right top-level requirements. The useful split is:

- **T1 / T5:** overview and pattern summary.
- **T2 / T3:** trace trajectories and compare temporal behaviors.
- **T4 / T6 / T7 / T8:** detect anomalies and decode burst structure.

That split matches the way the hybrid visualization needs to work: overview first, trace/compare second, burst semantics third.

### Visualization and Interaction Design

The proposed hybrid environment should be treated as a coordinated system, not a set of independent panels.

**Must-have interaction supports:**
- 2D density projection with opacity modulation for broad pattern reading.
- 3D STC with time on the vertical axis for tracing and depth-aware inspection.
- Synchronized navigation, selection, and brushing/linking between the 2D and 3D views.
- Timeline slider for active temporal windows.
- Non-uniform temporal scaling that expands dense intervals while keeping metric duration visible.
- Hue for categorical discrimination and transparency for low-confidence events.

**Supporting analysis features:**
- Hotspot / STKDE layer for concentration surfaces.
- Proposal / guidance system for slice discovery.
- Trust / provenance states so real, mock, partial, and degraded data are explicit.
- Large-dataset responsiveness through workers, memoization, and texture reuse.

### Architecture Approach

Keep the App Router modular monolith, but enforce four zones: route shells, interaction coordinators, analysis workers, and rendering adapters. Shared truth for selection, brush range, playhead, and support metadata must live in one coordination store, while temporal transforms and hotspot/guidance scoring move into domain libs and workers. Visualization components should only render derived state and emit intents; they should not own business logic or mutate global state directly.

**Major components:**
1. Route shells - page composition, boundaries, and providers.
2. Coordination store + feature stores - shared sync state and feature-local UI state.
3. API routes + domain libs + workers - query shaping, validation, temporal analysis, and normalization.
4. Visualization adapters - 2D density, 3D STC, and timeline rendering.

### Critical Pitfalls

1. **Density summaries hide burst order** - a clean overview can erase the sequence inside a dense interval.
2. **3D depth ambiguity** - the cube can be hard to navigate or interpret without linked 2D cues.
3. **Temporal warping distorts metric duration** - scaling can change meaning if reference cues are weak.
4. **Support overlays look like ground truth** - hotspot/guidance output can be over-trusted if it is not visually distinct.
5. **Trust/provenance ambiguity** - users may believe they are seeing real analysis when the system is still loading or degraded.
6. **Large-data UI freezes** - main-thread work makes the core tasks unusable.

## Implications for Roadmap

### Phase 1: Overview + pattern summaries
**Rationale:** Users must perceive broad structure before any deeper interpretation is stable.
**Delivers:** 2D density projection, timeline windows, summary cues.
**Addresses:** T1, T5, broad pattern reading.

### Phase 2: Trace trajectories + compare behaviors
**Rationale:** The cube, map, and timeline must agree before the burst model is layered on top.
**Delivers:** 3D STC, synchronized navigation, brushing/linking, multi-selection comparison.
**Addresses:** T2, T3, object constancy, cross-view drift.

### Phase 3: Detect events + decode bursts
**Rationale:** Non-uniform scaling is the differentiator, but it must preserve metric duration and explain burst structure.
**Delivers:** Adaptive time warping, burst ordering, burst pacing, duration recovery, confidence cues.
**Addresses:** T4, T6, T7, T8.

### Phase 4: Support overlays + hardening
**Rationale:** Trust, hotspot, guidance, and performance support should be explicit and reversible.
**Delivers:** Provenance states, hotspot/STKDE, proposal guidance, validation, performance cleanup.
**Addresses:** trust ambiguity, support-over-ground-truth confusion, and large-data stalls.

### Phase Ordering Rationale

- Overview comes before richness: users need broad structure before detailed burst semantics.
- Sync comes before adaptation: the shared state model must be stable before the warp model is layered on top.
- Compute comes before extras: workerized temporal logic is the core differentiator and the main performance risk.
- Support overlays should wait until the interaction loop and adaptive analysis are stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** adaptive warp semantics, metric-duration thresholds, and burst classification cues.
- **Phase 4:** hotspot/proposal contracts, provenance visibility, and fallback-state UX.

Phases with standard patterns (skip research-phase):
- **Phase 1:** density overview and summary cues.
- **Phase 2:** shared-state coordination and cross-panel sync.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strongly grounded in the current brownfield dependency stack and architecture fit. |
| Features | HIGH | Clear split between core tasks, visualization supports, and support features. |
| Architecture | MEDIUM | Solid pattern guidance, but some seams (workers, textures, sync) still need implementation validation. |
| Pitfalls | HIGH | Risks are specific, recurring, and directly tied to observed failure modes. |

**Overall confidence:** MEDIUM

### Gaps to Address

- Warp semantics and UX thresholds: validate with real datasets during planning.
- Worker protocol shape: define versioned messages before implementation.
- Hotspot / proposal contracts: validate against the support-feature scope before implementation.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` - stack recommendation and avoid/defer guidance
- `.planning/research/FEATURES.md` - conceptual tasks and support features
- `.planning/research/ARCHITECTURE.md` - boundary model, data flow, build order
- `.planning/research/PITFALLS.md` - critical and moderate failure modes

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` - product scope and constraints referenced by the research files
- `README.md` - current interaction model referenced by the research files

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
