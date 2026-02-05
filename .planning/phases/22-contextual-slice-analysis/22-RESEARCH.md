# Phase 22: Contextual Slice Analysis - Research

**Researched:** 2026-02-05
**Domain:** UI/UX & Data Visualization
**Confidence:** HIGH

## Summary

This phase implements a side panel that provides detailed analytics for a selected time slice (point or range). It requires integrating a slide-in UI component, calculating statistics from the selected data subset, and enabling bidirectional interaction between the 3D view and the panel.

**Primary recommendation:** Use Radix UI `Dialog` or `Sheet` (if available, otherwise standard fixed div with transitions) for the panel. Calculate stats on-demand using `useDataStore`'s `columns` and `useSliceStore`'s active selection.

## Standard Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| **Panel** | Radix UI (Dialog/Sheet) or custom `fixed` div | The contextual container. |
| **Charts** | Visx (`@visx/shape`, `@visx/scale`) | Bar charts for Type/District distribution. |
| **Icons** | `lucide-react` | UI controls (close, expand, type icons). |
| **State** | `zustand` (`useSliceStore`, `useDataStore`) | Data source and selection state. |

## Architecture Patterns

### 1. Panel Integration
- **Component:** `ContextualSlicePanel.tsx`
- **Location:** `src/components/viz/ContextualSlicePanel.tsx`
- **Behavior:**
  - Subscribes to `useSliceStore`.
  - Renders if `activeSliceId` is present (or a specific "inspecting" state).
  - Slides in from right (CSS transition).

### 2. Data Calculation
- **Trigger:** When `activeSliceId` changes or slice parameters update (on drag end).
- **Logic:**
  - Retrieve slice bounds (time range or point).
  - Filter `useDataStore.columns` based on these bounds.
  - Compute aggregates: Count by Type, Count by District.
  - **Optimization:** Run calculation in a `useMemo` or a dedicated effect to avoid blocking the main thread if data is large. For 2M points, a simple loop is fast enough (~10-50ms), but `useTransition` could keep UI responsive.

### 3. Bidirectional Selection
- **3D -> Panel:** Clicking a point in `TimeSlices` (or `DataPoints`) sets `selectedPointId` in a store (likely `useSliceStore` or a new `useSelectionStore` if complex).
- **Panel -> 3D:** Hovering/Clicking a point in the "Top Events" list highlights it in the 3D view (via `ClusterHighlights` mechanism or similar).

## Data Access Strategy

The `useDataStore` holds `columns` (Float32Arrays).
To get stats for a slice (e.g., time `T` +/- window `W`):

```typescript
// Pseudo-code for stats calculation
const { timestamp, type, district } = columns;
const startT = slice.range[0]; // normalized
const endT = slice.range[1];

const stats = { types: {}, districts: {}, total: 0 };

for (let i = 0; i < length; i++) {
  if (timestamp[i] >= startT && timestamp[i] <= endT) {
    stats.types[type[i]] = (stats.types[type[i]] || 0) + 1;
    stats.districts[district[i]] = (stats.districts[district[i]] || 0) + 1;
    stats.total++;
  }
}
```

**Pre-computation:** Since `useDataStore` already has `columns`, we can access raw typed arrays directly for max speed.

## Pitfalls

### 1. Real-time Updates vs Drag End
- **Risk:** Recalculating stats on every frame of a drag (slice resize) will lag.
- **Solution:** As decided in Context, update stats only on interaction end (or debounce heavily). The slice visual updates in real-time, but the panel shows a "Calculating..." or stale state until release.

### 2. Panel Overlay Conflicts
- **Risk:** Panel covers 3D controls or other UI.
- **Solution:** Ensure z-index is correct. If it's a "sidebar", it might need to push the canvas or just overlay. Overlay is standard for "contextual" details.

### 3. No Data State
- **Risk:** Empty slices look broken.
- **Solution:** Explicit "No events found in this time range" empty state.

## Code Examples

### Store Extension (useSliceStore.ts)
We need to track *which* slice is being inspected, not just which exist.

```typescript
interface SliceStore {
  // ... existing
  inspectedSliceId: string | null;
  setInspectedSlice: (id: string | null) => void;
  // History
  inspectionHistory: string[]; // IDs
}
```

### Stats Hook (useSliceStats.ts)
```typescript
export function useSliceStats(sliceId: string) {
  const slice = useSliceStore(s => s.slices.find(sl => sl.id === sliceId));
  const { columns } = useDataStore();
  
  return useMemo(() => {
    if (!slice || !columns) return null;
    // ... calculation logic ...
    return stats;
  }, [slice, columns]);
}
```

## Existing Assets
- `useSliceStore` exists but needs `inspectedSliceId`.
- `useDataStore` has `columns` ready for fast iteration.
- `TimeSlices` component exists for rendering.

## Metadata
- **Confidence:** HIGH
- **Complexity:** MEDIUM (mostly UI work + efficient looping)
