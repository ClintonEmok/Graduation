# Architecture Patterns for Linked Coordinated View Visualization Systems

**Domain:** Spatiotemporal visualization with 3D Space-Time Cube, 2D map, and 2D timeline
**Researched:** 2026-01-30
**Confidence:** MEDIUM-HIGH (verified via use-coordination official docs, React Three Fiber docs, CMV academic literature)

---

## Executive Summary

Linked coordinated view (CMV) visualization systems follow a well-established architectural pattern from information visualization research. The core idea is separating **coordination state** from **view implementation**, enabling views to be linked dynamically on arbitrary properties without direct coupling between view components.

For this project (3D Space-Time Cube + 2D Map + 2D Timeline), the recommended architecture uses:
- **Coordination Layer:** Centralized coordination space managing shared state (selection, filter, zoom, time range)
- **View Layer:** Independent view components that subscribe to coordination state
- **Data Layer:** Query service abstracting backend API with caching
- **Logging Layer:** Event telemetry for interaction analytics

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Shell                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Coordination Provider                         │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │              Coordination Space (Zustand store)             │ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│ │ │
│  │  │  │selection │ │timeRange │ │spatialBounds│ │zoomLevel       ││ │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│ │ │
│  │  │  │filter    │ │highlight │ │camera     │ │timeScale        ││ │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                         View Layer                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │ │
│  │  │  3D Space-  │  │   2D Map    │  │      2D Timeline        │  │ │
│  │  │  Time Cube  │  │  (Mapbox)   │  │        (D3)             │  │ │
│  │  │   (R3F)     │  │             │  │                         │  │ │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │ │
│  │         │                │                      │                │ │
│  │         └────────────────┼──────────────────────┘                │ │
│  │                          ▼                                       │ │
│  │              ┌───────────────────────┐                           │ │
│  │              │   Data Query Service  │                           │ │
│  │              │  (React Query cache)  │                           │ │
│  │              └───────────┬───────────┘                           │ │
│  │                          │                                       │ │
│  └──────────────────────────┼───────────────────────────────────────┘ │
│                             ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     Backend API Layer                            │ │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐   │ │
│  │  │ Query Endpoint│  │ Filter Endpoint  │  │ Aggregate Stats │   │ │
│  │  └───────────────┘  └──────────────────┘  └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     Interaction Logger                           │ │
│  │              (OpenTelemetry / Custom Events)                     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Coordination Provider
**Responsibility:** Manages the shared coordination space where all coordinated state lives.

| Aspect | Details |
|--------|---------|
| **Technology** | Zustand store (lightweight, React-native) OR use-coordination library |
| **State Owned** | selection, timeRange, spatialBounds, zoomLevel, filter, highlight, cameraState, timeScale |
| **Exposes** | `useCoordination(viewId, coordinationTypes)` hook |
| **Communicates With** | All view components (via React context/hooks) |

**Key Insight from Research:** The `use-coordination` library (IEEE VIS 2024) provides a proven model for CMV:
- Views subscribe to **coordination scopes** (named instances of coordination types)
- Multiple views can share the same scope = linked
- Different views can have different scopes = independent
- State is serializable to JSON (good for persistence/sharing)

**Coordination Types for This Project:**
```typescript
interface CoordinationSpace {
  // Selection coordination
  selectedIds: string[];           // Currently selected data items
  hoveredId: string | null;        // Currently hovered item
  
  // Temporal coordination
  timeRange: [Date, Date];         // Visible time window
  timeScale: 'linear' | 'adaptive';// Scaling algorithm
  animationTime: Date | null;      // For playback
  
  // Spatial coordination  
  spatialBounds: GeoJSON.BBox;     // Visible map bounds
  mapZoom: number;
  mapCenter: [number, number];
  
  // 3D camera coordination
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  
  // Filter coordination
  activeFilters: FilterSpec[];     // Applied filters
  
  // Visibility
  layerVisibility: Record<string, boolean>;
}
```

### 2. 3D Space-Time Cube View
**Responsibility:** Renders spatiotemporal data as a 3D cube with X/Y as space and Z as time.

| Aspect | Details |
|--------|---------|
| **Technology** | React Three Fiber (R3F) with @react-three/drei helpers |
| **Reads From** | selection, timeRange, spatialBounds, filter, cameraPosition |
| **Writes To** | selection (on click), cameraPosition (on orbit), hoveredId (on hover) |
| **Communicates With** | Coordination Provider (via hooks), Data Query Service (for geometry) |

