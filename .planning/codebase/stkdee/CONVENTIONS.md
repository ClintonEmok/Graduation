# STKDE Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- `useStkdeStore.ts` - Zustand store hook pattern
- `stkde-*.ts` - Core library files in `src/lib/stkde/`
- `stkdeHotspot.worker.ts` - Web Worker for hotspot processing
- `MapStkdeHeatmapLayer.tsx` - React component for map rendering

**Types:**
- `StkdeRequest` - Input request interface
- `StkdeResponse` - Output response interface
- `StkdeHotspot` - Individual hotspot data
- `StkdeHeatmapCell` - Heatmap grid cell
- `StkdeParams` - Algorithm parameter set
- `StkdeQueryState` - URL query state for `/stkde` route

**Functions:**
- `computeStkdeFromCrimes()` - Compute from sampled crime records
- `computeStkdeFromAggregates()` - Compute from pre-aggregated data
- `buildStkdeGridConfig()` - Build spatial grid configuration
- `validateAndNormalizeStkdeRequest()` - Request validation
- `buildFullPopulationStkdeInputs()` - Build inputs for full-pop mode
- `projectHotspots()` - Client-side hotspot filtering

## Code Style

**TypeScript:**
- Strict TypeScript usage throughout
- Explicit return type annotations for exported functions
- Interface-first approach for domain types

**Numeric Precision:**
```typescript
// Coordinates rounded to 6 decimal places
centroidLng: Number((minLng + (col + 0.5) * grid.lonCellDegrees).toFixed(6)),
centroidLat: Number((minLat + (row + 0.5) * grid.latCellDegrees).toFixed(6)),

// Intensity normalized to 6 decimal places
intensity: Number(normalized.toFixed(6)),
```

**Numeric Coercion:**
```typescript
// Floor values after clamping
Math.floor(Math.min(max, Math.max(min, candidate)))
```

## Algorithm Conventions

**Grid Building:**
```typescript
// Coarsen factor applied when cells exceed limit
if (totalCells > request.limits.maxGridCells) {
  coarsenFactor = Math.ceil(Math.sqrt(totalCells / request.limits.maxGridCells));
  rows = Math.max(1, Math.ceil(rows / coarsenFactor));
  cols = Math.max(1, Math.ceil(cols / coarsenFactor));
}
```

**Intensity Calculation:**
- Gaussian kernel with sigma = bandwidth / 2
- Kernel radius = 3 * sigma (3-sigma rule)
- Intensity normalized to [0, 1] range

**Hotspot Peak Window:**
- Sliding window algorithm for temporal peak detection
- Window size = `timeWindowHours * 3600` seconds

## Component Patterns

**React Components:**
- `"use client"` directive for client-side components
- Functional components with explicit prop interfaces
- Tailwind CSS for styling (consistent with codebase)

**Store Pattern (Zustand):**
```typescript
export const useStkdeStore = create<StkdeStoreState>((set) => ({
  // State
  params: { ... },
  runStatus: 'idle',
  response: null,
  
  // Actions
  setParams: (patch) => set((state) => ({ params: { ...state.params, ...patch } })),
  startRun: () => set({ runStatus: 'running' }),
  finishRunSuccess: (response) => set({ runStatus: 'success', response }),
  // ...
}));
```

**Worker Pattern:**
```typescript
// Web Worker instantiation
const worker = new Worker(new URL('../../../workers/stkdeHotspot.worker.ts', import.meta.url));

// Message handling with requestId for deduplication
worker.postMessage({ requestId, hotspots, filters });
```

## API Conventions

**Request Validation:**
- Validate and normalize in `validateAndNormalizeStkdeRequest()`
- Apply clamping with recorded applied clamps
- Return `{ ok: boolean, request?: StkdeRequest, error?: string, clampsApplied?: string[] }`

**Response Headers:**
```typescript
{
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'X-Content-Type-Options': 'nosniff',
}
```

## Error Handling

**Compute Errors:**
- Graceful fallback from `full-population` to `sampled` mode
- Timeout handling with configurable guardrails
- AbortController for request cancellation

**Validation Errors:**
- Specific error messages for each validation failure
- HTTP 400 status for validation errors
- HTTP 500 for compute failures

## Testing Conventions

**Test Files:**
- Co-located with source: `*.test.ts` alongside `*.ts`
- Uses Vitest framework
- Mock external dependencies

**Test Patterns:**
```typescript
// Mock STKDE worker
vi.mock('@/workers/stkdeHotspot.worker', () => ({
  projectHotspots: vi.fn(),
}));

// Test validation
const result = validateAndNormalizeStkdeRequest(payload);
expect(result.ok).toBe(true);
```

---

*Convention analysis: 2026-03-30*
