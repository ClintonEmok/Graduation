# SliceManagerUI & DemoSlicePanel: Full Analysis

**Analysis Date:** 2026-05-07

---

## Overview

Two slice management UIs exist in the codebase, serving different purposes:

| Component | File | Lines | Store Used | Purpose |
|-----------|------|-------|------------|---------|
| `SliceManagerUI` | `src/components/viz/SliceManagerUI.tsx` | 339 | `useSliceStore` (→ `useSliceDomainStore`) | Time slice sheet in main dashboard |
| `DemoSlicePanel` | `src/components/dashboard-demo/DemoSlicePanel.tsx` | 1079 | `useDashboardDemoSliceStore` (→ `useSliceDomainStore`) | Slice companion in demo dashboard |

Both stores share the same underlying `SliceDomainState` type and `TimeSlice` interface, but differ substantially in which fields they actually use.

---

## Store Dependencies

### SliceManagerUI

**Stores read (5):**
- `useSliceStore` — slices, addSlice, removeSlice, updateSlice, toggleLock, toggleVisibility, clearSlices
- `useTimelineDataStore` — minTimestampSec, maxTimestampSec
- `useFeatureFlagsStore` — isEnabled (for 'heatmap')
- `useHeatmapStore` — isEnabled, intensity, radius, opacity (heat layer controls)
- `useClusterStore` — sensitivity (cluster controls)

**Store operations used from useSliceStore:**
```typescript
slices.map((slice) => { ... })           // Read slices array
addSlice({ type: 'point', time: 50 })     // Create point slice
addSlice({ type: 'range', range: [40, 60] }) // Create range slice
removeSlice(slice.id)
updateSlice(slice.id, { name: ..., time: ..., range: ... })
toggleVisibility(slice.id)
toggleLock(slice.id)
clearSlices()
```

### DemoSlicePanel

**Stores read (6):**
- `useDashboardDemoSliceStore` — same interface as useSliceStore but persisted
- `useDashboardDemoWarpStore` — timeScaleMode, warpFactor, setTimeScaleMode, setWarpFactor, resetWarp
- `useDashboardDemoTimeStore` — currentTime, timeRange, timeResolution
- `useDashboardDemoCoordinationStore` — comparisonSliceIds, setComparisonSliceId, swapComparisonSlices, clearComparisonSlices, clearSelectedBurstWindows
- `useDashboardDemoTimeslicingModeStore` — generationStatus, generationInputs, generateBurstDraftBinsFromWindows, pendingGeneratedBins, merge/split/delete, lastGeneratedMetadata, lastAppliedAt
- `useTimelineDataStore` — minTimestampSec, maxTimestampSec

---

## Slice Fields Used

### TimeSlice interface (from `src/store/slice-domain/types.ts` lines 7-32)

```typescript
interface TimeSlice {
  id: string;
  name?: string;
  color?: string;
  notes?: string;
  source?: TimeSliceSource;  // 'manual' | 'generated-applied' | 'suggestion'
  warpEnabled?: boolean;
  warpWeight?: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstRuleVersion?: string;
  burstScore?: number;
  burstConfidence?: number;
  burstProvenance?: string;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
  type: 'point' | 'range';
  time: number;              // normalized 0-100
  range?: [number, number];   // normalized 0-100
  startDateTimeMs?: number | null;
  endDateTimeMs?: number | null;
  isBurst?: boolean;
  burstSliceId?: string;
  isLocked: boolean;
  isVisible: boolean;
}
```

### Fields SliceManagerUI accesses:

| Field | Read | Write | Notes |
|-------|------|-------|-------|
| `id` | ✓ | | |
| `name` | ✓ | ✓ | Via updateSlice |
| `type` | ✓ | | Display only |
| `time` | ✓ | ✓ | Via updateSlice for point slices |
| `range` | ✓ | ✓ | Via updateSlice for range slices |
| `isVisible` | ✓ | ✓ | Via toggleVisibility |
| `isLocked` | ✓ | ✓ | Via toggleLock |

