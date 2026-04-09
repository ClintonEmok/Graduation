# Phase 58: Enrich Timeslicing with Neighbourhood Data (POI Events) - Research

**Researched:** 2026-03-20
**Domain:** OpenStreetMap Overpass API + Chicago Open Data Portal API integration
**Confidence:** MEDIUM (WebSearch-verified, not Context7-confirmed)

## Summary

Phase 58 adds neighbourhood context enrichment to timeslicing analysis by fetching Points of Interest (POI) data from OpenStreetMap and Chicago Open Data Portal. The data provides external context about what's happening in the geographic area on the selected day, helping validate or discover timeslicing patterns.

**Key approach:**
- Create `src/lib/neighbourhood/` module following Phase 57's `context-diagnostics/` pattern
- Build a new neighbourhood diagnostics section in `buildContextDiagnostics()` that parallels `temporal` and `spatial`
- Add `neighbourhood` section to `SuggestionContextMetadata` store type
- Integrate into `/timeslicing-algos` diagnostics panel using existing compact summary + expandable pattern
- Fetch on-demand during suggestion generation with explicit fallback handling

**Primary recommendation:** Build neighbourhood diagnostics as a new module in `src/lib/neighbourhood/` with `index.ts`, `osm.ts`, and `chicago.ts`, mirroring the `context-diagnostics/` structure. Use OSM Overpass API for POI data with a dedicated `/api/neighbourhood/poi` route to avoid client-side rate limiting.

## Standard Stack

The established libraries/tools for neighbourhood/POI data:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Overpass API | 0.7.62+ | OSM POI query endpoint | Official OSM data API, free, well-documented |
| `overpass-ql-ts` | 1.11.0 | TypeScript Overpass query builder | Provides typed query construction, npm package available |
| `fetch` (native) | ES2020 | HTTP requests to APIs | Built-in, no additional dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Socrata Open Data API (SODA) | v2 | Chicago Data Portal queries | For business licenses, land use from Chicago |
| Nominatim | - | Geocoding for area names | Optional: convert "Chicago" to bounding box |

### Chicago Data Portal Endpoints
| Dataset | Endpoint | Purpose |
|---------|----------|---------|
| Business Licenses | `https://data.cityofchicago.org/resource/6pth-rz8e.json` | Active businesses |
| Land Use | `https://data.cityofchicago.org/resource/pxu2-2i9s.json` | Land use classifications |
| Community Places | `https://data.cityofchicago.org/resource/khc4-3gc3.json` | Community resources |

### OSM POI Categories (amenity tags)
| Category | OSM Tags | Chicago Use |
|----------|----------|-------------|
| Food/Drink | `amenity=restaurant`, `amenity=bar`, `amenity=cafe`, `amenity=fast_food` | Restaurant density |
| Shopping | `shop=*` | Retail activity |
| Education | `amenity=school`, `amenity=university` | School zones |
| Parks | `leisure=park`, `leisure=playground` | Recreation areas |
| Transit | `railway=station`, `public_transport=station` | Transit hubs |
| Healthcare | `amenity=hospital`, `amenity=clinic`, `amenity=pharmacy` | Medical facilities |

### Overpass API Query Example
```overpass-ql
[out:json][timeout:30];
(
  node["amenity"="restaurant"](41.6,-87.9,42.1,-87.5);
  way["amenity"="restaurant"](41.6,-87.9,42.1,-87.5);
  node["leisure"="park"](41.6,-87.9,42.1,-87.5);
  way["leisure"="park"](41.6,-87.9,42.1,-87.5);
);
out center;
```

