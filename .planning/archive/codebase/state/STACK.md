# State Management Stack

**Analysis Date:** 2026-03-30

## Core State Management

**Primary Library:**
- **Zustand** v5.0.10 - Primary state management solution
  - Used for: Global application state, UI state, domain state
  - Location: `src/store/`

**Middleware:**
- `zustand/middleware/persist` - Built-in persistence middleware
  - Used for: Theme preferences, layout state, slice domains, feature flags
  - Storage: localStorage (browser) with custom storage adapters

## Supporting Libraries

**Testing:**
- **Vitest** v4.0.18 - Test runner
- **React Test Renderer** v19.2.0 - Component testing (when needed)

**Types:**
- TypeScript v5.9.3 - Full type safety for store state and actions

## Store Categories

### 1. Domain Stores (Data-Focused)

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useTimelineDataStore` | Timeline/cube data loading | None |
| `useAdaptiveStore` | Adaptive computation state | None |
| `useSliceDomainStore` | Time slice management | `slice-domain-v1` |
| `useBinningStore` | Binning strategy and bins | None |
| `useTimeslicingModeStore` | Generate/review/apply workflow | None |
| `useStkdeStore` | STKDE computation state | None |
| `useFilterStore` | Crime data filters | Custom (presets) |

### 2. UI Stores (Interaction-Focused)

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useUIStore` | View mode, context panel | None |
| `useLayoutStore` | Panel visibility, split ratios | `layout-storage-v3` |
| `useCoordinationStore` | Cross-panel selection sync | None |

### 3. Utility Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useThemeStore` | Color theme selection | `theme-storage` |
| `useFeatureFlagsStore` | Feature toggles | `feature-flags-v1` |
| `useViewportStore` | Timeline viewport (lib) | None |

## State Patterns

**Immutability:**
- All state updates use immutable patterns via Zustand's `set()` function
- Spread operators for nested updates: `set((state) => ({ key: { ...state.key, update: value } }))`

**Computed Values:**
- Getters embedded in store (not persisted):
  ```typescript
  isTypeSelected: (id) => get().selectedTypes.includes(id)
  ```
- Separate selector functions for fine-grained subscriptions

**Persistence Strategy:**
- `partialize` function to persist only necessary state
- Custom merge functions for complex state merging
- Separate storage keys for each persistent store

---

*Stack analysis: 2026-03-30*
