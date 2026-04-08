# Bin Generation Stack

**Analysis Date:** 2026-03-30

## Core Technologies

**Primary Language:**
- TypeScript 5.9.3 - All bin generation code is written in TypeScript

**Runtime:**
- Node.js via Next.js 16.1.6 - Web application runtime
- Browser Web Workers - For heavy binning computations off the main thread

**Package Manager:**
- pnpm 9.x (workspace configuration present in `pnpm-workspace.yaml`)

## Binning Dependencies

**Direct Bin Generation:**
- `d3-array` (^3.2.4) - Provides `bin()` function for time-based binning in `src/utils/binning.ts`
- `density-clustering` (^1.3.0) - Clustering algorithms for advanced binning modes

**Data Processing:**
- `date-fns` (^4.1.0) - Date manipulation for time-based bin calculations

**State Management:**
- `zustand` (^5.0.10) - Bin state management via `src/store/useBinningStore.ts`

## Supporting Dependencies

**Type Definitions:**
- `@types/d3-array` - TypeScript types for d3-array
- `@types/density-clustering` - TypeScript types for clustering library

**Testing:**
- `vitest` (^4.0.18) - Test runner for bin generation tests
- `jsdom` (^28.0.0) - DOM environment for tests

## Build Configuration

**TypeScript Configuration:**
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`

**Next.js Configuration:**
- `next.config.ts` - Configures `duckdb` as serverExternalPackage

## Architecture Summary

```
src/
├── lib/binning/           # Core bin generation library
│   ├── engine.ts          # Main bin generation algorithms
│   ├── rules.ts           # Binning rules and constraints
│   ├── types.ts           # TypeScript interfaces
│   └── engine.test.ts    # Unit tests
├── store/
│   └── useBinningStore.ts # Zustand store for bin state
├── utils/
│   └── binning.ts         # D3-based utility functions
└── workers/
    └── stkdeHotspot.worker.ts  # Web Worker for heavy computations
```

---

*Stack analysis: 2026-03-30*
