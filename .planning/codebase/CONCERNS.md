# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Massive DualTimeline Component:**
- Issue: `src/components/timeline/DualTimeline.tsx` is 1245 lines - extremely large single file component
- Files: `src/components/timeline/DualTimeline.tsx`
- Impact: Hard to maintain, test, and understand. Any change risks breaking multiple unrelated features
- Fix approach: Split into smaller, focused sub-components (OverviewTimeline, DetailTimeline, Axis, Brush, etc.)

**Massive Suggestion Stores:**
- Issue: `src/store/useSuggestionStore.ts` is 768 lines, handling too many responsibilities
- Files: `src/store/useSuggestionStore.ts`, `src/app/timeslicing/components/SuggestionPanel.tsx` (767 lines)
- Impact: Store is difficult to test and reason about
- Fix approach: Split into focused stores (suggestion generation, suggestion UI state, suggestion selection)

**Large Page Components:**
- Issue: Multiple page components exceed 600+ lines
- Files: `src/app/timeline-test/page.tsx` (672 lines), `src/app/timeline-test-3d/components/SuggestionPanel.tsx` (643 lines)
- Impact: Bundle size concerns, longer parse times
- Fix approach: Extract visualization logic into custom hooks, extract UI into components

**Unused/Missing Index Exports:**
- Issue: Many lib files lack barrel exports, forcing deep imports
- Files: `src/lib/` directory
- Impact: Brittle import paths, harder refactoring
- Fix approach: Add index.ts barrel files to all lib directories

## Known Bugs

**Silent Error Swallowing in Catch Blocks:**
- Issue: Multiple catch blocks with empty bodies that silently fail
- Files: 
  - `src/store/useSuggestionStore.ts` (line 236 - empty catch returns empty array)
  - `src/store/useFilterStore.ts` (lines 29, 43 - empty catch)
  - `src/app/timeline-test-3d/page.tsx` (line 269 - empty catch)
  - `src/app/timeline-test-3d/components/TimeSlices3D.tsx` (lines 306, 364 - empty catch)
  - `src/hooks/useURLFeatureFlags.ts` (line 105 - empty catch)
- Impact: Errors are hidden from users and logs, making debugging extremely difficult
- Fix approach: Add proper error logging in all catch blocks, surface errors to user when appropriate

**Debug Console Statements:**
- Issue: 100+ console.log/console.warn/console.error statements throughout codebase
- Files: Scattered across components, hooks, stores, and API routes
- Impact: Clutters browser console, potential performance impact in development, security risk if sensitive data logged
- Fix approach: Remove all console.log statements, keep only critical console.error for actual errors with proper context

## Type Safety Issues

**Excessive `any` Type Usage:**
- Issue: 28+ instances of `any` type scattered throughout codebase
- Files:
  - `src/lib/db.ts` (line 4: `let db: any = null`)
  - `src/hooks/useCrimeStream.ts` (lines 8, 11: arrays and callbacks typed as `any`)
  - `src/components/viz/TrajectoryLayer.tsx` (line 38: `const points: any[] = []`)
  - `src/components/timeline/Timeline.tsx` (line 20: index signature with `any`)
  - API routes in `src/app/api/` (multiple instances)
- Impact: TypeScript cannot catch type errors in these areas, runtime errors more likely
- Fix approach: Replace with proper types, use `unknown` where type is truly unknown, create proper interfaces

## Security Considerations

**Environment Variable Validation:**
- Issue: Raw environment variables used without validation
- Files: 
  - `src/app/api/stkde/hotspots/route.ts` (line 11)
  - `src/lib/db.ts` (lines 9, 25)
- Impact: Could accept invalid values leading to unexpected behavior
- Fix approach: Add validation/schema for environment variables at startup

**Console Logging of Sensitive Data:**
- Issue: Potential for sensitive data to be logged via console.log statements
- Files: `src/components/viz/DataPoints.tsx` (debug raycasting logs), various hooks
- Impact: Data exposure in browser console
- Fix approach: Remove debug logging, use proper debug tooling

## Performance Bottlenecks

**Heavy Computation in Render Path:**
- Issue: Large component render calculations happening synchronously
- Files:
  - `src/components/timeline/DualTimeline.tsx` (1245 lines of render logic)
  - `src/components/viz/DataPoints.tsx` (687 lines)
  - `src/lib/stkde/compute.ts` (461 lines)
