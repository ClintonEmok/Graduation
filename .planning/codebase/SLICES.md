# Slices — Data Model, Generation, and State Management

**Analysis Date:** 2026-06-25

---

## 1. Slice Data Model

### TimeSlice (Canonical Type)

**File:** `src/store/slice-domain/types.ts`, line 7

```typescript
interface TimeSlice {
  id: string;
  name?: string;
  color?: string;
  notes?: string;
  source?: 'manual' | 'generated-applied' | 'suggestion';
  warpEnabled?: boolean;
  warpWeight?: number;
  
  // Burst taxonomy fields (populated by binning engine)
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstRuleVersion?: string;
  burstScore?: number;
  burstConfidence?: number;
  burstProvenance?: string;
  burstinessCoefficient?: number;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
  
  // Temporal geometry
  type: 'point' | 'range';
  time: number;           // Center position (normalized 0-100)
  range?: [number, number]; // [start, end] normalized 0-100
  startDateTimeMs?: number | null;  // Absolute epoch ms
  endDateTimeMs?: number | null;    // Absolute epoch ms
  
  // Burst relationship
  isBurst?: boolean;
  burstSliceId?: string;
  
  // UI state
  isLocked: boolean;
  isVisible: boolean;
}
```

### TimeBin (Binning Engine Output)

**File:** `src/lib/binning/types.ts`, line 9

```typescript
interface TimeBin {
  id: string;
  startTime: number;    // epoch ms
  endTime: number;      // epoch ms
  count: number;
  crimeTypes: string[];
  districts?: string[];
  avgTimestamp: number;
  isModified?: boolean;
  mergedFrom?: string[];
  // Burst taxonomy fields
  burstClass?, burstRuleVersion?, burstScore?, burstinessCoefficient?,
  burstinessFormula?, burstinessCalculation?, burstinessByType?,
  burstConfidence?, warpWeight?, isNeutralPartition?, burstProvenance?,
  tieBreakReason?, thresholdSource?, neighborhoodSummary?
}
```

### WarpSlice (Separate Slice Model for Warp Profiles)

**File:** `src/store/useWarpSliceStore.ts`, line 3

```typescript
interface WarpSlice {
  id: string;
  label: string;
  range: [number, number];  // normalized 0-100
  weight: number;           // 0-3, clamped
  enabled: boolean;
  source: 'manual' | 'suggestion';
  warpProfileId: string | null;
}
```

---

## 2. Slice Generation Pipeline

### Flow: Binning Engine → TimeBin → TimeSlice

```
Crime data → generateBins() → TimeBin[]
  ↓
useTimeslicingModeStore / useDashboardDemoTimeslicingModeStore
  ↓ (applyGeneratedBins)
useSliceDomainStore.addSliceFromBin() / replaceSlicesFromBins()
  ↓
TimeSlice[] in store
```

### `addSliceFromBin()` — Single bin → Slice

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 311

1. Normalize bin range to 0-100 via `toNormalizedBinRange()`: `((bin.startTime - domainStart) / span) * 100`
2. If bin has burst taxonomy → create `Burst N` slice with `isBurst: true`, `warpWeight: 1.25` (or `bin.warpWeight`)
3. Else → create `Slice N` with `warpWeight: 1`
4. Both populate `startDateTimeMs`, `endDateTimeMs` from `bin.startTime`/`bin.endTime`
5. Sort slices by start time and set as active

### `replaceSlicesFromBins()` — Bulk replace

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 374

Same bin-to-slice conversion, but replaces ALL existing slices. Sets first slice as active.

### `addBurstSlice()` — Auto-created from burst windows

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 192

1. `toNormalizedStoreRange()` to normalize burst window
2. Check `findMatchingSlice()` with tolerance to avoid duplicates (0.5% range tolerance)
3. Create slice with `warpWeight: 1.25`, `isBurst: true`, auto-named `Burst {n}`

---

## 3. Manual Slice Creation

**File:** `src/store/slice-domain/createSliceCreationSlice.ts`

### Workflow

1. `startCreation('click' | 'drag')` → sets `isCreating: true`, resets preview
2. `updatePreview(start, end)` → clamps to 0-100, sets `ghostPosition { x, width }`
3. `setPreviewFeedback(feedback)` → validation, duration label, snap interval
4. `commitCreation()` → creates `TimeSlice` (point if same start/end, else range), calls `addSlice()`, resets state
5. `cancelCreation()` → resets to idle, preserves `snapEnabled`

### Date Time Resolution

`toDateTimeMs()` → converts normalized 0-100 value to epoch ms using `useTimelineDataStore` min/max timestamps via `normalizedToEpochSeconds()`.

