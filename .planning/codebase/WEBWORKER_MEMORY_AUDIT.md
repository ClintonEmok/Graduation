# Web Workers & Computation Memory Audit

**Analysis Date:** 2026-06-01
**Focus:** Worker Implementations, Computation Patterns, Main Thread Blocking, Transferable Opportunities

---

## 1. Worker Inventory

| Worker | File | Lifecycle | Purpose |
|--------|------|-----------|---------|
| adaptiveTime.worker | `src/workers/adaptiveTime.worker.ts` | Module-level singleton, reused | Computes density/burstiness/warp/count maps from timestamps |
| stkdeHotspot.worker | `src/workers/stkdeHotspot.worker.ts` | Created per-call, terminated | Filters and projects STKDE hotspots |
| kdeSlice.worker | `src/workers/kdeSlice.worker.ts` | Created once (demo 3D widget), reused | Computes per-slice KDE grids (Phase 76+) |

---

## 2. Worker Message Payload Sizes

### adaptiveTime.worker.ts

**Input Payload:**
- `timestamps: Float32Array` — 8 bytes × N timestamps (N = number of crime events)
- `domain: [number, number]` — 2 numbers × 8 bytes = 16 bytes
- `config: WorkerConfig` — 3 fields, ~100 bytes serialized
- **Total per message:** ~8N + 116 bytes

**Output Payload:**
- `densityMap: Float32Array` — 4 bytes × 1024 bins = 4KB
- `burstinessMap: Float32Array` — 4 bytes × 1024 = 4KB
- `warpMap: Float32Array` — 4 bytes × 1024 = 4KB
- `countMap: Float32Array` — 4 bytes × 1024 = 4KB
- **Total output:** ~16KB (fixed size, independent of input)

