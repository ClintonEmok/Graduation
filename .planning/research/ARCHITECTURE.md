# Architecture Patterns

**Domain:** Adaptive space-time cube / dual-timeline geospatial analytics
**Researched:** 2026-04-09
**Overall confidence:** MEDIUM

## Recommended Architecture

Keep the current **Next.js App Router modular monolith**, but sharpen it into three explicit zones:

1. **Route shells** — page-level composition only
2. **Feature controllers** — Zustand stores, hooks, orchestration logic
3. **Rendering adapters** — Three.js / MapLibre / timeline components that only render derived state and emit user intents

High-level shape:

```text
User Intent
  → Feature Component
  → Store Action / Query Hook
  → Domain Lib or Worker
  → Normalized Result
  → Shared Store
  → Visualization Adapters
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `app/*` route shells | Page composition, route-level loading/error boundaries, layout wiring | Feature shells, providers |
| Feature shells (`dashboard`, `timeline-test`, `stkde`, etc.) | Assemble panels and pass only feature-level props | Stores, hooks, visualization adapters |
| Coordination store | Own shared selection, brush range, playhead, source-of-truth sync state | Map, cube, timeline, slice/adaptive stores |
| Domain stores (`slice`, `adaptive`, `timeline`, `filter`, `suggestion`) | Manage local feature state and derived UI state | Coordination store, lib modules, workers |
| Data hooks (`useCrimeData`, etc.) | Fetch/stream API data and normalize it for client use | API routes, stores |
| API routes (`/api/crime/*`, `/api/adaptive/*`, `/api/stkde/*`) | Server-side DuckDB/Arrow access, query shaping, fallback handling | `src/lib/*`, workers, client hooks |
| `src/lib/*` domain modules | Query building, binning, interval detection, warp generation, normalization | API routes, stores, workers |
| Web Workers | Run expensive adaptive-time / hotspot computation off the main thread | Lib modules, stores via typed messages |
| Visualization adapters (`MapLibre`, `Three.js`, timeline panels) | Render derived state and emit interactions; no heavy business logic | Coordination store, feature stores |
| Shared types | Canonical contracts for crime records, time slices, proposals, responses | All layers |

### Data Flow

#### 1) Ingestion / query flow
1. Client hook requests data for a route or filter state.
2. API route validates/sanitizes inputs and queries DuckDB.
3. API returns Arrow or structured JSON, plus explicit loading/error/warning metadata.
4. Hook parses Arrow into canonical client types (`CrimeRecord`, bins, facets).
5. Parsed data is written into the relevant store(s).
6. Visualization components render from store selectors only.

#### 2) Cross-panel interaction flow
1. User brushes timeline, clicks cube, or selects map features.
2. The emitting component dispatches an intent to the coordination store.
3. Coordination store reconciles source, range, and selected index.
4. Derived selection state fans out to cube/map/timeline highlights.
5. Feature-local stores consume the same source state for secondary UI.

#### 3) Adaptive time flow
1. Adaptive controls update warp parameters in the adaptive store.
2. Store triggers worker-backed proposal/warp recomputation.
3. Worker returns ranked proposals, breakpoints, or warp maps.
4. Store commits the normalized result.
5. Timeline and cube consume the warp state; shader textures update from the derived map.

#### 4) Burst highlighting flow
1. Density / burst metric is computed in lib or worker code.
2. Highlight cutoff is derived centrally, not inside each component.
3. Store updates a compact highlight mask / percentile result.
4. Cube and map read the same highlight source, avoiding divergent logic.

## Patterns to Follow

### Pattern 1: Store as coordination spine
**What:** One store owns cross-panel truth (`selectedIndex`, `brushRange`, `playhead`, sync status).  
**When:** Any state must stay aligned across cube, map, and timeline.

### Pattern 2: Feature-local state, global shared truth
**What:** Keep interaction micro-state near the component, but promote only durable shared state to the coordination layer.  
**When:** Drag previews, hover state, UI toggles, and selection commits need different lifetimes.

### Pattern 3: Worker boundary for expensive math
**What:** Anything involving adaptive binning, interval detection, or large data transforms should cross into a worker.  
**When:** The operation can block rendering or repeatedly recomputes on slider/timeline changes.

### Pattern 4: Derived render props, not direct mutation
**What:** MapLibre/Three.js components should receive derived state and dispatch intents, not mutate shared stores directly.  
**When:** Building cube meshes, textures, layers, or timeline overlays.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Component-owned global truth
**What:** Letting `DualTimeline`, `DataPoints`, or map panels each maintain their own version of selection/time state.  
**Why bad:** Sync drift, duplicated logic, impossible-to-debug loops.  
**Instead:** Centralize reconciliation in the coordination store.

### Anti-Pattern 2: Custom events as the main integration bus
**What:** Relying on ad hoc browser events between stores/components.  
**Why bad:** Hidden contracts, weak typing, brittle refactors.  
**Instead:** Prefer explicit store actions or a typed message layer.

### Anti-Pattern 3: Heavy work on the main thread
**What:** Recomputing warps, queries, or large texture updates inside render paths or effects.  
**Why bad:** Jank, frozen interaction, dropped frames.  
**Instead:** Offload to workers and commit compact results.

### Anti-Pattern 4: Silent mock-data fallback
**What:** Returning fake data without surfacing it in the UI.  
**Why bad:** Users trust the visualization incorrectly.  
**Instead:** Make loading/fallback state explicit at the route and panel level.

## Scalability Considerations

| Concern | At small data | At large data | At very large data |
|---------|---------------|---------------|--------------------|
| Data fetch / parse | Simple Arrow parse in hook | Stream or chunk more aggressively | Push more aggregation server-side |
| Shared selection state | Single coordination store is fine | Still fine if selectors stay narrow | Split state into focused slices |
| Adaptive recomputation | Recompute on every control change | Debounce and workerize | Cache proposals and reuse partial results |
| Rendering textures | Rebuild on warp changes | Pool / reuse textures | Minimize texture churn and transfer size |
| Timeline component size | Monolithic but manageable | Extract sub-panels and hooks | Make timeline a composition of smaller views |

## Suggested Build Order

1. **Shared contracts first**  
   Stabilize types for records, time slices, warp outputs, warnings, and loading/error states.

2. **Data ingress and validation**  
   Harden API routes, input schemas, and explicit mock/loading signaling before adding more UI complexity.

3. **Coordination spine**  
   Tighten the selection/brush/playback reconciliation path so the three views always agree.

4. **Workerized adaptive compute**  
   Move expensive warp and burst calculations behind a typed worker contract.

5. **Visualization extraction**  
   Break up `DualTimeline` and `DataPoints` into smaller adapters, keeping logic out of render code.

6. **Texture / rendering optimization**  
   After boundaries are stable, optimize Three.js data texture lifecycles and memoization.

## Fragile Boundaries to Protect

| Seam | Why brittle | Protect by |
|------|-------------|------------|
| `useCoordinationStore` ↔ cube/map/timeline | Cross-panel feedback loops | Keep actions explicit; test end-to-end selection sync |
| Store ↔ `CustomEvent` bridge | Hidden contract, weak typing | Document events or replace with typed actions |
| Store ↔ worker messages | Serialization and schema drift | Define a versioned message contract |
| `DataPoints` ↔ `THREE.DataTexture` | Memory leaks and churn | Centralize texture creation/disposal |
| API routes ↔ mock fallback | Users may not know data is synthetic | Surface warnings in UI and telemetry |
| DuckDB init ↔ concurrent requests | Race conditions during startup | Serialize initialization and expose readiness |

## Architecture Implications for Roadmap

- Early phases should target **boundary hardening** before new visual features.
- Any work touching timeline/cube/map sync should be treated as **high-coupling**.
- Performance work should prioritize **worker contracts and render cleanup** over micro-optimizing component code.
- Data validation and explicit fallback states are a prerequisite for trustworthy analytics UX.

## Sources

- `.planning/PROJECT.md`
- `README.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
