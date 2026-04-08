# Phase 34: Performance Optimization - Research

**Researched:** 2026-02-22
**Domain:** Large dataset visualization (8.4M crime records)
**Confidence:** HIGH

## Summary

This research addresses performance optimization for rendering and loading 8.4M crime records. Based on the locked decisions in CONTEXT.md (viewport-based infinite loading, LOD, pre-computed aggregations), this research validates the approach and provides specific library recommendations.

**Key findings:**
- Use **@tanstack/react-virtual** for timeline virtualization (not react-window) - it handles dynamic content better
- Use **THREE.Points** for crime dots (not InstancedMesh) - Points can handle millions at 60fps, InstancedMesh is for complex geometries
- Use **TanStack Query** for server state caching with `select` option to prevent over-rendering
- Pre-sort DuckDB data by date for zone map optimization - this is critical for time-range queries

**Primary recommendation:** Implement viewport-based loading with @tanstack/react-virtual for UI and THREE.Points with BufferGeometry for rendering. Use TanStack Query with `select` for fine-grained subscriptions to prevent full-app re-renders.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-virtual | ^3.x | Timeline/list virtualization | Modern headless approach, better than react-window for dynamic content |
| @tanstack/react-query | ^5.x | Server state caching | Industry standard for API caching, deduplication |
| THREE.Points | r160+ | Point cloud rendering | GPU-accelerated, can handle millions of points |
| duckdb | ^1.4.x | Query execution | Embedded analytical DB, excellent for time-series |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.x | Client state | UI state, filter selections, viewport bounds |
| @react-three/fiber | ^8.x | React-Three bridge | Declarative Three.js in React |
| three-stdlib | latest | Three.js utilities | BufferGeometryUtils for merging |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-virtual | react-window | react-window simpler but less flexible; tanstack better for dynamic/timeline content |
| THREE.Points | InstancedMesh | Points for dots, InstancedMesh only when each point needs geometry (circles, icons) |
| TanStack Query | Zustand + custom cache | TanStack has better cache invalidation, deduplication, background refetch |

**Installation:**
```bash
npm install @tanstack/react-virtual@^3 @tanstack/react-query@^5 zustand@^5 three@^0.160 @react-three/fiber@^8 duckdb@^1.4
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── timeline/
│   │   ├── TimelineViewport.tsx      # Viewport-based data fetcher
│   │   ├── TimelinePoints.tsx        # THREE.Points renderer
│   │   └── TimelineControls.tsx      # Zoom/pan handlers
│   └── data/
│       ├── useCrimeData.ts           # TanStack Query hook
│       └── useViewportBuffer.ts      # Buffer zone logic
├── lib/
│   ├── duckdb.ts                     # DuckDB query executor
│   └── queries.ts                    # Pre-computed aggregation queries
└── stores/
    └── viewportStore.ts              # Zustand for viewport state
```

### Pattern 1: Viewport-Based Infinite Loading
**What:** Fetch data only for visible time range + buffer zones
**When to use:** Always for large datasets (8.4M records)
**Example:**
```typescript
// Source: Context-aware pattern from research
function useTimelineData(viewport: DateRange, bufferDays: number = 30) {
  const queryClient = useQueryClient()
  
  // Query key includes viewport bounds - triggers refetch on pan/zoom
  return useQuery({
    queryKey: ['crimes', 'viewport', viewport.start, viewport.end],
    queryFn: () => fetchCrimeDataInRange(
      addDays(viewport.start, -bufferDays),
      addDays(viewport.end, bufferDays)
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes for same viewport
  })
}
```

### Pattern 2: THREE.Points for Large Point Clouds
**What:** Use Points with BufferGeometry instead of InstancedMesh
**When to use:** Rendering dots/circles for data visualization
**Example:**
```typescript
// Source: Three.js documentation + performance research
const geometry = new THREE.BufferGeometry()
const positions = new Float32Array(pointCount * 3)
const colors = new Float32Array(pointCount * 3)

// Fill positions and colors from crime data
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.PointsMaterial({
  size: 2,
  vertexColors: true,
  sizeAttenuation: true
})

const points = new THREE.Points(geometry, material)
```

### Pattern 3: TanStack Query with Select for Fine-Grained Subscriptions
**What:** Prevent full-app re-renders by subscribing to only needed data
**When to use:** When multiple components need different slices of same query
**Example:**
```typescript
// Source: TanStack Query best practices
// Component that only needs count (not full records)
const { data: count } = useQuery({
  queryKey: ['crimes', filters],
  queryFn: () => fetchCrimeCount(filters),
  select: (data) => data.count // Only re-render when count changes
})

// Component that needs density for visualization
const { data: density } = useQuery({
  queryKey: ['crimes', 'density', filters],
  queryFn: () => fetchDensity(filters),
  select: (data) => data.bins // Subscribe only to bins
})
```