### Fields SliceManagerUI NEVER accesses:

| Field | Used? |
|-------|-------|
| `source` | **Never** |
| `warpEnabled` | **Never** |
| `warpWeight` | **Never** |
| `isBurst` | **Never** (only in `getSliceFallbackName` to check `!!slice.isBurst`) |
| `burstSliceId` | **Never** |
| `startDateTimeMs` | **Never** |
| `endDateTimeMs` | **Never** |
| `burstClass` | **Never** |
| `burstScore` | **Never** |
| `burstConfidence` | **Never** |
| `burstProvenance` | **Never** |
| `tieBreakReason` | **Never** |
| `thresholdSource` | **Never** |
| `neighborhoodSummary` | **Never** |
| `color` | **Never** |
| `notes` | **Never** |
| `burstRuleVersion` | **Never** |

### Fields DemoSlicePanel accesses:

| Field | Read | Write | Notes |
|-------|------|-------|-------|
| `id` | ✓ | | |
| `name` | ✓ | ✓ | |
| `type` | ✓ | | |
| `time` | ✓ | ✓ | |
| `range` | ✓ | ✓ | |
| `isVisible` | ✓ | ✓ | |
| `isLocked` | ✓ | ✓ | |
| `source` | ✓ | ✓ | Set to 'manual' on creation |
| `warpEnabled` | ✓ | ✓ | Defaults to true, can toggle |
| `warpWeight` | ✓ | ✓ | Defaults to 1, editable 0-3 |
| `isBurst` | ✓ | | Display badge |
| `burstScore` | ✓ | | Display in badge |
| `burstConfidence` | ✓ | | Display in detail dialog |
| `burstClass` | ✓ | | Display in detail dialog |
| `burstProvenance` | ✓ | | Display in detail dialog |
| `startDateTimeMs` | ✓ | ✓ | Set on creation, editable via datetime-local |
| `endDateTimeMs` | ✓ | ✓ | Set on creation for range, editable |
| Tie-break/threshold fields | ✓ | | Detail dialog display |

---

## Operations Comparison

### Add Point Slice

**SliceManagerUI (line 54-56):**
```typescript
const handleAddPointSlice = () => {
  addSlice({ type: 'point', time: 50 });
};
```
- Normalized time hardcoded to 50 (center)
- No `startDateTimeMs`
- No `warpEnabled` / `warpWeight`
- No `source`

**DemoSlicePanel (line 243-258):**
```typescript
const handleAddPointSlice = useCallback(() => {
  const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
    ? normalizedToEpochSeconds(currentTime, minTimestampSec, maxTimestampSec) * 1000
    : null;

  addSlice({
    type: 'point',
    time: currentTime,
    source: 'manual',
    warpEnabled: true,
    warpWeight: 1,
    isLocked: false,
    isVisible: true,
    startDateTimeMs,
  });
}, [addSlice, currentTime, maxTimestampSec, minTimestampSec]);
```
- Uses `currentTime` from demo time store
- Sets `startDateTimeMs` from normalized conversion
- Sets `warpEnabled: true`, `warpWeight: 1`
- Sets `source: 'manual'`

### Add Range Slice

**SliceManagerUI (line 58-60):**
```typescript
const handleAddRangeSlice = () => {
  addSlice({ type: 'range', range: [40, 60] });
};
```
- Hardcoded range [40, 60]
- No datetime tracking
- No warp metadata

**DemoSlicePanel (line 260-284):**
```typescript
const handleAddRangeSlice = useCallback(() => {
  const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
  const start = Math.max(timeRange[0], currentTime - stepSize * 2);
  const end = Math.min(timeRange[1], currentTime + stepSize * 2);
  const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
  const startDateTimeMs = ...; // computed
  const endDateTimeMs = ...; // computed

  addSlice({
    type: 'range',
    time: (normalizedRange[0] + normalizedRange[1]) / 2,
    range: normalizedRange,
    source: 'manual',
    warpEnabled: true,
    warpWeight: 1,
    isLocked: false,
    isVisible: true,
    startDateTimeMs,
    endDateTimeMs,
  });
}, [...]);
```
- Uses current time range + resolution to calculate size
- Sets both `startDateTimeMs` and `endDateTimeMs`
- Sets warp metadata

