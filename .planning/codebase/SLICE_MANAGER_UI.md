# Slice Manager UI — State, Controls, and Interaction Patterns

**Analysis Date:** 2026-06-25

---

## 1. Slice Selection State

**File:** `src/store/slice-domain/createSliceSelectionSlice.ts`

### State:
```typescript
selectedIds: Set<string>
selectedCount: number
```

### Actions:
| Action | Behavior |
|---|---|
| `selectSlice(id)` | Sets selected to SINGLE id (Set with 1 entry) |
| `deselectSlice(id)` | Removes id from Set |
| `toggleSlice(id)` | Toggle membership in Set |
| `clearSelection()` | Empty Set |
| `selectAll(ids)` | Replaces Set with all given ids |
| `isSelected(id)` | Returns boolean |

### Selectors (`src/store/slice-domain/selectors.ts`):
- `selectSelectedIds`, `selectSelectedCount`, `selectHasSelection`

### UI Pattern:
- Single click → `selectSlice()` (replaces selection)
- Ctrl+click / cmd+click → `toggleSlice()` (multi-select)
- "Select All" / "Clear" buttons → `selectAll()` / `clearSelection()`

---

## 2. Slice Adjustment (Drag Interaction)

**File:** `src/store/slice-domain/createSliceAdjustmentSlice.ts`

### State:

| Field | Type | Purpose |
|---|---|---|
| `draggingSliceId` | `string \| null` | Currently dragged slice |
| `draggingHandle` | `'left' \| 'right' \| 'center' \| null` | Which edge |
| `liveBoundarySec` | `number \| null` | Live boundary in epoch seconds |
| `liveBoundaryX` | `number \| null` | Live boundary pixel position |
| `hoverSliceId` | `string \| null` | Hovered slice |
| `hoverHandle` | `AdjustmentHandle \| null` | Hovered handle |
| `tooltip` | `TooltipPayload \| null` | Position/context tooltip |
| `limitCue` | `'none' \| 'min-size' \| 'max-size' \| 'time-range'` | Visual cue |
| `modifierBypass` | `boolean` | Alt key to bypass snap |
| `snapEnabled` | `boolean` | Snap to grid/points |
| `snapMode` | `'adaptive' \| 'fixed'` | Snap mode |
| `fixedSnapPresetSec` | `number \| null` | For fixed snap |

### Drag Workflow:

1. `beginDrag({ sliceId, handle })` → sets dragging state, clears tooltip
2. `updateDrag({ limitCue, liveBoundarySec, liveBoundaryX })` → partial update during mouse move
3. `endDrag()` → clears all drag state

### Hover:
- `setHover(sliceId, handle)` — called on mouse enter/leave on slice edges
- Drives highlight rendering and tooltip display

### Tooltip Payload:
```typescript
{
  x: number;          // pixel position
  y: number;          // pixel position
  boundarySec: number; // epoch second at boundary
  durationSec: number; // slice duration
  label: string;       // formatted label
  snapState: 'snapped' | 'free' | 'bypass';
}
```

### Snap Controls:
- `setSnap({ snapEnabled, snapMode, fixedSnapPresetSec })` — toggle snap behavior
- `modifierBypass` = true when Alt key held → temporarily disables snap

---

## 3. Slice Creation Preview

**File:** `src/store/slice-domain/createSliceCreationSlice.ts` and `selectors.ts`

### Preview State:
- `previewStart`, `previewEnd`: Normalized 0-100 range
- `ghostPosition`: `{ x, width }` for rendering ghost rect
- `previewIsValid`, `previewReason`, `previewDurationLabel`, `previewTimeRangeLabel`
- `snapInterval`: Snap grid size in normalized units

### Caching (selectors.ts, line 39):
`selectCreationPreviewFeedback()` caches preview feedback object reference to prevent unnecessary re-renders when values haven't changed.

---

## 4. Comparison Slice System

**File:** `src/store/useDashboardDemoCoordinationStore.ts`

### State:
```typescript
comparisonSliceIds: { left: string | null, right: string | null }
comparisonSelectionOrder: DemoComparisonSlot[]  // ['left', 'right'] or reverse
```

### Actions:
| Action | Behavior |
|---|---|
| `pushComparisonSlice(sliceId)` | Fills left first, then right; replaces oldest if full |
| `swapComparisonSlices()` | Swaps left ↔ right |
| `clearComparisonSlices()` | Both to null |
| `setComparisonSliceId(slot, sliceId)` | Explicit set for specific slot |

### UI Pattern:
- "Compare" button fills next available slot
- Side-by-side slice view renders content for `comparisonSliceIds`
- Order tracked by `comparisonSelectionOrder` for replacement policy

---

## 5. Slice View Mode & Inspection

**File:** `src/store/useDashboardDemoCoordinationStore.ts`

### View Modes:
| Mode | Description |
|---|---|
| `'stack'` | Slices stacked vertically in timeline |
| `'focus'` | Focus on single selected slice |

### Inspection State:
- `inspectIsPlaying`: Auto-play through slices
- `inspectPlaybackSpeed`: 0.25–4x
- `inspectInterpolation`: Smooth transition between slices
- `inspectTrailEnabled`: Show trail of previous slice(s)
- `inspectTrailDecay`: 0.12–0.9
- `inspectIsScrubbing`: Manual scrub mode
- `inspectSliceOpacity`: 0–1

### Rail Tabs (`DemoRailTab`):
```
'scan' | 'detect' | 'slices' | 'inspect' | 'configure'
```

---

## 6. Slice Templates (Quick Creation)

**File:** `src/store/useTimeslicingModeStore.ts`, line 246  
**File:** `src/store/useDashboardDemoTimeslicingModeStore.ts`, line 280

### Predefined:
```typescript
[
  { id: '1h', name: '1 Hour', duration: 3600000, color: '#3b82f6' },
  { id: '4h', name: '4 Hours', duration: 14400000, color: '#10b981' },
  { id: '8h', name: '8 Hours (Workday)', duration: 28800000, color: '#f59e0b' },
  { id: '24h', name: '24 Hours (Day)', duration: 86400000, color: '#8b5cf6' },
  { id: '7d', name: '7 Days (Week)', duration: 604800000, color: '#ec4899' },
]
```

### UI Pattern:
User clicks a template name → `setIsCreatingSlice(true)` + `setCreationStart(normalizedTime)` → drag to set range → commit

---

## 7. Slice Visibility & Locking

- `toggleVisibility(id)` — Show/hide slice in timeline and 3D cube
- `toggleLock(id)` — Lock prevents accidental adjustment/deletion
- `selectVisibleSlices` selector filters to only visible slices

---

## 8. Overlap Detection

**File:** `src/store/slice-domain/createSliceCoreSlice.ts`, line 117 — `getOverlapCounts()`

Calculates how many slices overlap with each visible range slice:
- Pairs of visible range slices checked for `start < otherEnd && otherStart < end`
- Returns `Record<sliceId, overlapCount>` for UI indicators

---

## 9. Workflow Phase

**File:** `src/store/useCoordinationStore.ts`

```typescript
type WorkflowPhase = 'generate' | 'review' | 'applied' | 'refine';
```

1. **generate** — Proposals/bins are being created
2. **review** — User inspects generated intervals
3. **applied** — Slices committed to store
4. **refine** — User adjusts applied slices

---

*UI analysis: 2026-06-25*