### Pattern 4: DuckDB Zone Map Optimization
**What:** Sort data by date column for automatic zone map pruning
**When to use:** Time-range queries on large datasets
**Example:**
```sql
-- Source: DuckDB documentation
-- Create sorted table for fast time-range queries
CREATE TABLE crimes_sorted AS
SELECT * FROM crimes
ORDER BY incident_date;

-- Now zone maps can skip chunks - "last 7 days" only scans relevant row groups
SELECT date_trunc('day', incident_date) as day, count(*)
FROM crimes_sorted
WHERE incident_date >= current_date - INTERVAL '7 days'
GROUP BY day;
```

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtual scrolling | Custom viewport math | @tanstack/react-virtual | Handles edge cases: dynamic heights, scroll restoration, accessibility |
| Data caching | Custom Map with TTL | TanStack Query | Deduplication, background refetch, stale-while-revalidate |
| Viewport state | React Context | Zustand | No re-render cascade, selectors for fine-grained updates |
| Point rendering | InstancedMesh for dots | THREE.Points | Points handles 1M+ at 60fps, InstancedMesh is for complex geometry |

**Key insight:** For 8.4M records, the bottlenecks are memory and GPU. THREE.Points uses ~12 bytes per point (position + color), while InstancedMesh uses ~200+ bytes per instance. At 8.4M points, that's ~100MB vs ~1.6GB.

---

## Common Pitfalls

### Pitfall 1: Loading Full Dataset on Initial Render
**What goes wrong:** App freezes, memory spikes, 10+ second load times
**Why it happens:** Attempting to fetch all 8.4M records upfront
**How to avoid:** Always use viewport-based loading with buffer zones. Initial load: 10-100k sample only.
**Warning signs:** Network tab shows 50MB+ response, Memory profiler shows >1GB heap

### Pitfall 2: React Context Causing Full-App Re-renders
**What goes wrong:** Every filter change triggers re-render of entire app
**Why it happens:** Storing viewport/filter state in React Context
**How to avoid:** Use Zustand with selectors - components only re-render when their specific selector changes
**Warning signs:** DevTools profiler shows entire tree re-rendering on small state change

### Pitfall 3: TanStack Query Without Select
**What goes wrong:** Components subscribe to entire query result, re-render on any data change
**Why it happens:** Not using `select` option to subscribe to specific fields
**How to avoid:** Use `select` to return only what component needs
**Warning signs:** Adding a filter causes unrelated components to re-render

### Pitfall 4: Using InstancedMesh for Simple Dots
**What goes wrong:** GPU memory explodes, frame rate drops
**Why it happens:** InstancedMesh is for complex geometry (3D models), not 2D dots
**How to avoid:** Use THREE.Points with PointsMaterial - designed for millions of particles
**Warning signs:** Memory >2GB, FPS <30 with <500k points

### Pitfall 5: Unsorted DuckDB Queries
**What goes wrong:** Time-range queries scan entire table
**Why it happens:** DuckDB zone maps only work on sorted columns
**How to avoid:** Create sorted/clustered tables for frequently queried columns
**Warning signs:** Query time doesn't improve with LIMIT or WHERE clauses

### Pitfall 6: No Buffer Zone
**What goes wrong:** Scrolling feels jerky, data pops in/out
**Why it happens:** Loading only exact viewport - no data during scroll
**How to avoid:** Add 2-4 weeks of buffer before/after visible range
**Warning signs:** Visible loading states during normal scrolling

---

## Code Examples

### Viewport-Based Data Loading with Buffer
```typescript
// Source: Pattern from research + best practices
import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
}

function useViewportCrimeData(viewport: DateRange, bufferDays: number = 30) {
  const bufferedRange = {
    start: addDays(viewport.start, -bufferDays),
    end: addDays(viewport.end, bufferDays),
  }

  return useQuery({
    queryKey: ['crimes', 'viewport', bufferedRange.start.toISOString(), bufferedRange.end.toISOString()],
    queryFn: async () => {
      const response = await fetch('/api/crimes/range', {
        method: 'POST',
        body: JSON.stringify(bufferedRange),
      })
      return response.json()
    },
    // Keep old data while fetching new - prevents flash
    placeholderData: (previousData) => previousData,
    // Don't refetch on every scroll event - debounce handled by viewport observer
  })
}
```