### Other operations (both components):

| Operation | SliceManagerUI | DemoSlicePanel |
|-----------|---------------|----------------|
| removeSlice | ✓ | ✓ (with selectedSliceId cleanup) |
| updateSlice | ✓ | ✓ |
| toggleVisibility | ✓ | ✓ |
| toggleLock | ✓ | ✓ |
| clearSlices | ✓ | ✓ (with additional cleanup of pending drafts) |

---

## Time Normalization Analysis

### Functions in `src/lib/time-domain.ts`

```typescript
export const epochSecondsToNormalized = (
  epochSeconds: number,
  minEpochSeconds: number,
  maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return ((epochSeconds - minEpochSeconds) / span) * 100;
};

export const normalizedToEpochSeconds = (
  normalized: number,
  minEpochSeconds: number,
  maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return minEpochSeconds + (normalized / 100) * span;
};
```

**Correctness:** These are mathematically correct. Both use `span = max - min` and the mapping is bijective.

### SliceManagerUI time handling

**formatTime (line 70-74):**
```typescript
const formatTime = (normalized: number) => {
  if (minTimestampSec === null || maxTimestampSec === null) return `${normalized.toFixed(1)}%`;
  const seconds = normalizedToEpochSeconds(normalized, minTimestampSec, maxTimestampSec);
  return format(new Date(seconds * 1000), "PPP");
};
```
- Correctly converts normalized → epoch seconds → Date
- Falls back to percentage display if timestamps unavailable
- Uses `date-fns` format with "PPP" (e.g., "Jan 23, 2024")

**formatRange (line 76-84):**
```typescript
const formatRange = (range?: [number, number]) => {
  if (!range) return "Invalid range";
  if (minTimestampSec === null || maxTimestampSec === null) 
    return `${range[0].toFixed(1)}% - ${range[1].toFixed(1)}%`;
  
  const start = normalizedToEpochSeconds(range[0], minTimestampSec, maxTimestampSec);
  const end = normalizedToEpochSeconds(range[1], minTimestampSec, maxTimestampSec);
  return `${format(new Date(start * 1000), "MMM d, yyyy")} - ${format(new Date(end * 1000), "MMM d, yyyy")}`;
};
```
- Correctly converts both range endpoints
- Uses shorter date format ("MMM d, yyyy")

**getDateFromNormalized (line 86-89):**
```typescript
const getDateFromNormalized = (normalized: number) => {
  const seconds = normalizedToEpochSeconds(normalized, minTimestampSec || 0, maxTimestampSec || 86400 * 365);
  return new Date(seconds * 1000);
};
```
- Uses fallbacks when timestamps null: min=0, max=31536000 (1 year from epoch)
- **Minor issue:** These fallbacks don't reflect actual data range, but this only affects Calendar display when timeline store isn't loaded yet

**Calendar onSelect for point (line 257-261):**
```typescript
onSelect={(date) => {
  if (date && minTimestampSec !== null && maxTimestampSec !== null) {
    const normalized = epochSecondsToNormalized(date.getTime() / 1000, minTimestampSec, maxTimestampSec);
    updateSlice(slice.id, { time: normalized });
  }
}}
```
- Correct: `date.getTime()` gives ms, divide by 1000 for seconds
- Correct: uses epochSecondsToNormalized to convert back

**Calendar onSelect for range (line 283-287):**
```typescript
onSelect={(range) => {
  if (range?.from && range?.to && minTimestampSec !== null && maxTimestampSec !== null) {
    const start = epochSecondsToNormalized(range.from.getTime() / 1000, minTimestampSec, maxTimestampSec);
    const end = epochSecondsToNormalized(range.to.getTime() / 1000, minTimestampSec, maxTimestampSec);
    updateSlice(slice.id, { range: [start, end] });
  }
}}
```
- Correct conversion for both endpoints
- Note: Does not update `startDateTimeMs` / `endDateTimeMs` — these fields are never set by SliceManagerUI

