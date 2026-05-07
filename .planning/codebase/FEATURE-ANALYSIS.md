# Codebase Feature Analysis

**Analysis Date:** 2026-05-06

---

## 1. Burst Detection

### File Paths and Key Functions

**Core burst taxonomy:**
- `src/lib/binning/burst-taxonomy.ts`
  - `classifyBurstWindow(input: BurstTaxonomyInput): BurstTaxonomyResult` - Main classification function
  - `deriveBurstConfidence(input, burstClass, neighbors)` - Confidence derivation
  - `normalizeScore(value, count, durationSec, neighbors)` - Internal scoring (0-100)
  - `BurstTaxonomyResult` includes: `burstClass`, `burstScore`, `burstConfidence`, `burstRuleVersion`, `burstProvenance`, `rationale`

**Boundary detection (interval boundaries):**
- `src/lib/interval-detection.ts`
  - `detectBoundaries(crimes, timeRange, options): BoundarySuggestion` - Main entry point
  - `detectPeaks(densityBins, sensitivity)` - Peak-based boundary detection
  - `detectChangePoints(densityBins, sensitivity)` - Change-point detection
  - `applyRuleBased(densityBins, boundaryCount)` - Equal-division boundaries
  - `snapToBoundary(epoch, unit)` - Snap to hour/day boundaries

**Confidence scoring:**
- `src/lib/confidence-scoring.ts`
  - `calculateConfidence({ crimes, timeRange, densityBins?, weights? }): number` - Composite 0-100 score
  - `calculateDataClarity(crimes, timeRange)` - Clarity component
  - `calculateCoverage(crimes, timeRange)` - Coverage component
  - `calculateStatisticalConfidence(densityBins)` - Statistical component

**Burst window building:**
- `src/components/viz/BurstList.tsx`
  - `buildBurstWindowsFromSeries({ densityMap, burstinessMap, countMap, ... })` - Builds `BurstWindow[]` from series data
  - `BurstWindow` type includes `burstClass`, `burstScore`, `burstConfidence`, `burstRationale`

**Demo burst generation:**
- `src/components/dashboard-demo/lib/demo-burst-generation.ts`
  - Uses `classifyBurstWindow` from burst-taxonomy.ts
  - Generates synthetic burst data for demos

### Burst Scores: EXIST

Burst scores are **already implemented** and calculated in `burst-taxonomy.ts` via `normalizeScore()`. The `BurstWindow` type in `BurstList.tsx` (line 30) includes `burstScore?: number`. The scoring is:
- 0-100 normalized score based on value, count, and duration
- Combined with `burstClass` ('prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral')
- Includes `burstConfidence` from `deriveBurstConfidence()`

---

## 2. Clustering

### File Paths

**Cluster store:**
- `src/store/useClusterStore.ts` - Basic cluster state management (clusters array, enabled, sensitivity, selectedClusterId)

**Spatial/temporal clustering:**
- `src/lib/stkde/compute.ts` - STKDE (Space-Time Kernel Density Estimation) hotspot computation
  - `computeStkdeFromCrimes(request, crimes)` - Computes hotspots from crime records
  - `computeStkdeFromAggregates(request, inputs)` - Computes from pre-aggregated data
  - `buildStkdeGridConfig(request)` - Grid configuration
  - Returns `StkdeHotspot[]` with centroid, intensityScore, supportCount, peak time window

**Time slice clustering:**
- `src/lib/slice-geometry.ts`
  - `clusterSlices(slices, gapThreshold)` - Groups TimeSlice objects by temporal gap

**Binning engine:**
- `src/lib/binning/engine.ts`
  - `generateCrimeTypeBins()` - Groups events by crime type (not spatial clustering)
  - `generateBurstinessBins()` - Groups by inter-arrival time

### Clustering Implementation: PARTIAL

**What's implemented:**
- STKDE for **spatial hotspot detection** (not traditional clustering)
- Cluster store exists but is minimal - just holds computed clusters
- `clusterSlices()` only clusters visual time slices, not crime events

