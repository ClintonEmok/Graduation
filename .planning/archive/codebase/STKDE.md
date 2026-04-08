# STKDE Domain

**Analysis Date:** 2026-03-30

## Overview

**STKDE** stands for **Spatio-Temporal Kernel Density Estimation** - a crime hotspot detection algorithm used in this codebase. It identifies geographic areas with statistically significant concentrations of crime events over time.

## What STKDE Does

The STKDE algorithm in this codebase:
1. Takes crime event data (location + timestamp)
2. Builds a spatial grid over the geographic area (Chicago)
3. Applies a Gaussian kernel to compute density at each grid cell
4. Identifies peak temporal windows for each cell
5. Returns top-K hotspots ranked by intensity score

## Domain Models

### Core Types (`src/lib/stkde/contracts.ts`)

**Request:**
```typescript
interface StkdeRequest {
  computeMode: 'sampled' | 'full-population';
  callerIntent?: 'stkde' | 'unknown';
  domain: {
    startEpochSec: number;
    endEpochSec: number;
  };
  filters: {
    crimeTypes?: string[];
    bbox?: [minLng, minLat, maxLng, maxLat];
  };
  params: {
    spatialBandwidthMeters: number;  // Default: 750
    temporalBandwidthHours: number;  // Default: 24
    gridCellMeters: number;           // Default: 500
    topK: number;                      // Default: 12
    minSupport: number;                // Default: 5
    timeWindowHours: number;          // Default: 24
  };
  limits: {
    maxEvents: number;     // Default: 50000
    maxGridCells: number;  // Default: 12000
  };
  guardrails?: {
    fullPopulationMaxSpanDays?: number;
    fullPopulationTimeoutMs?: number;
  };
}
```

**Response:**
```typescript
interface StkdeResponse {
  meta: {
    eventCount: number;
    computeMs: number;
    truncated: boolean;
    requestedComputeMode: 'sampled' | 'full-population';
    effectiveComputeMode: 'sampled' | 'full-population';
    fallbackApplied?: string | null;
    clampsApplied?: string[];
    fullPopulationStats?: {
      scannedRows: number;
      aggregatedCells: number;
      queryMs: number;
    };
  };
  heatmap: {
    cells: StkdeHeatmapCell[];
    maxIntensity: number;
  };
  hotspots: StkdeHotspot[];
  contracts: {
    scoreVersion: 'stkde-v1';
  };
}
```

**Hotspot:**
```typescript
interface StkdeHotspot {
  id: string;
  centroidLng: number;
  centroidLat: number;
  intensityScore: number;
  supportCount: number;
  peakStartEpochSec: number;
  peakEndEpochSec: number;
  radiusMeters: number;
}
```

**Heatmap Cell:**
```typescript
interface StkdeHeatmapCell {
  lng: number;
  lat: number;
  intensity: number;
  support: number;
}
```

## Compute Modes

### Sampled Mode
- Queries crime data with a limit (default 50,000 events)
- Uses in-memory computation
- Default for dashboard use

### Full-Population Mode
- Scans entire crime database
- Uses SQL aggregation pipeline for efficiency
- Supports timeout and span guards
- Requires `callerIntent: 'stkde'` and `computeMode: 'full-population'`
- Controlled by feature flag `STKDE_QA_FULL_POP_ENABLED`

## Key Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| spatialBandwidthMeters | 750 | 100-5000 | Radius of spatial kernel |
| temporalBandwidthHours | 24 | 1-168 | Temporal window for kernel |
| gridCellMeters | 500 | 100-5000 | Resolution of spatial grid |
| topK | 12 | 1-100 | Number of hotspots to return |
| minSupport | 5 | 1-1000 | Minimum events in a cell |
| timeWindowHours | 24 | 1-168 | Peak detection window |

## State Management

### Store: `src/store/useStkdeStore.ts`

```typescript
interface StkdeStoreState {
  scopeMode: 'applied-slices' | 'full-viewport';
  params: StkdeParams;
  runStatus: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  staleReason: string | null;
  isStale: boolean;
  errorMessage: string | null;
  response: StkdeResponse | null;
  lastRunAt: number | null;
  runMeta: {
    requestedComputeMode: StkdeComputeMode;
    effectiveComputeMode: StkdeComputeMode;
    truncated: boolean;
    fallbackApplied: string | null;
    clampsApplied: string[];
  } | null;
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
}
```

### Key Methods
- `setScopeMode(mode)` - Switch between slice-scoped or full-viewport
- `setParams(patch)` - Update algorithm parameters with clamping
- `startRun()` / `finishRunSuccess()` / `finishRunError()` - Run lifecycle
- `markStale(reason)` - Mark results as stale when inputs change

## Business Logic

### Computation Pipeline (`src/lib/stkde/compute.ts`)

1. **Grid Building** (`buildStkdeGridConfig`)
   - Converts bbox and gridCellMeters to lat/lon grid
   - Applies coarsening if cells exceed maxGridCells limit

