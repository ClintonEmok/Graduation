# Project Research Summary

**Project:** Space-Time Cube Interactive Visualization Prototype  
**Domain:** Spatiotemporal visualization with adaptive time scaling for user study  
**Researched:** January 30, 2026  
**Confidence:** HIGH

## Executive Summary

This project builds an interactive Space-Time Cube visualization prototype to evaluate adaptive time scaling for bursty spatiotemporal data (Chicago crime dataset). Experts in this domain use React Three Fiber for declarative 3D, Zustand for cross-view state coordination, and D3 for time scale calculations. The recommended approach is a **coordinated multi-view architecture** with a central state store enabling linked selection and brushing between the 3D cube and supporting 2D views, with React Three Fiber's instanced rendering handling the performance requirements of large point datasets.

The **core thesis contribution is adaptive time scaling**—a non-linear time mapping that expands event-dense periods and compresses sparse ones. Everything else in the project supports validating this algorithm through a controlled user study comparing adaptive vs. uniform time scaling. This demands rigorous A/B switching infrastructure, comprehensive interaction logging, and task presentation systems built for research validity.

Key risks center on **3D rendering performance** (instanced rendering is non-negotiable from Phase 1), **WebGL resource management** (memory leaks will crash user study sessions), and **time distortion communication** (users must understand when time is being scaled non-linearly). The mitigation strategy is to establish performance patterns in the foundation phase, test with maximum-density data throughout, and include clear visual indicators for scale transitions.

## Key Findings

### Recommended Stack

The stack leverages the **pmndrs ecosystem** (React Three Fiber, Zustand, drei) which provides tight integration and battle-tested patterns for 3D visualization in React. Version alignment is critical: React 19 + R3F 9 + Three.js r182.

**Core technologies:**
- **Next.js 15 + React 19**: App Router for server/client component optimization, Turbopack for fast dev iteration
- **React Three Fiber 9 + Three.js r182**: Declarative 3D with automatic render loop; drei provides OrbitControls, instances, text
- **Zustand 5**: Lightweight state store that works outside React (critical for Three.js callbacks), same ecosystem as R3F
- **D3 scales (d3-scale, d3-time)**: Industry-standard time scale calculations handling calendar complexities; do NOT use for rendering
- **MapLibre GL 5**: Open-source 2D maps if spatial context needed (lower priority for MVP)
- **TanStack Query 5**: Caching large dataset responses, request deduplication, background refetching
- **FastAPI + Python**: Backend for data processing with Pandas; cursor-based pagination for large datasets
- **Leva + r3f-perf**: Real-time parameter tuning and performance monitoring

### Expected Features

**Must have (table stakes):**
- 3D rotation/zoom/pan with reset view — users expect standard 3D navigation
- Time slider with play/pause/step controls — fundamental for temporal exploration
- Point/event rendering with color encoding — core visualization of crime data
- Spatial grid for geographic context — simpler than full base map
- Interaction logging with timestamps — required for user study analysis
- Task presentation system with timing — structured study delivery

**Should have (differentiators):**
- **Adaptive time scaling algorithm** — CORE THESIS CONTRIBUTION
- Uniform vs. adaptive comparison mode (A/B switching) — required for study
- Time scale visualization showing the mapping difference — communicates distortion
- Guided tutorial/training mode — ensures study validity
- Progress indicator — reduces participant anxiety

**Defer (v2+):**
- Linked 2D timeline view — nice for exploration but adds complexity
- Spatial filtering/brushing — useful but not essential for study
- Session replay capability — high effort, valuable for qualitative analysis
- Event density indicator — helpful context, secondary priority

### Architecture Approach

The architecture follows the **Coordinated Multiple Views (CMV)** pattern from visualization research: a central **Coordination Layer** (Zustand store) manages shared state (selection, timeRange, timeScale, filter), and independent **View Components** subscribe to relevant slices. Views never communicate directly—all coordination flows through the store. This enables bidirectional linking where a selection in the 3D cube instantly highlights in the timeline, and vice versa.

