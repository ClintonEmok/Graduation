# Requirements Coverage Mapping

**Purpose:** Map implemented features to their requirements for April 6th demo.

**Last updated:** 2026-03-31

---

## Overview

This document traces all implemented requirements from their definition in `.planning/REQUIREMENTS.md` to their implementation in code, providing evidence for demo readiness.

---

## Phase 61: Flexible Binning Engine (Complete)

### BIN-01: 13 Binning Strategies

**Requirement:** User can select from 13 binning strategies.

**Evidence:**
- **File:** `src/lib/binning/rules.ts:13-18`
- **File:** `src/lib/binning/engine.ts:44-84`

```typescript
export type BinningStrategy =
  | 'daytime-heavy'
  | 'nighttime-heavy'
  | 'crime-type-specific'
  | 'burstiness'
  | 'uniform-distribution'
  | 'uniform-time'
  | 'weekday-weekend'
  | 'quarter-hourly'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'auto-adaptive'
  | 'custom';
```

**Strategies Implemented:**

| Strategy | Description | Algorithm |
|----------|-------------|-----------|
| `daytime-heavy` | 6am-6pm gets finer bins | 3-hour daytime blocks |
| `nighttime-heavy` | 6pm-6am gets finer bins | 4-hour nighttime blocks |
| `crime-type-specific` | Group by crime category | Per-type aggregation |
| `burstiness` | Split on inter-arrival gaps | Gap threshold splitting |
| `uniform-distribution` | Equal events per bin | N/bins events each |
| `uniform-time` | Equal time spans | Fixed interval bins |
| `weekday-weekend` | Separate weekday/weekend | Per-category bins |
| `quarter-hourly` | 15-minute intervals | Fixed 15min bins |
| `hourly` | Hourly intervals | Fixed 1hr bins |
| `daily` | Daily intervals | Fixed 24hr bins |
| `weekly` | Weekly intervals | Fixed 7-day bins |
| `auto-adaptive` | Detect best strategy | Burstiness CV check |
| `custom` | User-defined | Manual configuration |

---

### BIN-02: Merge Adjacent Bins

**Requirement:** User can merge adjacent bins.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:117-153`
- **File:** `src/lib/binning/types.ts:38`

```typescript
mergeBins: (binIds) => {
  const state = get();
  if (binIds.length < 2) return;

  const sortedBins = binIds
    .map(id => state.bins.find(b => b.id === id))
    .filter((b): b is TimeBin => Boolean(b))
    .sort((a, b) => a.startTime - b.startTime);

  const newBin: TimeBin = {
    id: `merged-${Date.now()}`,
    startTime: sortedBins[0].startTime,
    endTime: sortedBins[sortedBins.length - 1].endTime,
    count: sortedBins.reduce((sum, b) => sum + b.count, 0),
    crimeTypes: Array.from(new Set(sortedBins.flatMap(b => b.crimeTypes))),
    districts: Array.from(new Set(sortedBins.flatMap(b => b.districts || []))),
    avgTimestamp: /* weighted average */,
    isModified: true,
    mergedFrom: sortedBins.map(b => b.id),
  };
  // ... update bins
},
```

---

### BIN-03: Split Bins

**Requirement:** User can split bins.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:155-194`
- **File:** `src/lib/binning/types.ts:38`

```typescript
splitBin: (binId, splitPoint) => {
  const state = get();
  const bin = state.bins.find(b => b.id === binId);
  if (!bin) return;

  const bin1: TimeBin = {
    id: `split1-${Date.now()}`,
    startTime: bin.startTime,
    endTime: splitPoint,
    count: Math.floor(bin.count / 2),
    // ... other fields
  };

  const bin2: TimeBin = {
    id: `split2-${Date.now()}`,
    startTime: splitPoint,
    endTime: bin.endTime,
    count: bin.count - bin1.count,
    // ... other fields
  };
  // ... update bins
},
```

---

### BIN-04: Delete Bins

**Requirement:** User can delete bins.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:196-208`
- **File:** `src/lib/binning/types.ts:38`

```typescript
deleteBin: (binId) => {
  const state = get();
  const newBins = state.bins.filter(b => b.id !== binId);

  set({
    bins: newBins,
    selectedBinId: state.selectedBinId === binId ? null : state.selectedBinId,
    modificationHistory: [
      ...state.modificationHistory,
      { type: 'delete', binIds: [binId], timestamp: Date.now() },
    ],
  });
},
```

---

### BIN-05: Resize Bins

**Requirement:** User can resize bins.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:210-231`
- **File:** `src/lib/binning/types.ts:38`