2. **Support Computation**
   - Maps each crime to a grid cell
   - Counts events per cell (support)

3. **Intensity Calculation** (`buildIntensityFromSupport`)
   - Applies Gaussian kernel with spatial bandwidth
   - Smooths density across neighboring cells

4. **Peak Window Detection** (`computePeakWindow`)
   - Sliding window algorithm finds densest temporal window
   - Returns [peakStartEpochSec, peakEndEpochSec]

5. **Hotspot Ranking**
   - Sorts by intensityScore → supportCount → location
   - Returns top-K hotspots

### Full-Population Pipeline (`src/lib/stkde/full-population-pipeline.ts`)

1. **SQL Aggregation**
   - Groups crimes by (cell_row, cell_col, time_bucket)
   - Uses database for scalability

2. **Chunked Processing**
   - Processes in configurable chunks (default 20,000)
   - Supports abort signal for cancellation

3. **Temporal Buckets**
   - Buckets by `temporalBandwidthHours * 3600` seconds
   - Tracks per-cell temporal distribution

## API Integration

### Endpoint: `POST /api/stkde/hotspots`

Located at `src/app/api/stkde/hotspots/route.ts`:

```typescript
// Request
{
  computeMode: 'sampled',
  callerIntent: 'stkde',
  domain: { startEpochSec, endEpochSec },
  filters: { bbox },
  params: { ... },
  limits: { maxEvents: 50000, maxGridCells: 12000 },
  guardrails: { fullPopulationTimeoutMs: 20000 }
}

// Response
StkdeResponse
```

### Guardrails
- Falls back to sampled mode if full-population span exceeds 12,000 days
- Falls back if query exceeds timeout
- Returns `fallbackApplied` in meta when fallback occurs
- Applies response size guard (2.5MB limit) with truncation

## Frontend Integration

### Hook: `useDashboardStkde` (`src/app/dashboard-v2/hooks/useDashboardStkde.ts`)

- Manages full STKDE run lifecycle
- Supports abort controller for cancellation
- Uses web worker for hotspot projection (`stkdeHotspot.worker.ts`)
- Sanitizes response size client-side if needed

### Worker: `src/workers/stkdeHotspot.worker.ts`

- Projects hotspots with filters
- Filters by intensity, support, temporal window, spatial bbox
- Runs off main thread with 8-second timeout

### View Model: `src/app/stkde/lib/stkde-view-model.ts`

- Transforms raw response to UI-friendly format
- Formats dates, coordinates, labels for display

## Feature Flag

Located in `src/lib/feature-flags.ts`:

```typescript
{
  id: 'stkdeRoute',
  description: 'Enable /stkde exploratory route with hotspot heatmap and panel',
  // ...
}
```

Environment variable `STKDE_QA_FULL_POP_ENABLED` controls full-population mode (default: true).

## Default Configuration (Phase 65)

```typescript
const DEFAULT_PARAMS = {
  spatialBandwidthMeters: 750,
  temporalBandwidthHours: 24,
  gridCellMeters: 500,
  topK: 12,
  minSupport: 5,
  timeWindowHours: 24,
};

const DEFAULT_LIMITS = {
  maxEvents: 50000,
  maxGridCells: 12000,
};
```

## Test Patterns

### Store Tests (`src/store/useStkdeStore.test.ts`)

- Verifies default parameter values
- Tests run lifecycle transitions
- Tests stale state after input changes
- Tests parameter clamping to bounds

### Compute Tests (`src/lib/stkde/compute.test.ts`)

- Tests grid configuration
- Tests kernel intensity computation
- Tests hotspot generation

### Worker Tests (`src/workers/stkdeHotspot.worker.test.ts`)

- Tests hotspot projection
- Tests filtering logic

## File Structure

```
src/
├── lib/stkde/
│   ├── contracts.ts       # Types, validation, constants
│   ├── compute.ts         # Core STKDE algorithm
│   ├── full-population-pipeline.ts  # SQL aggregation pipeline
│   └── *.test.ts
├── store/
│   └── useStkdeStore.ts   # Zustand state management
├── workers/
│   └── stkdeHotspot.worker.ts  # Client-side projection
├── app/
│   ├── api/stkde/hotspots/
│   │   └── route.ts       # API endpoint
│   ├── dashboard-v2/
│   │   └── hooks/useDashboardStkde.ts
│   └── stkde/
│       └── lib/
│           ├── stkde-view-model.ts
│           └── stkde-query-state.ts
└── types/crime.ts         # CrimeRecord type
```

## Usage in Dashboard

The STKDE panel in the dashboard:
1. Shows when `panels.stkde` is enabled in layout store
2. Displays top-K hotspots as interactive circles on map
3. Shows intensity, support count, and peak time window
4. Supports selection and hover interactions
5. Can be filtered by time range and spatial bounds

---

*STKDE domain analysis: 2026-03-30*