**Major components:**
1. **Coordination Provider** — Zustand store with selectedIds, timeRange, timeScale, spatialBounds, filter state
2. **3D Space-Time Cube** — R3F canvas with instanced point cloud, adaptive Z-axis, orbit controls
3. **2D Timeline View** — D3 scales + React rendering, brush for time range selection
4. **Data Query Service** — TanStack Query layer handling caching, pagination, server-side filtering
5. **Interaction Logger** — Event capture for research analysis, timestamps, session tracking
6. **Task System** — Participant ID management, task presentation, response validation, timing

### Critical Pitfalls

1. **Individual meshes instead of instancing** — Must use InstancedMesh from Phase 1; individual meshes = 1 draw call each = browser freeze at 10K points. Cannot retrofit.

2. **WebGL memory leaks** — Geometries/materials/textures need explicit `dispose()`. Without cleanup, memory grows with each filter change until crash. Implement disposal protocol in foundation phase.

3. **React state triggering full re-renders** — Don't use useState for camera/hover; use refs for rapid changes, Zustand selectors for shared state. Never setState inside useFrame.

4. **Loading full dataset to client** — Server-side aggregation required. Progressive loading with level-of-detail. Cannot send millions of records; aggregate to thousands.

5. **3D occlusion hiding patterns** — Dense data hides points in back. Implement transparency, slicing planes, and coordinated 2D views as escape hatch. Test with maximum-density data.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Infrastructure
**Rationale:** All views depend on coordination infrastructure; performance patterns must be baked in from start
**Delivers:** Project scaffolding, Zustand coordination store, R3F canvas with instanced rendering, disposal protocols
**Addresses:** Core rendering (table stakes), state architecture
**Avoids:** Pitfalls #1 (instancing), #2 (memory leaks), #3 (re-render thrashing), #10 (compatibility)
**Must establish:** Instanced mesh pattern, Zustand store shape, resource disposal pattern, target device testing

### Phase 2: Core 3D Visualization
**Rationale:** The Space-Time Cube is the primary view; building it validates the rendering architecture
**Delivers:** Working 3D cube with crime data points, orbit controls, time axis, color encoding
**Uses:** R3F, drei (OrbitControls, Instances), D3 scales for time axis
**Implements:** 3D Space-Time Cube component, point cloud rendering, camera controls
**Avoids:** Pitfalls #5 (occlusion), #12 (camera controls), #13 (color scales)

### Phase 3: Temporal System & Adaptive Scaling
**Rationale:** The adaptive time scaling algorithm IS the thesis contribution; requires solid foundation
**Delivers:** Time slider, play/pause, uniform time mapping, adaptive time mapping, A/B mode switching
**Implements:** Time state management, linear and adaptive scale algorithms, visual indicators of scaling
**Avoids:** Pitfalls #6 (aggregation), #8 (time distortion confusion)
**Research contribution:** This phase delivers the core differentiator

### Phase 4: Data Pipeline & Backend
**Rationale:** Until now can use mock data; real Chicago crime data integration is complex
**Delivers:** FastAPI endpoints, cursor-based pagination, server-side filtering, TanStack Query integration
**Uses:** FastAPI, Pandas/DuckDB, TanStack Query, progressive loading
**Avoids:** Pitfall #4 (full dataset load), #14 (no loading indicators)

### Phase 5: User Study Infrastructure
**Rationale:** Logging and task systems are critical for research validity; build before study
**Delivers:** Interaction logging, task presentation, participant ID management, timing measurement
**Implements:** Logging layer, task state machine, response validation
**Avoids:** Pitfall #9 (missing log events)
**Critical:** Define logging schema BEFORE implementation; pilot test to verify capture

### Phase 6: Coordinated Views (Optional MVP Extension)
**Rationale:** 2D timeline linked to 3D cube enhances exploration; adds complexity
**Delivers:** 2D timeline with D3, linked brushing, bidirectional selection sync
**Implements:** Timeline view component, brush overlay, coordination between views
**Avoids:** Pitfall #7 (sync issues)
**Note:** May defer to post-study if timeline critical path

### Phase 7: Polish & Study Preparation
**Rationale:** Final quality pass before user study; participant experience matters
**Delivers:** Tutorial mode, progress indicators, reset view, performance optimization, compatibility testing
**Implements:** Guided onboarding, UX polish, final performance pass
**Avoids:** Pitfall #10 (compatibility) — test on actual study machines

