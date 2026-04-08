# STKDE Technology Stack

**Analysis Date:** 2026-03-30

## Domain Overview

STKDE (Spatio-Temporal Kernel Density Estimation) is a crime hotspot detection algorithm that identifies temporal-spatial clusters in crime data. The domain encompasses:

- **Core Algorithm**: Kernel density estimation with separate spatial and temporal bandwidth parameters
- **Compute Modes**: `sampled` (random sample of events) and `full-population` (aggregate-based computation)
- **Visualization**: Heatmap rendering via MapLibre GL and hotspot markers
- **UI Components**: Dedicated `/stkde` route and dashboard integration panel

## Core Technologies

**Runtime:**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5.9.3

**State Management:**
- Zustand 5.0.10 - Store for STKDE parameters, results, and UI state

**Mapping & Visualization:**
- react-map-gl 8.1.0 - React bindings for MapLibre GL
- maplibre-gl 5.17.0 - WebGL mapping library
- @math.gl/web-mercator 4.1.0 - Coordinate transformations

**Data Processing:**
- duckdb 1.4.4 - In-process SQL database for crime data queries
- density-clustering 1.3.0 - Clustering algorithms (used for hotspot detection)

## STKDE-Specific Dependencies

**Core Algorithm:**
- `@/lib/stkde/compute.ts` - STKDE computation engine
- `@/lib/stkde/contracts.ts` - TypeScript interfaces and validation
- `@/lib/stkde/full-population-pipeline.ts` - Full population aggregate pipeline

**Worker Processing:**
- `@/workers/stkdeHotspot.worker.ts` - Web Worker for client-side hotspot filtering

**Database:**
- DuckDB for crime data queries (`@/lib/db`)
- Full population mode uses SQL aggregation with chunked processing

## Configuration

**Environment Variables:**
- `STKDE_QA_FULL_POP_ENABLED` - Controls full population mode availability (default: `true`)

**Key Constants:**
```typescript
// From src/lib/stkde/contracts.ts
const DEFAULT_REQUEST = {
  computeMode: 'sampled',
  params: {
    spatialBandwidthMeters: 750,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 12,
    minSupport: 5,
    timeWindowHours: 24,
  },
  limits: {
    maxEvents: 50000,
    maxGridCells: 12000,
  },
  guardrails: {
    fullPopulationMaxSpanDays: 12000,
    fullPopulationTimeoutMs: 20000,
  },
};
```

## Parameter Limits

| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| spatialBandwidthMeters | 100 | 5000 | meters |
| temporalBandwidthHours | 1 | 168 | hours |
| gridCellMeters | 100 | 5000 | meters |
| topK | 1 | 100 | count |
| minSupport | 1 | 1000 | events |
| timeWindowHours | 1 | 168 | hours |

## Feature Flags

- `stkdeRoute` - Enables the dedicated `/stkde` exploration route

---

*Stack analysis: 2026-03-30*
