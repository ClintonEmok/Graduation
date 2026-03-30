# Crime Data Patterns & Conventions

**Analysis Date:** 2026-03-30

## Crime Type Naming

**Canonical format:** UPPERCASE with spaces (e.g., `"THEFT"`, `"BATTERY"`, `"CRIMINAL DAMAGE"`, `"MOTOR VEHICLE THEFT"`, `"DECEPTIVE PRACTICE"`)

**Source:** Raw values from Chicago PD CSV `"Primary Type"` column — passed through as-is.

**Filtering:** Crime types are passed as comma-separated query params (`crimeTypes=THEFT,BATTERY`), parsed by `parseCsvFilterParam()` in `src/app/api/crimes/range/route.ts`.

```typescript
// Pattern: parseCsvFilterParam splits, trims, and filters empty strings
const parseCsvFilterParam = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const parsed = value.split(',').map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
};
```

## Timestamp Conventions

**Storage:** All timestamps are Unix epoch **seconds** (not milliseconds).

**Conversion pattern:**
```typescript
// Milliseconds → seconds
Math.floor(timestampMs / 1000)

// Seconds → Date
new Date(epochSeconds * 1000)
```

**API contracts:** `startEpoch` / `endEpoch` params are always seconds.

**STKDE domain:** `startEpochSec` / `endEpochSec` (seconds, integer).

**Buffer pattern:** Buffer zones are specified in days, converted to seconds via `bufferDays * 86400`:
```typescript
const buildBufferedRange = (startEpoch, endEpoch, bufferDays) => {
  const bufferSeconds = bufferDays * 86400;
  return { bufferedStart: startEpoch - bufferSeconds, bufferedEnd: endEpoch + bufferSeconds };
};
```

## Query Parameter Patterns

**Pagination:** `limit` param (default 50000, max 50000).

**Sampling:** When `totalMatches > limit`, compute `sampleStride = ceil(totalMatches / limit)` and apply `WHERE ((rn - 1) % ?) = 0` in a CTE with `row_number()`.

**CSV list params:** Comma-separated, trimmed, empty-filtered. Always re-checked with `.filter(Boolean)`.

## SQL Query Patterns

**Table name sanitization:** Allowlist-based — only `crimes_sorted` and `adaptive_global_cache` are permitted. See `src/lib/queries/sanitization.ts`.

```typescript
const TABLE_NAME_ALLOWLIST = new Set(['crimes_sorted', 'adaptive_global_cache']);
export const sanitizeTableName = (tableName: string): string => {
  if (!TABLE_NAME_ALLOWLIST.has(tableName)) {
    throw new Error(`Unexpected table name: ${tableName}`);
  }
  return tableName;
};
```

**Parameterized queries:** All filter values use `?` placeholders. Column names use sanitization or constant strings.

**Coordinate SQL projection:** Inline normalized expressions via `buildNormalizedSqlExpression()` — produces deterministic SQL fragments like `((("Longitude" - -87.9) / 0.4) * 100) + -50`.

## Response Format

**Crime range responses** always include:
```typescript
{
  data: CrimeRecord[],
  meta: {
    viewport: { start, end },
    buffer: { days, applied: { start, end } },
    returned: number,
    limit: number,
    totalMatches?: number,
    sampled?: boolean,
    sampleStride?: number,
  }
}
```

**Mock data indicator:** `meta.isMock: true` and `X-Data-Warning` header.

## STKDE Request/Response Pattern

**Request validation:** `validateAndNormalizeStkdeRequest()` in `src/lib/stkde/contracts.ts` validates and clamps all parameters:
- Validates domain (start < end, finite integers)
- Validates bbox (min < max, clamps to Chicago bounds)
- Clamps all numeric params to defined ranges (`COERCION_RANGES`)
- Returns `clampsApplied` array noting any coercion

**Compute modes:** `'sampled'` (fetch raw records) or `'full-population'` (server-side aggregation). Fallback chain: full-population → sampled on guardrail violations, timeouts, or errors.

**Hotspot ID format:** `hs-{row}-{col}-{peakStartEpochSec}-{peakEndEpochSec}` — deterministic, stable for identical input.

## Hotspot Selection Pattern

**Store:** `selectedHotspotId` and `hoveredHotspotId` in `useStkdeStore`.

**Selection commit:** When a hotspot is selected on the dashboard, the hook in `src/app/dashboard-v2/page.tsx`:
1. Looks up the hotspot by ID
2. Computes spatial bounds from centroid ± radiusMeters
3. Calls `setSpatialBounds()` and `setTimeRange()` on filter stores
4. Calls `commitSelection()` to log the interaction
5. Shows a note: `"Hotspot time window is an investigative overlay; applied slices remain the workflow source of truth."`

## Error Handling Pattern

**API routes:** Try/catch wrapping the entire handler, returning `{ error, details }` JSON with 500 status.

**DuckDB failures:** Return mock data with `X-Data-Warning` header instead of hard error.

**Query callback style:** DuckDB uses Node.js callback-style `db.all(sql, ...params, callback)` — all query functions wrap this in `new Promise()`.

---

*Convention analysis: 2026-03-30*
