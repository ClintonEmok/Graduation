# Summary: Backend Metadata Optimization

**Phase:** 09 (Logging/Study)
**Plan:** 01 (Logging Infrastructure)
**Date:** 2026-02-03

## Overview
Addressed a performance bottleneck and stack overflow error in client-side data loading by offloading aggregation to the backend.

## Problem
The initial implementation calculated `min` and `max` timestamps for 1.2M rows in the browser. This caused:
1.  `Maximum call stack size exceeded` due to `Math.min(...largeArray)`.
2.  Unnecessary CPU usage on the client thread.

## Solution
1.  **New API Endpoint:** Created `src/app/api/crime/meta/route.ts` which uses DuckDB to instantly query the Parquet file's metadata (`MIN(timestamp)`, `MAX(timestamp)`, `COUNT(*)`).
2.  **Store Refactor:** Updated `useDataStore.ts` to:
    - Fetch metadata first.
    - Use the pre-calculated `y` column (normalized time 0-100) from the Parquet file instead of recalculating it client-side.
    - Map Parquet columns `x` (long), `z` (lat), `y` (time) correctly to the store structure.

## Technical Details
- **DuckDB:** Used in-memory DB to query the parquet file by path.
- **Arrow:** Still used for streaming the raw columnar data, but now we skip the O(N) iteration for normalization.

## Impact
- **Performance:** Significant reduction in client-side processing time during data load.
- **Stability:** Eliminated stack overflow risk for large datasets.
- **Architecture:** Better separation of concerns (DB handles aggregation, Client handles rendering).