### Chicago Coordinate Bounds
```typescript
const CHICAGO_BOUNDS = {
  minLon: -87.9,
  maxLon: -87.5,
  minLat: 41.6,
  maxLat: 42.1,
};
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── context-diagnostics/   # Phase 57 pattern (already exists)
│   │   ├── index.ts           # Main builder, composes all diagnostics
│   │   ├── temporal.ts        # Temporal diagnostics
│   │   ├── spatial.ts         # Spatial diagnostics
│   │   ├── profile.ts        # Dynamic profile resolution
│   │   └── compare.ts         # Static vs dynamic comparison
│   └── neighbourhood/         # NEW: Phase 58 neighbourhood enrichment
│       ├── index.ts           # Main builder (buildNeighbourhoodSummary)
│       ├── osm.ts              # OSM Overpass API client
│       ├── chicago.ts          # Chicago Data Portal client
│       └── types.ts            # POI types and interfaces
├── hooks/
│   └── useNeighbourhoodData.ts # NEW: Hook for fetching/fetching neighbourhood data
├── store/
│   └── useSuggestionStore.ts   # Extend SuggestionContextMetadata with neighbourhood
└── app/
    ├── api/
    │   └── neighbourhood/     # NEW: Server-side API routes
    │       └── poi/route.ts    # Proxy route for OSM/Chicago data
    └── timeslicing-algos/
        └── lib/
            ├── NeighbourhoodDiagnosticsPanel.tsx  # NEW: UI component
            └── TimeslicingAlgosRouteShell.tsx     # Extend existing
```

### Pattern 1: Diagnostics Module Structure (from Phase 57)
**What:** Each diagnostic category is a standalone module with its own builder function
**When to use:** Adding new neighbourhood diagnostics
**Example:**
```typescript
// src/lib/neighbourhood/index.ts
import { queryOSMPOI, queryChicagoData } from './osm';

export interface NeighbourhoodSummaryResult {
  status: 'available' | 'missing';
  poiCounts?: Record<string, number>;
  summary?: string;
  hotspots?: POIHotspot[];
  notice?: string;
}

export const buildNeighbourhoodSummary = async (input: {
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  dateEpoch?: number;
}): Promise<NeighbourhoodSummaryResult> => {
  try {
    const [osmData, chicagoData] = await Promise.all([
      queryOSMPOI(input.bounds),
      queryChicagoData(input.bounds),
    ]);
    
    const poiCounts = aggregatePOICounts(osmData, chicagoData);
    
    return {
      status: 'available',
      poiCounts,
      summary: formatNeighbourhoodSummary(poiCounts),
    };
  } catch (error) {
    return {
      status: 'missing',
      notice: 'Neighbourhood data unavailable: external API error',
    };
  }
};
```

### Pattern 2: Extend Existing Store Types (from Phase 57)
**What:** Add new fields to existing types rather than creating new stores
**When to use:** Adding neighbourhood to suggestion metadata
**Example:**
```typescript
// src/store/useSuggestionStore.ts - Extend existing type
export interface SuggestionContextMetadata {
  // ... existing fields ...
  neighbourhood?: {
    status: 'available' | 'missing';
    poiSummary?: string;
    poiCounts?: Record<string, number>;
    notice?: string;
  };
}
```

### Pattern 3: Compact Summary + Expandable Details (from Phase 57)
**What:** Show condensed summary by default, detailed breakdown on toggle
**When to use:** Displaying neighbourhood diagnostics in UI
**Example:**
```tsx
// In NeighbourhoodDiagnosticsPanel.tsx
<div className="rounded-md border border-slate-700/70 bg-slate-900/60 p-3">
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      Neighbourhood Context
    </span>
    {status === 'available' && (
      <span className="text-xs text-slate-300">{summary}</span>
    )}
  </div>
  {status === 'missing' && (
    <p className="mt-1 text-xs text-slate-500">{notice}</p>
  )}
</div>
```

### Anti-Patterns to Avoid
- **Don't fetch on component mount:** Use on-demand fetching triggered during suggestion generation, not during initial load
- **Don't block UI on external API failure:** Always provide graceful fallback with explicit notice
- **Don't fetch full Chicago dataset client-side:** Use server-side API route as proxy to avoid rate limits
- **Don't duplicate coordinate normalization:** Reuse `normalizedToLonLat()` from `@/lib/coordinate-normalization`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OSM query construction | Manual string building with URL encoding | `overpass-ql-ts` npm package | Handles escaping, provides types, cleaner API |
| Chicago SODA pagination | Custom cursor handling | Built-in SODA `$offset` + `$limit` | Handles 50k row limits automatically |
| Bounding box queries | Raw coordinate arrays | Overpass BBoxQuery or `[bbox:south,west,north,east]` | Proper coordinate ordering, handles edge cases |
| Server-side OSM access | Client fetch with CORS issues | Server-side `/api/neighbourhood/poi` route | Bypasses CORS, allows caching |
| Coordinate bounds | Custom Chicago bounds | Existing `CHICAGO_BOUNDS` from `@/lib/coordinate-normalization` | Already in codebase, consistent |

