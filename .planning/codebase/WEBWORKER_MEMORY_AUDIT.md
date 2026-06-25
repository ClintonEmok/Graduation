# Web Worker & Memory Audit

**Analysis Date:** 2026-06-25

## Web Worker Inventory

### 1. Adaptive Time Worker

**File:** `src/workers/adaptiveTime.worker.ts`
**Lines:** 248
**Type:** Dense computation worker (density, burstiness, warp map computation)

#### Input/Output Contract

```typescript
// Input
interface WorkerInput {
  requestId: number;
  timestamps: Float32Array;
  domain: [number, number];
  config: {
    binCount: number;       // default: 1024
    kernelWidth?: number;   // default: 3
    binningMode?: 'uniform-time' | 'uniform-events';
    burstInfluence?: number; // default: 0.25
  };
}

// Output
interface WorkerOutput {
  requestId: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  countMap: Float32Array;
}
```

#### Memory Transfer Strategy

**In `src/store/useAdaptiveStore.ts` (lines 189-202):**
```typescript
// Copy data to avoid detaching the original buffer
const timestampsCopy = timestamps.slice();
worker.postMessage({
  requestId,
  timestamps: timestampsCopy,
  domain,
  config: { binCount: ADAPTIVE_BIN_COUNT, kernelWidth: ADAPTIVE_KERNEL_WIDTH, burstInfluence: ADAPTIVE_BURST_INFLUENCE, binningMode }
}, [timestampsCopy.buffer]);  // Transfer ownership
```

- **Transferrable:** `timestampsCopy.buffer` is transferred (not copied) via the second argument to `postMessage`.
- **Return:** No transfer list on the return `self.postMessage()`. Maps are **copied** back to main thread (structured clone).
- **Memory impact:** The worker allocates `4 × 1024 × 4 bytes = 16KB` per invocation for the output maps, plus temporary arrays (`countMap`, `densityInput`, `smoothedDensity`, `burstCounts`, `burstSum`, `burstSumSq`, `weights`). Total ~10-15 temporary allocations per run.

#### Worker Instance

- **Singleton:** Module-level `let worker: Worker | null = null` in `useAdaptiveStore.ts`
- **Creation:** `new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url))` — only created once, reused
- **Request management:** Incrementing `activeRequestId`. Stale responses (mismatched `requestId`) are silently dropped.
- **Lifecycle:** Created at module load time, never terminated.

### 2. STKDE Hotspot Worker

**File:** `src/workers/stkdeHotspot.worker.ts`
**Lines:** 67
**Type:** Filtering/ranking worker

#### Input/Output Contract

```typescript
interface StkdeWorkerInput {
  requestId: number;
  hotspots: StkdeWorkerHotspot[];   // Array of hotspot objects
  filters: {
    minIntensity?: number;
    minSupport?: number;
    temporalWindow?: [number, number] | null;
    spatialBbox?: [number, number, number, number] | null;
  };
}

interface StkdeWorkerOutput {
  requestId: number;
  rows: StkdeWorkerHotspot[];
}
```

- **No transferables used.** Hotspots are object arrays, copied via structured clone.
- **Operation:** Array filter + sort on up to ~100 hotspot objects — lightweight.
- **Worker instance:** Exists independently in `src/store/useStkdeStore.ts` (presumed singleton pattern).
- **Memory:** Negligible — operates on small arrays.

### 3. KDE Slice Worker

**File:** `src/workers/kdeSlice.worker.ts`
**Lines:** 42
**Type:** Computation worker for per-slice kernel density

#### Input/Output Contract

```typescript
interface KdeWorkerInput {
  requestId: number;
  sliceGroups: Array<{ points: Array<{ x: number; z: number }> }>;
  params?: Partial<KdeParams>;
}

interface KdeWorkerOutput {
  requestId: number;
  results: Array<{
    cells: Float32Array;         // Flat [x, z, intensity, support] per cell
    maxIntensity: number;
    meanIntensity: number;
    cellCount: number;
  }>;
}
```

- **Import:** Uses `import { computeSliceKde } from '@/lib/kde/compute-slice-kde'` — a bundled dependency.
- **Data transfer:** `sliceGroups.points` arrays copied via structured clone. Output `Float32Array` cells copied back.
- **Cell format:** Flat array of `[x, z, intensity, support]` quadruples packed into a single `Float32Array` for compact transfer.
- **Memory:** Grid size 32×32 = 1024 cells max. Each cell = 4 floats = 16 bytes. Total ~16KB per slice group result.

## Data Transfer Patterns

### Transferable Usage

Only **one** transferable is used in the entire codebase:
```typescript
// src/store/useAdaptiveStore.ts
worker.postMessage({ requestId, timestamps: timestampsCopy, domain, config }, [timestampsCopy.buffer]);
```

This transfers ownership of the Float32Array buffer to the worker, avoiding a copy of the timestamps array (~8.5M × 4 bytes = 34MB for full dataset).

**Gap:** The return path (`worker.onmessage`) does NOT use transferables. The 4 output maps (~16KB each) are copied via structured clone.

### Structured Clone (Non-transferable)

