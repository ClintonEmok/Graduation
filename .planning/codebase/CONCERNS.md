# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**DualTimeline monolith:**
- Issue: One component holds rendering + interaction + store synchronization + data selection logic.
- Files: `src/components/timeline/DualTimeline.tsx`
- Impact: High regression risk for brush/zoom/scrub changes; difficult to test and review.
- Fix approach: Extract independent hooks/modules for (1) scale transforms, (2) brush/zoom sync, (3) point selection, (4) density strip derivation.

**Deprecated data store still active in flow:**
- Issue: `useDataStore` is marked deprecated but is still required for timeline and timeslicing parity.
- Files: `src/store/useDataStore.ts`, `src/app/timeslicing/page.tsx`, `src/components/timeline/DualTimeline.tsx`
- Impact: Confusing ownership between React Query and store data; duplicate sources of truth.
- Fix approach: Define one canonical timeline input contract and remove deprecated pathways incrementally.

**Suggestion trigger path duplication:**
- Issue: Legacy mock trigger hook remains alongside real generator hook.
- Files: `src/hooks/useSuggestionTrigger.ts`, `src/hooks/useSuggestionGenerator.ts`
- Impact: Future contributors may attach UI to outdated mock path.
- Fix approach: Remove or clearly deprecate `useSuggestionTrigger.ts` and keep one workflow entry.

## Known Bugs

**Double buffering in crimes range pipeline:**
- Symptoms: Queried range is expanded twice (client-side in hook and server-side in route default buffer logic).
- Files: `src/hooks/useCrimeData.ts`, `src/app/api/crimes/range/route.ts`
- Trigger: Any `useCrimeData` call with non-zero `bufferDays` (hook pre-buffers; API applies buffer again).
- Workaround: Set `bufferDays: 0` at hook call sites until one layer is made authoritative.

**Coordinate normalization mismatch across APIs:**
- Symptoms: Different endpoints return incompatible x/z scales.
- Files: `src/app/api/crimes/range/route.ts`, `src/app/api/crime/stream/route.ts`
- Trigger: Mixing data from range API (`x/z` in `[-50,50]`) and stream API (`x/z` near `[0,1]` style formulas).
- Workaround: Normalize in one adapter before mixing datasets.

## Security Considerations

**String-built SQL queries:**
- Risk: Dynamic SQL string construction is used broadly.
- Files: `src/lib/queries.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/stream/route.ts`
- Current mitigation: Some manual escaping for filter values in `src/lib/queries.ts`.
- Recommendations: Centralize sanitized query builders and avoid direct interpolation where possible.

## Performance Bottlenecks

**High-frequency logging in client paths:**
- Problem: Large objects and repetitive logs execute during interactive usage.
- Files: `src/components/layout/TopBar.tsx`, `src/hooks/useCrimeData.ts`, `src/components/viz/DataPoints.tsx`
- Cause: Debug `console.log` left in render/interaction code.
- Improvement path: Gate logs behind feature flags or remove in production path.

**Large detail point mapping inside timeline render cycle:**
- Problem: Repeated filtering/subsampling and SVG circle rendering for dense ranges.
- Files: `src/components/timeline/DualTimeline.tsx`
- Cause: Derivations and rendering occur in one large component with broad dependencies.
- Improvement path: Memoize by stable signatures, reduce re-renders via selector granularity, and consider canvas for dense point layers.

## Fragile Areas

**Data path contract divergence:**
- Files: `src/lib/db.ts`, `src/app/api/crime/facets/route.ts`, `scripts/setup-data.js`, `data/README.md`
- Why fragile: CSV path (`data/sources/...csv`) and parquet path (`data/crime.parquet`) assumptions are inconsistent across modules.
- Safe modification: Choose one canonical ingestion path and update all API/data docs together.
- Test coverage: No integration tests validate end-to-end data-file contract.

**Timeslicing parity bridge relies on manual store mirroring:**
- Files: `src/app/timeslicing/page.tsx`
- Why fragile: Page-level effect writes into `useDataStore` and triggers adaptive compute solely for `DualTimeline` compatibility.
- Safe modification: Introduce shared adapter hook for timeline input instead of route-local state mutation.
- Test coverage: No tests on this mirroring effect.

## Scaling Limits

**Range API response sizing:**
- Current capacity: `limit` default 50,000 with optional sampling (`sampleStride`) in `/api/crimes/range`.
- Limit: Large windows can become sampled or heavy in client memory/rendering.
- Scaling path: Add paged window loading or server-side aggregation endpoints for timeline-only consumers.

**Mock fallback cardinality mismatch:**
- Current capacity: Mock range returns up to 2,000 records even if client requests 50,000.
- Limit: Behavior diverges from real-data path and can hide scaling issues.
- Scaling path: Align mock generation controls with real route limits and metadata semantics.

## Dependencies at Risk

**Native DuckDB binding wiring:**
- Risk: `postinstall` symlink workaround is ABI/path-sensitive.
- Files: `package.json` (`postinstall`), `next.config.ts`
- Impact: Install/runtime failures on environments that differ from expected `duckdb` binding layout.
- Migration plan: Validate against current DuckDB package guidance or move heavy querying behind stable service boundary.

## Missing Critical Features

**Suggestion workflow persistence and apply path:**
- Problem: Suggestions can be accepted/rejected in store but there is no durable persistence or direct apply-to-slice pipeline.
- Blocks: End-to-end semi-automated timeslicing flow completion.
- Files: `src/store/useSuggestionStore.ts`, `src/app/timeslicing/components/SuggestionCard.tsx`

**Mode switching implementation in generator:**
- Problem: `mode` is fixed to `'manual'`; `setMode` is a no-op.
- Blocks: Planned automatic/on-demand generation behavior.
- Files: `src/hooks/useSuggestionGenerator.ts`

## Test Coverage Gaps

**`useCrimeData` + `/api/crimes/range` contract:**
- What's not tested: Buffering semantics, metadata shape, filter parameter handling end-to-end.
- Files: `src/hooks/useCrimeData.ts`, `src/app/api/crimes/range/route.ts`
- Risk: Silent drift between client assumptions and server response behavior.
- Priority: High

**Suggestion algorithms and store integration:**
- What's not tested: Confidence scoring behavior, boundary detection quality, suggestion status lifecycle.
- Files: `src/lib/confidence-scoring.ts`, `src/lib/interval-detection.ts`, `src/lib/warp-generation.ts`, `src/hooks/useSuggestionGenerator.ts`, `src/store/useSuggestionStore.ts`
- Risk: Unreliable suggestions during upcoming phase work.
- Priority: High

**Timeline interaction regressions:**
- What's not tested: Brush/zoom sync, adaptive axis inversion, selection behavior under warped scales.
- Files: `src/components/timeline/DualTimeline.tsx`, `src/app/timeline-test/page.tsx`
- Risk: Breaks are only discovered manually.
- Priority: High

---

*Concerns audit: 2026-02-26*
