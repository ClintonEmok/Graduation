# Slice Normalization — Spatial & Temporal Alignment

**Analysis Date:** 2026-06-25

---

## 1. Spatial Coordinate Normalization

**File:** `src/lib/coordinate-normalization.ts`

### Chicago Bounds:

```
lon: [-87.9, -87.5]  →  span = 0.4
lat: [41.6, 42.1]    →  span = 0.5
```

### Normalization Formula:

```
x = ((lon - minLon) / lonSpan) * 100 + (-50)    →  [-50, +50]
z = ((lat - minLat) / latSpan) * 100 + (-50)    →  [-50, +50]
```

### Functions:

| Function | Input | Output | Purpose |
|---|---|---|---|
| `lonLatToNormalized(lon, lat)` | Geographic coords | `{ x, z }` in [-50,50] | Client-side conversion |
| `normalizedToLonLat(x, z)` | Normalized [-50,50] | `{ lon, lat }` | Reverse for map display |
| `buildNormalizedSqlExpression(column, axis)` | Column name + axis | SQL expression string | DuckDB query generation |

### SQL Expression Pattern:
```sql
(((column - min) / span) * normalizedSpan) + normalizedMin
```

---

## 2. Time Normalization

**File:** `src/lib/time-domain.ts`

### Epoch Detection:
```typescript
detectEpochUnit(value) → 'seconds' | 'milliseconds'
// Threshold: 1e11 — values >= that are treated as ms
```

### Core Conversions:

| Function | Formula |
|---|---|
| `toEpochSeconds(value)` | If ms: `value / 1000`; else: `value` |
| `epochSecondsToNormalized(sec, min, max)` | `((sec - min) / span) * 100` → [0, 100] |
| `normalizedToEpochSeconds(norm, min, max)` | `min + (norm / 100) * span` |

### Time Resolution:
```typescript
RESOLUTION_SECONDS = {
  seconds: 1, minutes: 60, hours: 3600, days: 86400,
  weeks: 604800, months: 2592000, years: 31536000
}
```

`resolutionToNormalizedStep(resolution, minEpochSec, maxEpochSec)` — converts resolution to a 0-100 step value.

---

## 3. Date Normalization Utilities

**File:** `src/lib/date-normalization.ts`

Simplified API for the real data date range (2001–2026):

| Function | Purpose |
|---|---|
| `normalizeToPercent(realTime, minTime, maxTime)` | Epoch sec → [0, 100] |
| `denormalizeToEpoch(percent, minTime, maxTime)` | [0, 100] → epoch sec |
| `normalizedRangeToEpoch(normalizedRange, minTime, maxTime)` | [start, end] → epoch sec pair |
| `epochRangeToNormalized(epochRange, minTime, maxTime)` | epoch sec pair → [0, 100] pair |

All clamp output to `[0, 100]` to prevent out-of-range values.

---

## 4. Slice Range Normalization (Store Layer)

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 16 — `toNormalizedStoreRange()`

This function handles three scenarios when converting raw range values to the store's canonical 0-100 normalized space:

```
Priority:
1. Already in [0, 100]              → use as-is
2. UseTimelineDataStore available    → epochSecondsToNormalized()
3. useAdaptiveStore.mapDomain available → linear map to 0-100
4. Fallback                          → clamp(0, 100)
```

Key detail — the function checks BOTH the raw values AND external store state, supporting:
- Pre-normalized values (0-100) pass through untouched
- Epoch timestamps automatically converted via `toEpochSeconds()` then `epochSecondsToNormalized()`
- `mapDomain` provides fallback when timeline metadata unavailable

### Normalization of Bin Ranges (`toNormalizedBinRange()`):

```typescript
const toNormalizedBinRange = (bin: TimeBin, domain: [number, number]) => {
  const span = Math.max(1, domainEnd - domainStart);
  const start = ((bin.startTime - domainStart) / span) * 100;
  const end = ((bin.endTime - domainStart) / span) * 100;
  return normalizeRange(clampNormalized(start), clampNormalized(end));
};
```

---

## 5. Slice Utility Functions

**File:** `src/lib/slice-utils.ts`

### Range Matching:
- `normalizeRange(range)` — ensures `[start, end]` order
- `withinTolerance(value, target, tolerance)` — `|v - t| <= |tol|`
- `calculateRangeTolerance(range, percent=0.005)` — `|rangeSpan| * percent`
- `rangesMatch(range1, range2, tolerance?)` — both start and end within tolerance

**Used by:** `findMatchingSlice()` in core slice store to deduplicate burst slices.

### Timeline Focus:
`focusTimelineRange()` — Coordinates setting time range across multiple stores:
1. Normalizes the range
2. Converts to epoch seconds if inputs look like 0-100
3. Calls `setTimeRange(epochRange)`, `setRange(normalizedRange)`, `setBrushRange(normalizedRange)`, `setTime(midpoint)`

---

## 6. Normalization in the Data Pipeline

### DuckDB → API → Client:

```
DuckDB query (buildNormalizedSqlExpression)
  ↓ Arrow stream
/api/crime/stream
  ↓ Apache Arrow + RecordBatchReader
useTimelineDataStore.loadRealData()
  ↓
Columns: x, z (pre-normalized by DuckDB SQL)
         timestamp (normalized via epochSecondsToNormalized)
         timestampSec (raw epoch seconds preserved)
```

### Mock Data Generation:
```typescript
// src/store/useTimelineDataStore.ts, line 80
x: (Math.random() - 0.5) * 100,   // [-50, +50]
z: (Math.random() - 0.5) * 100,   // [-50, +50]
timestamp: MOCK_START_MS + Math.random() * span
```

---

## 7. Normalization in Filter Store

**File:** `src/store/useDashboardDemoFilterStore.ts`

The filter store enforces a convention: `selectedTimeRange` uses **epoch seconds** as the canonical unit.

A guard warning fires if callers pass 0-100 normalized values:
```typescript
if (normalizedRange.every(v => v >= 0 && v <= 100)) {
  console.warn('... received values that look like normalized 0–100 percentages...');
}
```

The `normalizeTimeRangeToEpochSeconds()` function auto-detects and converts normalized values to epoch seconds using `useTimelineDataStore` metadata.

---

*Normalization analysis: 2026-06-25*