**Transferable Used:** YES — `timestampsCopy.buffer` passed as second argument to `postMessage` (line 201 in `useAdaptiveStore.ts`). However, the worker response arrays are NOT transferred (they're structured-cloned).

### stkdeHotspot.worker.ts

**Input Payload:**
- `hotspots: StkdeWorkerHotspot[]` — Each hotspot is ~200 bytes. With topK=12 default, max ~2.4KB
- `filters` object — ~50 bytes
- **Total input:** ≤5KB typically

**Output Payload:**
- `rows: StkdeWorkerHotspot[]` — Same structure, usually ≤5KB
- **No result data is large (grids/hotspots only, not raw data)**

### kdeSlice.worker.ts

**Input Payload:**
- `sliceGroups: Array<{ points: Array<{ x: number; z: number }> }>` — each crime point ~16 bytes. With 50k crimes per slice × up to ~12 slices = potentially up to ~9.6MB serialized
- `params: Partial<KdeParams>` — ~50 bytes

**Output Payload:**
- `cells: Float32Array` — 4 floats per cell (x, z, intensity, support). 1024 cells × 4 × 4 = 16KB per slice. For ~12 slices: ~192KB
- `results` array of per-slice results

**Transferable Used:** NO — both input and output are structured-cloned

---

## 3. Memory Held in Workers Between Messages

### adaptiveTime.worker.ts

**Worker Lifecycle:** Module-level worker instance (`src/store/useAdaptiveStore.ts` line 62) — **created once, reused across computations**.

**Memory Retention:**
- Worker retains NO large data between messages
- Each computation is stateless (`computeAdaptiveMaps` is a pure function)
- Worker only holds runtime, no cached crime data
- Clean: Worker doesn't accumulate state

**Memory held at rest:** ~few hundred KB (V8 worker runtime)

### stkdeHotspot.worker.ts

**Worker Lifecycle:** Created per-computation in `useDashboardStkde.ts` line 84 — `new Worker(...)` called inside `projectHotspotsWithWorker`. **TERMINATED after each use** (lines 101, 107, 113).

**Memory Retention:**
- Worker is created fresh, used once, terminated
- No data held between messages
- Clean by design

### kdeSlice.worker.ts

**Worker Lifecycle:** Created once in `Demo3dSpatialView.tsx` (line 200) — singleton via `useRef`, reused across KDE computations. **TERMINATED on unmount** (line 247-249).

**Memory Retention:**
- Worker retains NO large data between messages
- Each computation is stateless (`self.onmessage` calls `computeSliceKde` from `@/lib/kde/compute-slice-kde.ts`)
- Worker only holds runtime reference to the worker module

---

## 4. Main Thread Computation Bottlenecks

### HIGH SEVERITY

**`src/lib/stkde/compute.ts` — buildIntensityFromSupport() (lines 117-154)**

```typescript
const intensity = new Float64Array(rows * cols);  // line 126
// ...
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    for (let r = Math.max(0, row - kernelRadius); r <= Math.min(rows - 1, row + kernelRadius); r += 1) {
      for (let c = Math.max(0, col - kernelRadius); c <= Math.min(cols - 1, col + kernelRadius); c += 1) {
        // O(rows * cols * kernelRadius^2) nested loops
```

- **Grid:** Up to 12,000 cells (120×100 default)
- **Kernel radius:** 3σ where σ = bandwidth/(2×cellSize) ≈ 3-7 cells typically
- **Complexity:** O(12,000 × 49) = ~588,000 iterations PER COMPUTE
- **Runs on:** Main thread (Next.js API route, Node.js runtime)
- **Float64Array allocations:** Multiple large arrays (support, intensity, cellTimestamps)

**`src/lib/stkde/compute.ts` — computeSingleStkdeSurfaceFromCrimes() (lines 238-391)**

```typescript
const cellTimestamps = Array.from({ length: cellCount }, () => [] as number[]);  // line 271
// ...
for (const crime of boundedEvents) {
  cellTimestamps[idx].push(crime.timestamp);  // Growing arrays per cell
}
```

- `cellTimestamps` is an array of arrays — memory fragmentation
- For 50,000 events spread across 12,000 cells, this creates many small array allocations
- Each `.push()` may trigger reallocation

**`src/lib/stkde/full-population-pipeline.ts` — buildFullPopulationStkdeInputs() (lines 89-198)**

```typescript
const cellTemporalBuckets = new Map<number, FullPopulationBucket[]>();
// ...
while (true) {
  const rows = await executeAll<AggregatedRow>(db, aggregateSql, [...baseAggregateParams, chunkSize, offset]);
  // ... processing chunks
  for (const row of rows) {
    const existing = cellTemporalBuckets.get(idx);
    if (existing) {
      existing.push(nextBucket);  // Map with array mutations
    } else {
      cellTemporalBuckets.set(idx, [nextBucket]);
    }
  }
}
```

- `Map<number, FullPopulationBucket[]>` — nested array structure
- Chunked processing but Map accumulates throughout
- With large datasets, Map can grow significantly

### MEDIUM SEVERITY

**`src/lib/adaptive-scale.ts` — Multiple synchronous computations**

- `getAdaptiveScaleConfig()` (line 21): O(binCount) binning, O(binCount) weights, O(binCount) domain/range build
- `computeAdaptiveY()` (line 157): O(N) mapping for each data point
- `getAdaptiveScaleConfigColumnar()` (line 91): Same pattern with Float64Arrays
- `computeAdaptiveYColumnar()` (line 193): Full recompute every call
- **Default binCount:** 100 (adaptive-scale.ts), 1024 (adaptive-utils.ts constant)

These run during React render paths if called directly in components.

**`src/lib/interval-detection.ts` — detectBoundaries() (lines 224-328)**

```typescript
const bins: number[] = new Array(binCount).fill(0);
// ...
for (const crime of crimes) {
  bins[binIndex]++;  // O(N) crimes loop
}
// ...
const normalizedBins = bins.map(c => c / maxCount);  // O(binCount) allocation
```

- O(N) iteration over crimes array
- Creates intermediate `normalizedBins` array
- Called from UI for boundary suggestions

**`src/lib/confidence-scoring.ts` — Multiple scoring functions**

```typescript
// calculateDataClarity (lines 46-93)
const bins: number[] = new Array(binCount).fill(0);  // line 62
// O(N) loop
// calculateCoverage (lines 105-168)
const bins: number[] = new Array(binCount).fill(0);  // line 138
// O(N) loop
// calculateConfidence (lines 228-277)
// Rebuilds density bins AGAIN if not provided
```

- Three separate functions, each doing O(N) binning
- `calculateConfidence()` calls `calculateDataClarity()` and `calculateCoverage()` — double binning
- If called in sequence, density bins are recomputed multiple times

**`src/lib/clustering/cluster-analysis.ts` — analyzeClusters() (lines 81-184)**

```typescript
const dataset = points.map((point) => [point.x, point.y * 0.5, point.z]);  // line 96
// Creates new 2D array of all points
const clusterIndexes = dbscan.run(dataset, epsilon, minPoints) as number[][];  // line 100
// DBSCAN returns number[][]
```

- `dataset` creates full copy of points transformed: O(N) allocation
- DBSCAN output is `number[][]` — nested arrays for cluster memberships
- With thousands of points, this is significant

### LOW SEVERITY

**`src/lib/stkde/adjacent-slice-comparison.ts` — Light computation**

- Uses `JSON.stringify()` for snapshot comparison (line 88-90) — O(N) but only for small slice descriptors
- Not a bottleneck

**`src/lib/stkde/compute.ts` — computePeakWindow() (lines 82-111)**

- O(N log N) sort on timestamps
- Runs on main thread but N is per-cell (small)

---

## 5. Transferable Object Opportunities (MISSED)

### CRITICAL — adaptiveTime.worker.ts response

**Problem:** Worker output arrays (`densityMap`, `burstinessMap`, `warpMap`, `countMap`) are returned via `postMessage` with **structured clone** instead of **transferable objects**.

```typescript
// src/workers/adaptiveTime.worker.ts line 242
self.postMessage({ requestId, ...maps });
// maps are Float32Arrays — structured cloned, not transferred
```

**Impact:** 16KB of Float32Array data copied via structured clone. With 50,000 crime events generating frequent updates, this adds up.

**Fix:** Use the second argument of `postMessage`:
```typescript
const buffers = [densityMap.buffer, burstinessMap.buffer, warpMap.buffer, countMap.buffer];
self.postMessage({ requestId, densityMap, burstinessMap, warpMap, countMap }, buffers);
// Then on main thread: recreate views from transferred buffers
```

### CRITICAL — stkdeHotspot.worker.ts

**Problem:** `projectHotspots()` receives and returns hotspot arrays via structured clone.

```typescript
// src/workers/stkdeHotspot.worker.ts line 65
self.postMessage(output);  // output.rows is StkdeWorkerHotspot[]
```

**Impact:** Small (≤5KB) but still unnecessarily copied.

**Fix:** If array is large, use transferable. However, since topK=12, this is LOW priority.

### MEDIUM — kdeSlice.worker.ts

**Problem:** `sliceGroups` (crime point arrays) arrived via structured clone. Output `cells` arrays are also structured-cloned.

```typescript
// src/workers/kdeSlice.worker.ts line 41
self.postMessage({ requestId, results } satisfies KdeWorkerOutput);
```

**Impact:** Input crime point arrays for large slices can be multi-MB. Output cells are Float32Arrays (~16KB per slice). The input is the bigger concern.

**Fix:** Transfer the input crime point data if using typed arrays. Currently `points: Array<{ x: number; z: number }>` is an object array — could be flattened to `Float32Array` and transferred.

### MEDIUM — API route to client

**`/api/stkde/hotspots/route.ts` returns full StkdeResponse via `NextResponse.json()`**

- JSON serialization of response involves copying
- 2.5MB response size limit in `contracts.ts` line 297
- Arrow IPC is used for crime streaming, but STKDE responses are JSON

**Potential:** Could stream response for large payloads.

---

## 6. Memory Allocation Patterns

### REALLOCATING (Not Reusing Buffers)

**`src/lib/stkde/compute.ts` — buildIntensityFromSupport()**
```typescript
const intensity = new Float64Array(rows * cols);  // New allocation each call
```
- Called fresh each computation — no buffer reuse
- Float64Array is zero-filled on allocation

**`src/lib/adaptive-scale.ts` — computeAdaptiveYColumnar()**
```typescript
const counts = new Float64Array(binCount);   // New
const weights = new Float64Array(binCount); // New
const yStarts = new Float64Array(binCount + 1); // New
const result = new Float32Array(count);     // New
```
- Four new typed array allocations per call
- Could pool/reuse these

**`src/lib/adaptive-scale.ts` — getAdaptiveScaleConfig()**
```typescript
const domain = new Array(binCount + 1);  // Regular JS arrays
const range = new Array(binCount + 1);
```
- Uses regular JS arrays instead of typed arrays
- Less efficient memory-wise

### FRAGMENTED

**`src/lib/stkde/compute.ts` — cellTimestamps**
```typescript
const cellTimestamps = Array.from({ length: cellCount }, () => [] as number[]);
```
- Array of arrays — many small heap allocations
- Better: Single Float64Array with index offsets, or pre-allocated storage

**`src/lib/stkde/full-population-pipeline.ts` — cellTemporalBuckets**
```typescript
const cellTemporalBuckets = new Map<number, FullPopulationBucket[]>();
```
- Map with array values — heap fragmentation
- Could use typed arrays with built-in bucketing

### ACCEPTABLE

**adaptiveTime.worker.ts**
```typescript
if (timestamps.length === 0) {
  const emptyDensity = new Float32Array(safeBinCount);
  // ... early return
}
// ...
const smoothedDensity = densityInput;  // Reuse reference or new allocation
```
- Worker allocates fresh arrays per computation
- No buffer pooling (acceptable since computation is fast)

**kdeSlice.worker.ts**
```typescript
const flat = new Float32Array(result.cells.length * 4);
// ...
return { cells: flat, maxIntensity: ..., meanIntensity: ..., cellCount: ... };
```
- Fresh allocation per slice group
- No buffer pooling

---

## 7. Specific File-by-File Findings

### src/workers/adaptiveTime.worker.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Message size | Input: 8N+116 bytes (Float32Array timestamps). Output: ~16KB fixed | MEDIUM |
| Memory held between messages | NONE — stateless worker | LOW |
| Transferable input | YES — timestampsCopy.buffer transferred (useAdaptiveStore.ts:201) | OK |
| Transferable output | NO — response arrays structured-cloned | **HIGH** |
| Worker lifecycle | Module-level singleton, reused | OK |
| Cleanup | Automatic garbage collection | OK |

### src/workers/stkdeHotspot.worker.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Message size | Input ≤5KB, output ≤5KB | LOW |
| Memory held between messages | NONE — created per use, terminated after | LOW |
| Transferable | Not needed (small payloads) | OK |
| Worker lifecycle | Created per-call, terminated | OK |

### src/workers/kdeSlice.worker.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Message size | Input up to ~9.6MB (object arrays), output ~192KB (12 slices × 16KB) | **HIGH** |
| Memory held between messages | NONE — stateless worker | LOW |
| Transferable input | NO — object arrays cannot be transferred | MEDIUM |
| Transferable output | NO — Float32Array structured-cloned | MEDIUM |
| Worker lifecycle | Singleton, reused across KDE computations (Demo3dSpatialView.tsx:200) | OK |
| Cleanup | Terminated on unmount | OK |

### src/lib/stkde/compute.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | buildIntensityFromSupport(): O(rows*cols*kernel^2) ≈ 600K iterations | **HIGH** |
| Memory allocation | cellTimestamps: Array of arrays (fragmented) | **HIGH** |
| Buffer reuse | Fresh Float64Arrays per computation | MEDIUM |
| Slice processing | Recursive call per slice (line 356) — exponential without caching | MEDIUM |

### src/lib/stkde/full-population-pipeline.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | Runs in API route (Node.js) — acceptable | LOW |
| Memory fragmentation | Map<number, FullPopulationBucket[]> — nested arrays | MEDIUM |
| Chunked processing | Yes, 20,000 rows per chunk | OK |
| Cleanup | Returns inputs object, caller manages | OK |

### src/lib/adaptive-scale.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | O(binCount) per call, but binCount=100 default | LOW |
| Memory allocation | 4 typed arrays per computeAdaptiveYColumnar() call | MEDIUM |
| Buffer reuse | NONE — fresh allocations each call | MEDIUM |
| Called during render | Potentially if used in component render paths | MEDIUM |

### src/lib/interval-detection.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | O(N) crimes loop + multiple passes | MEDIUM |
| Memory allocation | normalizedBins: new Array(binCount) per call | LOW |
| Called from | UI layer for boundary suggestions | MEDIUM |

### src/lib/confidence-scoring.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | calculateDataClarity() + calculateCoverage() = 2× O(N) binning | MEDIUM |
| Redundant computation | calculateConfidence() rebuilds bins if not pre-provided | MEDIUM |
| Memory allocation | Multiple bins arrays created | LOW |

### src/lib/clustering/cluster-analysis.ts

| Aspect | Finding | Severity |
|--------|---------|----------|
| Main thread blocking | DBSCAN runs on main thread | MEDIUM |
| Memory allocation | dataset: points.map() creates full copy | MEDIUM |
| DBSCAN library | density-clustering package, O(n²) naive implementation | MEDIUM |

---

## 8. Summary Table

| Issue | Location | Severity | Recommendation |
|-------|----------|----------|----------------|
| Output arrays not transferred | `adaptiveTime.worker.ts:242` | **HIGH** | Use `postMessage(obj, [buffer1, buffer2, ...])` |
| O(600K) nested loops on main thread | `compute.ts:117-154` | **HIGH** | Offload to worker or WebAssembly |
| Array-of-arrays fragmentation | `compute.ts:271` cellTimestamps | **HIGH** | Use single typed array with offsets |
| 4× typed arrays per adaptive compute | `adaptive-scale.ts:193-260` | MEDIUM | Pool/reuse buffers |
| Double binning in confidence scoring | `confidence-scoring.ts:240-267` | MEDIUM | Pre-compute and cache density bins |
| Fresh allocations no reuse | `compute.ts:126` intensity, `adaptive-scale.ts` | MEDIUM | Buffer pool for hot paths |
| Recursive slice STKDE without caching | `compute.ts:356` | MEDIUM | Memoize or pipeline |
| Cluster dataset copy | `cluster-analysis.ts:96` | MEDIUM | Compute in-place or use transferables |
| kdeSlice.worker input not transferable | `kdeSlice.worker.ts:41` | MEDIUM | Flatten to Float32Array + transfer |
| kdeSlice.worker output not transferred | `kdeSlice.worker.ts:41` | MEDIUM | Transfer Float32Array buffers |

---

## 9. Recommendations Priority Order

1. **Transfer worker output arrays** — `adaptiveTime.worker.ts:242` — Easy win, ~16KB per message
2. **Offload kernel density loops** — `compute.ts:117-154` — This is the biggest bottleneck
3. **Fix cellTimestamps Array-of-Arrays** — `compute.ts:271` — Memory fragmentation
4. **Pool typed arrays in adaptive-scale** — Avoid repeated allocations
5. **Cache density bins for confidence** — `confidence-scoring.ts` — Avoid recompute
6. **Flatten kdeSlice input to Float32Array + transfer** — `kdeSlice.worker.ts` — Reduce structured clone overhead
7. **Memoize slice STKDE results** — `compute.ts:356` — Repeated work

---

*Memory audit: 2026-06-01*
