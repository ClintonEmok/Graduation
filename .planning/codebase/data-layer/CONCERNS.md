# Data Layer Concerns

**Analysis Date:** 2026-03-30

## Query Invalidation

**Issue:** No explicit query invalidation patterns found
- Current approach relies on query key changes
- No `invalidateQueries` or `refetchQueries` calls in codebase
- Manual refresh not possible without page reload

**Impact:** Users cannot refresh data on demand
**Fix approach:** Add `useQueryClient` hooks for manual invalidation

## Mock Data Dependency

**Issue:** Mock data enabled by default
- `.env` has `USE_MOCK_DATA=false` but this is unusual
- Most development/testing happens with mock data
- Production behavior may differ from development

**Impact:** Production database integration may have undetected issues
**Fix approach:** Document expected production configuration

## Type Duplication

**Issue:** CrimeRecord type defined in multiple places
- `src/types/crime.ts` - Primary type definition
- `src/lib/queries/types.ts` - Duplicated definition
- `src/lib/data/types.ts` - Different internal format

**Impact:** Potential for type mismatches
**Fix approach:** Consolidate to single source of truth

## Error Handling Inconsistency

**Issue:** Different error handling approaches
- Some places throw errors, others return empty arrays
- API routes return different error structures
- Console.log usage varies (some with prefixes, some without)

**Impact:** Debugging difficulty, inconsistent user experience
**Fix approach:** Standardize error handling pattern

## Streaming Implementation

**Issue:** `useCrimeStream` hook is basic
- Uses `any` types for batch data
- No progress indication
- No cancellation mechanism

**Location:** `src/hooks/useCrimeStream.ts`
**Impact:** Limited observability into streaming operations
**Fix approach:** Add typed callbacks and progress state

## Query Key Stability

**Issue:** Potential for unstable query keys
- Array-based keys with objects (crimeTypes, districts)
- Objects may be recreated on each render
- Though `useCrimeData` has test for stability

**Current mitigation:** Test exists at `src/hooks/useCrimeData.test.ts:236`
**Concern:** May regress if not carefully maintained

## Large Data Handling

**Issue:** No pagination in current API
- Default limit: 50,000 records
- Can request up to 200,000 with sampling
- No cursor-based pagination for large datasets

**Impact:** Memory pressure with large date ranges
**Fix approach:** Implement pagination for large requests

## Cache Configuration

**Issue:** Cache times are relatively short
- staleTime: 5 minutes
- gcTime: 10 minutes
- No persistent caching across sessions

**Impact:** Users may re-fetch same data after navigation
**Fix approach:** Consider longer staleTime for stable data

## Test Coverage Gaps

**Untested areas:**
- `useCrimeStream` hook - no tests
- `useSliceStats` hook - no tests  
- `useSuggestionGenerator` - partial test coverage
- API routes - limited integration tests
- Database query functions - mocked in tests

**Risk:** Breaking changes may go unnoticed
**Priority:** Medium - Add tests for critical paths

## Performance Concerns

**Issue:** Columnar data transformation in main thread
- `ColumnarData` created synchronously
- Can block UI with large datasets

**Location:** `src/lib/data/selectors.ts`
**Impact:** UI freeze with >100k records
**Fix approach:** Move transformation to Web Worker

---

*Concerns audit: 2026-03-30*