**Sub-components:**
- `<CubeContainer>` - Scene setup, lighting, controls
- `<DataPointCloud>` - Instanced meshes for performance
- `<TimeAxis>` - Z-axis with time labels
- `<SpatialPlane>` - XY base with map texture
- `<SelectionIndicator>` - Visual feedback for selection
- `<AdaptiveTimeScale>` - Algorithm for non-linear time mapping

**Performance Consideration:** Use instanced rendering for large datasets (>10k points). R3F supports this natively via `<Instances>`.

### 3. 2D Spatial Map View
**Responsibility:** Standard geographic map showing spatial distribution.

| Aspect | Details |
|--------|---------|
| **Technology** | react-map-gl (Mapbox/MapLibre) OR react-leaflet |
| **Reads From** | selection, spatialBounds, mapZoom, mapCenter, filter, timeRange |
| **Writes To** | selection (on click), spatialBounds/mapZoom/mapCenter (on pan/zoom), hoveredId |
| **Communicates With** | Coordination Provider, Data Query Service |

**Integration Note:** For 3D objects on map, consider `react-three-map` library which integrates R3F with Mapbox. However, for this project's space-time cube, keep them as separate views.

### 4. 2D Timeline View  
**Responsibility:** Linear or adaptive timeline showing temporal patterns.

| Aspect | Details |
|--------|---------|
| **Technology** | D3.js (for scales/axes) + React (for rendering), or visx |
| **Reads From** | selection, timeRange, filter, timeScale |
| **Writes To** | selection (on click), timeRange (on brush), hoveredId |
| **Communicates With** | Coordination Provider, Data Query Service |

**Sub-components:**
- `<TimelineAxis>` - D3 time scale with zoom/pan
- `<BrushOverlay>` - For time range selection
- `<EventMarkers>` - Data point visualization
- `<DensityPlot>` - Optional aggregated view

**Adaptive Time Scaling:** The timeline should support both linear and adaptive scaling. Adaptive scaling compresses sparse time periods and expands dense ones.

### 5. Data Query Service
**Responsibility:** Abstracts backend API, manages caching, handles query optimization.

| Aspect | Details |
|--------|---------|
| **Technology** | TanStack Query (React Query) |
| **Reads From** | timeRange, spatialBounds, filter (to form queries) |
| **Writes To** | Cached query results |
| **Communicates With** | Backend API, all view components |

**Query Patterns:**
```typescript
// Queries react to coordination state changes
const { data } = useQuery({
  queryKey: ['spatialData', timeRange, spatialBounds, filter],
  queryFn: () => api.queryData({ timeRange, spatialBounds, filter }),
  staleTime: 30000,
});
```

**Optimization for Large Datasets:**
- Server-side aggregation for overview
- Progressive loading (load nearby data first)
- Level-of-detail (LOD) based on zoom
- Debounce rapid coordination changes

### 6. Interaction Logger
**Responsibility:** Records user interactions for analytics/research.

| Aspect | Details |
|--------|---------|
| **Technology** | OpenTelemetry SDK OR custom event system |
| **Reads From** | All coordination state changes, user events |
| **Writes To** | Backend telemetry endpoint |
| **Communicates With** | Coordination Provider (subscribes to state changes) |

**Events to Log:**
- Selection changes (what, when, duration)
- View navigation (pan, zoom, rotate)
- Filter changes
- Time range brushing
- View switching/focus

---

## Data Flow Patterns

### Pattern 1: Unidirectional Coordination Flow

```
User Interaction → View Component → setCoordinationValue() → Zustand Store
                                                                    │
                                    ┌───────────────────────────────┘
                                    ▼
              All Views (via useCoordination hook) → Re-render with new values
```

**Key Principle:** Views never communicate directly. All coordination goes through the central store.

### Pattern 2: Selection Propagation

```
User clicks point in 3D Cube
    │
    ▼
SpaceTimeCube calls setSelectedIds(['point-123'])
    │
    ▼
Coordination store updates selectedIds
    │
    ├──▶ 2D Map receives new selectedIds → highlights corresponding marker
    ├──▶ Timeline receives new selectedIds → highlights corresponding event
    └──▶ 3D Cube receives new selectedIds → (already highlighted from local state)
```

### Pattern 3: Filter + Query Flow

