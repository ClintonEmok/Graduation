# Technology Stack

**Project:** Space-Time Cube Interactive Visualization Prototype  
**Researched:** January 30, 2026  
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x | App framework | App Router is now stable with improved caching (uncached-by-default), Server Actions, and Turbopack. Industry standard for React production apps. | HIGH |
| React | 19.x | UI library | Required for React Three Fiber v9. Concurrent features improve rendering performance for complex UIs. | HIGH |
| TypeScript | 5.x | Type safety | Essential for complex visualization code—catches coordinate system errors, state shape issues at compile time. | HIGH |

**Rationale:** Next.js 15 with App Router provides the optimal balance of:
- Server Components for non-3D UI (lighter bundles)
- Client Components where needed (3D canvas, interactive controls)
- API routes for backend integration
- Built-in image/font optimization

### 3D Rendering Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Three.js | 0.182.x (r182) | 3D engine | Latest stable release. Foundation for all WebGL/WebGPU rendering. | HIGH |
| @react-three/fiber | 9.x | React renderer for Three.js | Declarative Three.js in React. v9 pairs with React 19, has improved performance. | HIGH |
| @react-three/drei | 9.x | R3F utilities | Essential helpers: OrbitControls, CameraControls, Html, Line, Text, performance tools. Actively maintained. | HIGH |

**Rationale:** React Three Fiber is the standard approach for Three.js in React ecosystems. It provides:
- Declarative scene graph that integrates with React state
- Automatic render loop management
- Drei library provides battle-tested controls and utilities
- Excellent TypeScript support

**Version Compatibility Matrix:**
```
react@19 + @react-three/fiber@9 + three@0.182.x
react@18 + @react-three/fiber@8 + three@0.170.x
```

**Next.js Integration Requirements:**
```javascript
// next.config.js
transpilePackages: ['three'],
```
- Must use `"use client"` directive on any component using R3F Canvas
- Use `next/dynamic` with `ssr: false` for 3D components to avoid hydration issues

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.x | Global UI state | Simple API, works outside React (for Three.js callbacks), excellent DevTools, tiny bundle. Created by same team as R3F. | HIGH |
| Jotai | 2.x | Fine-grained reactive state (alternative) | Atomic model ideal for highly granular updates if needed. | MEDIUM |

**Recommendation: Zustand** for this project because:
1. **Same ecosystem** - Created by pmndrs (same team as R3F/drei), designed to work with Three.js
2. **Simpler mental model** - Centralized store works well for coordinated views (all views read from same source of truth)
3. **Works outside React** - Can call store methods from Three.js render loops without hooks
4. **Selective subscriptions** - Components only re-render when their slice changes

**State Architecture Pattern:**
```typescript
// Shared state for bidirectional sync across views
interface VisualizationState {
  // Selection state (synced across all views)
  selectedTimeRange: [Date, Date];
  selectedSpatialBounds: BoundingBox | null;
  hoveredPoint: DataPoint | null;
  
  // View configuration
  timeScaleMode: 'linear' | 'adaptive';
  spatialViewMode: 'map' | 'abstract';
  
  // Data
  filteredData: DataPoint[];
  
  // Actions
  setTimeRange: (range: [Date, Date]) => void;
  setSpatialBounds: (bounds: BoundingBox | null) => void;
}
```

### Data Fetching & Caching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | 5.x | Server state management | Caching, background refetching, pagination support. Decouples server state from UI state. | HIGH |
| Axios | 1.x | HTTP client | Cleaner API than fetch for complex requests, interceptors for auth. | MEDIUM |

**Rationale:** TanStack Query handles:
- Caching large dataset responses (avoid refetching 100K+ crime records)
- Pagination/infinite queries for progressive data loading
- Background updates for real-time data scenarios
- Request deduplication

### 2D Spatial Visualization (Map)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MapLibre GL JS | 5.x | 2D map rendering | Open-source fork of Mapbox GL. No API key required for self-hosted tiles. | HIGH |
| react-maplibre | 0.x | React bindings | Official React wrapper from vis.gl team. Declarative map layers. | HIGH |

**Why MapLibre over Mapbox:**
- **Open source** - BSD license, no vendor lock-in
- **No usage fees** - Mapbox charges per map load
- **API compatible** - Easy to switch from existing Mapbox code
- **Active community** - v5 released with Globe view, 3D terrain