**What's NOT implemented (despite `density-clustering` in package.json):**
- **No actual use of `density-clustering` package** - The package is listed but no imports found
- No DBSCAN, OPTICS, or similar spatial clustering algorithm
- No crime event clustering by spatial proximity
- No cluster extraction from STKDE results into labeled groups

### Missing for True Clustering

1. Integration of `density-clustering` package (appears unused)
2. DBSCAN or similar for crime event clustering
3. Cluster centroid computation, cluster member assignment
4. Multi-dimensional clustering (space-time together)
5. Cluster visualization layer

---

## 3. Category Handling

### File Paths

**Palettes and colors:**
- `src/lib/palettes.ts`
  - `PALETTES: Record<Theme, Palette>` - dark, light, colorblind themes
  - `OKABE_ITO` - Colorblind-safe palette
  - `DEFAULT_CATEGORY_COLORS` - Maps crime types to hex colors (THEFT: gold, BATTERY: amber, etc.)
  - `COLORBLIND_CATEGORY_COLORS` - Okabe-Ito based colors
  - `LIGHT_CATEGORY_COLORS` - Darker variants for light backgrounds

**Category mappings:**
- `src/lib/category-maps.ts`
  - `CRIME_TYPE_MAP` - Maps crime type strings to IDs (33 types)
  - `getCrimeTypeId(type)` / `getCrimeTypeName(id)` - Conversions
  - `CHICAGO_DISTRICT_NAMES` - District display names
  - `DISTRICT_MAP` / `getDistrictId()` / `getDistrictName()`

**Legend components:**
- `src/components/viz/SimpleCrimeLegend.tsx` - 2-column legend with 6 hardcoded crime types
- `src/components/map/MapTypeLegend.tsx` - Map crime type legend
- `src/components/map/MapDistrictLegend.tsx` - District legend
- `src/components/map/MapPoiLegend.tsx` - POI legend

**Crime record type:**
- `src/types/crime.ts`
  - `CrimeRecord.type: string` - Crime category field

### Current Implementation

- **Colors:** Full color mapping per crime type in palettes.ts with theme support
- **Legend:** SimpleCrimeLegend shows 6 types (THEFT, ASSAULT, BURGLARY, ROBBERY, VANDALISM, OTHER)
- **Shapes:** NOT implemented - no marker shapes per category
- **Filtering:** NOT implemented - legend is display-only, no click-to-filter

### Missing for Categories

1. **Legend incomplete** - Hardcoded 6 types but `CRIME_TYPE_MAP` has 33
2. **No click-to-filter** - Legend items cannot be clicked to filter map/timeline
3. **No shapes** - Crimes rendered as same marker shape regardless of type
4. **No category aggregation** - Cannot group crimes by type in visualizations
5. **Missing category filter UI** - No dropdown/panel to select crime types to show

---

## Summary Table

| Feature | Status | Key Files | Missing |
|---------|--------|-----------|---------|
| **Burst Detection** | ✅ Complete | `burst-taxonomy.ts`, `interval-detection.ts`, `confidence-scoring.ts` | Nothing critical |
| **Burst Scores** | ✅ Implemented | `BurstList.tsx`, `burst-taxonomy.ts` | Already exists |
| **Clustering (spatial)** | ⚠️ Partial | `stkde/compute.ts`, `useClusterStore.ts` | density-clustering unused, no DBSCAN |
| **Time Slice Clustering** | ✅ Basic | `slice-geometry.ts:clusterSlices()` | Groups slices only, not crime events |
| **Category Colors** | ✅ Complete | `palettes.ts` | Themes + 33 types mapped |
| **Category Legend** | ⚠️ Incomplete | `SimpleCrimeLegend.tsx` | Hardcoded 6 types, no interaction |
| **Category Filtering** | ❌ Missing | - | No click-to-filter, no dropdown |
| **Category Shapes** | ❌ Missing | - | All crimes same marker shape |