- Impact: UI jank, slow interactions with large datasets
- Fix approach: Memoize computations, use web workers for heavy calculations, implement virtualization

**No Virtualization for Large Lists:**
- Issue: Rendering potentially large arrays without virtualization
- Files: Suggestion panels, slice lists
- Impact: Performance degrades linearly with data size
- Fix approach: Implement react-window or similar for long lists

**DuckDB Initialization:**
- Issue: Synchronous database initialization can block
- Files: `src/lib/db.ts`
- Impact: Initial load time, potential UI blocking
- Fix approach: Lazy initialization, worker-based initialization

## Fragile Areas

**Slice Domain Store Complexity:**
- Issue: Complex slice domain with multiple slice types (core, adjustment, creation, selection)
- Files: `src/store/slice-domain/` directory
- Why fragile: Multiple store slices interacting, state sync issues between slices
- Safe modification: Always test multi-slice interactions, use selectors
- Test coverage: Partial - some slice-specific tests exist but integration tests limited

**Timeline State Synchronization:**
- Issue: Multiple stores managing timeline state with potential race conditions
- Files: `src/store/useTimeStore.ts`, `src/store/useTimelineDataStore.ts`, `src/store/useSliceStore.ts`
- Why fragile: Brush zoom, time range selection, slice creation all modify overlapping state
- Safe modification: Use transactions or batched updates
- Test coverage: Gaps in concurrent state modification testing

**Web Worker Communication:**
- Issue: Workers for STKDE and adaptive time computations with message passing
- Files: `src/workers/stkdeHotspot.worker.ts`, `src/workers/adaptiveTime.worker.ts`
- Why fragile: No type-safe message contracts, worker crashes are silent
- Safe modification: Add error boundaries around worker calls, implement retry logic
- Test coverage: Limited - worker tests exist but error scenarios not fully covered

## Scaling Limits

**In-Memory Data:**
- Current capacity: Large datasets loaded into memory via DuckDB WASM
- Limit: Browser memory (~2GB typical), dataset size ~10M records
- Scaling path: Implement streaming/chunking, server-side aggregation

**Client-Side State:**
- Current capacity: Zustand stores hold significant application state
- Limit: Serialization costs on navigation, memory pressure
- Scaling path: Implement store persistence strategies, lazy load state

**Maplibre GL Rendering:**
- Current capacity: Large point datasets rendered via GPU
- Limit: ~100K visible points before frame drops
- Scaling path: Clustering, level-of-detail rendering, viewport culling

## Dependencies at Risk

**DuckDB WASM:**
- Risk: Heavy dependency (megabytes), complex initialization
- Impact: Slow cold start, large bundle size
- Migration plan: Consider server-side DuckDB for initial queries, lighter client for streaming

**React 19:**
- Risk: Relatively new version, potential compatibility issues
- Impact: Bug fixes may require updates, ecosystem compatibility
- Migration plan: Monitor, test thoroughly on updates

**Three.js / React Three Fiber:**
- Risk: Large 3D library bundle
- Impact: Significant bundle size increase for 3D features
- Migration plan: Lazy load 3D components, consider lighter alternatives for simple visualizations

**Next.js 16:**
- Risk: Very new version (16.1.6)
- Impact: Potential breaking changes, less community knowledge
- Migration plan: Test thoroughly on updates, monitor Next.js releases

## Test Coverage Gaps

**Integration Tests:**
- What's not tested: End-to-end user workflows across multiple pages/stores
- Files: Integration between timeline, suggestion generation, and STKDE
- Risk: Store interactions can break silently
- Priority: High

**Error Boundary Tests:**
- What's not tested: Component error boundaries, worker failure recovery
- Files: UI components with error potential
- Risk: Full app crashes on component errors
- Priority: Medium

**API Route Tests:**
- What's not tested: Most API routes lack comprehensive error case testing
- Files: `src/app/api/` routes
- Risk: API failures not handled gracefully
- Priority: Medium

**Store Concurrency Tests:**
- What's not tested: Concurrent store updates from multiple sources
- Files: Slice domain stores
- Risk: Race conditions in production
- Priority: High

---

*Concerns audit: 2026-03-30*
