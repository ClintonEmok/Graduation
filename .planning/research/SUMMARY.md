# Project Research Summary

**Project:** Adaptive Space-Time Cube Prototype
**Domain:** Adaptive spatiotemporal visualization / crime analytics
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Executive Summary

This is a brownfield analytical visualization product, not a greenfield platform. The right move is to keep the current Next.js + React + TypeScript modular-monolith shape and harden it rather than replace it. Experts would build this as a tightly coordinated, desktop-first experience with a single source of truth for cross-panel state, workerized math, and explicit data provenance so users never mistake mock or degraded output for real analysis.

The recommended stack is already close to ideal: Next.js, Zustand, TanStack Query, Three.js/R3F, MapLibre, DuckDB, Arrow, and Web Workers. The main risks are trust and sync: silent mock fallback, input-validation gaps, multi-view drift, and main-thread performance collapse on large datasets. Mitigate those first with typed contracts, visible readiness/provenance states, and worker boundaries before adding more feature depth.

## Key Findings

### Recommended Stack

Keep the current stack; add only targeted hardening. Next.js 16 + React 19 + TypeScript is the correct app shell, Zustand/TanStack Query is the right state split, and Three.js/R3F + MapLibre is the right visualization combo for a custom adaptive cube plus geographic context. DuckDB + Arrow + Web Workers should remain the analytics core; add zod and Comlink to close validation and typed-worker gaps.

**Core technologies:**
- Next.js 16 / React 19 / TypeScript — keep the app shell and shared type safety.
- Zustand + TanStack Query — separate cross-panel coordination from async server state.
- Three.js + React Three Fiber + MapLibre — support custom 3D cube rendering and a 2D map without extra abstraction layers.
- DuckDB + Arrow + Web Workers — enable local analytics and keep heavy transforms off the main thread.
- zod + Comlink — add schema validation and typed worker contracts.

### Expected Features

The MVP is clearly interaction-led: synchronized cube/map/timeline, brushing, resolution control, playback, filters, and trustworthy status/provenance handling. The differentiators are adaptive time warping, burst highlighting, dual timelines, and optional hotspot/STKDE analysis. Avoid feature creep into auth, collaboration, mobile-native UX, full case management, or generic BI surfaces.

**Must have (table stakes):**
- Synchronized 3D cube + 2D map + timeline
- Timeline brushing / point inspection
- Time resolution control + playback/step controls
- Basic filters
- Clear loading / empty / error / provenance states

**Should have (competitive):**
- Adaptive time warping + burst highlighting
- Dual timeline overview/detail
- User-tunable warp controls
- Confidence/rationale metadata

**Defer (v2+):**
- Hotspot / STKDE layer
- Proposal/suggestion system
- Social/export features

### Architecture Approach

Keep the App Router modular monolith, but enforce three zones: route shells, feature controllers, and rendering adapters. Shared truth for selection/brush/playback must live in one coordination store, while adaptive math and data shaping move into domain libs and workers. Visualization components should only render derived state and emit intents; they should not own business logic or mutate global state directly.

**Major components:**
1. Route shells — page composition, boundaries, and providers.
2. Coordination store + feature stores — shared sync state and feature-local UI state.
3. API routes + domain libs + workers — query shaping, validation, adaptive compute, and normalization.

### Critical Pitfalls

1. **Silent mock-data fallback masquerading as real analysis** — show explicit provenance badges and block “analysis-ready” states until real data is confirmed.
2. **Multi-view synchronization drift** — keep one authoritative interaction contract and test rapid brush/play flows end to end.
3. **Adaptive warping distorts meaning** — preserve monotonic ordering, cap warp strength, and show warped/unwarped reference cues.
4. **Large-data UI freezes** — workerize heavy transforms, add performance budgets, and reuse textures/buffers.
5. **Initialization races** — gate startup behind explicit readiness states and cold-start tests.

## Implications for Roadmap

### Phase 1: Trust + contracts first
**Rationale:** The product is only useful if its data and state are trustworthy. Locking down validation, provenance, and startup readiness prevents false analysis before more UI complexity lands.
**Delivers:** Shared types, zod validation, explicit loading/error/degraded states, provenance indicator, cold-start readiness gating.
**Addresses:** Filters, loading/error states, provenance visibility, trustworthy empty states.
**Avoids:** Silent fallback, invalid query bugs, startup races.

### Phase 2: Coordination spine + core interaction loop
**Rationale:** The cube, map, and timeline must agree before any advanced adaptive behavior is stable.
**Delivers:** Single selection/brush/playhead contract, synchronized brushing and inspection, resolution control, playback, and baseline cross-panel highlighting.
**Uses:** Zustand coordination store, TanStack Query hooks, typed actions/contracts.
**Implements:** Coordination store + feature controllers.
**Avoids:** Multi-view drift, store sprawl, custom-event coupling.

### Phase 3: Workerized adaptive compute
**Rationale:** Adaptive warping and burst detection are the differentiator, but they must stay off the main thread and preserve user trust.
**Delivers:** Adaptive time warping, burst highlighting, warp parameter controls, worker-backed recomputation, confidence/rationale metadata.
**Uses:** DuckDB, Arrow, Web Workers, Comlink, zod.
**Implements:** Domain libs + worker boundary.
**Avoids:** Meaning distortion, main-thread stalls, schema drift.

### Phase 4: Differentiators and performance hardening
**Rationale:** Once the core loop is stable, add higher-value analytics and polish.
**Delivers:** Dual timeline refinement, optional hotspot/STKDE layer, proposal/suggestion system, texture/render lifecycle cleanup.
**Addresses:** Competitive depth and scalability.
**Avoids:** GPU churn, overbuilt configuration, premature scope expansion.

### Phase Ordering Rationale

- Trust comes before richness: provenance and validation must land before users rely on the visuals.
- Sync comes before adaptation: the shared state model must be stable before the warp model is layered on top.
- Compute comes before extras: workerized adaptive logic is the core differentiator and the main performance risk.
- Deeper analytics and rendering polish should wait until the interaction loop is stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** input schema edge cases and explicit degraded-state UX.
- **Phase 3:** adaptive warp semantics, worker message contracts, and hotspot/STKDE implementation details.
- **Phase 4:** if STKDE or proposal systems are promoted, validate their data/model assumptions first.

Phases with standard patterns (skip research-phase):
- **Phase 2:** shared-state coordination and cross-panel sync are well-covered by established React/Zustand patterns.
- **Phase 4 render cleanup:** texture lifecycle and memoization follow known Three.js patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strongly grounded in the current brownfield dependency stack and architecture fit. |
| Features | HIGH | Clear MVP vs. differentiator split; anti-features are well-defined. |
| Architecture | MEDIUM | Solid pattern guidance, but some seams (workers, textures, sync) still need implementation validation. |
| Pitfalls | HIGH | Risks are specific, recurring, and directly tied to observed failure modes. |

**Overall confidence:** MEDIUM

### Gaps to Address

- Warp semantics and UX thresholds: validate with real datasets during planning.
- Worker protocol shape: define versioned messages before implementation.
- STKDE / hotspot depth: research only if it moves into the near-term roadmap.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — stack recommendation and avoid/defer guidance
- `.planning/research/FEATURES.md` — MVP, differentiators, and anti-features
- `.planning/research/ARCHITECTURE.md` — boundary model, data flow, build order
- `.planning/research/PITFALLS.md` — critical and moderate failure modes

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` — product scope and constraints referenced by the research files
- `README.md` — current interaction model referenced by the research files

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
