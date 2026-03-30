# Bin Generation Integrations

**Analysis Date:** 2026-03-30

## Internal Integrations

### Data Sources

**Crime Event Data:**
- Input format: `{ timestamp: number; type: string; district?: string }`
- Consumed by `generateBins()` in `src/lib/binning/engine.ts`
- Data flows from `useBinningStore` via `computeBins()` action

**Time Domain:**
- Provided as `[number, number]` tuple (start, end in epoch ms)
- Can be auto-computed from data if not provided

### State Management

**Zustand Store:**
- `src/store/useBinningStore.ts` manages all bin state
- Provides actions: `computeBins`, `mergeBins`, `splitBin`, `deleteBin`, `resizeBin`
- Persists: strategy, constraints, bins, modification history, saved configurations

### UI Integration

**React Components:**
- Binning store consumed by visualization components
- Binning mode resolved from URL routes via `route-binning-mode.ts`

## External Libraries

### D3-Array

**Purpose:** Time-based binning calculations

**Usage:**
```typescript
import { bin } from 'd3-array';
const binGenerator = bin().domain(domain).thresholds(ticks);
```

**Key Functions:**
- `bin()` - Creates bin generator
- `max()` - Used in utility functions

### Density Clustering

**Purpose:** Advanced clustering algorithms for complex binning modes

**Usage:** Crime-type-specific binning uses clustering to group similar events

### Date-fns

**Purpose:** Date manipulation for time calculations

**Usage:** Time interval calculations in bin generators

## Testing Infrastructure

**Vitest:**
- Test runner for all bin generation tests
- Config: Standard Next.js vitest setup

**JSDOM:**
- DOM environment for component tests involving binning

## Build Dependencies

### TypeScript

- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`

### Next.js

- Server-side external packages: `duckdb`
- Web Worker support via standard Web APIs

### ESLint

- Config: `eslint.config.mjs`
- Uses `eslint-config-next/typescript` and `eslint-config-next/core-web-vitals`

## Data Flow

```
Crime Data Input
       ↓
useBinningStore.computeBins()
       ↓
generateBins(config)
       ↓
[Strategy Selection]
       ↓
[Strategy-specific generator]
       ↓
postProcessBins() - Apply constraints
       ↓
TimeBin[] output
       ↓
Store updated → UI re-renders
```

## Environment Requirements

**No external API dependencies** - Bin generation runs entirely client-side:

- No database calls for bin computation
- No external services required
- Works offline after initial page load

**Development Requirements:**

- Node.js with pnpm
- TypeScript 5.9.3+
- Vitest for testing

---

*Integration audit: 2026-03-30*
