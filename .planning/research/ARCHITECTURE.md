# Architecture Patterns

**Domain:** Adaptive space-time cube / hybrid spatiotemporal visualization
**Researched:** 2026-04-09
**Overall confidence:** MEDIUM

## Recommended Architecture

Keep the current **Next.js App Router modular monolith**, but sharpen it into four explicit zones:

1. **Route shells** - page-level composition and boundaries only
2. **Interaction coordinators** - state orchestration for overview, trace, burst, and support flows
3. **Analysis workers** - non-uniform temporal scaling, burst metrics, hotspot scoring, and proposal generation
4. **Rendering adapters** - 2D density projection, 3D STC, and timeline components that only render derived state and emit intents

High-level shape:

```text
User Intent
  -> Feature Component
  -> Store Action / Query Hook
  -> Domain Lib or Worker
  -> Normalized Result
  -> Shared Store
  -> Visualization Adapters
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `app/*` route shells | Page composition, route-level loading/error boundaries, layout wiring | Feature shells, providers |
| Overview shell | Own the overview surface, density projection, and summary cues | Stores, map/timeline adapters |
| Trace shell | Own the trace/comparison loop for selected incidents or clusters | Stores, 3D cube adapter, timeline |
| Burst shell | Own the adaptive scaling and burst-decoding interactions | Stores, workers, timeline/cube views |
| Support shell | Own hotspot, guidance, provenance, and validation messaging | API routes, stores, overlays |
| Coordination store | Own shared selection, brush range, playhead, and sync state | Map, cube, timeline, support overlays |
| Temporal analysis workers | Run non-uniform scaling, burst metrics, hotspot scoring, and proposal generation | Lib modules, stores via typed messages |
| Visualization adapters | Render derived state and emit interactions; no heavy business logic | Coordination store, feature stores |
| Shared types | Canonical contracts for records, time slices, warp outputs, proposals, and warnings | All layers |

### Data Flow

#### 1) Overview / filter flow
1. User changes the timeline window or overview filter state.
2. The overview shell dispatches an intent to the coordination store.
3. Domain code derives density summaries and pattern cues.
4. The 2D projection renders cluster density and summary cues.
5. The timeline slider and overview remain aligned.

#### 2) Trace / compare flow
1. User selects a record, cluster, or range in any view.
2. The emitting component dispatches an intent to the coordination store.
3. Coordination state reconciles source, range, and selected index.
4. Derived selection state fans out to 2D and 3D highlights.
5. Brush/link hover state stays ephemeral, while committed selection becomes shared truth.

#### 3) Burst analysis flow
1. Temporal window and burst parameters update in the burst shell.
2. The store triggers worker-backed recomputation of scaling and burst metrics.
3. The worker returns normalized warp maps, burst groupings, or duration cues.
4. The store commits the normalized result.
5. The 3D STC and 2D density view consume the same scaling state.

#### 4) Support overlay flow
1. Hotspot, guidance, or provenance requests resolve through the API and workers.
2. The response includes explicit rationale, confidence, and data-source metadata.
3. Support overlays read the same shared state as the core views.
4. The UI keeps support signals visually distinct from the primary analytical story.

## Patterns to Follow

### Pattern 1: Store as coordination spine
**What:** One store owns cross-view truth (`selectedIndex`, `brushRange`, `playhead`, sync status).  
**When:** Any state must stay aligned across overview, trace, burst, and support flows.

### Pattern 2: Feature-local state, global shared truth
**What:** Keep interaction micro-state near the component, but promote only durable shared state to the coordination layer.  
**When:** Drag previews, hover state, UI toggles, and selection commits need different lifetimes.

### Pattern 3: Worker boundary for expensive math
**What:** Anything involving non-uniform scaling, burst decoding, or large data transforms should cross into a worker.  
**When:** The operation can block rendering or recomputes on slider/timeline changes.

### Pattern 4: Derived render props, not direct mutation
**What:** MapLibre/Three.js components should receive derived state and dispatch intents, not mutate shared stores directly.  
**When:** Building density overlays, cube meshes, textures, or timeline overlays.

### Pattern 5: Make metric duration explicit
**What:** Warped views must always preserve a visible cue for true duration.  
**When:** Any non-uniform temporal scaling changes the visual spacing of time.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Component-owned global truth
**What:** Letting overview, cube, and timeline panels each maintain their own version of selection/time state.  
**Why bad:** Sync drift, duplicated logic, impossible-to-debug loops.  
**Instead:** Centralize reconciliation in the coordination store.

### Anti-Pattern 2: Custom events as the main integration bus
**What:** Relying on ad hoc browser events between stores/components.  
**Why bad:** Hidden contracts, weak typing, brittle refactors.  
**Instead:** Prefer explicit store actions or a typed message layer.

### Anti-Pattern 3: Heavy work on the main thread
**What:** Recomputing scaling, hotspot math, or large texture updates inside render paths or effects.  
**Why bad:** Jank, frozen interaction, dropped frames.  
**Instead:** Offload to workers and commit compact results.

### Anti-Pattern 4: Silent mock-data fallback
**What:** Returning fake data without surfacing it in the UI.  
**Why bad:** Users trust the visualization incorrectly.  
**Instead:** Make loading/fallback state explicit at the route and panel level.

### Anti-Pattern 5: Warped time without reference cues
**What:** Changing the time axis without a visible metric-duration reference.  
**Why bad:** Burst analysis becomes visually persuasive but quantitatively wrong.  
**Instead:** Keep warped and unwarped cues visible together.

## Scalability Considerations

| Concern | At small data | At large data | At very large data |
|---------|---------------|---------------|--------------------|
| Data fetch / parse | Simple Arrow parse in hook | Stream or chunk more aggressively | Push more aggregation server-side |
| Shared selection state | Single coordination store is fine | Still fine if selectors stay narrow | Split state into focused slices |
| Temporal recomputation | Recompute on every control change | Debounce and workerize | Cache outputs and reuse partial results |
| Rendering textures | Rebuild on scaling changes | Pool / reuse textures | Minimize texture churn and transfer size |
| Timeline component size | Monolithic but manageable | Extract sub-panels and hooks | Make timeline a composition of smaller views |

## Suggested Build Order

1. **Shared task contracts first**  
   Stabilize types for records, time slices, warp outputs, warnings, and support metadata.

2. **Overview surface and temporal windows**  
   Build the density projection, timeline slider, and summary cues before deeper interactions.

3. **Trace and comparison synchronization**  
   Tighten the selection/brush/reconciliation path so the 2D and 3D views always agree.

4. **Workerized burst analysis**  
   Move expensive scaling and burst calculations behind a typed worker contract.

5. **Support overlays and hardening**  
   Add hotspot, guidance, provenance, and performance support after the main interaction loop is stable.

## Fragile Boundaries to Protect

| Seam | Why brittle | Protect by |
|------|-------------|------------|
| `useCoordinationStore` -> overview/cube/timeline | Cross-panel feedback loops | Keep actions explicit; test end-to-end selection sync |
| Store -> typed worker messages | Serialization and schema drift | Define a versioned message contract |
| `DataTexture` lifecycle -> 3D view | Memory leaks and churn | Centralize texture creation/disposal |
| API routes -> support overlays | Users may not know what is inferred or optional | Surface rationale and provenance in the UI |
| Startup boot sequence -> all views | Partially initialized app state | Gate interactions on readiness checks |

## Architecture Implications for Roadmap

- Early phases should target **overview, trace, and burst-task boundaries** before new support features.
- Any work touching 2D/3D sync should be treated as **high-coupling**.
- Performance work should prioritize **worker contracts and render cleanup** over micro-optimizing component code.
- Data validation and explicit support states are a prerequisite for trustworthy analytics UX.

## Sources

- `.planning/PROJECT.md`
- `README.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
