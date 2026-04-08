# Data Layer Directory Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
src/
├── hooks/                      # React Query hooks and data fetching
│   ├── useCrimeData.ts         # Primary crime data hook
│   ├── useCrimeData.test.ts    # Tests for useCrimeData
│   ├── useCrimeStream.ts       # Streaming data hook (Apache Arrow)
│   ├── useViewportCrimeData.ts # Viewport-based wrapper (deprecated)
│   ├── useSliceStats.ts       # Stats computation from data
│   ├── useSuggestionGenerator.ts # ML/suggestion generation
│   ├── useDebouncedDensity.ts # Debounced density computation
│   ├── useAdaptiveScale.ts    # Adaptive scale hook
│   ├── useSmartProfiles.ts    # Profile detection
│   ├── useContextExtractor.ts # Context extraction
│   └── ...
├── lib/
│   ├── queries/               # Query builders and database access
│   │   ├── index.ts          # Exports
│   │   ├── types.ts          # Query-related types
│   │   ├── builders.ts       # SQL query builders
│   │   ├── filters.ts        # Filter builders
│   │   ├── aggregations.ts   # Aggregation queries
│   │   └── sanitization.ts   # Input sanitization
│   ├── queries.ts            # Main query entry point
│   ├── db.ts                 # DuckDB initialization
│   ├── data/                 # Client-side data handling
│   │   ├── types.ts          # Columnar data types
│   │   └── selectors.ts      # Data selection/filtering
│   ├── crime-api.ts          # (exists in codebase)
│   ├── coordinate-normalization.ts
│   └── ...
├── types/
│   ├── crime.ts              # Crime data types
│   ├── autoProposalSet.ts   # Suggestion types
│   └── index.ts             # Type exports
├── app/
│   └── api/                 # Next.js API routes
│       ├── crimes/
│       │   └── range/
│       │       └── route.ts # Crime data endpoint
│       ├── crime/
│       │   ├── stream/
│       │   ├── facets/
│       │   ├── meta/
│       │   └── bins/
│       ├── stkde/
│       │   └── hotspots/
│       ├── neighbourhood/
│       │   └── poi/
│       ├── adaptive/
│       │   └── global/
│       └── study/
│           └── log/
├── providers/
│   └── QueryProvider.tsx    # React Query provider setup
└── store/                   # Zustand stores (complements data layer)
    ├── useSliceStore.ts
    ├── useTimelineDataStore.ts
    ├── useFilterStore.ts
    └── ...
```

## Key File Locations

### Entry Points

- `src/providers/QueryProvider.tsx` - React Query setup
- `src/hooks/useCrimeData.ts` - Primary data hook
- `src/lib/queries.ts` - Query execution entry

### Data Types

- `src/types/crime.ts` - CrimeRecord, CrimeDataMeta
- `src/lib/queries/types.ts` - QueryCrimesOptions, GlobalAdaptiveMaps
- `src/lib/data/types.ts` - ColumnarData, FilteredPoint

### API Routes

- `/api/crimes/range` - `src/app/api/crimes/range/route.ts`
- `/api/stkde/hotspots` - `src/app/api/stkde/hotspots/route.ts`
- `/api/crime/stream` - `src/app/api/crime/stream/route.ts`

## Where to Add New Code

### New Data Hook

1. Create in `src/hooks/` following pattern:
   - Use `useQuery` from `@tanstack/react-query`
   - Export typed options and result interfaces
   - Include proper error handling

### New API Endpoint

1. Create in `src/app/api/[resource]/[endpoint]/route.ts`
2. Follow existing patterns:
   - Use Next.js Route Handlers
   - Export `runtime = 'nodejs'` for DuckDB compatibility
   - Export `dynamic = 'force-dynamic'` for dynamic data
   - Implement proper error handling
   - Set cache headers appropriately

### New Query Builder

1. Add to `src/lib/queries/builders.ts` or create new file
2. Export type in `src/lib/queries/types.ts`
3. Export function in `src/lib/queries/index.ts`

### New Data Type

1. Add to appropriate types file:
   - `src/types/crime.ts` for API response types
   - `src/lib/queries/types.ts` for database query types
   - `src/lib/data/types.ts` for client-side types

---

*Structure analysis: 2026-03-30*