**Key insight:** OSM Overpass API is the primary POI source with excellent coverage. Chicago Data Portal is supplementary for business license data. Build one unified neighbourhood summary that aggregates both sources rather than separate UI sections.

## Common Pitfalls

### Pitfall 1: Overpass API Rate Limiting
**What goes wrong:** Too many requests causes 429 "Too Many Requests" errors
**Why it happens:** Public Overpass API has rate limits (~2 requests/second)
**How to avoid:** 
- Cache POI results server-side with 24h TTL
- Use `/api/neighbourhood/poi` route as proxy
- Include bounding box in cache key

### Pitfall 2: Bounding Box Coordinate Order
**What goes wrong:** Wrong order causes empty results or syntax errors
**Why it happens:** Overpass uses `(south, west, north, east)` but it's easy to mix up
**How to avoid:** Use named parameters or `overpass-ql-ts` which enforces correct order

### Pitfall 3: OSM Ways vs Nodes
**What goes wrong:** Only querying nodes misses polygon-based POIs (parks, large buildings)
**Why it happens:** OSM represents small features as nodes, larger ones as ways/relations
**How to avoid:** Query `nwr` (nodes + ways + relations) with `out center` for ways

### Pitfall 4: Chicago Data Portal Row Limits
**What goes wrong:** Large queries truncated at 50k rows without warning
**Why it happens:** SODA API default limit, requires explicit `$limit=100000`
**How to avoid:** Always request explicit limit when querying, check `meta.license`

### Pitfall 5: Date-Filtering POI Data
**What goes wrong:** OSM data doesn't have historical POI info; Chicago business licenses have issue dates but not closures
**Why it happens:** POI databases are current-state, not historical
**How to avoid:** 
- Acknowledge limitation: "POI context reflects current neighbourhood, not historical events"
- Focus on static neighbourhood features (parks, schools, transit) that are relatively stable

## Code Examples

### Overpass API Query (TypeScript)
```typescript
// src/lib/neighbourhood/osm.ts
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export interface OSMPOIResult {
  id: number;
  type: 'node' | 'way';
  lat?: number;
  lon?: number;
  centerLat?: number;
  centerLon?: number;
  name?: string;
  amenity?: string;
  tags: Record<string, string>;
}

const POI_QUERY_TEMPLATE = `
[out:json][timeout:30];
(
  node["amenity"]({{bbox}});
  way["amenity"]({{bbox}});
  node["leisure"]({{bbox}});
  way["leisure"]({{bbox}});
  node["shop"]({{bbox}});
  way["shop"]({{bbox}});
);
out center;
`;

export async function queryOSMPOI(bounds: {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}): Promise<OSMPOIResult[]> {
  const bbox = `${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon}`;
  const query = POI_QUERY_TEMPLATE.replace('{{bbox}}', bbox);
  
  const response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.elements.map((el: any) => ({
    id: el.id,
    type: el.type,
    lat: el.lat,
    lon: el.lon,
    centerLat: el.center?.lat,
    centerLon: el.center?.lon,
    name: el.tags?.name,
    amenity: el.tags?.amenity || el.tags?.leisure || el.tags?.shop,
    tags: el.tags || {},
  }));
}
```

### Chicago Data Portal Query
```typescript
// src/lib/neighbourhood/chicago.ts
const CHICAGO_API_BASE = 'https://data.cityofchicago.org/resource';

export interface ChicagoBusiness {
  id: string;
  doing_business_as_name: string;
  license_description: string;
  address: string;
  latitude: number;
  longitude: number;
}

export async function queryChicagoBusinesses(bounds: {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}): Promise<ChicagoBusiness[]> {
  // Using Socrata SODA API with bounding box filter
  const where = `latitude >= ${bounds.minLat} AND latitude <= ${bounds.maxLat} AND longitude >= ${bounds.minLon} AND longitude <= ${bounds.maxLon}`;
  
  const url = `${CHICAGO_API_BASE}/6pth-rz8e.json?$where=${encodeURIComponent(where)}&$limit=50000`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Chicago API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Integration with Context Diagnostics
```typescript
// src/lib/context-diagnostics/index.ts - Extend existing
import { buildNeighbourhoodSummary, type NeighbourhoodSummaryResult } from '../neighbourhood';

