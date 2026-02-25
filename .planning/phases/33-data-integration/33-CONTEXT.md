# Phase 33: Data Integration - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire timeline to real crime data instead of mock data. This involves:
- Connecting to DuckDB (already in project) to query CSV files directly
- Updating timeline to use real date range (2001-2026, 25 years)
- Refactoring API to serve from DuckDB queries
- Handling query-level filtering and aggregation

This is strictly backend/integration work. No UI changes.

</domain>

<decisions>
## Implementation Decisions

### Database: DuckDB (not SQLite)
- DuckDB already exists in `src/lib/db.ts`
- Queries CSV directly without import step (~1.4s per query)
- No need for SQLite's 34s import + 1GB file
- If performance issues arise: pre-convert to Parquet (future optimization)

### Coordinate System: Keep Both lat/lon AND x/z
- Keep raw `lat`, `lon` columns in query results (for 2D map)
- Compute `x`, `z` using existing `project(lat, lon)` from `src/lib/projection.ts`
- Both coordinate systems already supported in `useDataStore.ts`

### Loading Behavior
- Show loading indicator during query execution (~1-2s acceptable)
- DuckDB's first query is ~1.4s — acceptable for initial load
- Progress % not critical (no easy way to track DuckDB progress)

### Error Handling
- If DuckDB query fails: fallback to mock data with warning banner
- Warning text: "Using demo data" so user knows it's not real data
- Log errors to console for debugging

### Data Validation
- Skip rows with missing Date or coordinates at query level
- Query filter: `WHERE Date IS NOT NULL AND Latitude IS NOT NULL`
- ~1.1% of rows have null coordinates — filtered out

### Timeline Range
- Update from mock (2024, 1 year) to real data (2001-2026, 25 years)
- This is a significant UX change but required for real data
- Filter presets (0-100 normalized) will need mapping to real dates

### Column Selection
Only query needed columns (not all 22):
- `Date` — for timeline
- `Primary Type` — for filtering
- `Latitude`, `Longitude` — for 2D map and 3D cube
- `IUCR` — for detailed crime categorization
- `District` — for geographic filtering
- `Year` — for quick year filtering

### Query Strategy
- Timeline needs **aggregated counts** per time bucket (day/week), not individual rows
- Example: `SELECT DATE(Date) as day, COUNT(*) as count GROUP BY day`
- Aggregate at database level, not in JavaScript

### Date Parsing
- CSV format: `"01/05/2026 12:00:00 AM"` (US month-first)
- Parse to epoch timestamp using DuckDB: `epoch_seconds(parse_datetime(Date, '%m/%d/%Y %I:%M:%S %p'))`

### Caching Strategy (Claude's Discretion)
- Acceptable: Query on each time range change (1.4s acceptable)
- Optional optimization: Cache daily counts per year
- Optional optimization: In-memory cache after first load of visible range

</decisions>

<specifics>
## Data Source Details

### Files Used
| File | Rows | Purpose |
|------|------|---------|
| Crimes_-_2001_to_Present_20260114.csv | 8,476,869 | Main crime events |
| Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv | 410 | Crime type lookup |
| Police_Stations_20260202.csv | 23 | District locations |

### Data Characteristics
- Date range: 2001-01-01 to 2026-01-05
- ~8.5 million crime records over 25 years
- ~34 unique crime types
- ~1.1% missing coordinates (filtered at query level)
- Early years (~450k/year), recent years (~260k/year)

### Existing Code to Leverage
- `src/lib/db.ts` — DuckDB connection (already exists)
- `src/lib/projection.ts` — lat/lon ↔ x/z conversion
- `src/lib/category-maps.ts` — Crime type ID mapping
- `src/store/useDataStore.ts` — Already has `lat`, `lon` support

</specifics>

<deferred>
## Deferred Ideas

- Pre-convert CSV to Parquet for faster queries — only if DuckDB proves too slow
- Pre-compute daily/weekly aggregates — only if query performance is poor
- Persist DuckDB state across sessions — would need file-based DB

These are performance optimizations to address only if needed.

</deferred>

---

*Phase: 33-data-integration*
*Context gathered: 2026-02-22*
