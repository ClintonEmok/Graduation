# Phase 27: Manual Slice Creation - Research

**Researched:** 2026-02-18
**Domain:** Timeline Interactions, Data Visualization, State Management
**Confidence:** HIGH (based on established patterns in codebase + verified best practices)

## Summary

This research covers implementation patterns for manual time slice creation in a D3/Visx-based timeline visualization. The key challenge is enabling users to create time slices via click (fixed duration) or drag (custom duration) while managing interaction conflicts with existing pan/zoom/brush functionality.

The codebase already has: (1) a DualTimeline component with D3 zoom and brush, (2) a useSliceStore with TimeSlice interface supporting both 'point' and 'range' types, (3) Pointer event handling patterns in timeline interactions, and (4) a /timeline-test isolated test environment from Phase 26.

**Primary recommendation:** Implement a mode-based slice creation system with clear visual mode indicators, using a 10px drag threshold for click/drag discrimination, transient ephemeral state in a separate Zustand store slice, and ghost visualization with D3 scales for immediate feedback.

## Standard Stack

The project already uses these technologies (from codebase analysis):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| D3 (d3-brush, d3-zoom, d3-scale, d3-selection) | v7+ | Timeline interactions, zoom, brush | Industry standard for data viz, already used in DualTimeline |
| Visx (@visx/responsive, @visx/scale) | Latest | React D3 wrapper components | Established in codebase for Timeline component |
| Zustand | Latest | State management | Already used across codebase with persist middleware |
| React Pointer Events | Native | Cross-device input handling | Modern alternative to mouse events, handles touch/mouse/pen uniformly |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| crypto.randomUUID() | Generate unique slice IDs | Already used in useSliceStore |
| DOMVector pattern | Drag selection math | For ghost preview positioning (see Architecture Patterns) |

**No additional dependencies required** - all patterns use existing stack.

## Architecture Patterns

### Recommended Project Structure (timeline-test)
```
src/app/timeline-test/
├── page.tsx                    # Existing test page (extend)
├── components/
│   ├── SliceCreationLayer.tsx  # New: Ghost/preview rendering
│   ├── SliceToolbar.tsx        # New: Mode toggle controls
│   └── SliceList.tsx           # New: List of created slices
├── hooks/
│   └── useSliceCreation.ts     # New: Creation interaction logic
└── lib/
    └── slice-utils.ts          # New: Duration calculations, snap logic
```

### Pattern 1: Mode-Based Interaction System
**What:** Explicit interaction modes (view/pan mode vs create-slice mode) with visual indicators
**When to use:** When multiple conflicting interactions (pan/zoom vs create) share the same input space
**Implementation:**
```typescript
// State structure
interface TimelineMode {
  mode: 'view' | 'create-slice';
  creationState: 'idle' | 'preview' | 'creating';
}

// Mode toggle UI pattern
<button 
  onClick={() => setMode('create-slice')}
  className={cn(
    'flex items-center gap-2 px-3 py-1.5 rounded-md transition-all',
    mode === 'create-slice' 
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
  )}
>
  <SliceIcon className="w-4 h-4" />
  <span>Create Slice</span>
  {mode === 'create-slice' && (
    <span className="ml-1 text-xs px-1.5 py-0.5 bg-amber-500/30 rounded">
      Active
    </span>
  )}
</button>
```