export interface ContextDiagnosticsResult {
  temporal: TemporalSummaryResult;
  spatial: SpatialSummaryResult;
  neighbourhood: NeighbourhoodSummaryResult;  // NEW
  dynamicProfile: DynamicProfileResult;
  comparison: ProfileComparison;
}

export const buildContextDiagnostics = async (input: ContextDiagnosticsInput): Promise<ContextDiagnosticsResult> => {
  const temporal = buildTemporalSummary({ timestamps: input.timestamps });
  const spatial = buildSpatialSummary({ crimes: input.crimes });
  
  // Get bounds from crimes for neighbourhood query
  const bounds = deriveBoundsFromCrimes(input.crimes);
  const neighbourhood = await buildNeighbourhoodSummary({ bounds });
  
  const dynamicProfile = resolveDynamicProfile({ temporal, spatial, neighbourhood });
  const comparison = buildProfileComparison(input.staticProfileName ?? null, dynamicProfile);

  return {
    temporal,
    spatial,
    neighbourhood,
    dynamicProfile,
    comparison,
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No neighbourhood context | OSM Overpass + Chicago SODA | 2026-03 | External context for timeslicing validation |
| Client-side API calls | Server-side `/api/neighbourhood/poi` route | 2026-03 | Avoids CORS, enables caching |
| String-based query building | `overpass-ql-ts` package | 2026-03 | Type-safe query construction |

**Deprecated/outdated:**
- Raw `fetch` with manual URL encoding for Overpass → Use `overpass-ql-ts` for type safety
- Client-side OSM queries → Server-side proxy with caching
- Hardcoded Chicago bounds → Reuse `CHICAGO_BOUNDS` from coordinate-normalization

## Open Questions

1. **Should neighbourhood data be fetched synchronously or asynchronously?**
   - What we know: Context is fetched during suggestion generation with debounce
   - What's unclear: Whether blocking the suggestion with neighbourhood data or loading in parallel is better UX
   - Recommendation: On-demand async with explicit loading state in diagnostics panel

2. **Should we cache POI data at all?**
   - What we know: OSM POI data changes slowly; Chicago business licenses update but not frequently
   - What's unclear: Cache TTL (1 hour? 24 hours? No cache?)
   - Recommendation: 24h TTL server-side cache keyed by bounding box

3. **Should we limit POI categories to focus on crime-relevant features?**
   - What we know: Parks, schools, transit hubs are often crime-relevant context
   - What's unclear: Whether bars/restaurants provide meaningful crime correlation context
   - Recommendation: Start with all categories, let summary aggregation determine relevance

## Sources

### Primary (HIGH confidence)
- OSM Overpass API Wiki - `https://wiki.openstreetmap.org/wiki/Overpass_API` - Query language reference
- OSM Overpass QL - `https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL` - Bounding box syntax
- Chicago Data Portal - `https://data.cityofchicago.org/` - Business license and land use APIs

### Secondary (MEDIUM confidence)
- `overpass-ql-ts` npm package - `https://registry.npmjs.org/overpass-ql-ts` - TypeScript Overpass builder
- Overpass Turbo examples - `https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example` - Common query patterns

### Tertiary (LOW confidence)
- WebSearch: OSM POI query examples - Multiple tutorials and Stack Overflow answers for Chicago bounding box queries

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Overpass API is standard, but specific query patterns need verification with Chicago bounds
- Architecture: HIGH - Directly follows Phase 57 pattern from existing codebase
- Pitfalls: MEDIUM - Known issues documented but not verified against Chicago-specific edge cases

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days - OSM/Chicago APIs are stable, no expected breaking changes)