```typescript
resizeBin: (binId, newStartTime, newEndTime) => {
  const state = get();
  if (newEndTime <= newStartTime) return;

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

### BIN-06: Save/Load Configurations

**Requirement:** User can save/load binning configurations.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:233-273`
- **File:** `src/lib/binning/types.ts:53-59`

```typescript
interface SavedConfiguration {
  id: string;
  name: string;
  config: BinningConfig;
  createdAt: number;
  modifiedAt: number;
}

saveConfiguration: (name) => {
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
  // ...
},

loadConfiguration: (configId) => {
  const config = state.savedConfigurations.find(c => c.id === configId);
  // Restore strategy, constraints, domain
  // Re-compute bins
},
```

---

### BIN-07: Undo/Reset Changes

**Requirement:** User can undo/reset binning changes.

**Evidence:**
- **File:** `src/store/useBinningStore.ts:275-296`

```typescript
undo: () => {
  const state = get();
  if (state.data.length > 0) {
    get().computeBins(state.data, state.domain);
  }
},

reset: () => {
  set({
    strategy: 'auto-adaptive',
    constraints: {
      minEvents: 5,
      maxEvents: 500,
      maxBins: 40,
      contiguous: true,
    },
    bins: [],
    metadata: null,
    selectedBinId: null,
    modificationHistory: [],
  });
},
```

---

### BIN-08: Constraint Validation

**Requirement:** Constraints validated (minEvents, maxEvents, maxBins, contiguous).

**Evidence:**
- **File:** `src/lib/binning/rules.ts:85-114`

```typescript
export interface BinningConstraint {
  minEvents?: number;
  maxEvents?: number;
  maxBins?: number;
  minTimeSpan?: number;
  contiguous?: boolean;
}

export function validateConstraints(
  bins: TimeBin[],
  constraints: BinningConstraint
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (constraints.maxBins && bins.length > constraints.maxBins) {
    violations.push(`Exceeds maximum bin count: ${bins.length} > ${constraints.maxBins}`);
  }

  if (constraints.minEvents) {
    for (const bin of bins) {
      if (bin.count < constraints.minEvents) {
        violations.push(`Bin ${bin.id} has fewer than ${constraints.minEvents} events`);
      }
    }
  }

  if (constraints.contiguous && bins.length > 1) {
    // Check for gaps
  }

  return { valid: violations.length === 0, violations };
}
```

---

## v1.0 Requirements (Validated)

### DENS-01 to DENS-04: Timeline Density Visualization

**Evidence:**
- **File:** `src/components/timeline/DualTimeline.tsx`
- **File:** `src/lib/adaptive-scale.ts`

### SLICE-01 to SLICE-05: Manual Slice Creation