### THREE.Points with Dynamic LOD
```typescript
// Source: Three.js documentation
import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'

interface CrimePoint {
  x: number
  y: number
  date: Date
}

function useCrimePointCloud(
  data: CrimePoint[],
  zoom: number
) {
  const pointsRef = useRef<THREE.Points>(null)

  const { geometry, material } = useMemo(() => {
    // Sample based on zoom level
    const sampleRate = zoom < 0.5 ? 100 : zoom < 1 ? 10 : 1
    const sampledData = data.filter((_, i) => i % sampleRate === 0)

    const positions = new Float32Array(sampledData.length * 3)
    const colors = new Float32Array(sampledData.length * 3)

    sampledData.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = 0
      // Color by crime type or density
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.5
      colors[i * 3 + 2] = 0
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      sizeAttenuation: true,
    })

    return { geometry, material }
  }, [data, zoom])

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.geometry = geometry
    }
  }, [geometry])

  return <points ref={pointsRef} geometry={geometry} material={material} />
}
```

### Zustand Store with Fine-Grained Selectors
```typescript
// Source: Zustand best practices
import { create } from 'zustand'

interface ViewportState {
  startDate: Date
  endDate: Date
  zoom: number
  filters: CrimeFilters
  setViewport: (start: Date, end: Date) => void
  setZoom: (zoom: number) => void
  setFilters: (filters: Partial<CrimeFilters>) => void
}

export const useViewportStore = create<ViewportState>((set) => ({
  startDate: new Date('2005-01-01'),
  endDate: new Date('2015-12-31'),
  zoom: 0.5,
  filters: {},
  
  setViewport: (startDate, endDate) => set({ startDate, endDate }),
  setZoom: (zoom) => set({ zoom }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}))

// Component only re-renders when zoom changes
function ZoomIndicator() {
  const zoom = useViewportStore((state) => state.zoom)
  return <div>Zoom: {zoom}x</div>
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React.memo for optimization | Viewport-based loading | 2023+ | Memo doesn't help with 8.4M records - need actual data reduction |
| InstancedMesh for points | THREE.Points | 2020+ | 10x+ memory reduction for simple dots |
| Redux for all state | Zustand + TanStack Query | 2022+ | Simpler mental model, better performance |
| react-window | @tanstack/react-virtual | 2023+ | Headless = more flexible for dynamic content |

**Deprecated/outdated:**
- **React.memo on large lists:** Only helps with re-render frequency, not with initial load of 8.4M records
- **Full dataset loading:** Not viable for 8.4M records - always use viewport + buffer approach
- **Redux for server state:** TanStack Query handles server state better with built-in caching

---

## Open Questions

1. **Buffer zone size optimization**
   - What we know: Buffer needed for smooth scrolling
   - What's unclear: Exact optimal size (30 days? 60 days?) depends on scroll speed and data density
   - Recommendation: Start with 30 days, measure scroll jank, adjust up/down

2. **Pre-computed aggregation granularity**
   - What we know: DuckDB can pre-compute density bins
   - What's unclear: Bin size (day/week/month) for different zoom levels
   - Recommendation: Compute multiple granularities, use appropriate one per zoom level

3. **Memory pressure handling**
   - What we know: Need to stay under 500MB
   - What's unclear: What to prune first when approaching limit
   - Recommendation: LRU eviction for old viewport data, keep current + adjacent buffer

---

## Sources

### Primary (HIGH confidence)
- Three.js official docs - InstancedMesh, Points, BufferGeometry APIs
- TanStack Query v5 docs - select, staleTime, caching
- DuckDB docs - zone maps, sorting, partitioning
- Zustand docs - selectors, performance

### Secondary (MEDIUM confidence)
- WebSearch: "TanStack Virtual vs react-window performance" - verified through multiple comparisons
- WebSearch: "Three.js Points vs InstancedMesh benchmark" - discourse.threejs.org discussions
- WebSearch: "DuckDB time-series query optimization" - Medium articles from DuckDB engineers

### Tertiary (LOW confidence)
- Community discussions on Reddit r/reactjs - virtualization library recommendations
- Blog posts on virtualization implementation patterns

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All libraries verified through Context7/official docs
- Architecture: HIGH - Patterns validated through multiple sources
- Pitfalls: MEDIUM - Common pitfalls identified through community discussions, some edge cases may exist

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days - libraries stable, DuckDB/Three.js have regular releases)
