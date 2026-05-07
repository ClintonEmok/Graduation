# Slice Store Architecture

**Analysis Date:** 2026-05-07

---

## 1. Store Composition

### `src/store/useSliceDomainStore.ts`

The root store is built by spreading four independent slice factories into a single Zustand store with persistence:

```typescript
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    {
      name: 'slice-domain-v1',
      partialize: (state) => ({ slices: state.slices }),
    }
  )
);
```

**Key points:**
- Uses Zustand's `persist` middleware, persisting only the `slices` array under key `slice-domain-v1`
- The four slices are composed via spread (`...`), so they share the same state object — no namespacing
- `SliceDomainState` is the intersection type of all four sub-state types

---

## 2. Central Type Definitions

### `src/store/slice-domain/types.ts`

#### `TimeSlice` Interface

```typescript
export interface TimeSlice {
  id: string;
  name?: string;
  color?: string;
  notes?: string;
  source?: TimeSliceSource;
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
  time: number;
  range?: [number, number];
  startDateTimeMs?: number | null;
  endDateTimeMs?: number | null;
  isBurst?: boolean;
  burstSliceId?: string;
  isLocked: boolean;
  isVisible: boolean;
}
```

**Critical observation — time storage is normalized (0–100):**
- `time`, `range[0]`, `range[1]` are all stored as **normalized percentages** (0–100), NOT as raw epoch timestamps
- `startDateTimeMs` / `endDateTimeMs` are the real datetime conversions, computed via `toDateTimeMs()` after slice creation
- `range` is typed as `[number, number]` but is consistently treated as normalized in the codebase
- All CRUD operations in `createSliceCoreSlice` normalize before storing

#### `SliceDomainState` Union

```typescript
export type SliceDomainState =
  & SliceCoreState
  & SliceSelectionState
  & SliceCreationState
  & SliceAdjustmentState;
```

No namespacing — all slice fields are flat at the top level of `SliceDomainState`.

---

## 3. Core Slice — CRUD & Storage

### `src/store/slice-domain/createSliceCoreSlice.ts`

#### Storage Pattern
- **Data structure**: `TimeSlice[]` (array), NOT a map/object by ID
- Persisted as `state.slices` (Zustand persist middleware)
- Slices are kept sorted via `sortSlices()` after every write operation

#### Normalization on CRUD

**`toNormalizedStoreRange(start, end)`** (lines 16–41) is the central normalization function, duplicated in `useSliceStore.ts`:
1. If inputs already in `[0, 100]` range → return as-is
2. Otherwise convert via `useTimelineDataStore` min/max timestamps → normalized (0–100)
3. Falls back to `useAdaptiveStore.mapDomain` for adaptive domain normalization
4. Result clamped to `[0, 100]`

**`addSlice(initial)`** (lines 149–175):
- Accepts partial `TimeSlice`, fills defaults: `type='point'`, `time=50`, `range=[40,60]`, `warpEnabled=true`, `warpWeight=1`, `isLocked=false`, `isVisible=true`
- Calls `withDateTimeFields()` to compute `startDateTimeMs`/`endDateTimeMs` from the normalized time
- Normalizes `range[0]` (or `time` for points) before hydration
- Sorts after insert

**`updateSlice(id, updates)`** (lines 295–298):
- Merges updates directly via `{ ...slice, ...updates }`
- No renormalization of time fields — if `updates.range` is passed, caller is responsible for normalizing
- Sorts after update

**`addBurstSlice(burstWindow)`** (lines 192–225):
- Converts burst window to normalized range via `toNormalizedStoreRange`
- Checks for existing matching burst slice via `findMatchingSlice` before creating
- Sets `warpWeight: 1.25` (higher than default `1`)
- Sets `isBurst: true`, generates `burstSliceId` from normalized range bounds

**`replaceSlicesFromBins(bins, domain)`** (lines 311–372):
- Converts each `TimeBin` to a normalized range via `toNormalizedBinRange`
- Sets `startDateTimeMs: bin.startTime`, `endDateTimeMs: bin.endTime` directly from bin (already epoch ms)
- Adds burst taxonomy fields when present on bin

**`getOverlapCounts()`** (lines 117–148):
- Normalizes all visible ranges via `toNormalizedStoreRange` before computing overlaps

#### Sort Order (`sortSlices`, lines 50–68)
1. Primary: ascending by range start (or `time` for points)
2. Secondary: non-burst slices before burst slices
3. Tertiary: original insertion order (stable)

#### Supported Fields Summary

