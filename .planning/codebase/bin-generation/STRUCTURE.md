# Bin Generation Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
src/
├── lib/
│   ├── binning/                 # Core bin generation library
│   │   ├── engine.ts           # Main bin generation algorithms
│   │   ├── engine.test.ts      # Unit tests
│   │   ├── rules.ts            # Strategy rules & presets
│   │   └── types.ts           # TypeScript interfaces
│   └── adaptive/
│       ├── route-binning-mode.ts
│       └── route-binning-mode.test.ts
├── store/
│   └── useBinningStore.ts      # Zustand store for bin state
├── utils/
│   └── binning.ts              # D3-based binning utilities
└── workers/
    └── stkdeHotspot.worker.ts  # Web Worker for heavy computation
```

## Directory Purposes

### `src/lib/binning/`

Primary bin generation module. Contains:

- **`engine.ts`** (459 lines) - Main bin generation logic with 12 strategy implementations
- **`rules.ts`** (319 lines) - Strategy definitions, presets, and constraint validation
- **`types.ts`** (62 lines) - TypeScript interfaces and type exports
- **`engine.test.ts`** (32 lines) - Unit tests for engine functions

### `src/store/`

State management using Zustand:

- **`useBinningStore.ts`** (297 lines) - Complete bin state management with:
  - Strategy selection
  - Constraint management
  - Bin manipulation (merge, split, delete, resize)
  - Configuration persistence

### `src/utils/`

Utility functions:

- **`binning.ts`** (33 lines) - D3-array based time binning wrapper

### `src/lib/adaptive/`

Route-based binning resolution:

- **`route-binning-mode.ts`** - Resolves binning mode from URL path
- **`route-binning-mode.test.ts`** - Tests for route resolution

### `src/workers/`

Web Workers for off-main-thread computation:

- **`stkdeHotspot.worker.ts`** - Filters and projects hotspots

## Key File Locations

### Entry Points

- `src/store/useBinningStore.ts` - Primary API for bin generation
- `src/lib/binning/engine.ts` - Core generation functions

### Types

- `src/lib/binning/types.ts` - TimeBin, BinGroup, BinningState interfaces
- `src/lib/binning/rules.ts` - BinningStrategy, BinningConstraint, BinningConfig

### Tests

- `src/lib/binning/engine.test.ts` - Engine algorithm tests
- `src/lib/adaptive/route-binning-mode.test.ts` - Route resolution tests

## Where to Add New Code

### New Binning Strategy

Add to `src/lib/binning/engine.ts`:

1. Implement generator function: `function generate*Bins(...)`
2. Add case to `generateBins()` switch statement
3. Add strategy to `BinningStrategy` type in `rules.ts`
4. Add preset config to `PRESET_RULES` in `rules.ts`

### New Constraint Type

Add to `src/lib/binning/rules.ts`:

1. Add field to `BinningConstraint` interface
2. Update `validateConstraints()` function
3. Update `mergeSmallBins()` if needed

### New Bin Manipulation

Add to `src/store/useBinningStore.ts`:

1. Add action method to `BinningState` interface
2. Implement action in store creation
3. Update modification history tracking

### New Utility Function

Add to `src/utils/binning.ts`:

- Keep focused on D3-wrapper utilities
- Complex logic belongs in `src/lib/binning/engine.ts`

## Special Considerations

### Barrel Exports

The binning library uses implicit exports via directory structure:
- Import from `src/lib/binning/engine` for main functions
- Import types from `src/lib/binning/types` or `src/lib/binning/rules`

### Test Co-location

Tests are co-located with source files using `.test.ts` suffix:
- `engine.ts` → `engine.test.ts`
- `route-binning-mode.ts` → `route-binning-mode.test.ts`

---

*Structure analysis: 2026-03-30*
