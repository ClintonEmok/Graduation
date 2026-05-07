# Slice Normalization Trace

**Analysis Date:** 2026-05-07

---

## 1. Time Domain Utilities — `src/lib/time-domain.ts`

**Exports:**

```typescript
export type EpochUnit = 'seconds' | 'milliseconds';
export type TimeResolution = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export const detectEpochUnit = (value: number): EpochUnit
export const toEpochSeconds = (value: number): number
export const epochSecondsToNormalized = (epochSeconds, minEpochSeconds, maxEpochSeconds): number
export const normalizedToEpochSeconds = (normalized, minEpochSeconds, maxEpochSeconds): number
export const resolutionToSeconds = (resolution: TimeResolution): number
export const resolutionToNormalizedStep = (resolution, minEpochSeconds, maxEpochSeconds, fallbackSpan): number
```

**Formulas:**

- `epochSecondsToNormalized`: `((epochSeconds - minEpochSeconds) / (maxEpochSeconds - minEpochSeconds)) * 100`
- `normalizedToEpochSeconds`: `minEpochSeconds + (normalized / 100) * (maxEpochSeconds - minEpochSeconds)`

**Key behavior:** Both functions handle the `|| 1` guard against zero-span domains (when `min === max`). No internal null-safety — callers must ensure `minTimestampSec`/`maxTimestampSec` are not null.

---

## 2. Time Range Utilities — `src/lib/time-range.ts`

**Full contents:**

- `TimeRangeTuple = [number, number]`
- `TimeRangeLike` — union of tuple, object with `startEpoch`/`endEpoch` or `start`/`end`, null, undefined
- `normalizeTimeRange(range: TimeRangeLike): TimeRangeTuple | null` — converts any TimeRangeLike to `[start, end]` ordered tuple, returns null for invalid input
- `normalizeTimeRangeBounds(range: TimeRangeLike): NormalizedTimeRange | null` — same but returns `{start, end}` object
- `timeRangeOverlapsDomain(range, domainStart, domainEnd): boolean`
- `clampTimeRangeToDomain(range, domainStart, domainEnd): TimeRangeTuple | null`

**Important:** These functions operate on raw epoch values (seconds), not normalized 0-100. They do NOT perform epoch-to-normalized conversion — they only normalize ordering and clamp to domain boundaries.

---

## 3. `useSliceStore.ts` — `toNormalizedStoreRange`

**Location:** `src/store/useSliceStore.ts`, lines 18–43

```typescript
const toNormalizedStoreRange = (start: number, end: number): [number, number] => {
  const [rawStart, rawEnd] = normalizeRange(start, end);

  if (rawStart >= 0 && rawEnd <= 100) {
    return [rawStart, rawEnd];  // Already normalized — pass through
  }

  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
  if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
    const startSec = toEpochSeconds(rawStart);
    const endSec = toEpochSeconds(rawEnd);
    const normalizedStart = epochSecondsToNormalized(startSec, minTimestampSec, maxTimestampSec);
    const normalizedEnd = epochSecondsToNormalized(endSec, minTimestampSec, maxTimestampSec);
    return normalizeRange(clampNormalized(normalizedStart), clampNormalized(normalizedEnd));
  }

  const mapDomain = useAdaptiveStore.getState().mapDomain;
  if (mapDomain[1] > mapDomain[0]) {
    const span = mapDomain[1] - mapDomain[0];
    const normalizedStart = ((rawStart - mapDomain[0]) / span) * 100;
    const normalizedEnd = ((rawEnd - mapDomain[0]) / span) * 100;
    return normalizeRange(clampNormalized(normalizedStart), clampNormalized(normalizedEnd));
  }

  return [clampNormalized(rawStart), clampNormalized(rawEnd)];
};
```

**Normalization cascade (priority order):**

1. **Already normalized (0–100):** Pass through unchanged
2. **Timeline domain available:** Convert raw epoch → normalized via `epochSecondsToNormalized`
3. **Adaptive mapDomain fallback:** Convert via mapDomain span
4. **Final fallback:** Blind clamp to 0–100

**`clampNormalized`:** `Math.min(100, Math.max(0, value))`

**Also in this file:** `useAutoBurstSlices` hook (lines 46–117) that auto-creates burst slices from windows and normalizes any burst slices with out-of-range `[0, 100]` values using `toNormalizedStoreRange`.

---

## 4. Domain Source — `useTimelineDataStore`

**Location:** `src/store/useTimelineDataStore.ts`

**State fields:**
- `minTimestampSec: number | null` — domain lower bound in epoch seconds
- `maxTimestampSec: number | null` — domain upper bound in epoch seconds

