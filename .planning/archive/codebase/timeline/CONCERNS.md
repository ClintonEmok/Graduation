# Codebase Concerns - Timeline & Visualization

**Analysis Date:** 2026-03-30

## Performance Concerns

### Point Subsampling Limit
**Issue:** Hardcoded 4000 point limit in detail view
- **File:** `src/components/timeline/DualTimeline.tsx` (lines 297-311)
- **Impact:** Visual accuracy degrades for dense time ranges
- **Fix approach:** Make configurable or use adaptive sampling based on pixel density

### Viewport Crime Data Loading
**Issue:** Viewport-based fetching may cause visible loading states
- **File:** `src/components/timeline/DualTimeline.tsx` (lines 196-198)
- **Impact:** Initial load shows first year only; panning triggers fetches
- **Mitigation:** 30-day buffer to reduce re-fetch frequency

### Density Map Recomputation Threshold
**Issue:** `DETAIL_DENSITY_RECOMPUTE_MAX_DAYS = 60` forces binning for ranges > 60 days
- **File:** `src/components/timeline/hooks/useDensityStripDerivation.ts` (line 5)
- **Impact:** Loses granularity for medium-length time ranges
- **Fix approach:** Consider adaptive threshold based on visible pixels

### Adaptive Warping Computation
**Issue:** Binary search in `toLinearSeconds` runs 24 iterations per invert
- **File:** `src/components/timeline/hooks/useScaleTransforms.ts` (lines 58-68)
- **Impact:** May cause jank during zoom/pan with adaptive mode
- **Fix approach:** Cache inverse or use analytical inverse where possible

## Memory Concerns

### Float32Array Density Maps
- **Status:** Properly using typed arrays for density storage
- **Concern:** Multiple copies may exist (store + derived + computed)

### SVG Element Count
- **Issue:** Large number of SVG elements for dense data
- **Example:** Each point in detail view is a `<circle>` element
- **Impact:** Browser may struggle with 1000+ elements
- **Fix approach:** Already mitigated via binning for large datasets

## Code Quality Concerns

### DualTimeline Component Size
- **Issue:** 1245 lines is a very large single component
- **File:** `src/components/timeline/DualTimeline.tsx`
- **Impact:** Hard to maintain, test, understand
- **Fix approach:** Extract more sub-components (e.g., TimelineTrack, CursorLayer, SelectionLayer)

### Hardcoded Color Values
- **Issue:** Colors defined as constants but not themeable
- **File:** `src/components/timeline/DualTimeline.tsx` (lines 48-61)
- **Fix approach:** Use CSS custom properties or theme context

### Magic Numbers
- **Issue:** Multiple hardcoded values throughout
- **Examples:** `OVERVIEW_HEIGHT = 42`, `DETAIL_HEIGHT = 60`, `AXIS_HEIGHT = 28`
- **Fix approach:** Extract to named constants or configuration

## Testing Gaps

### Limited Component Tests
- **Issue:** Most tests are for utility functions, not React components
- **Coverage gap:** `DualTimeline`, `DensityHeatStrip`, `TemporalPatternChart`
- **Fix approach:** Add more integration tests with testing-library

### No Visual Regression Tests
- **Impact:** Style changes may break timeline rendering
- **Fix approach:** Consider screenshot-based testing for critical paths

### Hook Testing
- **Good:** `useScaleTransforms`, `useDensityStripDerivation` have unit tests
- **Missing:** Tests for `useBrushZoomSync`, `usePointSelection`

## Accessibility Concerns

### Missing ARIA Labels
- **Issue:** Some interactive elements lack proper ARIA attributes
- **File:** `src/components/timeline/DualTimeline.tsx`
- **Current:** Has `aria-busy`, `aria-label` on canvas
- **Fix approach:** Add more descriptive ARIA labels for screen readers

### Keyboard Navigation
- **Issue:** Timeline may not be fully keyboard accessible
- **Impact:** Users cannot navigate timeline via keyboard
- **Fix approach:** Add keyboard handlers for cursor movement

## Potential Bugs

### Edge Case: Empty Data
- **Status:** Components handle empty data with `!data?.length` checks
- **Concern:** Loading states may flash briefly

### Edge Case: Zero Width
- **Status:** Protected with `Math.max(0, width)`
- **Concern:** Margins may produce negative inner width

### Edge Case: Infinite Values
- **Status:** Protected with `Number.isFinite()` checks
- **Concern:** NaN handling in scale inversions

---

*Concerns audit: 2026-03-30*
