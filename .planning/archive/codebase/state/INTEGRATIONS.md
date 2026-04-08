# Store Integrations

**Analysis Date:** 2026-03-30

## Component Integration Patterns

### Basic Store Hook Usage

```typescript
// Simple subscription - re-renders on any state change
const value = useStore((state) => state.value);

// Fine-grained subscription - re-renders only when value changes
const value = useMyStore((state) => state.value);
```

### Usage in Pages

```typescript
// src/app/dashboard-v2/page.tsx
import { useLayoutStore } from '@/store/useLayoutStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';

export default function DashboardPage() {
  const panels = useLayoutStore((state) => state.panels);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  
  const setWorkflowPhase = useCoordinationStore((state) => state.setWorkflowPhase);
  
  // Use values in component...
}
```

### Usage in Components

```typescript
// src/components/stkde/DashboardStkdePanel.tsx
import { useStkdeStore } from '@/store/useStkdeStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';

export function DashboardStkdePanel() {
  const params = useStkdeStore((state) => state.params);
  const response = useStkdeStore((state) => state.response);
  const errorMessage = useStkdeStore((state) => state.errorMessage);
  
  const appliedSliceCount = useSliceDomainStore(
    (state) => state.slices.length
  );
  
  // Component logic...
}
```

## Store-to-Store Communication

### Reading State from Other Stores

```typescript
// In useSliceStore.ts - reading from other stores
const { mapDomain } = useAdaptiveStore.getState();
const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
```

### React Effects with Store Updates

```typescript
// Auto-create burst slices when burst data becomes available
// src/store/useSliceStore.ts
export const useAutoBurstSlices = (burstWindows: { start: number; end: number }[]) => {
  const addBurstSlice = useSliceStore((state) => state.addBurstSlice);
  const isComputing = useAdaptiveStore((state) => state.isComputing);
  
  useEffect(() => {
    if (!burstWindows.length || isComputing) return;
    
    burstWindows.forEach((window) => {
      addBurstSlice({ start: window.start, end: window.end });
    });
  }, [burstWindows, isComputing, addBurstSlice]);
};
```

## Direct Store Access

### Using getState()

```typescript
// For one-time reads without subscription
const store = useMyStore.getState();
const value = store.value;

// For calling actions from event handlers
const handleClick = () => {
  useBinningStore.getState().selectBin(binId);
};
```

### Using setState()

```typescript
// Direct state manipulation (rarely needed)
useTimelineDataStore.setState({
  minTimestampSec: startSec,
  maxTimestampSec: endSec,
});
```

## Selection Patterns

### Selector Functions in Components

```typescript
// Instead of subscribing to entire state
const { slices, activeSliceId } = useSliceDomainStore((state) => ({
  slices: state.slices,
  activeSliceId: state.state.activeSliceId,
}));

// Use exported hooks for fine-grained subscriptions
import { useViewportZoom } from '@/lib/stores/viewportStore';

const zoom = useViewportZoom();  // Only re-renders when zoom changes
```

### Selectors in Store Files

```typescript
// src/store/slice-domain/selectors.ts
export const selectSlices = select((state) => state.slices);

export const selectActiveSlice = select((state): TimeSlice | null => {
  if (!state.activeSliceId) return null;
  return state.slices.find((slice) => slice.id === state.activeSliceId) ?? null;
});
```

## Data Flow Patterns

### Parent-to-Child via Stores

```typescript
// Parent component - writes to store
const setGenerationInputs = useTimeslicingModeStore((state) => state.setGenerationInputs);
setGenerationInputs({ crimeTypes: ['THEFT'], granularity: 'daily' });

// Child component - reads from store
const generationInputs = useTimeslicingModeStore((state) => state.generationInputs);
```

### Event-Driven Updates

```typescript
// Component triggers store action
const applyBins = () => {
  const success = useTimeslicingModeStore.getState().applyGeneratedBins([0, 100]);
  if (success) {
    // Update coordination store
    useCoordinationStore.getState().setWorkflowPhase('applied');
  }
};
```

### Coordinated Store Updates

```typescript
// useCoordinationStore handles cross-panel sync
setSelectedIndex: (index, source) => set({
  selectedIndex: index,
  selectedSource: source,
  lastInteractionAt: Date.now(),
  lastInteractionSource: source,
  syncStatus: { status: 'syncing' },
  panelNoMatch: {},
}),
```

## Common Integration Patterns

### Filter Integration

```typescript
// Filter store controls what data is shown
const selectedTypes = useFilterStore((state) => state.selectedTypes);
const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

// Used by visualization components
const filteredData = useMemo(() => {
  return rawData.filter(item => 
    (selectedTypes.length === 0 || selectedTypes.includes(item.type)) &&
    (selectedDistricts.length === 0 || selectedDistricts.includes(item.district)) &&
    (!selectedTimeRange || item.timestamp >= selectedTimeRange[0] && item.timestamp <= selectedTimeRange[1])
  );
}, [rawData, selectedTypes, selectedDistricts, selectedTimeRange]);
```

### Mode/Workflow Integration

```typescript
// Workflow phases control UI
const workflowPhase = useCoordinationStore((state) => state.workflowPhase);

// Different UI based on phase
switch (workflowPhase) {
  case 'generate':
    return <GenerationPanel />;
  case 'review':
    return <ReviewPanel />;
  case 'applied':
    return <AppliedView />;
  case 'refine':
    return <RefinePanel />;
}
```

---

*Integration analysis: 2026-03-30*
