# Store Conventions

**Analysis Date:** 2026-03-30

## Naming Conventions

**Store Files:**
- Prefix: `use` (for React hooks)
- Suffix: `Store`
- Pattern: `use[Domain]Store.ts`
- Examples: `useSliceStore.ts`, `useFilterStore.ts`, `useLayoutStore.ts`

**State Interfaces:**
- Suffix: `State`
- Pattern: `[Domain]State`
- Examples: `FilterState`, `LayoutState`, `CoordinationState`

**Types/Interfaces:**
- Slice types: `TimeSlice`, `TimeBin`
- Config types: `GenerationInputs`, `GenerationResultMetadata`
- Enums: `TimeslicingMode`, `WorkflowPhase`, `SelectionSource`

## Store Structure Pattern

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  // State properties
  value: Type;
  
  // Actions
  setValue: (value: Type) => void;
  
  // Computed/getters
  isValid: () => boolean;
}

export const useMyStore = create<MyState>()(
  persist(
    (set, get) => ({
      value: defaultValue,
      
      setValue: (value) => set({ value }),
      
      isValid: () => get().value !== null,
    }),
    {
      name: 'storage-key',
      partialize: (state) => ({ value: state.value }), // Only persist what's needed
    }
  )
);
```

## Action Patterns

### Simple Setters
```typescript
setValue: (value) => set({ value }),
```

### Computed Updates
```typescript
setValue: (value) => set((state) => ({
  value: state.value + value,
})),
```

### Conditional Updates
```typescript
toggleValue: () => set((state) => ({
  value: !state.value,
})),

// With validation
setValue: (value) => {
  if (value < 0 || value > 100) return;
  set({ value });
}
```

### Array Operations
```typescript
addItem: (item) => set((state) => ({
  items: [...state.items, item],
})),

removeItem: (id) => set((state) => ({
  items: state.items.filter((item) => item.id !== id),
})),
```

## Selector Patterns

### Inline Selectors (Component)
```typescript
const value = useStore((state) => state.value);
```

### Fine-Grained Selectors (Performance)
```typescript
// In viewportStore.ts - exported hooks
export const useViewportZoom = () => 
  useViewportStore((state) => state.zoom);

export const useViewportStart = () => 
  useViewportStore((state) => state.startDate);
```

### Memoized Selectors (Complex)
```typescript
// Cached computation in slice-domain/selectors.ts
let cachedResult: Result | null = null;
export const selectComplexValue = select((state) => {
  const next = compute(state);
  if (cachedResult && isEqual(cachedResult, next)) {
    return cachedResult;
  }
  cachedResult = next;
  return next;
});
```

## Persistence Patterns

### Basic Persistence
```typescript
persist(
  (set) => ({
    value: defaultValue,
    setValue: (value) => set({ value }),
  }),
  { name: 'storage-key' }
)
```

### With Custom Merge
```typescript
persist(
  (set) => ({ ... }),
  {
    name: 'storage-key',
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...(persistedState as Partial<MyState>),
      // Deep merge for nested objects
      panels: { ...currentState.panels, ...persistedState?.panels },
    }),
  }
)
```

### Partial Persistence
```typescript
persist(
  (set) => ({ ... }),
  {
    name: 'storage-key',
    partialize: (state) => ({
      // Only persist specific keys
      slices: state.slices,
      theme: state.theme,
    }),
  }
)
```

### Custom Storage Adapter
```typescript
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
```

## Slice Pattern (Modular Stores)

### Creating Slices
```typescript
// slice-domain/createSliceCoreSlice.ts
export const createSliceCoreSlice: SliceDomainStateCreator<SliceCoreState> = (set, get) => ({
  slices: [],
  addSlice: (initial) => set((state) => ({
    slices: [...state.slices, { ...initial, id: crypto.randomUUID() }],
  })),
  // ...
});
```

### Combining Slices
```typescript
// useSliceDomainStore.ts
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    { name: 'slice-domain-v1' }
  )
);
```

### Slice Types
```typescript
export type SliceDomainStateCreator<T> = StateCreator<SliceDomainState, [], [], T>;
```

## Cross-Store Dependencies

### Reading Other Stores
```typescript
// Direct read (avoid in reactions)
const mapDomain = useAdaptiveStore.getState().mapDomain;

// In actions that need other store state
computeBins: () => {
  const domain = useOtherStore.getState().domain;
  // use domain...
}
```

### Avoid Store Actions
Don't call other store's actions directly in setters. Instead:
- Return values that caller can use to update other stores
- Use callbacks
- Use events or middleware

---

*Convention analysis: 2026-03-30*