**Mock domain values** (set in `generateMockData`):
```typescript
minTimestampSec: MOCK_START_SEC  // 1704067200 (2024-01-01T00:00:00Z)
maxTimestampSec: MOCK_END_SEC    // 1735689599 (2024-12-31T23:59:59Z)
```

**Real data domain** comes from `/api/crime/meta` response `minTime`/`maxTime` fields (epoch seconds).

**`loadRealData` also stores both:**
- `columns.timestampSec: Float64Array` — raw epoch seconds for each data point
- `columns.timestamp: Float32Array` — normalized 0–100 values pre-computed via `epochSecondsToNormalized`

---

## 5. How Slice Stores Store Time

### TimeSlice Type (`src/store/slice-domain/types.ts`)

```typescript
export interface TimeSlice {
  id: string;
  type: 'point' | 'range';
  time: number;              // Always normalized 0-100 (midpoint for ranges)
  range?: [number, number];  // Always normalized 0-100 for range slices
  startDateTimeMs?: number | null;  // Hydrated epoch ms (computed from time/range)
  endDateTimeMs?: number | null;    // Hydrated epoch ms (computed from range end)
  isBurst?: boolean;
  warpEnabled?: boolean;
  warpWeight?: number;
  // ... burst metadata fields
  isLocked: boolean;
  isVisible: boolean;
}
```

**Convention: `time` and `range` are ALWAYS normalized 0-100 values.** `startDateTimeMs`/`endDateTimeMs` are derived hydration fields.

### `addSlice` Behavior (`createSliceCoreSlice.ts`, lines 149–175)

```typescript
addSlice: (initial) =>
  set((state) => {
    const id = crypto.randomUUID();
    const nextSlice: TimeSlice = {
      id,
      type: initial.type || 'point',
      time: initial.time ?? 50,        // Stored directly as given
      range: initial.range || [40, 60], // Stored directly as given
      warpEnabled: true,
      warpWeight: 1,
      isLocked: false,
      isVisible: true,
      ...initial,
    };

    const normalizedStart = nextSlice.type === 'range' && nextSlice.range
      ? nextSlice.range[0]
      : nextSlice.time;
    const normalizedEnd = nextSlice.type === 'range' && nextSlice.range ? nextSlice.range[1] : undefined;
    const hydratedSlice = withDateTimeFields(nextSlice, normalizedStart, normalizedEnd);
    // ...
  }),
```

**Callers pass normalized 0-100 values.** No automatic normalization occurs on `addSlice` — the value is stored as-is.

### Hydration via `withDateTimeFields` (`createSliceCoreSlice.ts`, lines 102–111)

```typescript
const toDateTimeMs = (normalizedValue: number): number | null => {
  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
  if (minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
    return null;
  }
  return normalizedToEpochSeconds(normalizedValue, minTimestampSec, maxTimestampSec) * 1000;
};

const withDateTimeFields = (slice, startNormalized, endNormalized): TimeSlice => ({
  ...slice,
  startDateTimeMs: slice.startDateTimeMs ?? toDateTimeMs(startNormalized),
  endDateTimeMs: slice.endDateTimeMs ?? (endNormalized === undefined ? null : toDateTimeMs(endNormalized)),
});
```

If `useTimelineDataStore` domain is null, `toDateTimeMs` returns `null` and the hydration fields remain unset.

---

## 6. Binning Types — `src/lib/binning/types.ts`

**`TimeBin` fields:**

```typescript
export interface TimeBin {
  id: string;
  startTime: number;   // Epoch MILLISECONDS
  endTime: number;     // Epoch MILLISECONDS
  avgTimestamp: number; // Epoch MILLISECONDS
  count: number;
  crimeTypes: string[];
  districts?: string[];
  warpWeight?: number;        // Hint weight passed through to slice
  isNeutralPartition?: boolean;
  // ... burst taxonomy fields
}
```

**No normalization in TimeBin.** All time fields are absolute epoch milliseconds.

---

## 7. Warp Scaling — `src/lib/binning/warp-scaling.ts`

**Key types:**

```typescript
export interface ComparableWarpBinInput {
  id: string;
  startTime: number;    // Epoch milliseconds
  endTime: number;      // Epoch milliseconds
  count: number;
  granularity: ComparableWarpGranularity;
  hintWeight?: number;  // Optional hint from bin
}

export interface ComparableWarpScore extends ComparableWarpBinInput {
  peerRelativeScore: number;  // bin.count / peerAverage
  normalizedScore: number;    // 0.5 + ((peerRelativeScore - 1) * 0.5) clamped to [0,1]
  warpWeight: number;         // peerRelativeScore * hintWeight, clamped to [0.25, 4]
  widthShare: number;
  isNeutralPartition: boolean;
}
```