| Field | Default | Notes |
|-------|---------|-------|
| `id` | `crypto.randomUUID()` | Set on add |
| `type` | `'point'` | |
| `time` | `50` | |
| `range` | `[40, 60]` | |
| `warpEnabled` | `true` | |
| `warpWeight` | `1` | |
| `isLocked` | `false` | |
| `isVisible` | `true` | |
| `name` | (unset) | Optional |
| `color` | (unset) | Optional |
| `notes` | (unset) | Optional |
| `source` | (unset) | Optional |
| `isBurst` | (unset) | For burst slices |
| `burstSliceId` | (unset) | For burst slices |
| `burstClass` | (unset) | For burst taxonomy |
| `burstRuleVersion` | (unset) | For burst taxonomy |
| `burstScore` | (unset) | For burst taxonomy |
| `burstConfidence` | (unset) | For burst taxonomy |
| `burstProvenance` | (unset) | For burst taxonomy |
| `tieBreakReason` | (unset) | For burst taxonomy |
| `thresholdSource` | (unset) | For burst taxonomy |
| `neighborhoodSummary` | (unset) | For burst taxonomy |
| `startDateTimeMs` | Computed | Hydrated on add |
| `endDateTimeMs` | Computed | Hydrated on add |

---

## 4. Creation Slice — Click/Drag Flow

### `src/store/slice-domain/createSliceCreationSlice.ts`

#### Creation Modes
- `'click'` — single-click creates a point slice at that position
- `'drag'` — drag creates a range slice from drag start to end

#### State Fields
```typescript
{
  isCreating: boolean,
  creationMode: CreationMode | null,
  dragActive: boolean,
  snapEnabled: boolean,
  previewStart: number | null,   // normalized 0-100
  previewEnd: number | null,     // normalized 0-100
  ghostPosition: { x: number, width: number } | null,
  previewIsValid: boolean,
  previewReason: string | null,
  previewDurationLabel: string | null,
  previewTimeRangeLabel: string | null,
  snapInterval: number | null,
}
```

#### Preview/Commit Flow

**`startCreation(mode)`** — resets all preview state, sets `isCreating: true`

**`updatePreview(start, end)`** (lines 75–87):
- Clamps inputs via `clampNormalizedTime(Math.min/max(start, end))`
- Updates `previewStart`, `previewEnd`, and `ghostPosition.x`/`width`
- Both `previewStart` and `previewEnd` are stored normalized (0–100)
- `ghostPosition.width = Math.max(0, normalizedEnd - normalizedStart)`

**`commitCreation()`** (lines 96–135):
1. Reads `previewStart`, `previewEnd` (normalized)
2. Calls `toDateTimeMs()` for both to hydrate datetime fields
3. Creates a `TimeSlice` (point if `previewEnd === null || previewEnd === previewStart`, else range)
4. Calls `get().addSlice(createdSlice)` — which re-normalizes and re-hydrates in `addSlice`
5. Resets creation state

**`cancelCreation()`** — resets all creation state, preserves `snapEnabled`

**Note:** `commitCreation` calls `addSlice(createdSlice)` which internally calls `withDateTimeFields()` again, so datetime fields get computed twice (once in `commitCreation` directly, once in `addSlice` via the same helper). The second call in `addSlice` will overwrite because it uses `slice.startDateTimeMs ?? toDateTimeMs()` — since `startDateTimeMs` is already set, the `??` fallback skips recomputation.

---

## 5. Selection Slice — Multi-Select

### `src/store/slice-domain/createSliceSelectionSlice.ts`

```typescript
{
  selectedIds: Set<string>,
  selectedCount: number,
  selectSlice: (id) => void,      // replaces selection with single id
  deselectSlice: (id) => void,    // removes id from selection
  toggleSlice: (id) => void,      // adds if absent, removes if present
  clearSelection: () => void,
  selectAll: (ids: string[]) => void,
  isSelected: (id) => boolean,
}
```

**Key pattern:** `selectedIds` is a `Set<string>`, not an array. Count is tracked redundantly in `selectedCount`.

**Important inconsistency:** `selectSlice` replaces the entire selection (like a radio button), unlike `toggleSlice` which multi-selects. There is no `addToSelection` method — use `toggleSlice` to add without deselecting others.

---

## 6. Adjustment Slice — Drag Handles & Snapping

### `src/store/slice-domain/createSliceAdjustmentSlice.ts`

