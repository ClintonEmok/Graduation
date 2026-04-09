---
phase: 06
plan: 02
subsystem: api
tags: nextjs, duckdb, arrow, streaming
requires:
  - phase: 06-01
    provides: crime.parquet
provides:
  - /api/crime/stream
affects:
  - 06-03
tech-stack:
  added: []
  patterns:
    - Streaming Arrow IPC from API
key-files:
  created:
    - src/app/api/crime/stream/route.ts
    - src/lib/db.ts
  modified:
    - next.config.ts
key-decisions:
  - "Used apache-arrow serialization"
  - "Updated Next.js config for v16"
patterns-established:
  - "API routes return raw Arrow IPC buffers for client consumption"
duration: 18m
completed: 2026-01-31
---

# Phase 06 Plan 02: Streaming API Endpoint Summary

**Streaming API endpoint using DuckDB and Apache Arrow for efficient data transfer**

## Performance

- **Duration:** 18m
- **Started:** 2026-01-31T22:15:00Z
- **Completed:** 2026-01-31T22:33:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented `/api/crime/stream` endpoint
- Created DuckDB singleton utility
- Enabled Arrow IPC response format for zero-copy client consumption
- Fixed Next.js 16 configuration for native modules

## Task Commits

1. **Task 1: Create Database Utility** - `9bb299b` (feat)
2. **Task 2: Implement Streaming Route** - `a1e6513` (feat)
   - Includes config fix `8a7a6dd` (fix)

## Files Created/Modified
- `src/lib/db.ts` - Singleton DuckDB connection wrapper
- `src/app/api/crime/stream/route.ts` - API route handler
- `next.config.ts` - Updated `serverExternalPackages` key

## Decisions Made
- **Manual Arrow Serialization:** Switched from `connection.arrowIPCStream()` to `apache-arrow`'s `tableToIPC()` because the native `to_arrow_ipc` function was missing in the DuckDB Node environment. This buffers data in memory on the server but still delivers standard Arrow IPC to the client.
- **In-Memory DB:** Used `new Database(':memory:')` and queried the Parquet file by path, avoiding persistent DB management overhead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated Next.js Config**
- **Found during:** Task 2 verification (server start)
- **Issue:** `serverComponentsExternalPackages` is deprecated/invalid in Next.js 16, causing server to ignore DuckDB config.
- **Fix:** Renamed to `serverExternalPackages`.
- **Files modified:** next.config.ts
- **Committed in:** 8a7a6dd

**2. [Rule 1 - Bug] Fallback to Apache Arrow Library**
- **Found during:** Task 2 verification (API call)
- **Issue:** DuckDB error "Table Function with name to_arrow_ipc does not exist" when using `arrowIPCStream`.
- **Fix:** Used `connection.all()` to fetch data and `apache-arrow.tableToIPC()` to serialize it manually.
- **Files modified:** src/app/api/crime/stream/route.ts
- **Committed in:** a1e6513

## Next Phase Readiness
- API is ready to serve data.
- Frontend data loading (06-03) can now implement the Arrow loader to consume this endpoint.
