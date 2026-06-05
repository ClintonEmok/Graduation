# Codebase Feature Analysis

**Analysis Date:** 2026-06-01

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

Burst scores are **already implemented** and calculated in `burst-taxonomy.ts` via `normalizeScore()`. The `BurstWindow` type in `BurstList.tsx` (line 22) includes `burstScore?: number`. The scoring is:
- 0-100 normalized score based on value, count, and duration
- Combined with `burstClass` ('prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral')
- Includes `burstConfidence` from `deriveBurstConfidence()`

---

## 2. Clustering

### File Paths

**Cluster store:**
- `src/store/useClusterStore.ts` - Basic cluster state management (clusters array, enabled, sensitivity, selectedClusterId)

**Spatial/temporal clustering:**
- `src/lib/clustering/cluster-analysis.ts` - DBSCAN clustering via `density-clustering` package
  - `analyzeClusters(points, sensitivity, minPoints)` - Executes DBSCAN, returns clusters with bounds, type counts, centers
  - `readNoiseIndexes(dbscan)` - Extracts noise points (private property access)

**STKDE (Space-Time Kernel Density Estimation) hotspot computation:**
- `src/lib/stkde/compute.ts` - Computes hotspots from crime records
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

### Clustering Implementation: PARTIAL with DBSCAN

**What's implemented:**
- DBSCAN from `density-clustering` IS used (in `cluster-analysis.ts`, line 1: `import { DBSCAN } from 'density-clustering'`)
- `analyzeClusters()` wraps DBSCAN with 3D projection `[x, y*0.5, z]` (y halved to reduce temporal influence)
- STKDE for spatial hotspot detection
- Cluster store manages computed clusters
- `clusterSlices()` clusters visual time slices, not crime events

**What's NOT implemented (despite DBSCAN existing):**
- No user-facing controls for DBSCAN epsilon or minPoints
- No cluster visualization toggle
- No cluster quality metrics shown to user
- No cluster extraction from STKDE results into labeled groups

### Missing for True Clustering

1. UI controls for DBSCAN parameters (epsilon, minPoints)
2. Cluster member assignment in UI
3. Multi-dimensional clustering visualization
4. Cluster quality display (silhouette score)
5. Cluster visualization toggle

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
- `src/components/viz/CrimeCategoryLegend.tsx` - Color-coded category legend
- `src/components/map/MapTypeLegend.tsx` - Map crime type legend
- `src/components/map/MapDistrictLegend.tsx` - District legend
- `src/components/map/MapPoiLegend.tsx` - POI legend

**Crime record type:**
- `src/types/crime.ts`
  - `CrimeRecord.type: string` - Crime category field

**Category shapes (NEW - Phase 75+):**
- `src/lib/category-shapes.ts` - Shape definitions per crime type
- `src/lib/category-legend.ts` - Legend integration

### Current Implementation

- **Colors:** Full color mapping per crime type in palettes.ts with theme support
- **Legend:** SimpleCrimeLegend shows 6 types (THEFT, ASSAULT, BURGLARY, ROBBERY, VANDALISM, OTHER)
- **Shapes:** Implemented in `category-shapes.ts` with per-crime-type shape definitions
- **Filtering:** NOT implemented - legend is display-only, no click-to-filter

### Missing for Categories

1. **Legend incomplete** - Hardcoded 6 types but `CRIME_TYPE_MAP` has 33
2. **No click-to-filter** - Legend items cannot be clicked to filter map/timeline
3. **No category aggregation** - Cannot group crimes by type in visualizations
4. **Missing category filter UI** - No dropdown/panel to select crime types to show

---

## Summary Table

| Feature | Status | Key Files | Missing |
|---------|--------|-----------|---------|
| **Burst Detection** | ✅ Complete | `burst-taxonomy.ts`, `interval-detection.ts`, `confidence-scoring.ts` | Nothing critical |
| **Burst Scores** | ✅ Implemented | `BurstList.tsx`, `burst-taxonomy.ts` | Already exists |
| **Clustering (spatial)** | ⚠️ Partial | `cluster-analysis.ts`, `useClusterStore.ts` | No UI controls for DBSCAN params |
| **DBSCAN Implementation** | ✅ Present | `cluster-analysis.ts` uses density-clustering | Quietly imported, works |
| **Time Slice Clustering** | ✅ Basic | `slice-geometry.ts:clusterSlices()` | Groups slices only, not crime events |
| **Category Colors** | ✅ Complete | `palettes.ts` | Themes + 33 types mapped |
| **Category Shapes** | ✅ Implemented | `category-shapes.ts` | Per-crime-type shape definitions |
| **Category Legend** | ⚠️ Incomplete | `SimpleCrimeLegend.tsx` | Hardcoded 6 types, no interaction |
| **Category Filtering** | ❌ Missing | - | No click-to-filter, no dropdown |

---

*Feature analysis: 2026-06-01*
