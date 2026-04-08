# Codebase Concerns

**Analysis Date:** 2026-04-08

## Tech Debt

### DuckDB Singleton with `any` Type
- **Issue:** Global `db` variable typed as `any` in `src/lib/db.ts` (line 4)
- **Files:** `src/lib/db.ts:4`
- **Impact:** No type safety for database operations; potential runtime errors
- **Fix approach:** Create proper DuckDB wrapper interface with typed methods

### Excessive Console Logging in Production
- **Issue:** 92 console.log/warn/error calls in TypeScript files, 14 in TSX files
- **Files:** `src/lib/queries.ts`, `src/store/useTimelineDataStore.ts`, `src/hooks/useCrimeData.ts`, `src/components/viz/DataPoints.tsx` (lines 550, 556, 560, 615, 628)
- **Impact:** Performance degradation, debug output in production, potential PII leakage
- **Fix approach:** Replace with structured logging (e.g., `src/lib/logger.ts`) and use log levels appropriately

### Unused/Missing Error Handling
- **Issue:** 78 instances of silent `return null`, `return []`, `return {}` patterns
- **Files:** `src/store/useSuggestionStore.ts:212-237`, `src/lib/warp-generation.ts:162-317`, `src/lib/selection.ts` (multiple)
- **Impact:** Errors fail silently; debugging becomes difficult
- **Fix approach:** Either throw errors or return with proper error context/warnings

### Large File Complexity
- **Files:**
  - `src/components/timeline/DualTimeline.tsx` (1285 lines)
  - `src/store/useSuggestionStore.ts` (768 lines)
  - `src/app/timeslicing/components/SuggestionPanel.tsx` (767 lines)
  - `src/components/viz/DataPoints.tsx` (687 lines)
- **Impact:** Hard to maintain, test, and understand
- **Fix approach:** Extract sub-components, split stores by domain

### Hardcoded File Paths
- **Issue:** Data file paths hardcoded in multiple places
- **Files:**
  - `src/lib/db.ts:21` - `data/sources/Crimes_-_2001_to_Present_20260114.csv`
  - `src/lib/duckdb-aggregator.ts:25` - `data/crime.parquet`
  - `src/lib/duckdb-aggregator.ts:61-62` - Epoch constants (978307200, 1767225600)
- **Impact:** Fragile if data sources change; no configuration flexibility
- **Fix approach:** Centralize path constants in `src/lib/constants.ts` or environment config

### Unused Code Commented Out
- **Issue:** `src/components/viz/DataPoints.tsx:19` has commented import
- **Files:** `src/components/viz/DataPoints.tsx:19`
- **Impact:** Dead code creates confusion
- **Fix approach:** Remove commented code or document why it exists

### Mock Data Fallback Without User Notification
- **Issue:** Database errors trigger mock data silently in `src/lib/queries.ts:264-265`, `src/store/useTimelineDataStore.ts:86-168`
- **Impact:** Users may not realize they're seeing mock data instead of real data
- **Fix approach:** Add UI indicator when mock data is active; add warning logs

## Known Bugs

### Potential Memory Leak in Store Undo Timeouts
- **Symptoms:** `undoTimeout` in `useSuggestionStore.ts` uses `setTimeout` but may not clear on all unmount paths
- **Files:** `src/store/useSuggestionStore.ts:313-315, 398-400`
- **Trigger:** Rapid accept/reject actions
- **Workaround:** None identified; needs cleanup verification

### Race Condition in DuckDB Initialization
- **Issue:** `db.ts:62-69` - Module-level `db` variable shared across requests without synchronization
- **Files:** `src/lib/db.ts:58-70`
- **Trigger:** Multiple concurrent requests during initialization
- **Workaround:** Ensure sequential initialization via external mechanism

## Security Considerations

### No Input Validation in API Routes
- **Risk:** Query parameters parsed directly without validation
- **Files:** `src/app/api/crime/facets/route.ts:84-100`, `src/lib/duckdb-aggregator.ts:51-56`
- **Current mitigation:** Basic parseInt checks; DuckDB parameterized queries in some places
- **Recommendations:** 
  - Add explicit schema validation with zod or similar
  - Sanitize all user inputs before SQL construction
  - Add rate limiting on API routes

### SQL Injection Risk in Dynamic Query Building
- **Risk:** String interpolation in DuckDB queries
- **Files:** `src/lib/duckdb-aggregator.ts:51-52, 54-56` - `types.map(t => `'${t}'')`, districts interpolation
- **Current mitigation:** DuckDB's prepared statement limitations help somewhat
- **Recommendations:** Use parameterized queries exclusively; validate enum values

### Missing CORS Configuration Visibility
- **Risk:** No explicit CORS configuration observed in codebase
- **Files:** API routes in `src/app/api/`
- **Recommendations:** Add explicit CORS headers configuration

### No Authentication on API Routes
- **Risk:** All `/api/*` routes appear publicly accessible
- **Files:** `src/app/api/crime/`, `src/app/api/stkde/`, etc.
- **Recommendations:** Add authentication middleware if these should be protected

## Performance Bottlenecks

### Large Data Processing Without Pagination
- **Problem:** `queryCrimesInRange` loads potentially millions of rows into memory
- **Files:** `src/lib/queries.ts:259-289`, `src/lib/duckdb-aggregator.ts:68-89`
- **Cause:** No streaming; all results buffered in array
- **Improvement path:** Implement cursor-based pagination or streaming for large queries