**`warpWeight` computation:**

```typescript
const warpWeight = clampComparableWarpWeight(peerRelativeScore * hintWeight, minimumWarpWeight, maximumWarpWeight);
// where clampComparableWarpWeight clamps to [MIN_WARP_WEIGHT=0.25, MAX_WARP_WEIGHT=4]
```

**Relationship to slice `warpWeight` field:**

In `replaceSlicesFromBins` (`createSliceCoreSlice.ts`, line 330):
```typescript
warpWeight: bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25),
```

The `bin.warpWeight` is the final computed warp weight from `scoreComparableWarpBins`. If absent (neutral partition), defaults to `1.25` for burst bins and `1` for regular bins.

**`buildComparableWarpMap`** uses warp weights to compute non-uniform bin boundaries within a domain, allocating more space to high-crime-density bins.

---

## Critical Trace: `addSlice({ type: 'point', time: 50 })`

**Answer: `50` is treated as a NORMALIZED 0-100 value.**

### Evidence:

1. In `createSliceCoreSlice.ts` line 155: `time: initial.time ?? 50` — the raw value from the caller's `initial.time` is stored directly without conversion.

2. The `TimeSlice.time` field is documented as always normalized 0-100 (confirmed by `toDateTimeMs` hydration which converts from normalized to epoch).

3. Tests in `src/store/useSliceStore.test.ts` confirm this:
   ```typescript
   store.addSlice({ time: 50 });
   expect(slicesAfterAdd[0].time).toBe(50);  // Stored as-is
   ```

4. `addBurstSlice({ start: 10, end: 30 })` similarly expects normalized inputs — tests check `range: [10, 30]`.

### What happens after `addSlice({ type: 'point', time: 50 })`:

1. `time: 50` stored as-is
2. `toDateTimeMs(50)` called via `withDateTimeFields`
3. If `minTimestampSec`/`maxTimestampSec` = mock domain (1704067200 to 1735689599), `normalizedToEpochSeconds(50, min, max)` = midpoint epoch = approximately Oct 2024
4. `startDateTimeMs` = `normalizedToEpochSeconds(50, ...) * 1000` ≈ 1720000000000

---

## `formatTimeRange` Correctness

**Location:** `src/app/timeline-test/lib/slice-utils.ts`, lines 108–141

```typescript
export function formatTimeRange(start: number, end: number, minTs: number, maxTs: number): string {
  const domainStart = Math.min(minTs, maxTs);
  const domainEnd = Math.max(minTs, maxTs);
  const domainSpan = Math.max(0, domainEnd - domainStart);

  const clampedStart = clamp(Math.min(start, end), 0, 100);
  const clampedEnd = clamp(Math.max(start, end), 0, 100);

  const startSec = domainStart + (clampedStart / 100) * domainSpan;
  const endSec = domainStart + (clampedEnd / 100) * domainSpan;

  const startDate = new Date(startSec * 1000);
  const endDate = new Date(endSec * 1000);
  // ...
}
```

**Correct behavior:** `formatTimeRange` correctly interprets its `start`/`end` parameters as normalized 0-100 values (clamped to 0-100 before use). It converts them to epoch seconds using `minTs`/`maxTs` as the domain bounds. Then formats as human-readable date/time strings.

**Call site** (`useSliceCreation.ts` line 126):
```typescript
timeRangeLabel: formatTimeRange(startNorm, endNorm, domainStartSec, domainEndSec),
```

The parameters are named `startNorm`/`endNorm` (normalized) and `domainStartSec`/`domainEndSec` (epoch seconds), confirming expected usage.

---

## Issue: Two `toNormalizedStoreRange` Functions Exist

**Location 1:** `src/store/useSliceStore.ts` lines 18–43
**Location 2:** `src/store/slice-domain/createSliceCoreSlice.ts` lines 16–41

Both are nearly identical with the same normalization cascade. `useSliceStore` re-exports `useSliceDomainStore` (which uses `createSliceCoreSlice` internally), so `toNormalizedStoreRange` in `useSliceStore` appears to be unused by slice stores directly — the slice store uses the one in `createSliceCoreSlice`.

The one in `useSliceStore.ts` is used by `useAutoBurstSlices` (line 102) to fix out-of-range burst slices. The one in `createSliceCoreSlice.ts` is used by `getOverlapCounts`, `findMatchingSlice`, `addBurstSlice`, and `mergeSlices`.