#### State Fields
```typescript
{
  draggingSliceId: string | null,
  draggingHandle: AdjustmentHandle | null,  // 'left' | 'right' | 'both' | 'move'
  liveBoundarySec: number | null,          // epoch seconds at drag boundary
  liveBoundaryX: number | null,             // normalized x position
  hoverSliceId: string | null,
  hoverHandle: AdjustmentHandle | null,
  tooltip: TooltipPayload | null,
  limitCue: LimitCue,                      // 'none' | 'start' | 'end'
  modifierBypass: boolean,
  snapEnabled: boolean,
  snapMode: SnapMode,                       // 'adaptive' | 'fixed' | 'none'
  fixedSnapPresetSec: number | null,
}
```

#### Methods
- `beginDrag({ sliceId, handle })` — starts drag, resets live boundary fields
- `updateDrag({ limitCue, modifierBypass, liveBoundarySec, liveBoundaryX })` — updates during drag
- `endDrag()` — clears all drag state
- `setHover(sliceId, handle)` — sets hover state (no-op on mouse leave)
- `updateTooltip(tooltip)` — updates tooltip during drag
- `setSnap({ snapEnabled, snapMode, fixedSnapPresetSec })` — updates snap settings

**Note:** The adjustment slice does NOT directly modify `TimeSlice` objects — it only tracks drag state. Actual slice modifications are expected to be performed by consuming code using `updateSlice` from the core slice.

---

## 7. Wrapper: `useSliceStore`

### `src/store/useSliceStore.ts`

```typescript
export const useSliceStore = noNewRootGuard(useSliceDomainStore);
```

A thin wrapper that re-exports `useSliceDomainStore` (with a no-op type guard).

#### `toNormalizedStoreRange` (duplicated, lines 18–43)

**Identical logic to `createSliceCoreSlice.ts` lines 16–41:**
1. If already in `[0, 100]` → return as-is
2. Convert via `useTimelineDataStore` timestamps → normalized
3. Fallback to `useAdaptiveStore.mapDomain`
4. Clamp to `[0, 100]`

**This duplication means normalization logic exists in two places.** Any change to normalization strategy must be applied in both files.

#### `useAutoBurstSlices(burstWindows)` Hook (lines 46–117)

A side-effect hook that auto-creates burst slices when `burstWindows` become available:

1. **Deduplication via signature:** Uses a `useRef<Set<string>>` tracking window signatures (`${start}-${end}` at 3-decimal precision) to avoid creating duplicate burst slices across renders
2. **Conditional creation:** Skips if `isComputing` (adaptive store computing flag) or window already processed
3. **Normalization on existing slices:** A second `useEffect` monitors `slices` and renormalizes any burst slice with `range` values outside `[0, 100]` using the local `toNormalizedStoreRange`
4. **Processed set cleanup:** Clears the signature set when all burst slices are removed

**Normalization trigger (lines 88–108):**
```typescript
const burstSlicesNeedingNormalization = slices.filter(
  (slice) =>
    slice.isBurst &&
    slice.type === 'range' &&
    !!slice.range &&
    (slice.range[0] < 0 || slice.range[0] > 100 || slice.range[1] < 0 || slice.range[1] > 100)
);
```
This handles the case where raw epoch timestamps were accidentally stored in `range` before normalization was applied.

---

## 8. Selectors

### `src/store/slice-domain/selectors.ts`

Curried selectors for all state slices. Notable patterns:
- `selectCreationPreviewFeedback` (lines 39–63) caches the previous result and only returns a new object reference if values changed — a referential equality optimization to prevent unnecessary re-renders
- `selectCreationPreviewRange` returns `null` if either `previewStart` or `previewEnd` is null
- `selectActiveSlice` returns `null` if `activeSliceId` is null

---

## 9. Normalization Summary

| Operation | Input Range | Output Storage | Datetime Hydration |
|-----------|-------------|----------------|-------------------|
| `addSlice` | Caller provides, assumed normalized or raw | Normalized 0–100 | `withDateTimeFields()` computes `startDateTimeMs`/`endDateTimeMs` |
| `addBurstSlice` | Raw epoch seconds via `burstWindow.start/end` | Normalized via `toNormalizedStoreRange` | `withDateTimeFields()` after normalization |
| `updateSlice` | Caller provides | Stored as-is (no renormalization) | Caller responsible |
| `replaceSlicesFromBins` | Raw bin times via `bin.startTime/endTime` | Normalized via `toNormalizedBinRange` | `bin.startTime/endTime` used directly for ms fields |
| `commitCreation` | Normalized from `updatePreview` | Normalized passed to `addSlice` | Computed in `commitCreation`, then overwritten by `addSlice` |
| `useAutoBurstSlices` normalization | Raw epoch timestamps | Normalized via `toNormalizedStoreRange` | `updateSlice` does not set datetime fields |