### DemoSlicePanel time handling

**toNormalizedFromTimestampMs (line 230-241):**
```typescript
const toNormalizedFromTimestampMs = useCallback((timestampMs: number | null) => {
  if (
    timestampMs === null ||
    minTimestampSec === null ||
    maxTimestampSec === null ||
    maxTimestampSec <= minTimestampSec
  ) {
    return null;
  }

  return clampNormalized(epochSecondsToNormalized(timestampMs / 1000, minTimestampSec, maxTimestampSec));
}, [maxTimestampSec, minTimestampSec]);
```
- Correct: divides ms by 1000 for seconds before passing to epochSecondsToNormalized
- Has null guard returning null for invalid inputs
- Uses `clampNormalized` to ensure result is 0-100

**toDateTimeLocalValue (line 44-53):**
```typescript
const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }

  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
```
- Formats for `<input type="datetime-local">` value attribute
- Handles invalid values by returning empty string

**parseDateTimeLocalValue (line 55-62):**
```typescript
const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
```
- Parses datetime-local string back to ms timestamp

**Correctness:** DemoSlicePanel time handling is complete and correct. It properly:
1. Computes `startDateTimeMs`/`endDateTimeMs` on slice creation
2. Formats datetime for display/editing
3. Parses user input back to milliseconds
4. Converts between normalized and epoch with proper clamping

---

## Inconsistencies and Issues

### 1. Stale UI: SliceManagerUI missing warp controls

**Issue:** SliceManagerUI never exposes warp functionality even though slices created through it will be rendered with warp if `warpEnabled ?? true`.

**Evidence:**
- `handleAddPointSlice` doesn't set `warpEnabled`/`warpWeight`
- No UI to toggle warp on/off
- No UI to adjust warp weight
- But the 3D cube and timeline will apply warp rendering to these slices

**User impact:** Users cannot control warping behavior for slices created via SliceManagerUI. The warp is effectively "baked in" with defaults but invisible in the UI.

### 2. Stale UI: SliceManagerUI missing burst metadata

**Issue:** SliceManagerUI never displays or edits burst-related fields, even though slices can be marked `isBurst: true` by the system (via `useAutoBurstSlices`).

**Evidence:**
- No burst badge display
- No burst score/confidence display
- `getSliceFallbackName` checks `slice.isBurst` but only uses it to generate name

**User impact:** Users cannot see burst classification or scores for auto-generated burst slices.

### 3. Missing datetime tracking in SliceManagerUI

**Issue:** Slices created via SliceManagerUI never get `startDateTimeMs`/`endDateTimeMs` set.

**Evidence:**
- `handleAddPointSlice`: `addSlice({ type: 'point', time: 50 })`
- `handleAddRangeSlice`: `addSlice({ type: 'range', range: [40, 60] })`

**Compare DemoSlicePanel:**
- Both point and range slices set `startDateTimeMs` (and `endDateTimeMs` for range)
- These are computed from normalized values using `normalizedToEpochSeconds`

**User impact:** If a user creates a slice in SliceManagerUI and then opens DemoSlicePanel's detail dialog, they'll see "—" for start/end datetime. The slice has normalized time but no absolute timestamp.

### 4. Inconsistent fallback in getDateFromNormalized

**Issue:** SliceManagerUI uses arbitrary fallbacks when timeline store isn't loaded.

```typescript
const getDateFromNormalized = (normalized: number) => {
  const seconds = normalizedToEpochSeconds(normalized, minTimestampSec || 0, maxTimestampSec || 86400 * 365);
  return new Date(seconds * 1000);
};
```

- minTimestampSec fallback: `0` (Unix epoch 1970)
- maxTimestampSec fallback: `86400 * 365` (year 1971)