**Risk:** Any divergence between these two functions (if one is fixed and the other isn't) could cause normalization bugs.

---

## Identified Issues

### Issue 1: Missing Domain Fallback in `addBurstSlice`

**File:** `src/store/slice-domain/createSliceCoreSlice.ts` lines 192–224

```typescript
addBurstSlice: (burstWindow) => {
  const [rangeStart, rangeEnd] = toNormalizedStoreRange(burstWindow.start, burstWindow.end);
  // ...
}
```

If `burstWindow.start`/`burstWindow.end` are already normalized 0-100, they pass through. But if they are raw epoch seconds (millions of seconds, e.g., 1700000000), the normalization cascade kicks in:

1. `rawStart >= 0 && rawEnd <= 100` → false (epoch seconds are much larger than 100)
2. `minTimestampSec`/`maxTimestampSec` available → conversion happens correctly
3. **If timeline data not loaded and domain is null:** falls back to mapDomain → likely wrong

If `minTimestampSec`/`maxTimestampSec` are null and `mapDomain` is also `[0, 0]` or invalid, `toNormalizedStoreRange` returns clamped raw values (e.g., `clampNormalized(1700000000)` = `100`). This silently corrupts the burst window to near `100`.

**Recommendation:** `addBurstSlice` should validate input range or require normalized inputs with explicit error on epoch values.

### Issue 2: `addSlice` Does No Input Normalization

**File:** `src/store/slice-domain/createSliceCoreSlice.ts` lines 149–175

`addSlice(initial)` stores `initial.time` and `initial.range` directly. There is no `toNormalizedStoreRange` call. If a caller passes epoch seconds instead of normalized values, they are stored incorrectly.

**Example bug scenario:**
```typescript
// Caller accidentally passes epoch seconds:
addSlice({ type: 'point', time: 1704067200 })  // Unix timestamp instead of 50
// Stored as: slice.time = 1704067200
// startDateTimeMs = normalizedToEpochSeconds(1704067200, domain...) // wrong domain conversion
```

The test suite passes because tests use correct normalized values (`time: 50`, `range: [20, 40]`), but this is not enforced.

**Recommendation:** Add runtime assertion or normalization in `addSlice` to catch swapped coordinate systems.

### Issue 3: Type Uses String Field `'time'` but Number Range Expected

**File:** `src/store/slice-domain/types.ts` line 24

```typescript
time: number;  // Named 'time' but is normalized 0-100
```

The field name `time` suggests it might be an absolute timestamp, but it's actually a normalized percentage. This naming ambiguity increases the risk of callers passing epoch values by mistake.

**Recommendation:** Consider renaming to `normalizedTime` or `timePercent` for clarity, or add a comment explaining the convention.

### Issue 4: No Enforcement of Normalized Contract

The `TimeSlice` interface has no runtime validation that `time ∈ [0, 100]` or `range[0], range[1] ∈ [0, 100]`. Slices with out-of-range values could exist in the store, causing subtle bugs in rendering or computation.

**Recommendation:** Add a defensive normalization step in `addSlice` and `updateSlice` that clamps values to [0, 100] or throws on clearly invalid (epoch-like) inputs.

### Issue 5: `replaceSlicesFromBins` Stores Epoch Milliseconds as DateTimes

**File:** `src/store/slice-domain/createSliceCoreSlice.ts` lines 344–345, 361–362

```typescript
startDateTimeMs: bin.startTime,  // epoch ms from TimeBin
endDateTimeMs: bin.endTime,     // epoch ms from TimeBin
```

`TimeBin.startTime`/`endTime` are epoch milliseconds. These are directly assigned to `startDateTimeMs`/`endDateTimeMs` without conversion. This is correct because `toDateTimeMs` multiplies by 1000 to get milliseconds, and the bin times are already in milliseconds. However, the field naming suggests a potential mismatch if `TimeBin` units ever change.

---

## Summary Table

| Aspect | Value |
|--------|-------|
| `addSlice({ time: 50 })` — is 50 normalized? | **YES** — stored as-is |
| `TimeSlice.time` unit | Normalized 0–100 |
| `TimeSlice.range` unit | Normalized 0–100 |
| `TimeBin.startTime`/`endTime` unit | Epoch milliseconds |
| `TimeBin.warpWeight` | Unitless ratio (peerRelativeScore * hintWeight), clamped [0.25, 4] |
| `TimeSlice.warpWeight` | Passed through from `TimeBin.warpWeight` or default 1/1.25 |
| `startDateTimeMs` hydration | `normalizedToEpochSeconds(normalized, domain...) * 1000` or null if domain missing |
| `formatTimeRange` input | Normalized 0-100, outputs human-readable |

---

*Slice normalization audit: 2026-05-07*