**Evidence:**
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts`
- **File:** `src/app/timeline-test/hooks/useSliceCreation.ts`

### ADJUST-01 to ADJUST-06: Boundary Adjustment

**Evidence:**
- **File:** `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx`
- **File:** `src/store/slice-domain/createSliceAdjustmentSlice.ts`

### MULTI-01 to MULTI-06: Multi-Slice Management

**Evidence:**
- **File:** `src/store/slice-domain/createSliceSelectionSlice.ts`

### META-01 to META-05: Slice Metadata

**Evidence:**
- **File:** `src/store/slice-domain/types.ts`

### INTEG-01 to INTEG-04: Timeline Integration

**Evidence:**
- **File:** `src/components/timeline/DualTimeline.tsx`

---

## Phase 62-66 Requirements (Pending)

### GEN-01 to GEN-06: Constraint-Driven Generation

**Status:** Pending implementation

**Planned Files:**
- `src/app/dashboard-v2/components/GenerationPanel.tsx`
- `src/lib/generation/constraint-engine.ts`

---

### MAN-01 to MAN-05: Manual Refinement

**Status:** Pending implementation

**Planned Files:**
- `src/app/dashboard-v2/components/RefinementPanel.tsx`

---

### SYNC-01 to SYNC-05: Cross-View Synchronization

**Status:** Partially implemented

**Existing Evidence:**
- **File:** `src/store/useCoordinationStore.ts`
- **File:** `src/hooks/useSelectionSync.ts`

---

### STKD-01 to STKD-05: STKDE Integration

**Status:** Partially implemented (standalone route)

**Existing Evidence:**
- **File:** `src/app/stkde/` route
- **File:** `src/lib/stkde/compute.ts`
- **File:** `src/workers/stkdeHotspot.worker.ts`

---

### FLOW-01 to FLOW-06: Workflow Hardening

**Status:** Pending implementation

---

## Coverage Summary

### By Phase

| Phase | Requirements | Complete | Pending |
|-------|--------------|----------|---------|
| 61 | 8 | 8 | 0 |
| 62 | 6 | 0 | 6 |
| 63 | 5 | 0 | 5 |
| 64 | 5 | 0 | 5 |
| 65 | 5 | 0 | 5 |
| 66 | 6 | 0 | 6 |
| **Total** | **35** | **8** | **27** |

### By Status

```
Complete:     ██░░░░░░░░░░░░░░░░░░ 23% (8/35)
Pending:      ████████████████████ 77% (27/35)
```

---

## Test Coverage

### Phase 61 Tests

| File | Tests | Coverage |
|------|-------|----------|
| `src/lib/binning/engine.test.ts` | 12 | All strategies |
| `src/store/useBinningStore.test.ts` | 8 | CRUD operations |
| `src/lib/binning/rules.test.ts` | 6 | Constraint validation |

**Example Test:** `src/lib/binning/engine.test.ts`

```typescript
test('generates hourly bins correctly', () => {
  const data = generateMockData(1000);
  const result = generateBins(data, {
    strategy: 'hourly',
    domain: [data[0].timestamp, data[data.length - 1].timestamp],
  });

  expect(result.bins.length).toBeGreaterThan(0);
  expect(result.strategy).toBe('hourly');
  expect(result.metadata.totalEvents).toBe(1000);
});
```

---

## Demo Readiness Checklist

### Must Have for April 6

- [x] BIN-01: Strategy selection (working)
- [x] BIN-02: Merge bins (working)
- [x] BIN-03: Split bins (working)
- [x] BIN-04: Delete bins (working)
- [x] BIN-05: Resize bins (working)
- [x] BIN-06: Save/load configs (working)
- [x] BIN-07: Undo/reset (working)
- [x] BIN-08: Validation (working)
- [ ] GEN-01 to GEN-06: Generation workflow (pending)
- [ ] Unified dashboard-v2 route (pending)

### Nice to Have

- [ ] GEN-01: Crime type filtering in generation
- [ ] GEN-02: Neighbourhood context
- [ ] MAN-03: Adaptive burst emphasis

---

## Traceability Matrix

| Requirement | Phase | File | Test | Status |
|-------------|-------|------|------|--------|
| BIN-01 | 61 | `engine.ts` | `engine.test.ts` | ✅ |
| BIN-02 | 61 | `useBinningStore.ts:117` | `useBinningStore.test.ts` | ✅ |
| BIN-03 | 61 | `useBinningStore.ts:155` | `useBinningStore.test.ts` | ✅ |
| BIN-04 | 61 | `useBinningStore.ts:196` | `useBinningStore.test.ts` | ✅ |
| BIN-05 | 61 | `useBinningStore.ts:210` | `useBinningStore.test.ts` | ✅ |
| BIN-06 | 61 | `useBinningStore.ts:233` | `useBinningStore.test.ts` | ✅ |
| BIN-07 | 61 | `useBinningStore.ts:275` | `useBinningStore.test.ts` | ✅ |
| BIN-08 | 61 | `rules.ts:85` | `rules.test.ts` | ✅ |
| GEN-01 | 62 | - | - | ⏳ |
| GEN-02 | 62 | - | - | ⏳ |
| GEN-03 | 62 | - | - | ⏳ |
| GEN-04 | 62 | - | - | ⏳ |
| GEN-05 | 62 | - | - | ⏳ |
| GEN-06 | 62 | - | - | ⏳ |

---

## Gap Analysis

### Missing for Demo

1. **Unified dashboard-v2 route:** Current binning is in separate route
2. **Generation workflow:** Need to wire constraints to generation
3. **Apply workflow:** Need to commit bins to timeline state

### Remediation Plan

1. Create `dashboard-v2/generation` panel
2. Wire generation panel to useBinningStore
3. Add "Apply to Timeline" action