### Phase Ordering Rationale

- **Performance architecture first:** Pitfalls #1-3 require patterns baked into foundation; cannot retrofit instancing or state management
- **3D before 2D:** The cube is the primary research artifact; coordinated views support it
- **Adaptive scaling before study infrastructure:** The algorithm must be solid before logging validates it
- **Data integration mid-project:** Mock data sufficient for UI development; real data adds complexity
- **Study infrastructure before polish:** Logging schema must inform what polish is needed
- **Optional coordinated view:** Linked timeline valuable but not essential; can cut if timeline tight

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Adaptive Scaling):** Core contribution with limited prior art on UX for non-linear time. Needs iterative design, user testing, multiple algorithm approaches
- **Phase 5 (Study Infrastructure):** Logging specification requires detailed study design. Define what questions you're answering before building

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Next.js + R3F patterns in official docs
- **Phase 2 (3D Visualization):** R3F and drei have extensive examples
- **Phase 4 (Data Pipeline):** FastAPI + TanStack Query are well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via official docs (R3F, Next.js, Zustand); version compatibility confirmed |
| Features | HIGH | Based on ArcGIS Pro documentation, academic papers, visualization literature |
| Architecture | MEDIUM-HIGH | Verified via use-coordination docs, CMV academic literature; some patterns project-specific |
| Pitfalls | HIGH | Verified via official Three.js docs, academic papers, community forums |

**Overall confidence:** HIGH

The research drew from official documentation, established academic literature, and verified community sources. The pmndrs ecosystem (R3F, Zustand, drei) has extensive documentation and is purpose-built for this use case. The main uncertainty is in the adaptive time scaling algorithm itself—which is appropriate since that's the research contribution.

### Gaps to Address

- **Adaptive time scaling UX:** Limited prior art on communicating non-linear time to users. Requires iterative design during Phase 3. Consider dual encoding (visual + tooltip), animation of distortion, user testing.

- **Chicago crime data specifics:** Actual data distribution, sparsity patterns, bursty periods unknown until data exploration. May affect aggregation strategy and algorithm design. Address in Phase 4.

- **Instancing with dynamic attributes:** How to efficiently update colors/visibility per instance during filtering is evolving. Check current drei/three.js patterns when implementing Phase 2.

- **Study task design:** What tasks will participants perform? Logging schema depends on study design. Needs IRB-aligned task specification before Phase 5.

- **LOD thresholds:** Level-of-detail rendering thresholds depend on actual performance on target devices. Requires profiling with real data in Phase 4/7.

## Sources

### Primary (HIGH confidence)
- React Three Fiber documentation — https://docs.pmnd.rs/react-three-fiber (installation, performance, hooks)
- Three.js official docs — disposal, instanced rendering, performance
- Next.js 15 documentation — App Router, server/client components
- Zustand GitHub — state management patterns, selectors
- ArcGIS Pro Space-Time Cube documentation — feature expectations, time slider design
- D3.js documentation — d3-scale, d3-time for time calculations
- use-coordination documentation — coordination model, hooks API (IEEE VIS 2024)

### Secondary (MEDIUM confidence)
- TanStack Query docs — caching, pagination patterns
- MapLibre GL documentation — open-source mapping
- FastAPI documentation — pagination, async patterns
- pmndrs ecosystem examples — drei, leva, r3f-perf
- Community forums (Three.js Discourse, GitHub Issues) — performance pitfalls

### Academic (HIGH confidence)
- Bach et al. "Generalized Space-Time Cubes" — theoretical framework
- Andrienko et al. "Visualization of Trajectory Attributes in Space-Time Cube" — time lens, occlusion
- Elmqvist "3D Occlusion Management and Causality Visualization" — occlusion solutions
- Byska et al. "Analysis of Long MD Simulations Using Focus+Context" (2019) — event-driven temporal visualization
- Roberts "State of the Art: Coordinated & Multiple Views" (2007) — CMV architecture patterns

---
*Research completed: January 30, 2026*  
*Ready for roadmap: yes*