### Synchronous DuckDB Table Creation
- **Problem:** `ensureSortedCrimesTable` blocks on table creation with no progress indication
- **Files:** `src/lib/db.ts:79-121`
- **Cause:** Synchronous run() callback; no streaming
- **Improvement path:** Show progress indicator; consider background worker

### Real-time Data Processing on Main Thread
- **Issue:** `DataPoints.tsx` shader compilation and raycasting on main thread
- **Files:** `src/components/viz/DataPoints.tsx:504-508`
- **Cause:** Complex shader manipulation with `onBeforeCompile`
- **Improvement path:** Move to Web Worker or use `requestIdleCallback`

### Multiple Re-renders in Large Components
- **Problem:** `DualTimeline.tsx` (1285 lines) likely causes many unnecessary re-renders
- **Files:** `src/components/timeline/DualTimeline.tsx`
- **Cause:** No visible memoization patterns
- **Improvement path:** Add React.memo, useMemo, useCallback strategically

## Fragile Areas

### Complex Zustand Store Coordination
- **Files:** `src/store/useCoordinationStore.ts`, `src/store/useSuggestionStore.ts`, `src/store/useSliceStore.ts`
- **Why fragile:** Cross-store dependencies and event dispatching between stores creates tight coupling
- **Safe modification:** Always test full workflow when modifying store interactions
- **Test coverage:** Partial - `useCoordinationStore.test.ts` exists

### Custom Event System for Slice Communication
- **Issue:** `useSuggestionStore` dispatches `CustomEvent` for `accept-time-scale` and `accept-interval-boundary`
- **Files:** `src/store/useSuggestionStore.ts:318-332, 491-504`
- **Why fragile:** Events bypass TypeScript typing; no compile-time checking
- **Safe modification:** Document event contract; consider typed message bus instead

### Adaptive Bin Calculation in Workers
- **Issue:** Worker communication with `adaptiveTime.worker.ts` uses postMessage
- **Files:** `src/workers/adaptiveTime.worker.ts`
- **Why fragile:** Serialization overhead; no type safety across worker boundary
- **Safe modification:** Use Comlink or similar for typed worker communication

### Complex Data Texture Management
- **Issue:** `DataPoints.tsx` creates and disposes THREE.DataTexture objects
- **Files:** `src/components/viz/DataPoints.tsx:42-48, 88-97, 99-100`
- **Why fragile:** Memory leaks if disposal fails; textures recreated on every warpMap change
- **Safe modification:** Ensure dispose() always called; consider texture pooling

## Scaling Limits

### DuckDB Memory Usage
- **Current capacity:** Handles ~8.5M rows (per `src/lib/db.ts:18`)
- **Limit:** DuckDB loads entire CSV into memory during `crimes_sorted` creation
- **Scaling path:** Partition data by time range; use chunked loading

### State Synchronization Overhead
- **Current capacity:** 25+ Zustand stores
- **Limit:** Each store subscription triggers re-renders
- **Scaling path:** Use selectors to minimize subscriptions; consider atomic state management

### Max Suggestion History
- **Current capacity:** `acceptedHistory` limited to 50 entries
- **Limit:** Hardcoded in `useSuggestionStore.ts:376, 731, 765`
- **Scaling path:** Add pagination or move to persistent storage

## Dependencies at Risk

### DuckDB v1.4.4
- **Risk:** Uses native Node addon requiring platform-specific binding
- **Impact:** `postinstall` script creates symlink for `duckdb.node` - fragile on rebuilds
- **Migration plan:** Consider `duckdb-wasm` for cross-platform support

### Next.js 16.1.6
- **Risk:** Very recent version (2026); may have undiscovered issues
- **Impact:** `eslint-config-next` pinned to same version
- **Migration plan:** Monitor for updates; test thoroughly before upgrading

### Three.js 0.182.0 with @react-three/fiber 9.5.0
- **Risk:** Major version mismatch; three 0.182 vs fiber 9.x compatibility unclear
- **Impact:** Potential rendering bugs or performance issues
- **Migration plan:** Verify compatibility; consider upgrading three.js to 0.170+

## Missing Critical Features

### Error Boundary Components
- **Problem:** No React error boundaries observed in component tree
- **Blocks:** Graceful degradation when components fail
- **Recommendation:** Add error boundaries around visualization components

### Loading States for API Calls
- **Problem:** No consistent loading state management across API routes
- **Blocks:** User experience with spinners vs error states
- **Recommendation:** Implement React Query's isLoading states consistently

### Offline/Disconnected Mode
- **Problem:** App requires API endpoints; no service worker observed
- **Blocks:** Use when network unavailable
- **Recommendation:** Add PWA support with workbox

## Test Coverage Gaps

### Untested Core Logic
- **What's not tested:** 
  - `src/lib/queries.ts` - query building and execution
  - `src/lib/duckdb-aggregator.ts` - aggregation logic
  - `src/components/viz/DataPoints.tsx` - point rendering
- **Risk:** Core data pipeline has no unit tests; bugs may go undetected
- **Priority:** High

### Missing Integration Tests
- **What's not tested:** Store coordination workflows
- **Risk:** Cross-store interactions may break silently
- **Priority:** Medium

### Untested Edge Cases
- **What's not tested:**
  - Empty data states
  - Invalid date formats
  - Concurrent slice modifications
- **Files:** Various stores and hooks
- **Risk:** Edge cases may cause crashes
- **Priority:** Medium

---

*Concerns audit: 2026-04-08*
