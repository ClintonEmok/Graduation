# Data Fetching Conventions

**Analysis Date:** 2026-03-30

## React Query Usage

### Query Client Configuration

Default caching in `src/providers/QueryProvider.tsx`:
```typescript
staleTime: 5 * 60 * 1000  // 5 minutes
gcTime: 10 * 60 * 1000    // 10 minutes
refetchOnWindowFocus: false
retry: 1
```

### Query Key Structure

Use array-based query keys with all dependencies:
```typescript
const queryKey = [
  'crimes',
  'viewport',
  normalizedRange.start,
  normalizedRange.end,
  bufferDays,
  limit,
  crimeTypes,
  districts
]
```

### Query Options Convention

Always include:
- `enabled` - Prevent fetching with invalid params
- `placeholderData` - Keep old data while fetching (prevent UI flash)
- `refetchOnWindowFocus: false` - For viewport-based queries

## Hook Patterns

### Primary Hook: useCrimeData

Located at `src/hooks/useCrimeData.ts`:

```typescript
export function useCrimeData(
  options: UseCrimeDataOptions
): UseCrimeDataResult {
  const { 
    startEpoch, 
    endEpoch, 
    crimeTypes, 
    districts, 
    bufferDays = 30,
    limit = 50000 
  } = options
  // ...
}
```

Returns:
- `data: CrimeRecord[]`
- `meta: CrimeDataMeta | null`
- `isLoading: boolean`
- `isFetching: boolean`
- `error: Error | null`
- `bufferedRange: { start, end }`

### Data Normalization

Always normalize input parameters in hooks:

```typescript
function normalizeEpochRange(startEpoch: number, endEpoch: number): NormalizedEpochRange {
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
    return FALLBACK_EPOCH_RANGE
  }
  // ... validation and normalization
}
```

## API Request Patterns

### Fetch Function Structure

```typescript
async function fetchCrimesInRange(
  startEpoch: number,
  endEpoch: number,
  bufferDays: number,
  crimeTypes?: string[],
  districts?: string[],
  limit?: number
): Promise<CrimeRangeResponse> {
  const requestPath = `/api/crimes/range?${new URLSearchParams({
    startEpoch: normalizedRange.start.toString(),
    // ...
  }).toString()}`;

  try {
    const response = await fetch(requestPath)
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('[useCrimeData] Error fetching crimes:', error)
    throw error
  }
}
```

### Error Handling

- Wrap network errors with contextual information
- Propagate errors through React Query error state
- Use meaningful error messages

## Data Types

### CrimeRecord (canonical type)

Located at `src/types/crime.ts`:

```typescript
export interface CrimeRecord {
  id?: string
  timestamp: number  // Unix epoch seconds
  lat: number
  lon: number
  x: number  // Normalized spatial x (-50 to +50)
  z: number  // Normalized spatial z (-50 to +50)
  type: string  // e.g., "THEFT", "BATTERY"
  district: string
  year: number
  iucr: string
}
```

### ColumnarData (optimized for viz)

Located at `src/lib/data/types.ts`:

```typescript
export interface ColumnarData {
  x: Float32Array
  z: Float32Array
  lat?: Float32Array
  lon?: Float32Array
  timestamp: Float32Array
  type: Uint8Array
  district: Uint8Array
  block: string[]
  length: number
}
```

## Cache Management

### Buffering Strategy

API applies buffer zones to prevent excessive refetching:
- Default buffer: 30 days
- Configurable per query
- Zero buffer for selection-specific fetches

### Query Invalidation

Currently relies on:
- Query key changes (viewport changes)
- Manual refetch triggers
- No explicit `invalidateQueries` calls found in codebase

## Data Transformation

### Coordinate Normalization

Located at `src/lib/coordinate-normalization.ts`:
- Converts lat/lon to normalized x/z coordinates
- Uses Chicago bounds as reference

### Filters

Located at `src/lib/queries/filters.ts`:
- Crime type filtering
- District filtering
- Time range filtering

---

*Convention analysis: 2026-03-30*
