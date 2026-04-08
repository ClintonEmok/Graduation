# STKDE Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
src/
├── lib/
│   └── stkde/                    # Core STKDE library
│       ├── contracts.ts           # TypeScript interfaces & validation
│       ├── compute.ts             # STKDE computation engine
│       ├── compute.test.ts        # Computation tests
│       ├── full-population-pipeline.ts    # Full population mode
│       └── full-population-pipeline.test.ts
│
├── store/
│   └── useStkdeStore.ts           # Zustand store for STKDE state
│   └── useStkdeStore.test.ts      # Store tests
│
├── workers/
│   └── stkdeHotspot.worker.ts    # Web Worker for client filtering
│   └── stkdeHotspot.worker.test.ts
│
├── components/
│   └── stkde/
│       └── DashboardStkdePanel.tsx  # Dashboard integration panel
│   └── map/
│       └── MapStkdeHeatmapLayer.tsx # MapLibre heatmap layer
│
├── app/
│   ├── stkde/                    # Dedicated STKDE exploration route
│   │   ├── page.tsx              # Route entry point
│   │   ├── page.stkde.test.ts    # Route tests
│   │   └── lib/
│   │       ├── StkdeRouteShell.tsx       # Main route component
│   │       ├── HotspotPanel.tsx           # Hotspot list panel
│   │       ├── stkde-query-state.ts       # URL query state management
│   │       └── stkde-view-model.ts        # View model transformers
│   │
│   ├── api/
│   │   └── stkde/
│   │       └── hotspots/
│   │           ├── route.ts      # POST /api/stkde/hotspots
│   │           └── route.test.ts
│   │
│   └── dashboard-v2/
│       └── hooks/
│           └── useDashboardStkde.ts  # Dashboard integration hook
│
└── app/
    └── dashboard-v2/
        └── page.stkde.test.ts    # Dashboard STKDE integration tests
```

## File Purposes

### Core Library (`src/lib/stkde/`)

| File | Purpose |
|------|---------|
| `contracts.ts` | TypeScript interfaces for request/response, validation logic, constants |
| `compute.ts` | STKDE algorithm implementation - grid building, intensity calculation, hotspot detection |
| `full-population-pipeline.ts` | Database aggregation pipeline for full-population compute mode |

### State Management (`src/store/`)

| File | Purpose |
|------|---------|
| `useStkdeStore.ts` | Zustand store managing params, results, run status, selection state |

### Workers (`src/workers/`)

| File | Purpose |
|------|---------|
| `stkdeHotspot.worker.ts` | Web Worker for client-side hotspot filtering and projection |

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `stkde/DashboardStkdePanel.tsx` | Integration panel in main dashboard |
| `map/MapStkdeHeatmapLayer.tsx` | MapLibre GL heatmap and hotspot marker rendering |

### Pages (`src/app/`)

| Path | Purpose |
|------|---------|
| `/stkde` | Dedicated STKDE exploration route with full UI |
| `/api/stkde/hotspots` | Backend API endpoint for STKDE computation |
| `/dashboard-v2` | Main dashboard with STKDE panel integration |

### Hooks (`src/app/dashboard-v2/hooks/`)

| File | Purpose |
|------|---------|
| `useDashboardStkde.ts` | Hook integrating STKDE with dashboard state (viewport, slices, filters) |

## Key Entry Points

**API Endpoint:**
- `src/app/api/stkde/hotspots/route.ts` - POST handler for STKDE computation

**Dedicated Route:**
- `src/app/stkde/page.tsx` → `StkdeRouteShell.tsx` - Full STKDE exploration UI

**Dashboard Integration:**
- `src/components/stkde/DashboardStkdePanel.tsx` - Embedded panel in dashboard

## Where to Add New Code

### New STKDE Algorithm Variant
- Add to `src/lib/stkde/compute.ts` or create new file in `src/lib/stkde/`
- Export compute function matching `ComputeStkdeOutput` interface
- Add to API route switch statement

### New STKDE Visualization
- Add MapLibre layer component to `src/components/map/`
- Reference in `StkdeRouteShell.tsx` or `MapVisualization.tsx`

### New STKDE Parameters
- Add to `StkdeParams` interface in `useStkdeStore.ts`
- Add validation in `validateAndNormalizeStkdeRequest()` in `contracts.ts`
- Add limits to `STKDE_PARAM_LIMITS`
- Add UI control in `StkdeRouteShell.tsx`

### New Client-Side Filtering
- Add filter logic to `src/workers/stkdeHotspot.worker.ts`
- Update `StkdeWorkerInput` interface
- Pass filters from UI components

---

*Structure analysis: 2026-03-30*
