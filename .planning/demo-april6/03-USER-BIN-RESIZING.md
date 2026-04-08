# User Bin Resizing Functionality

**Purpose:** Document the design and implementation of user-controlled bin resizing in the binning system.

**Last updated:** 2026-03-31

---

## Overview

The flexible binning engine (Phase 61) supports user-driven bin modifications including **resizing**. Users can adjust bin boundaries to better match their analytical needs, with the system maintaining consistency and providing undo capabilities.

---

## Bin Resizing Capability

### Supported Operations

| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Resize** | Adjust start/end time of a single bin | Focus bin on specific time region |
| **Merge** | Combine adjacent bins into one | Consolidate related periods |
| **Split** | Divide a bin into two at a point | Isolate burst within larger period |
| **Delete** | Remove a bin entirely | Exclude irrelevant time period |
| **Create** | Add a new bin manually | Add missing time region |

---

## Resizing Implementation

### Data Structure

**File:** `src/lib/binning/types.ts`

```typescript
export interface TimeBin {
  id: string;
  startTime: number;      // Epoch ms
  endTime: number;        // Epoch ms
  count: number;          // Event count
  crimeTypes: string[];   // Crime categories in bin
  districts?: string[];   // Districts in bin
  avgTimestamp: number;   // Average timestamp (for positioning)
  isModified?: boolean;   // User-modified flag
  mergedFrom?: string[];  // Source bin IDs if merged
}

export interface BinModification {
  type: 'merge' | 'split' | 'delete' | 'resize' | 'create';
  binIds: string[];
  newBinIds?: string[];
  timestamp: number;
}
```

### Resize Function

**File:** `src/store/useBinningStore.ts:210-231`

```typescript
resizeBin: (binId, newStartTime, newEndTime) => {
  const state = get();
  if (newEndTime <= newStartTime) return; // Validate

  const newBins = state.bins.map(bin => {
    if (bin.id !== binId) return bin;
    return {
      ...bin,
      startTime: newStartTime,
      endTime: newEndTime,
      isModified: true,
    };
  });

  set({
    bins: newBins,
    modificationHistory: [
      ...state.modificationHistory,
      { type: 'resize', binIds: [binId], timestamp: Date.now() },
    ],
  });
},
```

---

## Validation Constraints

### Constraint Enforcement

**File:** `src/lib/binning/rules.ts`

```typescript
export interface BinningConstraint {
  minEvents?: number;     // Minimum events per bin (default: 5)
  maxEvents?: number;     // Maximum events per bin
  maxBins?: number;       // Maximum bin count (default: 40)
  minTimeSpan?: number;   // Minimum bin duration (ms)
  contiguous?: boolean;   // Bins must be contiguous (default: true)
}
```

### Validation Logic

**File:** `src/lib/binning/rules.ts:validateConstraints`

```typescript
export function validateConstraints(
  bins: TimeBin[],
  constraints: BinningConstraint
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check max bins
  if (constraints.maxBins && bins.length > constraints.maxBins) {
    violations.push(`Exceeds maximum bin count: ${bins.length} > ${constraints.maxBins}`);
  }

  // Check min events per bin
  if (constraints.minEvents) {
    for (const bin of bins) {
      if (bin.count < constraints.minEvents) {
        violations.push(`Bin ${bin.id} has fewer than ${constraints.minEvents} events`);
      }
    }
  }

  // Check contiguity
  if (constraints.contiguous && bins.length > 1) {
    const sorted = [...bins].sort((a, b) => a.startTime - b.startTime);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime > sorted[i - 1].endTime) {
        violations.push(`Gap between bins: ${sorted[i - 1].id} and ${sorted[i].id}`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
```

---

## User Interface

### Binning Controls Component

**File:** `src/components/binning/BinningControls.tsx`

| Control | Action | Effect |
|---------|--------|--------|
| **Strategy selector** | Choose binning strategy | Regenerates all bins |
| **Constraint sliders** | Adjust minEvents, maxBins | Regenerates bins with constraints |
| **Merge button** | Merge selected bins | Combines adjacent bins |
| **Split button** | Split at midpoint | Divides bin into two |
| **Delete button** | Remove selected bin | Deletes bin from set |
| **Save config** | Save current configuration | Persists to savedConfigurations |
| **Undo button** | Revert to previous state | Re-runs generation |
| **Reset button** | Return to defaults | Clears modifications |

### Bin Selection

Users select bins by clicking on them in the timeline visualization. Selected bin is highlighted and becomes target for operations.

---

## Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Resizing Flow                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User selects bin on timeline                             │
│     ↓                                                        │
│  2. System highlights selected bin                           │
│     ↓                                                        │
│  3. User drags bin edge (or uses controls)                   │
│     ↓                                                        │
│  4. System validates new boundaries                          │
│     ↓                                                        │
│  5a. Valid → Apply resize, mark isModified                   │
│  5b. Invalid → Show error toast, reject change               │
│     ↓                                                        │
│  6. User can undo or continue modifying                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Modification History

### History Tracking

All modifications are tracked in `modificationHistory`:

```typescript
interface BinningState {
  modificationHistory: Array<{
    type: 'merge' | 'split' | 'delete' | 'resize' | 'create';
    binIds: string[];
    timestamp: number;
  }>;
}
```

### Undo Behavior

**File:** `src/store/useBinningStore.ts:275-280`

```typescript
undo: () => {
  const state = get();
  if (state.data.length > 0) {
    get().computeBins(state.data, state.domain); // Re-generate from original data
  }
},
```

**Note:** Undo currently re-generates bins from scratch. Future enhancement could maintain a full undo stack.

---

## Configuration Management

### Save/Load Workflow

**File:** `src/store/useBinningStore.ts:233-266`

```typescript
saveConfiguration: (name) => {
  const state = get();
  const config: SavedConfiguration = {
    id: `config-${++configIdCounter}`,
    name,
    config: {
      strategy: state.strategy,
      constraints: state.constraints,
      domain: state.domain,
    },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
  set({
    savedConfigurations: [...state.savedConfigurations, config],
  });
},

loadConfiguration: (configId) => {
  const state = get();
  const config = state.savedConfigurations.find(c => c.id === configId);
  if (!config) return;

  set({
    strategy: config.config.strategy,
    constraints: config.config.constraints,
    domain: config.config.domain,
  });

  if (state.data.length > 0) {
    get().computeBins(state.data, config.config.domain);
  }
},
```

---

## Integration with Timeline

### Timeline Drag Handles

**File:** `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx:122`

```tsx
<div
  className="pointer-events-auto cursor-ew-resize"
  onMouseDown={handleMouseDown}
/>
```

### Resize Cursor Feedback

**File:** `src/components/timeslicing/ManualTimesliceEditor.tsx:183-188`

```tsx
<div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/50 transition-colors" />
<div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/50 transition-colors" />
```

---

## Validation Scenarios

### Valid Resize

```
Before: Bin A [Jan 1 - Jan 10], Bin B [Jan 10 - Jan 20]
Action: Resize Bin A to [Jan 1 - Jan 5]
Result: Valid - Bin A now ends before Bin B starts
```

### Invalid Resize (Overlap)

```
Before: Bin A [Jan 1 - Jan 10], Bin B [Jan 10 - Jan 20]
Action: Resize Bin A to [Jan 1 - Jan 15]
Result: Invalid - Would overlap Bin B (contiguity violation)
```

### Invalid Resize (Min Events)

```
Before: Bin A [Jan 1 - Jan 10] with 50 events
Action: Resize Bin A to [Jan 1 - Jan 2] (would have 3 events)
Result: Invalid - Below minEvents threshold (5)
```

---

## Key Design Decisions

### D1: Why mark modified bins with `isModified`?

**Decision:** Track user modifications with `isModified` flag.

**Rationale:**
- Allows distinguishing generated vs manually adjusted bins
- Supports future analytics on user modification patterns
- Enables "reset to generated" functionality

### D2: Why re-generate on undo instead of maintaining stack?

**Decision:** Undo re-generates bins from original data.

**Rationale:**
- Simpler implementation
- Ensures consistency with strategy
- Avoids complex state management
- Trade-off: Cannot undo through multiple manual modifications

### D3: Why enforce contiguity by default?

**Decision:** `contiguous: true` by default.

**Rationale:**
- Ensures complete temporal coverage
- Simplifies visualization (no gaps)
- Matches typical use case (continuous time analysis)
- Can be disabled for special cases

---

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| **BIN-02**: User can merge adjacent bins | `mergeBins()` in useBinningStore |
| **BIN-03**: User can split bins | `splitBin()` in useBinningStore |
| **BIN-04**: User can delete bins | `deleteBin()` in useBinningStore |
| **BIN-05**: User can resize bins | `resizeBin()` in useBinningStore |
| **BIN-06**: User can save/load configurations | `saveConfiguration()`, `loadConfiguration()` |
| **BIN-07**: User can undo/reset | `undo()`, `reset()` |
| **BIN-08**: Constraints validated | `validateConstraints()` in rules.ts |

---

## Future Enhancements

1. **Full undo stack:** Maintain history for multi-step undo
2. **Bin recalculation:** Recalculate counts/types after resize (currently estimated)
3. **Visual feedback:** Show constraint violations in real-time during drag
4. **Keyboard shortcuts:** Add/merge/split/delete without mouse
5. **Bin annotations:** Allow user notes on modified bins