```
User applies filter
    │
    ▼
FilterPanel calls setActiveFilters([...])
    │
    ▼
Coordination store updates activeFilters
    │
    ├──▶ All views see new filter state
    └──▶ Data Query Service sees dependency change
            │
            ▼
        React Query refetches with new filter params
            │
            ▼
        Views receive new data, re-render
```

### Pattern 4: Brushing & Linking

Brushing is the canonical CMV interaction pattern:

```
User brushes time range on Timeline (drag selection)
    │
    ▼
Timeline calls setTimeRange([startDate, endDate])
    │
    ▼
Coordination store updates timeRange
    │
    ├──▶ 3D Cube filters visible points to time range
    ├──▶ 2D Map filters visible markers to time range  
    └──▶ Timeline shows brush selection UI
```

---

## State Management Patterns

### Option A: Zustand (Recommended)

**Why Zustand:**
- Minimal boilerplate (unlike Redux)
- Works outside React components (useful for logging)
- Supports subscriptions for non-React code
- Small bundle size (~1KB)
- Used by pmndrs ecosystem (same as R3F)

**Store Structure:**
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CoordinationStore {
  // State
  selectedIds: string[];
  timeRange: [Date, Date];
  spatialBounds: [number, number, number, number];
  // ... other coordination state
  
  // Actions
  setSelectedIds: (ids: string[]) => void;
  setTimeRange: (range: [Date, Date]) => void;
  setSpatialBounds: (bounds: [number, number, number, number]) => void;
  // ... other setters
}

export const useCoordinationStore = create<CoordinationStore>()(
  subscribeWithSelector((set) => ({
    selectedIds: [],
    timeRange: [defaultStart, defaultEnd],
    spatialBounds: defaultBounds,
    
    setSelectedIds: (ids) => set({ selectedIds: ids }),
    setTimeRange: (range) => set({ timeRange: range }),
    setSpatialBounds: (bounds) => set({ spatialBounds: bounds }),
  }))
);
```

**Usage in Views:**
```typescript
function SpaceTimeCube() {
  const selectedIds = useCoordinationStore((state) => state.selectedIds);
  const setSelectedIds = useCoordinationStore((state) => state.setSelectedIds);
  
  const handleClick = (pointId: string) => {
    setSelectedIds([pointId]);
  };
  
  return <Canvas>...</Canvas>;
}
```

### Option B: use-coordination Library

For more complex coordination needs (meta-coordination, multi-level coordination):

```typescript
import { ZodCoordinationProvider, useCoordination } from '@use-coordination/all';

const spec = {
  coordinationSpace: {
    selection: { A: [] },
    timeRange: { A: [startDate, endDate] },
  },
  viewCoordination: {
    cube: { coordinationScopes: { selection: 'A', timeRange: 'A' } },
    map: { coordinationScopes: { selection: 'A', timeRange: 'A' } },
    timeline: { coordinationScopes: { selection: 'A', timeRange: 'A' } },
  },
};

function App() {
  return (
    <ZodCoordinationProvider spec={spec}>
      <SpaceTimeCube viewUid="cube" />
      <SpatialMap viewUid="map" />
      <Timeline viewUid="timeline" />
    </ZodCoordinationProvider>
  );
}