This creates a 1-year span starting at Unix epoch. A normalized value of 50 would show as ~mid-1970.

**Not a functional bug** (only affects Calendar display before data loads), but it's inconsistent and confusing.

### 5. Different stores, same data model

**Issue:** `useSliceStore` and `useDashboardDemoSliceStore` are separate Zustand stores built on the same `SliceDomainState` type. They persist to different keys:

```typescript
// useSliceStore → useSliceDomainStore (no persist visible in code)
export const useSliceStore = noNewRootGuard(useSliceDomainStore);

// useDashboardDemoSliceStore → persisted
export const useDashboardDemoSliceStore = noNewRootGuard(
  create<SliceDomainState>()(
    persist(
      (...args) => ({ ... }),
      { name: 'dashboard-demo-slice-domain-v1', partialize: (state) => ({ slices: state.slices }) }
    )
  )
);
```

**Implication:** Slices created in SliceManagerUI (using `useSliceStore`) are NOT persisted and will be lost on page refresh. Slices in DemoSlicePanel persist.

### 6. DemoSlicePanel has comparison slot UI that SliceManagerUI lacks

DemoSlicePanel includes comparison slot controls (lines 836-878):
- "Left" / "Right" buttons to assign slice to comparison slots
- "Swap" / "Clear pair" buttons
- Display of which slot a slice occupies (badge)

SliceManagerUI has no equivalent functionality.

### 7. DemoSlicePanel has detail dialog with rich metadata

DemoSlicePanel shows a detailed dialog (lines 886-968) exposing:
- burstClass, burstScore, burstConfidence
- burstProvenance, tieBreakReason, thresholdSource
- neighborhoodSummary
- startDateTimeMs, endDateTimeMs

SliceManagerUI has no detail dialog — only inline editing of name.

---

## Normalization Bugs

**No actual bugs found.** The normalization functions are mathematically correct and both components use them properly:

1. `normalizedToEpochSeconds` and `epochSecondsToNormalized` are proper inverses
2. Both components correctly handle ms vs seconds (divide by 1000 before converting to epoch seconds)
3. Both components handle null/undefined edge cases

---

## Summary of Discrepancies

| Aspect | SliceManagerUI | DemoSlicePanel |
|--------|----------------|----------------|
| Slice creation datetime | ❌ Not set | ✅ startDateTimeMs, endDateTimeMs |
| Warp controls | ❌ None | ✅ Toggle + weight slider |
| Burst metadata | ❌ None | ✅ Badge, detail dialog |
| Source field | ❌ Not set | ✅ Set to 'manual' |
| Persistence | ❌ Not persisted | ✅ Persisted to localStorage |
| Comparison slots | ❌ None | ✅ Left/Right/Swap/Clear |
| Detail dialog | ❌ None | ✅ Rich metadata display |
| Slices from auto-burst | ✅ getSliceFallbackName aware | ✅ isBurst badge + full metadata |

---

## Recommendations

1. **Add datetime tracking to SliceManagerUI** — Compute `startDateTimeMs`/`endDateTimeMs` when creating slices to maintain consistency with DemoSlicePanel model.

2. **Add warp controls to SliceManagerUI** — Either expose warpEnabled/warpWeight toggles, or ensure defaults are clearly documented. Currently invisible to users.

3. **Consider merging or aligning stores** — The divergence between `useSliceStore` (non-persisted) and `useDashboardDemoSliceStore` (persisted) creates two incompatible slice pools. Decide if these should be one store with different persistence strategies.

4. **Add burst metadata display to SliceManagerUI** — At minimum show isBurst badge and burstScore if available.

5. **Fix getDateFromNormalized fallbacks** — Use more sensible defaults or handle the null case explicitly rather than creating misleading dates.

6. **Align feature scope** — Decide if SliceManagerUI should be a "simple" slice tool and DemoSlicePanel the "advanced" tool, or if they should be feature-equivalent.