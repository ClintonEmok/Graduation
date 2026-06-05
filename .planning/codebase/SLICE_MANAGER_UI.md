# DemoSlicePanel: Slice Management UI Analysis

**Analysis Date:** 2026-06-01

---

## Overview

A single slice management UI exists in the codebase: `DemoSlicePanel`. The `SliceManagerUI` component at `src/components/viz/SliceManagerUI.tsx` was **removed** — it no longer exists.

| Component | File | Lines | Store Used | Purpose |
|-----------|------|-------|------------|---------|
| `DemoSlicePanel` | `src/components/dashboard-demo/DemoSlicePanel.tsx` | 667 | `useSliceDomainStore`, `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeslicingModeStore`, `useDashboardDemoTimeStore`, `useTimelineDataStore` | Slice review-and-apply companion in demo dashboard |

---

## Store Dependencies

### DemoSlicePanel

**Stores read (5):**
- `useSliceDomainStore` — slices, removeSlice, clearSlices
- `useDashboardDemoCoordinationStore` — timeScaleMode, warpFactor, setTimeScaleMode, setWarpFactor, resetWarp, clearSelectedBurstWindows
- `useDashboardDemoTimeslicingModeStore` — pendingGeneratedBins, generationError, mergePendingGeneratedBins, splitPendingGeneratedBin, deletePendingGeneratedBin, clearPendingGeneratedBins, lastGeneratedMetadata, lastAppliedAt, addManualDraftRange, computeManualDraftBin, applySingleGeneratedBin
- `useDashboardDemoTimeStore` — currentTime, timeRange, timeResolution
- `useTimelineDataStore` — minTimestampSec, maxTimestampSec

**Store operations used from useSliceDomainStore:**
```typescript
slices.find((slice) => slice.id === selectedSliceId)  // Read selected slice
removeSlice(slice.id)                                   // Remove slice
clearSlices()                                          // Clear all
```

**No direct slice creation via addSlice.** All slice creation goes through draft bins → `applySingleGeneratedBin`.

---

## TimeSlice Interface

**File:** `src/store/slice-domain/types.ts` (lines 7-33)

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
  burstinessCoefficient?: number;
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

### Fields DemoSlicePanel accesses:

| Field | Read | Write | Notes |
|-------|------|-------|-------|
| `id` | ✓ | | |
| `name` | ✓ | | Display in label |
| `type` | ✓ | | |
| `time` | ✓ | | |
| `range` | ✓ | | |
| `isVisible` | ✓ | | |
| `isLocked` | ✓ | | |
| `source` | ✓ | | Display in detail dialog |
| `warpEnabled` | ✓ | | Display warp label |
| `warpWeight` | ✓ | | Display in badge |
| `isBurst` | ✓ | | Display burst badge |
| `burstScore` | ✓ | | Display in detail dialog |
| `burstConfidence` | ✓ | | Display in detail dialog |
| `burstClass` | ✓ | | Display in detail dialog |
| `burstProvenance` | ✓ | | Display in detail dialog |
| `burstinessCoefficient` | ✓ | | Display in list and dialog |
| `tieBreakReason` | ✓ | | Display in detail dialog |
| `thresholdSource` | ✓ | | Display in detail dialog |
| `neighborhoodSummary` | ✓ | | Display in detail dialog |
| `startDateTimeMs` | ✓ | | Display in detail dialog |
| `endDateTimeMs` | ✓ | | Display in detail dialog |

---

## Key Operations

### Creating Slices (via draft bins)

The panel does NOT call `addSlice` directly. Instead:

```typescript
const handleAddRangeSlice = useCallback(() => {
  const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
  const start = Math.max(timeRange[0], currentTime - stepSize * 2);
  const end = Math.min(timeRange[1], currentTime + stepSize * 2);
  const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
  const startDateTimeMs = ...;
  const endDateTimeMs = ...;

  if (startDateTimeMs === null || endDateTimeMs === null) return;
  const binId = addManualDraftRange({ startMs: startDateTimeMs, endMs: endDateTimeMs });
  computeManualDraftBin(binId);  // generates burst metadata
}, [...]);
```

### Applying a Single Draft