function SpaceTimeCube({ viewUid }) {
  const [{ selection }, { setSelection }] = useCoordination(viewUid, ['selection']);
  // ...
}
```

**Trade-off:** use-coordination adds complexity but provides:
- Dynamic coordination scope changes (views can be linked/unlinked at runtime)
- JSON-serializable state (good for saving/loading configurations)
- Multi-level coordination for hierarchical data

**Recommendation:** Start with plain Zustand. Add use-coordination later if dynamic view linking is needed.

---

## Build Order (Suggested Phases)

Based on component dependencies:

### Phase 1: Foundation
**Build:** Coordination store, basic app shell, project scaffolding
**Rationale:** All views depend on coordination infrastructure

### Phase 2: Single View (Timeline)
**Build:** 2D Timeline with D3
**Rationale:** Simplest view, establishes React+D3 patterns, tests coordination hooks

### Phase 3: Add Second View (Map)
**Build:** 2D Spatial Map with react-map-gl
**Rationale:** Tests bidirectional sync between two views, establishes map patterns

### Phase 4: Add 3D View
**Build:** 3D Space-Time Cube with React Three Fiber
**Rationale:** Most complex view, benefits from established coordination patterns

### Phase 5: Data Integration
**Build:** Backend API, Query Service, realistic data loading
**Rationale:** Views can initially use mock data; real data integration is complex

### Phase 6: Adaptive Algorithms
**Build:** Adaptive time scaling, LOD rendering, performance optimization
**Rationale:** Requires working views to test against

### Phase 7: Interaction Logging
**Build:** Event telemetry, analytics dashboard
**Rationale:** Can be added as cross-cutting concern after core functionality

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct View-to-View Communication
**What:** Views calling methods or passing props directly to other views
**Why Bad:** Creates coupling, makes adding/removing views difficult
**Instead:** All coordination through central store

### Anti-Pattern 2: Event-Based Coordination in React
**What:** Using custom events or pub/sub for view coordination
**Why Bad:** Bypasses React's rendering model, causes synchronization bugs
**Instead:** Use React state (Zustand) with hooks

### Anti-Pattern 3: Lifting All State to Parent
**What:** Keeping all view state in a common parent, prop drilling to views
**Why Bad:** Deeply nested props, all views re-render on any change
**Instead:** External store with selective subscriptions

### Anti-Pattern 4: Unthrottled Coordination Updates
**What:** Every mouse move updates coordination state
**Why Bad:** Causes render thrashing, poor performance
**Instead:** Debounce/throttle rapid updates (especially for pan/zoom)

### Anti-Pattern 5: Synchronous Data Loading on Coordination Change
**What:** Blocking render while fetching new data on filter change
**Why Bad:** UI freezes, poor UX
**Instead:** Async loading with loading states, keep stale data visible during fetch

---

## Scalability Considerations

| Concern | At 1K points | At 100K points | At 1M+ points |
|---------|--------------|----------------|---------------|
| **3D Rendering** | Regular meshes | Instanced meshes | GPU instancing + LOD |
| **Map Markers** | GeoJSON layer | Clustered markers | Vector tiles + server aggregation |
| **Timeline** | Individual marks | Density aggregation | Server-side binning |
| **Data Loading** | Load all | Paginated/windowed | Streaming + progressive |
| **Selection** | Array of IDs | Set for O(1) lookup | Bitmap/bloom filter |
| **Filtering** | Client-side | Hybrid | Server-side with cache |

---

## Integration Points

### 3D Cube + Map Synchronization
The 3D cube's XY plane corresponds to the 2D map. Keep them aligned:
- Cube spatial bounds = Map viewport bounds
- Consider projecting map as texture on cube base plane

### Timeline + Cube Z-Axis Synchronization  
The timeline's X-axis corresponds to the cube's Z-axis (time):
- Timeline brush range = Cube visible Z range
- Adaptive time scale applies to both simultaneously

### Camera Synchronization (Optional)
For advanced linking:
- Map pan/zoom can update cube camera (top-down view)
- Cube rotation is independent (3D-specific)

---

## Sources

| Source | Confidence | Used For |
|--------|------------|----------|
| [use-coordination documentation](https://use-coordination.dev/) | HIGH | Coordination model, hooks API |
| [IEEE VIS 2024: Use-Coordination Paper](https://doi.org/10.1109/VIS55277.2024.00041) | HIGH | Theoretical foundation |
| [React Three Fiber docs](https://docs.pmnd.rs/react-three-fiber) | HIGH | 3D rendering patterns |
| [Zustand GitHub](https://github.com/pmndrs/zustand) | HIGH | State management patterns |
| [CMV State of the Art (Roberts 2007)](https://kar.kent.ac.uk/14569/) | MEDIUM | Academic CMV architecture |
| [react-three-map](https://github.com/RodrigoHamuy/react-three-map) | MEDIUM | R3F + Mapbox integration option |
| [Martin Fowler: Observer Synchronization](https://martinfowler.com/eaaDev/MediatedSynchronization.html) | MEDIUM | General coordination pattern |
| [OpenTelemetry React](https://signoz.io/blog/opentelemetry-react/) | MEDIUM | Interaction logging patterns |

---

## Gaps to Address in Later Phases

1. **Adaptive Time Scaling Algorithm** - Needs deeper research on specific algorithms (fisheye, semantic zoom)
2. **LOD Strategy for 3D** - Needs profiling with actual data to determine thresholds
3. **Backend Query Optimization** - Depends on actual data schema and database choice
4. **Accessibility** - 3D views have inherent accessibility challenges; needs specific research
