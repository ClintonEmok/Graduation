# Binary/Code Generation Analysis

**Analysis Date:** 2026-03-30

## Project Overview

This codebase is a **Next.js crime data visualization application** called "neon-tiger" (adaptive-space-time-cube). The "bin generation" in this context refers to **time-series binning for crime data analysis**, not traditional binary executable generation.

The application generates:
1. **Time bins** - temporal segments for crime data analysis
2. **Warp profiles** - time compression profiles for visualization
3. **STKDE outputs** - Space-Time Kernel Density Estimation results
4. **Hotspot data** - computed from density analysis

---

## Build System

### Build Tool: Next.js

**Configuration:** `next.config.ts`
```typescript
const nextConfig = {
  serverExternalPackages: ["duckdb"],
};
module.exports = nextConfig;
```

**Build Commands (from `package.json`):**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "NEXT_DISABLE_TURBOPACK=1 next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "postinstall": "patch-package && mkdir -p node_modules/duckdb/lib/binding/3 && ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node"
  }
}
```

### TypeScript Configuration

**File:** `tsconfig.json`
- Standard Next.js TypeScript setup
- Path alias: `@/*` maps to `./src/*`

### Testing Configuration

**File:** `vitest.config.mts`
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Code Generation: Binning Engine

### Primary Generation Module

**Location:** `src/lib/binning/engine.ts`

This is the core bin generation engine that creates temporal bins from crime event data.

#### Main Function

```typescript
export function generateBins(
  data: CrimeEventData[],
  config: BinningConfig
): BinningResult
```

#### Supported Binning Strategies

| Strategy | Function | Description |
|----------|----------|-------------|
| `daytime-heavy` | `generateDaytimeHeavyBins()` | Split by daytime (6am-6pm) vs nighttime |
| `nighttime-heavy` | `generateNighttimeHeavyBins()` | Split by nighttime vs daytime |
| `crime-type-specific` | `generateCrimeTypeBins()` | Cluster by crime type |
| `burstiness` | `generateBurstinessBins()` | Split based on inter-arrival times |
| `uniform-distribution` | `generateUniformDistributionBins()` | Equal events per bin |
| `uniform-time` | `generateUniformTimeBins()` | Equal time spans |
| `weekday-weekend` | `generateWeekdayWeekendBins()` | Separate weekday/weekend |
| `quarter-hourly` | `generateIntervalBins()` | 15-minute intervals |
| `hourly` | `generateIntervalBins()` | 1-hour intervals |
| `daily` | `generateIntervalBins()` | 24-hour intervals |
| `weekly` | `generateIntervalBins()` | 7-day intervals |
| `auto-adaptive` | `generateAutoAdaptiveBins()` | Auto-detect best strategy |

#### Key Data Types

**TimeBin Interface** (`src/lib/binning/types.ts`):
```typescript
export interface TimeBin {
  id: string;
  startTime: number;      // epoch ms
  endTime: number;        // epoch ms
  count: number;          // event count
  crimeTypes: string[];
  districts?: string[];
  avgTimestamp: number;
  isModified?: boolean;
  mergedFrom?: string[];
}
```

#### Binning Rules

**Location:** `src/lib/binning/rules.ts`

Contains constraint validation and bin merging logic:
- `validateConstraints()` - Validates bin constraints
- `mergeSmallBins()` - Merges small bins to meet minEvents
- Constraint types: `minEvents`, `maxBins`, `minTimeSpan`, `maxEvents`

---

## Code Generation: Warp Profiles

### Warp Profile Generation

**Location:** `src/lib/warp-generation.ts`

Generates time-warping profiles for visualization compression.

#### Main Functions

```typescript
export function analyzeDensity(
  crimes: CrimeRecord[],
  binCount: number
): DensityAnalysis

export function detectEvents(densityBins: DensityBin[]): number[]

export function generateWarpProfiles(
  crimes: CrimeRecord[],
  timeRange: { start: number; end: number },
  options?: GenerateWarpProfilesOptions
): WarpProfile[]
```

#### Warp Profile Types

```typescript
export interface WarpProfile {
  name: string;
  intervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number;  // 0.5-2.0 warp factor
  }>;
  confidence: number;
  emphasis: WarpEmphasis;  // 'aggressive' | 'balanced' | 'conservative'
}
```

#### Emphasis Profiles

| Emphasis | Name | Strength Range | Intervals |
|----------|------|---------------|-----------|
| `aggressive` | High Density Focus | 0.5-2.0 | 5-12 |
| `balanced` | Uniform Balance | 0.7-1.5 | 5 |
| `conservative` | Gentle Compression | 0.8-1.3 | 3-5 |

---

## Code Generation: Full Auto Orchestrator

### Orchestration Layer

**Location:** `src/lib/full-auto-orchestrator.ts`

Combines warp profiles and boundary detection for automated proposal generation.

#### Main Function

```typescript
export function generateRankedAutoProposalSets(options: {
  crimes: CrimeRecord[];
  context: AutoProposalContext;
  params: FullAutoGenerationParams;
}): RankedAutoProposalSets
```

#### Scoring Weights

```typescript
const SCORE_WEIGHTS = {
  relevance: 0.4,
  continuity: 0.3,
  overlapMin: 0.2,
  coverage: 0.1,
} as const;
```

---

## Code Generation: STKDE (Space-Time Kernel Density Estimation)

### STKDE Computation

**Location:** `src/lib/stkde/compute.ts`

Generates density heatmaps and hotspots from crime data.

#### Main Functions

```typescript
export function computeStkdeFromCrimes(
  request: StkdeRequest,
  crimes: CrimeRecord[],
  metaOverrides?: ComputeMetaOverrides
): ComputeStkdeOutput

export function computeStkdeFromAggregates(
  request: StkdeRequest,
  inputs: FullPopulationStkdeInputs,
  metaOverrides?: ComputeMetaOverrides
): ComputeStkdeOutput

export function buildStkdeGridConfig(request: StkdeRequest): StkdeGridConfig
```

#### Key Types

**StkdeResponse** (`src/lib/stkde/contracts.ts`):
```typescript
export interface StkdeResponse {
  meta: {
    eventCount: number;
    computeMs: number;
    truncated: boolean;
    requestedComputeMode: StkdeComputeMode;
    effectiveComputeMode: StkdeComputeMode;
    fallbackApplied?: string | null;
    clampsApplied?: string[];
  };
  heatmap: {
    cells: StkdeHeatmapCell[];
    maxIntensity: number;
  };
  hotspots: StkdeHotspot[];
  contracts: {
    scoreVersion: StkdeScoreVersion;
  };
}
```

#### Compute Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `sampled` | Sample-based computation | Default, faster |
| `full-population` | Full dataset analysis | Complete analysis |

---

## Web Workers

### STKDE Hotspot Worker

**Location:** `src/workers/stkdeHotspot.worker.ts`

Client-side filtering of hotspots using Web Workers.

```typescript
export function projectHotspots(input: StkdeWorkerInput): StkdeWorkerOutput

// Usage in components
const worker = new Worker(new URL('../../../workers/stkdeHotspot.worker.ts', import.meta.url));
worker.postMessage({ hotspots, filters });
```

### Adaptive Time Worker

**Location:** `src/workers/adaptiveTime.worker.ts`

Handles time-adaptive computations.

---

## Data Generation: DuckDB Scripts

### Data Setup Script

**Location:** `scripts/setup-data.js`

Generates synthetic crime data and converts to Parquet format.

#### Process

1. **CSV Generation:** Creates synthetic crime data with 100,000 points
2. **DuckDB Processing:** Converts CSV to Parquet with coordinate normalization
3. **Coordinate Projection:**
   - X: `(lon + 180) / 360` (0 to 1)
   - Z: Web Mercator Y coordinate
   - Y: Time (0 to 100 normalized)

#### DuckDB Integration

**Location:** `src/lib/db.ts`

```typescript
export const getDb = async (): Promise<any> => {
  const duckdb = await import('duckdb');
  db = new duckdb.default.Database(dbPath);
};

export const ensureSortedCrimesTable = async (): Promise<string> => {
  // Creates zone map optimized sorted table
  const createQuery = `
    CREATE TABLE crimes_sorted AS 
    SELECT * FROM read_csv_auto('${dataPath}')
    WHERE "Date" IS NOT NULL
    ORDER BY "Date"
  `;
};
```

---

## Output Generation Processes

### Response Payload Guard

**Location:** `src/lib/stkde/compute.ts`

Limits response size to prevent over-transmission:

```typescript
const STKDE_RESPONSE_SIZE_LIMIT_BYTES = 2_500_000;

function applyResponsePayloadGuard(response: StkdeResponse): StkdeResponse {
  // Truncates cells if payload exceeds limit
  while (payloadBytes > STKDE_RESPONSE_SIZE_LIMIT_BYTES) {
    keep = Math.max(1, Math.floor(keep * 0.85));
  }
}
```

### Typed Arrays for Performance

The codebase uses typed arrays for efficient computation:

```typescript
const support = new Float64Array(cellCount);
const intensity = new Float64Array(rows * cols);
```

---

## State Management: Binning Store

### Binning Store

**Location:** `src/store/useBinningStore.ts`

Manages bin generation state and configuration:

```typescript
interface BinningState {
  config: BinningConfig;
  bins: TimeBin[];
  selectedBinId: string | null;
  isComputing: boolean;
  modificationHistory: BinModification[];
}
```

### Timeslicing Mode Store

**Location:** `src/store/useTimeslicingModeStore.ts`

Handles generated bins lifecycle:

```typescript
interface TimeslicingState {
  pendingGeneratedBins: TimeBin[];
  setPendingGeneratedBins: (bins: TimeBin[], metadata: GenerationResultMetadata) => void;
  applyGeneratedBins: (domain: [number, number]) => void;
  clearPendingGeneratedBins: () => void;
}
```

---

## Build Artifacts

### Next.js Build Output

- **Development:** `next dev` (hot reload)
- **Production:** `next build` outputs to `.next/` directory
- **Start:** `next start` serves production build

### Dependencies

**Key Dependencies for Generation:**

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | Framework |
| `react` | 19.2.3 | UI |
| `duckdb` | 1.4.4 | Data processing |
| `three` | 0.182.0 | 3D visualization |
| `@react-three/fiber` | 9.5.0 | React Three.js |
| `d3-array` | 3.2.4 | Data manipulation |
| `date-fns` | 4.1.0 | Date handling |
| `zustand` | 5.0.10 | State management |

---

## Summary

This is NOT a traditional binary generation project. Instead, it generates:

1. **Temporal bins** - Crime data segmentation
2. **Warp profiles** - Time compression mappings  
3. **Density computations** - STKDE heatmaps/hotspots
4. **Web worker code** - Client-side computation
5. **Next.js application bundle** - Production web app

The build process uses **Next.js** with TypeScript, producing a web application. Code generation refers to algorithmic generation of data structures (bins, profiles) from input crime data.

---

*Analysis completed: 2026-03-30*