| Worker | Direction | Data | Size Estimate | Transferable? |
|--------|-----------|------|---------------|---------------|
| Adaptive | → worker | Float32Array timestamps | ~34MB (full) | ✅ Yes |
| Adaptive | ← main | 4 × Float32Array maps | ~16KB | ❌ No |
| STKDE | → worker | Hotspot objects | ~5-50KB | ❌ No (objects) |
| STKDE | ← main | Filtered hotspots | ~5-50KB | ❌ No (objects) |
| KDE | → worker | Slice point groups | ~1-500KB | ❌ No (objects) |
| KDE | ← main | Flat Float32Array cells | ~16KB/slice | ❌ No |

## Memory Management Patterns

### Texture Disposal

**In `src/components/viz/DataPoints.tsx`:**
```typescript
useEffect(() => () => warpTexture.dispose(), [warpTexture]);
useEffect(() => () => densityTexture.dispose(), [densityTexture]);
```
Cleanup of GPU textures on unmount/recreation. Correct pattern.

**In `src/components/viz/SlicePlane.tsx`:**
```typescript
useEffect(() => {
  return () => heatmapTexture?.dispose();
}, [heatmapTexture]);
```
Cleanup of CanvasTexture for STKDE overlay. Correct.

### Geometry/Material Caching

- **`HeatmapOverlay.tsx`:** `aggregationScene` and `aggregationCamera` created once via `useMemo`, never disposed. **Potential leak** — these are `THREE.Scene` and `OrthographicCamera` instances held for component lifetime.
- **`HeatmapOverlay.tsx`:** `aggregationMaterial` and `heatmapMaterial` recreated via `useMemo` with dependencies on filter/control state. Old materials are disposed by Three.js garbage collector (no explicit `dispose()`).
- **`DataPoints.tsx`:** Custom program cache key on material: `material.customProgramCacheKey = () => 'ghosting-stable-v1'` — prevents shader recompilation on re-render.

### Store Memory

**`useAdaptiveStore`:** Holds `Float32Array` references for `densityMap`, `burstinessMap`, `countMap`, `warpMap`. These are replaced on each compute. Old arrays are garbage collected.

**`useTimelineDataStore`:** Holds full `ColumnarData` with typed arrays. This is the largest memory consumer. Data loaded once and held for application lifetime.

### Columnar Data Downsampling

**File:** `src/lib/downsample.ts`

Provides `downsampleByStride()` for `ColumnarData` but it's **not currently used in the rendering pipeline**. This means:
- Full dataset is always in memory
- Full dataset is uploaded to GPU via `InstancedMesh` attributes
- No level-of-detail based on camera distance

**Opportunity:** Implement automatic downsampling based on camera zoom/distance, similar to the LOD uniform in the shader.

## Concerns

### 1. Worker Lifecycle Management

Workers are created at module import time and **never terminated**. The adaptive time worker in `useAdaptiveStore.ts`:
```typescript
if (typeof window !== 'undefined') {
  worker = new Worker(...);
}
```
This runs when the store module is first imported. No `worker.terminate()` on component unmount. **Minor issue** for a single-page app, but would leak if used in a multi-route context.

### 2. No Transferables on Return Path

The adaptive worker computes 4 × `Float32Array` maps and returns them via `postMessage` without a transfer list. This means each map is **copied** via structured clone. Adding `[densityMap.buffer, burstinessMap.buffer, warpMap.buffer, countMap.buffer]` would eliminate the copy (zero-cost transfer).

Currently:
```typescript
self.postMessage({ requestId, densityMap, burstinessMap, warpMap, countMap });
```

Should be:
```typescript
self.postMessage(
  { requestId, densityMap, burstinessMap, warpMap, countMap },
  [densityMap.buffer, burstinessMap.buffer, warpMap.buffer, countMap.buffer]
);
```

### 3. Object Arrays in Worker Messages

The STKDE and KDE workers receive object arrays (not typed arrays). This forces structured clone copying for data that could be transferred as typed arrays. For the KDE worker, `sliceGroups.points` (array of `{x, z}` objects) could be flattened to a `Float32Array` for zero-copy transfer.

### 4. Race Condition on Adaptive Compute

When `densityScope` changes between 'viewport' and 'global', the `computeMaps` and `setPrecomputedMaps` both increment `activeRequestId`. If a prior worker response arrives after the mode switch, it's correctly dropped (requestId mismatch). However, the `isComputing` flag may briefly glitch (set to `false` during mode switch even if worker is still processing).

### 5. No SharedArrayBuffer Usage

Given the computational nature of this app, `SharedArrayBuffer` could be explored for the warp map computation pattern (worker writes to shared buffer, main thread reads without copy). Not currently used, likely due to cross-origin isolation requirements.

## Recommendations

1. **Add transferables on return path** for `adaptiveTime.worker.ts` to avoid copy of 4 output buffers
2. **Flatten KDE input** to typed arrays for zero-copy transfer to `kdeSlice.worker.ts`
3. **Add worker termination** on store cleanup (optional, minor)
4. **Implement automatic downsampling** based on viewing distance before uploading to GPU
5. **Add heatmap FBO dirty flag** to skip per-frame render when data unchanged

---

*Worker & memory audit: 2026-06-25*