---

## 4. Auto Burst Slices (Hook)

**File:** `src/store/useSliceStore.ts`, line 46 — `useAutoBurstSlices()`

```typescript
export const useAutoBurstSlices = (burstWindows: { start: number; end: number }[]) => {
  // Uses a processedRef Set to avoid duplicate creation
  // Skips if isComputing (avoid mid-computation races)
  // Auto-normalizes burst slices outside 0-100 range
};
```

- Creates burst slices reactively when burst windows change
- Deduplicates via window signature `{rounded(start)}-{rounded(end)}`
- Clears processed set when all burst slices are removed

---

## 5. Slice Merging

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 236 — `mergeSlices()`

1. Validate ≥ 2 slices provided
2. Normalize all ranges to 0-100
3. Check adjacency: gap between consecutive slices ≤ `MERGE_TOUCH_TOLERANCE` (0.5)
4. Compute merged range: `min(start...)` to `max(end...)`
5. Create new slice named `Merged Slice {n}`
6. Remove originals, add merged

---

## 6. Slice CRUD Operations

All in `createSliceCoreSlice`:

| Operation | Method | Behavior |
|---|---|---|
| Add | `addSlice(initial)` | Generates UUID, applies defaults, hydrates date fields, sorts |
| Remove | `removeSlice(id)` | Clears active if removed |
| Update | `updateSlice(id, updates)` | Partial update, re-sorts |
| Clear | `clearSlices()` | Empties all, nulls active |
| Toggle lock | `toggleLock(id)` | Flips `isLocked` |
| Toggle visible | `toggleVisibility(id)` | Flips `isVisible` |
| Set active | `setActiveSlice(id)` | Updates `activeSliceId` + timestamp |
| Find matching | `findMatchingSlice(start, end, tolerance?)` | Uses `rangesMatch()` with tolerance |

### Sorting

Slices sorted by start time, then non-burst before burst, then insertion order (`src/store/slice-domain/createSliceCoreSlice.ts`, line 50).

### Range Normalization

`toNormalizedStoreRange()` (`src/store/slice-domain/createSliceCoreSlice.ts`, line 16):
- If already 0-100 → use as-is
- Else if `minTimestampSec` available → convert via `epochSecondsToNormalized()`
- Else if `mapDomain` available → linear scale to 0-100
- Else → clamp to 0-100

---

## 7. Pending Generation Workflow

**File:** `src/store/useTimeslicingModeStore.ts` and `src/store/useDashboardDemoTimeslicingModeStore.ts`

### State Machine

```
idle → generating → ready → applied
                       ↓
                    error
```

### Key states:
- `generationInputs`: Crime types, neighbourhood, time window, granularity
- `pendingGeneratedBins: TimeBin[]` — editable before applying
- `generationStatus`: `'idle' | 'generating' | 'ready' | 'applied' | 'error'`
- `lastGeneratedMetadata`: Bin count, event count, warning, inputs

### Bin Editing (pending):
- `mergePendingGeneratedBins(binIds)` — merge adjacent (preserves burst metadata)
- `splitPendingGeneratedBin(binId, splitPoint)` — split at point
- `deletePendingGeneratedBin(binId)` — remove bin
- `replacePendingGeneratedBins(bins)` — full replacement

### Apply:
- `applyGeneratedBins(domain)` → calls `useSliceDomainStore.getState().replaceSlicesFromBins()`
- Clears pending, sets `generationStatus: 'applied'`

---

## 8. Slice Templates

**File:** `src/store/useTimeslicingModeStore.ts`, line 246

Pre-defined duration templates for quick manual slice creation:
- `1h`: 1 hour
- `4h`: 4 hours
- `8h`: 8 hours (Workday)
- `24h`: 24 hours (Day)
- `7d`: 7 days (Week)

Custom templates addable via `addSliceTemplate()`.

---

## 9. Preset Time Interval Definitions

**File:** `src/store/useTimeslicingModeStore.ts`, line 183 — `PRESET_DEFINITIONS`

| Preset | Intervals |
|---|---|
| `hourly` | 24 × 1-hour blocks |
| `daily` | 4 × 6-hour blocks (00-06, 06-12, 12-18, 18-24) |
| `weekly` | Mon-Thu, Fri, Sat-Sun |
| `monthly` | 4 weekly blocks |
| `weekday-weekend` | Mon-Fri, Sat-Sun |
| `morning-afternoon-evening-night` | 6-12, 12-18, 18-24, 0-6 |
| `business-hours` | 9-17, 17-24, 0-9 |

---

*Slice analysis: 2026-06-25*