**Alternative Considered: deck.gl**
- deck.gl is excellent for 100K+ point visualization with GPU acceleration
- However, for this project: MapLibre + simple overlay is sufficient for Chicago crime data
- deck.gl adds complexity; use only if performance demands it

### Timeline/Scale Libraries

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| D3 (d3-scale, d3-time, d3-axis) | 7.x | Scale calculations | Industry standard for time scales, domain/range mapping. Do NOT use D3 for rendering. | HIGH |

**Integration Pattern:** D3 for math, React for rendering:
```typescript
// Use D3 scales for calculations
import { scaleTime, scaleLinear } from 'd3-scale';

const timeScale = scaleTime()
  .domain([startDate, endDate])
  .range([0, width]);

// React renders the axis/timeline UI
// D3 only provides the mathematical transformations
```

**Rationale:**
- D3's time scales handle calendar complexities (variable month lengths, DST, leap years)
- `scaleTime().ticks()` generates intelligent tick marks based on zoom level
- `scaleTime().nice()` rounds domain to human-readable boundaries

### Debug & Development Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Leva | 0.10.x | Real-time GUI controls | Tweak parameters live without code changes. Essential for tuning visualization. Same pmndrs ecosystem. | HIGH |
| r3f-perf | 7.x | R3F performance monitor | FPS, draw calls, memory. Critical for 3D optimization. | HIGH |
| React DevTools | latest | React debugging | Component tree, state inspection | HIGH |

**Leva Usage:**
```typescript
import { useControls } from 'leva';

const { cubeHeight, pointSize } = useControls({
  cubeHeight: { value: 100, min: 50, max: 500 },
  pointSize: { value: 2, min: 0.5, max: 10 },
});
```

### Backend API

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.12+ | Backend runtime | Best ecosystem for data processing | HIGH |
| FastAPI | 0.115+ | API framework | Async, automatic OpenAPI docs, Pydantic validation | HIGH |
| fastapi-pagination | 0.15+ | Pagination | Cursor-based pagination for large datasets | HIGH |
| Pandas | 2.x | Data processing | Crime dataset loading, filtering, aggregation | HIGH |
| DuckDB | 1.x | Embedded analytics DB | Faster than Pandas for 100K+ row queries, SQL interface | MEDIUM |

**API Design for Large Datasets:**
```python
# Cursor-based pagination for crime data
@app.get("/api/crimes")
async def get_crimes(
    time_start: datetime,
    time_end: datetime,
    bounds: Optional[BoundingBox] = None,
    limit: int = 10000,
    cursor: Optional[str] = None
) -> CrimePage:
    ...
```

**Rationale:**
- **Cursor pagination** over offset - maintains consistency as data updates
- **Server-side filtering** - send only visible data to frontend
- **Aggregation endpoints** - return pre-computed density for heatmaps

### User Study / Interaction Logging

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom event logger | - | Interaction capture | Research-specific, privacy-preserving | HIGH |
| PostHog (optional) | - | Analytics platform | Open-source, self-hostable, session replay | MEDIUM |

**Custom Logging Approach (Recommended for Research):**
```typescript
interface InteractionEvent {
  timestamp: number;
  sessionId: string;
  eventType: 'selection' | 'navigation' | 'filter' | 'hover';
  view: 'cube' | 'timeline' | 'map';
  payload: Record<string, unknown>;
}

// Log to backend API for later analysis
const logInteraction = (event: Omit<InteractionEvent, 'timestamp' | 'sessionId'>) => {
  fetch('/api/log', {
    method: 'POST',
    body: JSON.stringify({
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    }),
  });
};
```