**Normalization formula** (`toNormalizedStoreRange`):
```
normalized = ((rawEpochSeconds - minTimestampSec) / (maxTimestampSec - minTimestampSec)) * 100
```
Clamped to `[0, 100]`.

**Reverse conversion** (`toDateTimeMs` / `normalizedToEpochSeconds`):
```
epochSeconds = minTimestampSec + (normalized / 100) * (maxTimestampSec - minTimestampSec)
datetimeMs = epochSeconds * 1000
```

---

## 10. Legacy / Unused Field Observations

| Field | Status |
|-------|--------|
| `color` | Defined in `TimeSlice` interface but never explicitly set by any creation function; defaults are never applied |
| `notes` | Only set in `replaceSlicesFromBins` (from bin count string) and `updateSlice` caller — not in `addSlice` defaults |
| `source` | Only set in `replaceSlicesFromBins`; `addSlice`/`addBurstSlice` leave it undefined |
| `warpEnabled`, `warpWeight` | Set with defaults in `addSlice`, `addBurstSlice`, `mergeSlices`, `replaceSlicesFromBins` — actively used |
| `thresholdSource`, `neighborhoodSummary`, `tieBreakReason` | Only set in `replaceSlicesFromBins` when burst taxonomy is present |
| `burstRuleVersion` | Only set in `replaceSlicesFromBins` when burst taxonomy present |
| `burstProvenance` | Only set in `replaceSlicesFromBins` when burst taxonomy present |
| `burstScore`, `burstConfidence` | Only set in `replaceSlicesFromBins` when burst taxonomy present |

**No deprecated/removed fields detected** — all fields in `TimeSlice` are currently being written or readable.

---

## 11. Inconsistencies & Risks

### 11.1 Duplicate Normalization Functions

`toNormalizedStoreRange` is defined identically in:
- `src/store/slice-domain/createSliceCoreSlice.ts` (lines 16–41)
- `src/store/useSliceStore.ts` (lines 18–43)

**Risk:** Divergence if one is updated without the other. Should be extracted to `src/lib/slice-utils.ts` or a shared utility.

### 11.2 Datetime Field Double-Computing in `commitCreation`

`commitCreation` computes `startDateTimeMs`/`endDateTimeMs` directly before calling `addSlice`, but `addSlice` calls `withDateTimeFields()` which uses `slice.startDateTimeMs ?? toDateTimeMs()` — since the value is already set, it is preserved. The computation is wasted work and creates a confusing pattern. Either:
- Remove datetime computation from `commitCreation` (rely entirely on `addSlice`)
- Or call `addSlice` with raw values and let `addSlice` handle all hydration

### 11.3 `updateSlice` Does Not Renormalize

If a caller passes `updates.range` with raw epoch values to `updateSlice`, they will be stored as-is (out of `[0, 100]` range). No protection exists. The `useAutoBurstSlices` normalization effect is the only safety net for existing slices.

### 11.4 Selection is Flat (No Groups)

`selectedIds` is a flat `Set<string>` — there is no support for selection groups, related-slice selection, or "select all burst slices" semantics beyond iterating the full `slices` array.

### 11.5 `selectSlice` Replaces Selection (Not Extends)

`slectSlice` sets the selection to a single ID (radio-style), while `toggleSlice` multi-selects. There is no `addToSelection` function. Callers must use `toggleSlice` to add without clearing existing selection.

### 11.6 Sort is Stable but Implicit

`sortSlices` uses original array index as a tiebreaker, which is fragile if slices are reordered by other means. The comment "original insertion order" is achieved by relying on `Array.prototype.sort` stability in modern JS engines, but this is implicit rather than explicit.

---

## 12. File Locations Reference

| File | Purpose |
|------|---------|
| `src/store/useSliceDomainStore.ts` | Root store composition + persistence config |
| `src/store/slice-domain/types.ts` | All TypeScript types for the slice domain |
| `src/store/slice-domain/createSliceCoreSlice.ts` | CRUD operations, normalization, sorting |
| `src/store/slice-domain/createSliceCreationSlice.ts` | Slice creation workflow (click/drag) |
| `src/store/slice-domain/createSliceSelectionSlice.ts` | Multi-select state |
| `src/store/slice-domain/createSliceAdjustmentSlice.ts` | Drag handle and snap state |
| `src/store/slice-domain/selectors.ts` | Curried selector exports |
| `src/store/useSliceStore.ts` | Wrapper store + auto-burst hook + duplicate normalization |
| `src/lib/slice-utils.ts` | Range matching/tolerance utilities |
| `src/lib/time-domain.ts` | Epoch/normalization conversion utilities |

---

*Slice store architecture analysis: 2026-05-07*
