# Phase 3 Plan 1: Integration Milestone - Context

## Project Overview

The neon-tiger project is a crime analysis application using Chicago crime data. It features:
- 3D space-time cube visualization
- 2D map with multiple layers
- Adaptive time scaling
- STKDE hotspot detection

## Current Architecture

### Pages/Routes
- `/` - Landing page with route links
- `/dashboard` - Main dashboard (Map + Cube + Timeline + Controls)
- `/timeline-test` - Timeline testing
- `/timeline-test-3d` - 3D timeline view
- `/timeslicing` - Timeslicing UI with suggestions
- `/timeslicing-algos` - Algorithm diagnostics
- `/stats` - Statistics/analytics page
- `/stkde` - STKDE hotspot analysis

### Data Sources
- `data/sources/Crimes_-_2001_to_Present_20260114.csv` - Crime data
- `data/sources/Police_Stations_20260202.csv` - Police stations (can serve as POI)
- `data/cache/crime.duckdb` - Cached crime data

### Key Stores
- `useAdaptiveStore` - Adaptive time scaling
- `useSliceStore` - Time slice management
- `useFilterStore` - Filtering
- `useStkdeStore` - STKDE hotspots
- `useCoordinationStore` - Cross-component coordination

### Current Binning Implementation
Located in `src/utils/binning.ts` - Uses D3 with fixed 40 tick count:
```typescript
const binGenerator = bin()
  .domain(domain)
  .thresholds(ticks);
```

### Current Timeslicing
- Automatic via web worker (`adaptiveTime.worker.ts`)
- Computes density/burstiness maps
- Applies warp factor to compress/expand time

### Current Map
- Uses `react-map-gl` with MapLibre
- Layers: events, heatmap, clusters, trajectories, selection
- No OSM tiles, no POI layer, no district boundaries

## What's Needed

### 1. Dynamic Binning
The current fixed-tick binning needs to be replaced with rule-based dynamic binning that can:
- Detect patterns like "daytime heavy", "nighttime heavy"
- Group by crime type
- Detect burstiness
- Allow user to merge/split/delete/resize bins

### 2. User-Driven Timeslicing
Currently auto-computed, needs:
- Manual mode toggle
- Click-drag slice creation
- Boundary adjustment via drag
- Preset slice configurations

### 3. Map Redesign
Needs proper:
- OSM tile layer
- POI markers (use Police_Stations data)
- District boundary polygons
- STKDE hotspot overlay

### 4. Dashboard Integration
- Connect all components
- Sync selection/state across views
- Keep extra routes functional

## Success Criteria

1. Binning: Dynamic rules, user can merge/split/resize
2. Timeslicing: Manual and auto modes, click-drag creation
3. Map: OSM, POI, Districts, STKDE all visible
4. Dashboard: All components sync, functional
5. Routes: Extra routes remain working