**Source:** React Flow patterns (https://reactflow.dev/learn/concepts/the-viewport) + NN/g mode guidelines

### Pattern 2: Drag Vector Mathematics
**What:** Use a DOMVector class to track drag state with magnitude and direction
**When to use:** Any drag-to-select or drag-to-create interaction where the selection can go in any direction
**Implementation:**
```typescript
class DOMVector {
  constructor(
    readonly x: number,      // Start X
    readonly y: number,      // Start Y
    readonly magnitudeX: number,  // Drag delta X (can be negative)
    readonly magnitudeY: number   // Drag delta Y (can be negative)
  ) {}

  toDOMRect(): DOMRect {
    return new DOMRect(
      Math.min(this.x, this.x + this.magnitudeX),
      Math.min(this.y, this.y + this.magnitudeY),
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY)
    );
  }

  getDiagonalLength(): number {
    return Math.sqrt(
      Math.pow(this.magnitudeX, 2) + Math.pow(this.magnitudeY, 2)
    );
  }
}

// Usage in component
const [dragVector, setDragVector] = useState<DOMVector | null>(null);
const isDragging = dragVector && dragVector.getDiagonalLength() >= DRAG_THRESHOLD;
```

**Source:** Joshua Wootonn's drag-to-select article (https://www.joshuawootonn.com/react-drag-to-select)

### Pattern 3: Click vs Drag Discrimination with Threshold
**What:** Distinguish clicks from drags using a pixel threshold to prevent accidental triggers
**When to use:** When the same pointer action can mean either "select/create at point" or "create range"
**Implementation:**
```typescript
const DRAG_THRESHOLD = 10; // pixels

const handlePointerMove = (e: React.PointerEvent) => {
  if (!dragStart) return;
  
  const nextVector = new DOMVector(
    dragStart.x,
    dragStart.y,
    e.clientX - containerRect.x - dragStart.x,
    0 // Y-axis locked for timeline
  );

  // Only enter "dragging" mode after threshold
  if (!isDragging && nextVector.getDiagonalLength() < DRAG_THRESHOLD) {
    return; // Still a click
  }

  setIsDragging(true);
  setDragVector(nextVector);
  updateGhostPreview(nextVector);
};

const handlePointerUp = () => {
  if (!isDragging) {
    // This was a click - create slice with default duration
    createSliceAtPoint(dragStart.x);
  } else {
    // This was a drag - create slice with custom range
    createSliceFromDrag(dragVector);
  }
  resetDragState();
};
```

**Source:** WCAG 2.5.7 guidelines + drag-to-select best practices

### Pattern 4: Ephemeral/Transient State Store Pattern
**What:** Separate persistent state (saved slices) from transient UI state (creation preview) using Zustand slices
**When to use:** When you have UI-only state that shouldn't be persisted or affect other components until committed
**Implementation:**
```typescript
// Transient state - not persisted
interface SliceCreationState {
  // Creation mode state
  isCreating: boolean;
  creationMode: 'click' | 'drag' | null;
  
  // Preview state (transient)
  previewStart: number | null;  // Normalized time 0-100
  previewEnd: number | null;    // Normalized time 0-100
  ghostPosition: { x: number; width: number } | null;
  
  // Actions
  startCreation: (mode: 'click' | 'drag') => void;
  updatePreview: (start: number, end: number) => void;
  commitCreation: () => TimeSlice | null;
  cancelCreation: () => void;
}

// Separate from persisted slice store
export const useSliceCreationStore = create<SliceCreationState>()(
  (set, get) => ({
    isCreating: false,
    creationMode: null,
    previewStart: null,
    previewEnd: null,
    ghostPosition: null,
    
    startCreation: (mode) => set({ 
      isCreating: true, 
      creationMode: mode,
      previewStart: null,
      previewEnd: null 
    }),
    
    updatePreview: (start, end) => set({
      previewStart: start,
      previewEnd: end
    }),
    
    commitCreation: () => {
      const { previewStart, previewEnd, creationMode } = get();
      if (previewStart === null) return null;
      
      const slice = creationMode === 'click'
        ? createSliceWithDefaultDuration(previewStart)
        : createSliceWithRange(previewStart, previewEnd ?? previewStart);
      
      // Add to persisted store
      useSliceStore.getState().addSlice(slice);
      
      // Reset transient state
      set({ isCreating: false, creationMode: null, previewStart: null, previewEnd: null });
      
      return slice;
    },
    
    cancelCreation: () => set({
      isCreating: false,
      creationMode: null,
      previewStart: null,
      previewEnd: null
    })
  })
);
```

**Source:** Zustand slices pattern (https://zustand.docs.pmnd.rs/guides/slices-pattern)

### Pattern 5: Ghost/Preview Visualization
**What:** Real-time visual feedback during drag showing the eventual slice boundaries
**When to use:** When user needs to see what they're creating before committing
**Implementation:**
```typescript
// Ghost slice component
const GhostSlice: React.FC<{
  startX: number;
  endX: number;
  height: number;
  isValid: boolean;
}> = ({ startX, endX, height, isValid }) => {
  const left = Math.min(startX, endX);
  const width = Math.abs(endX - startX);
  
  return (
    <div
      className={cn(
        'absolute top-0 rounded-sm pointer-events-none transition-all',
        isValid 
          ? 'bg-amber-500/20 border-2 border-amber-500/60' 
          : 'bg-red-500/10 border-2 border-red-500/40 border-dashed'
      )}
      style={{
        left,
        width: Math.max(width, 2), // Minimum visible width
        height
      }}
    >
      {/* Duration tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className={cn(
          'px-2 py-1 text-xs rounded-md',
          isValid ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
        )}>
          {formatDuration(widthToDuration(width))}
        </span>
      </div>
    </div>
  );
};
```

### Pattern 6: Conflict Resolution with setPointerCapture
**What:** Prevent event conflicts between drag creation and underlying zoom/brush by capturing pointer
**When to use:** When overlapping interactive elements compete for pointer events
**Implementation:**
```typescript
const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
  if (mode !== 'create-slice') return;
  
  // Capture all pointer events to this element until pointerup
  e.currentTarget.setPointerCapture(e.pointerId);
  
  // Initialize drag
  const rect = e.currentTarget.getBoundingClientRect();
  setDragStart({
    x: e.clientX - rect.left,
    time: scale.invert(e.clientX - rect.left)
  });
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!dragStart) return;
  
  // Event won't propagate to zoom/brush while pointer is captured
  updatePreview(e);
};
```

**Source:** Joshua Wootonn's article + React Aria interactions

### Pattern 7: Snap Behavior with Time Intervals
**What:** Optional snapping to logical time boundaries during slice creation
**When to use:** When users need precise control or round time values
**Implementation:**
```typescript
const SNAP_INTERVALS = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400
};

function snapToInterval(
  timestamp: number, 
  interval: number,
  domainStart: number
): number {
  const offset = timestamp - domainStart;
  const snappedOffset = Math.round(offset / interval) * interval;
  return domainStart + snappedOffset;
}

// In component with user preference
const [snapEnabled, setSnapEnabled] = useState(true);
const snapInterval = useMemo(() => {
  const span = domainEnd - domainStart;
  if (span < 3600) return 60; // Snap to minutes
  if (span < 86400) return 3600; // Snap to hours
  return 86400; // Snap to days
}, [domainStart, domainEnd]);

// Apply snap during preview update
const snappedTime = snapEnabled 
  ? snapToInterval(rawTime, snapInterval, domainStart)
  : rawTime;
```

### Anti-Patterns to Avoid
- **Mode confusion without visual indicators:** Always show clear visual feedback of active mode (cursor change, UI highlight, tooltips)
- **Persistent preview state:** Never persist preview/ghost state to storage - keep it ephemeral
- **Immediate slice creation on mousedown:** Always wait for pointerup to create, supporting cancel via Escape or moving outside bounds
- **Overloading single interaction:** Don't try to support pan, zoom, brush, AND slice creation without clear mode separation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag distance calculation | Manual delta tracking | DOMVector class (Pattern 2) | Handles negative magnitudes, direction changes, threshold checking |
| Click vs drag detection | Heuristics based on time | Pixel threshold (Pattern 3) | Time-based detection fails with slow movements; pixels are reliable |
| Pointer event normalization | Mouse event polyfills | React Pointer Events | Native cross-device support (mouse/touch/pen) |
| Mode state management | Boolean flags scattered in component | Zustand store (Pattern 4) | Centralized, testable, avoids prop drilling |
| Snap behavior | Manual rounding math | Snap function with configurable interval (Pattern 7) | Supports different granularities, testable, reusable |
| Ghost rendering | Absolute positioned divs manually | D3 scales + React component (Pattern 5) | Consistent with timeline scale, responsive to zoom |

**Key insight:** The hardest part of this interaction is managing the state machine transitions (idle → preview → creating → committed/cancelled). A well-structured Zustand store makes this explicit and testable.

## Common Pitfalls

### Pitfall 1: Interaction Conflict Hell
**What goes wrong:** Zoom/pan/brush handlers fire simultaneously with slice creation, causing erratic behavior
**Why it happens:** D3 zoom and brush attach to the same elements; without explicit mode switching or event capture, events propagate unexpectedly
**How to avoid:** 
1. Use `setPointerCapture` in slice creation mode (Pattern 6)
2. Conditionally render interaction layers (zoom rect vs creation rect)
3. Use `e.stopPropagation()` in creation handlers

**Warning signs:** Selection jumps around, multiple cursors appear, ghost doesn't match final result

### Pitfall 2: Phantom Clicks on Drag Release
**What goes wrong:** After dragging to create a slice, a click event fires on an underlying element
**Why it happens:** Browser synthesizes click events after pointer sequences; if threshold isn't applied, drag end triggers click handlers
**How to avoid:** 
1. Always use 10px+ threshold before treating as drag (Pattern 3)
2. Track `isDragging` state; only handle click if `!isDragging`
3. Prevent default on pointer events during creation mode

### Pitfall 3: State Leak Between Modes
**What goes wrong:** Creating a slice in test environment, then switching modes leaves ghost visible or corrupts slice data
**Why it happens:** Transient creation state not properly reset on mode switch or unmount
**How to avoid:**
1. Always call `cancelCreation()` in mode toggle
2. Use `useEffect` cleanup to reset state when component unmounts
3. Gate all creation UI on `isCreating` state from store

### Pitfall 4: Time Conversion Errors
**What goes wrong:** Slice appears at wrong position or wrong duration after creation
**Why it happens:** Mixing normalized (0-100), epoch seconds, and Date objects inconsistently
**How to avoid:**
1. Use existing `epochSecondsToNormalized` and `normalizedToEpochSeconds` utilities
2. Store slice times in normalized format (consistent with existing useSliceStore)
3. Convert to pixels ONLY at render time using D3 scales
4. Add TypeScript branded types: `type NormalizedTime = number & { __brand: 'normalized' }`

### Pitfall 5: Accessibility Trap
**What goes wrong:** Slice creation only works with mouse; keyboard users can't create slices
**Why it happens:** Drag-based interactions are inherently mouse-centric
**How to avoid (minimum viable):**
1. Provide alternative: text inputs for start/end times
2. Ensure mode toggle is keyboard accessible
3. Add ARIA labels to ghost preview
4. Consider: after creating first slice, copy its duration for next creation

**Note:** Per CONTEXT.md, full keyboard support is Claude's discretion; basic accessibility is required

## Code Examples

### Basic Slice Creation Hook
```typescript
// hooks/useSliceCreation.ts
import { useCallback, useRef } from 'react';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceStore } from '@/store/useSliceStore';

const DRAG_THRESHOLD = 10;

export function useSliceCreation(
  scale: ScaleTime<number, number>,
  containerRef: React.RefObject<HTMLElement>
) {
  const {
    isCreating,
    startCreation,
    updatePreview,
    commitCreation,
    cancelCreation
  } = useSliceCreationStore();

  const dragState = useRef<{
    startX: number;
    startTime: number;
    isDragging: boolean;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isCreating) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    dragState.current = {
      startX: x,
      startTime: scale.invert(x).getTime() / 1000,
      isDragging: false
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isCreating, scale, containerRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const dx = Math.abs(x - dragState.current.startX);

    if (!dragState.current.isDragging && dx >= DRAG_THRESHOLD) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      const currentTime = scale.invert(x).getTime() / 1000;
      updatePreview(
        Math.min(dragState.current.startTime, currentTime),
        Math.max(dragState.current.startTime, currentTime)
      );
    }
  }, [scale, containerRef, updatePreview]);

  const handlePointerUp = useCallback(() => {
    if (!dragState.current) return;

    if (!dragState.current.isDragging) {
      // Click - use default duration
      updatePreview(dragState.current.startTime, dragState.current.startTime + 3600);
    }

    const slice = commitCreation();
    dragState.current = null;
    return slice;
  }, [commitCreation, updatePreview]);

  return {
    isCreating,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp
    }
  };
}
```

### Slice Toolbar Component
```typescript
// components/SliceToolbar.tsx
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceStore } from '@/store/useSliceStore';
import { Scissors, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SliceToolbar() {
  const { isCreating, startCreation, cancelCreation } = useSliceCreationStore();
  const { slices, clearSlices } = useSliceStore();

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-700">
      <button
        onClick={() => isCreating ? cancelCreation() : startCreation('drag')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md transition-all',
          isCreating 
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' 
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
        )}
      >
        <Scissors className="w-4 h-4" />
        <span>{isCreating ? 'Cancel' : 'Create Slice'}</span>
      </button>
      
      {isCreating && (
        <span className="text-xs text-amber-300/70 px-2">
          Click or drag on timeline
        </span>
      )}
      
      {slices.length > 0 && (
        <>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <span className="text-xs text-slate-400">
            {slices.length} slice{slices.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearSlices}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
            title="Clear all slices"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mouse events | Pointer events | 2020+ (Pointer Events Level 3) | Unified handling for mouse/touch/pen; simplifies cross-device support |
| Redux for local UI state | Zustand for ephemeral state | 2023+ | Less boilerplate, better TypeScript, easier to split transient vs persistent |
| Immediate slice creation | Preview/commit pattern | Modern UX | Users can cancel, see result before committing, reduces errors |
| Drag threshold by time | Drag threshold by pixels | 2024+ (WCAG 2.5.7) | More reliable, doesn't fail with slow deliberate movements |
| Global mode state | Component-local mode | 2024+ | Better encapsulation, multiple timelines can have independent modes |

**Deprecated/outdated:**
- Direct mutation of D3 selections in React render (use useEffect + refs instead)
- Storing positions in pixels (always use data coordinates + scales)
- Mouse event detection for mobile compatibility (use pointer events)

## Open Questions

### 1. Default Duration Calculation
- **What we know:** CONTEXT.md specifies "Claude's discretion" for default duration behavior
- **What's unclear:** Whether default duration should be fixed (e.g., always 1 hour), zoom-relative (visible range / N), or density-adaptive
- **Recommendation:** Start with zoom-relative: `defaultDuration = visibleRange / 10` (creates slice covering 10% of visible range). This feels natural at all zoom levels and matches Figma/Sketch pattern.

### 2. Overlap Handling Strategy
- **What we know:** CONTEXT.md mentions "auto-merge preferred" but leaves implementation to discretion
- **What's unclear:** Whether to merge immediately, show preview of merge, or prevent creation
- **Recommendation:** Show warning in ghost tooltip when overlap detected: "Overlaps with 'Slice 3' - will merge". On commit, merge into existing slice or create new depending on overlap percentage (>50% overlap = extend existing, <50% = new adjacent slice).

### 3. Pan/Zoom in Create Mode
- **What we know:** CONTEXT.md marks this as Claude's discretion
- **What's unclear:** Whether to disable pan/zoom entirely in create mode, or require modifier key (Space to pan, Cmd+scroll to zoom)
- **Recommendation:** Disable direct pan/zoom in create mode (mode should be exclusive). Show hint: "Exit create mode to pan/zoom". This prevents accidental mode confusion and matches design tool patterns (Figma/Sketch).

### 4. Minimum/Maximum Duration Constraints
- **What we know:** "Zoom-relative maximum duration preferred" per CONTEXT.md
- **What's unclear:** Exact ratio and minimum duration floor
- **Recommendation:** Min: 1 minute (absolute floor), Max: 80% of visible range (prevents creating slices larger than viewport). Visual indicator when hitting limits: ghost turns red with tooltip "Maximum duration reached".

## Sources

### Primary (HIGH confidence)
- Existing codebase: DualTimeline.tsx, useSliceStore.ts - D3 zoom/brush patterns already implemented
- Zustand documentation (https://zustand.docs.pmnd.rs/guides/slices-pattern) - State management patterns
- W3C Pointer Events Level 3/4 (https://w3.org/TR/pointerevents/) - Cross-device input handling
- Joshua Wootonn's "Drag to Select" article (https://www.joshuawootonn.com/react-drag-to-select) - Proven drag selection patterns with code

### Secondary (MEDIUM confidence)
- React Flow viewport documentation (https://reactflow.dev/learn/concepts/the-viewport) - Mode-based interaction patterns
- NN/g "Modes in User Interfaces" (https://www.nngroup.com/articles/modes/) - UX guidelines for modal interfaces
- WCAG 2.5.7 Dragging Movements guidelines - Accessibility considerations for drag interactions
- Observable "Linked Brushing" article (January 2025) - Data visualization interaction patterns

### Tertiary (LOW confidence - for context only)
- Various Stack Overflow discussions on D3 brush/zoom conflicts - Community solutions, not authoritative
- Medium articles on drag-and-drop UX - General UX principles, not specific to timelines

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase technologies exclusively
- Architecture patterns: HIGH - Based on established patterns (React Flow, Joshua Wootonn's proven approach)
- Pitfalls: MEDIUM-HIGH - Derived from common D3/React issues, some from community experience

**Research date:** 2026-02-18
**Valid until:** 2026-04-18 (2 months - patterns are stable, but always verify against latest D3/Zustand versions)

**Integration notes for planner:**
1. Build in /timeline-test first (per CONTEXT.md)
2. Follow existing codebase patterns: useSliceStore for persistence, create new transient store for creation state
3. Reuse DualTimeline's scale logic and pointer event handling as reference
4. Test with mock data in isolated environment before production integration