```typescript
const handleApplySingleDraft = useCallback((binId: string) => {
  const [windowStart, windowEnd] = timeRange;
  const domainStartMs = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
  const domainEndMs = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;
  const applied = applySingleGeneratedBin(binId, [domainStartMs, domainEndMs]);
  if (applied) {
    toast.success('Slice applied', { description: 'Slice activated from Detect.' });
    // Set active slice index to the newly applied slice
    const storeSlices = useSliceDomainStore.getState().slices;
    const visibleRange = storeSlices.filter(s => s.isVisible && s.type === 'range')
      .sort((a, b) => (a.startDateTimeMs ?? 0) - (b.startDateTimeMs ?? 0));
    const newIndex = Math.max(0, visibleRange.length - 1);
    useDashboardDemoCoordinationStore.getState().setActiveSliceIndex(newIndex);
  }
}, [applySingleGeneratedBin, maxTimestampSec, minTimestampSec, timeRange]);
```

### Managing Draft Bins

| Operation | Method | Notes |
|-----------|--------|-------|
| Merge | `mergePendingGeneratedBins(binIds)` | Merges adjacent draft bins |
| Split | `splitPendingGeneratedBin(binId, splitPoint)` | Splits at midpoint epoch |
| Delete | `deletePendingGeneratedBin(binId)` | Removes draft (with selected ID cleanup) |
| Apply | `applySingleGeneratedBin(binId, domain)` | Writes to `useSliceDomainStore.replaceSlicesFromBins` |

### Clearing All State

```typescript
const handleClearAll = useCallback(() => {
  setSelectedSliceId(null);
  setSelectedDraftId(null);
  clearSlices();
  clearPendingGeneratedBins();
  clearSelectedBurstWindows();
}, [...]);
```

---

## Warp Controls

The panel includes adaptive warp control (lines 257-303):

- **Linear/Adaptive toggle** — switches `timeScaleMode` in `useDashboardDemoCoordinationStore`
- **Warp factor slider** (0-3 range, 0.05 step) — sets `warpFactor`
- Status badge showing `{mode} · {factor}x` or `—`

**Auto-activation effect** (lines 111-124): When `visibleWarpSliceCount > 0`, the effect auto-switches to adaptive mode with warp factor 1. When all warp slices are removed, it resets to linear.

---

## Detail Dialogs

### Slice Details Dialog

The dialog (lines 474-556) displays a 3-column grid with:
- Name / type
- Burst class + coefficient + confidence
- Warp enabled/disabled + strength
- Visibility / lock state
- Burst provenance
- Tie-break / threshold reason
- Neighborhood summary
- Start / end datetimes

### Draft Details Dialog

The draft dialog (lines 557-663) displays:
- Draft ID and time span
- Burst class + coefficient
- Warp weight + neutral partition state
- Burst confidence + event count
- Crime types + districts
- Provenance / threshold
- Tie-break / neighborhood
- Burstiness formula + calculation
- Per-type burstiness breakdown

---

## Time Normalization Analysis

### Functions in `src/lib/time-domain.ts`

```typescript
export const epochSecondsToNormalized = (
  epochSeconds: number, minEpochSeconds: number, maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return ((epochSeconds - minEpochSeconds) / span) * 100;
};

export const normalizedToEpochSeconds = (
  normalized: number, minEpochSeconds: number, maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return minEpochSeconds + (normalized / 100) * span;
};
```

**Correctness:** These are mathematically correct. Both use `span = max - min` and the mapping is bijective.

### DemoSlicePanel time handling functions

**`formatDateTime` (line 30-35):** Formats ms timestamp for display. Falls back to `—` for null/undefined/infinite.

**`formatCompactDate` (line 37-42):** Formats ms timestamp as compact date (e.g., "Jan 23, 2024"). Falls back to `—`.

**`formatCoefficient` (line 44-49):** Formats burstiness coefficient to 2 decimal places. Returns `null` for invalid values.

**`formatNormalizedScore` (line 51-56):** Formats normalized score as `NN / 100`. Returns `null` for invalid values.

---

## Summary of Behavior

| Aspect | DemoSlicePanel |
|--------|----------------|
| Slice creation | Via draft bins only (`addManualDraftRange` → `computeManualDraftBin` → `applySingleGeneratedBin`) |
| Warp controls | Linear/Adaptive toggle + warp factor slider (0-3) |
| Burst metadata | Full display: class, coefficient, score, confidence, provenance, breakdown |
| Source field | Set via draft metadata |
| Persistence | Slices persisted via `useSliceDomainStore` (key `slice-domain-v1`) |
| Comparison slots | Not present in UI |
| Detail dialog | Rich metadata display for both slices and drafts |
| Draft management | Merge, split, delete, apply |
| Auto-warp | Auto-switches to adaptive mode when warp slices are present |

---

*Slice management UI analysis: 2026-06-01*