**Why custom over third-party:**
- Full control over data format for research analysis
- No data shared with external services (IRB compliance)
- Can capture domain-specific events (time range selections, scale changes)

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility styling | Fast iteration, consistent design tokens, tree-shaking | HIGH |
| shadcn/ui | latest | Component primitives | Accessible, unstyled base components. Copy-paste, not npm. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| 3D Engine | React Three Fiber | raw Three.js | R3F integrates better with React state, less boilerplate |
| 3D Engine | React Three Fiber | Babylon.js | Heavier, less React integration, smaller community for React |
| State | Zustand | Redux Toolkit | Overkill for this scope, more boilerplate |
| State | Zustand | Jotai | Atomic model adds complexity; centralized store simpler for coordinated views |
| Map | MapLibre GL | Mapbox GL | Mapbox requires API key & usage fees |
| Map | MapLibre GL | Leaflet | No WebGL, worse performance for large point sets |
| Map | MapLibre GL | deck.gl | deck.gl overkill unless >100K points need GPU acceleration |
| Backend | FastAPI | Next.js API Routes | Python better for data science workflows, Pandas integration |
| Backend | FastAPI | Express/Node | Python ecosystem better for dataset manipulation |
| Timeline | D3 scales | visx | visx is heavier, D3 scales are all we need for math |
| Timeline | D3 scales | Chart.js | Not flexible enough for custom timeline rendering |

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Redux | Excessive boilerplate for this project scope |
| MobX | Observable patterns conflict with R3F's render loop |
| Recoil | Discontinued by Meta, use Jotai if atomic needed |
| react-three-a11y | Deprecated, accessibility handled differently now |
| Mapbox GL JS v2+ | Proprietary license, API key costs |
| Create React App | Deprecated, use Next.js or Vite |
| Webpack (manual) | Use Next.js's built-in bundling |
| react-map-gl | Works but react-maplibre is more actively maintained for MapLibre |

---

## Installation

```bash
# Core Framework
npx create-next-app@latest --typescript --tailwind --app

# 3D Rendering
npm install three @react-three/fiber @react-three/drei

# State & Data
npm install zustand @tanstack/react-query axios

# 2D Map
npm install maplibre-gl react-maplibre

# Scales & Visualization Math
npm install d3-scale d3-time d3-array

# Debug Tools
npm install leva r3f-perf

# Dev Dependencies
npm install -D @types/three @types/d3-scale @types/d3-time
```

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  experimental: {
    turbo: {
      // Turbopack is now default in Next.js 15
    },
  },
};

module.exports = nextConfig;
```

### R3F Component Pattern

```typescript
// components/SpaceTimeCube.tsx
"use client";

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import dynamic from 'next/dynamic';

// Wrap in dynamic import for SSR safety
const SpaceTimeCubeCanvas = () => (
  <Canvas camera={{ position: [5, 5, 5] }}>
    <ambientLight intensity={0.5} />
    <OrbitControls />
    {/* Cube contents */}
  </Canvas>
);

export default dynamic(() => Promise.resolve(SpaceTimeCubeCanvas), {
  ssr: false,
});
```

---

## Version Pinning Strategy

For a research prototype, pin to specific versions to ensure reproducibility:

```json
{
  "dependencies": {
    "next": "15.1.x",
    "react": "19.0.x",
    "three": "0.182.x",
    "@react-three/fiber": "9.5.x",
    "@react-three/drei": "9.x",
    "zustand": "5.0.x",
    "@tanstack/react-query": "5.x",
    "maplibre-gl": "5.x",
    "d3-scale": "4.x",
    "d3-time": "3.x"
  }
}
```

---

## Sources

### High Confidence (Official Documentation)
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber (installation docs confirm R3F v9 pairs with React 19)
- npm @react-three/fiber: https://www.npmjs.com/package/@react-three/fiber (v9.5.0 current)
- Three.js releases: https://github.com/mrdoob/three.js/releases (r182 latest)
- TanStack Query: https://tanstack.com/query (v5 current)
- D3 Scales: https://d3js.org/d3-scale
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/guides/mapbox-migration-guide/

### Medium Confidence (Verified Community Sources)
- Next.js 15 best practices: Multiple 2025 articles confirm App Router stability, Turbopack default
- Zustand vs Jotai comparisons: 2025 state management articles confirm Zustand for centralized state
- deck.gl React Summit 2025 talk: Confirms deck.gl for large-scale geospatial, GPU acceleration

### Research/Logging
- Slack Engineering: Creating a React Analytics Logging Library
- ielab Big Brother: Research-focused interaction logging

---

## Confidence Assessment Summary

| Component | Confidence | Notes |
|-----------|------------|-------|
| Next.js 15 + React 19 | HIGH | Verified via official docs, production stable |
| R3F v9 + Three.js r182 | HIGH | Verified via npm, official R3F docs |
| Zustand | HIGH | Standard for R3F projects, same ecosystem |
| TanStack Query v5 | HIGH | Verified via official site |
| MapLibre GL | HIGH | Verified open-source, v5 released |
| D3 scales | HIGH | Industry standard, verified via d3js.org |
| FastAPI + pagination | HIGH | Verified via PyPI |
| Custom interaction logging | MEDIUM | Standard approach but implementation-specific |
| Leva | HIGH | Same pmndrs ecosystem, actively maintained |
