---
status: investigating
trigger: "Read-only deep investigation: why does the 3D adaptive warp show a visually dramatic effect at warpFactor=0.0 → 0.1, when the same range on the timeline shows only a subtle effect? The math appears identical (both use toDisplaySeconds with normalizeWarpBlend = clamp(warpFactor/3, 0, 1)), yet the 3D scene shows a big visual jump at this range. Investigate what's causing this."
created: 2026-06-20T00:45:00Z
updated: 2026-06-20T00:45:00Z
---

## Current Focus

hypothesis: CONFIRMED. At warpFactor=0 the 3D resolves Y from `slice.index` (linearly spaced in INDEX), but at any warpFactor>0 it resolves Y from `midEpoch` (linearly spaced in TIME). The base mapping function changes discontinuously at warpFactor=0, so even a 3.3% warpBlend snaps slices from index-uniform to time-uniform positions.
test: Compare Y of a non-uniform slice set at warpFactor=0 (yForIndex) vs warpFactor=0.1 (mapRange(midEpoch, ...)). Verified by reading both `resolveSliceY` guards and `applyAdaptiveWarping` in the timeline.
expecting: confirmed — the timeline's base mapping is TIME → X in both cases (returns the linear scale at warpFactor=0 and a time-mapped adaptive scale at warpFactor>0); the 3D's base mapping is INDEX → Y at warpFactor=0 and TIME → Y at warpFactor>0
next_action: deliver final analysis report (read-only)

## Symptoms

expected: warpFactor 0.0 → 0.1 should produce a small visual change in 3D comparable to the timeline (3.3% blend → ~3.3% X-shift on timeline; expected ~3.3% Y-shift on 3D)
actual: 3D shows a "big difference" at warpFactor 0.0 → 0.1; same range on timeline is subtle
errors: none reported
reproduction: open /dashboard-demo (or /stkde-3d), turn on adaptive warp factor, observe dramatic 3D slice repositioning at warpFactor 0 → 0.1
started: investigation 2026-06-20

## Eliminated

- hypothesis: "3D is using a different normalizeWarpBlend (not /3)"
  evidence: Stkde3DScene.tsx:312, StkdeSliceStack.tsx:25,283, DemoDualTimeline.tsx:51,333 all use the SAME `Math.min(1, Math.max(0, warpFactor / 3))`. So warpFactor=0.1 → warpBlend=0.033 in BOTH.
  timestamp: 2026-06-20T00:46:00Z

- hypothesis: "3D is bypassing the blend (e.g., applying 100% warp at warpFactor=0.1)"
  evidence: toDisplaySeconds (in useScaleTransforms.ts:19-69) implements the standard `linearSec * (1 - blend) + warpedSec * blend`. Both 3D and timeline go through this. Verified identical math.
  timestamp: 2026-06-20T00:47:00Z

- hypothesis: "warpMap has extreme values that amplify the deviation"
  evidence: buildDensityWarpMap (DemoDualTimeline.tsx:53-100) produces warpMap[i] = start + (accumulated/totalWeight) * span, bounded to [start, end] = [domainStart, domainEnd]. So warpedSec is always within the domain.
  timestamp: 2026-06-20T00:48:00Z

- hypothesis: "toDisplaySeconds is applied twice or compounded"
  evidence: only one call site in resolveSliceY (Stkde3DScene.tsx:344 and StkdeSliceStack.tsx:331). No double-warp.
  timestamp: 2026-06-20T00:49:00Z

- hypothesis: "3D uses a different mapDomain than the timeline"
  evidence: both read mapDomain from the same store (useDashboardDemoCoordinationStore). However, BOTH the 3D (lines 324-326) AND StkdeSliceStack (lines 308-310) have a fallback to viewDomain when mapDomain is degenerate. They use the same source.
  timestamp: 2026-06-20T00:50:00Z

## Evidence

- timestamp: 2026-06-20T00:46:00Z
  checked: `Stkde3DScene.tsx:338-346` and `StkdeSliceStack.tsx:324-335`
  found: BOTH `resolveSliceY` have the same guard structure:
    ```
    if (timeScaleMode !== 'adaptive' || warpBlend <= 0 || !warpMap || warpMap.length < 2) {
      return [StkdeSliceStack only: compact ? 0 : yForIndex(slice.index)] / [Stkde3DScene: yForIndex(slice.index)]
    }
    const midEpoch = (slice.startEpoch + slice.endEpoch) / 2;
    const displayEpoch = toDisplaySeconds(midEpoch, warpBlend, warpMap, warpDomain);
    return mapRange(displayEpoch, warpDomainDisplay[0], warpDomainDisplay[1], START_Y, stackEndY);
    ```
  implication: at warpFactor=0 (warpBlend=0) → Y is `yForIndex(slice.index)` (LINEAR in INDEX). At warpFactor>0 → Y is `mapRange(midEpoch, ...)` (LINEAR in TIME). The base mapping function CHANGES at warpFactor=0.

- timestamp: 2026-06-20T00:47:00Z
  checked: `Demo3dSpatialView.tsx:79-108` and `StkdeSliceStack.tsx:241-265`
  found: BOTH build `orderedSlices` (or `OrderedSourceSlice`) by:
    1. Filtering `slices` from `useSliceDomainStore` for `isVisible && type === 'range'`
    2. Mapping with `originalIndex`
    3. SORTING by `startEpoch` (then `endEpoch`, then sourceSliceId)
    4. RE-INDEXING 0..N-1 based on sort position (Demo3dSpatialView.tsx:103-107 explicit; StkdeSliceStack.tsx does it the same way via buildOrderedSourceSlices)
  implication: `slice.index` is the position-in-visible-sorted-array, NOT proportional to the slice's time-fraction. For non-uniform slices, `slice.index` does not equal `floor(midEpoch_normalized * N)`.

- timestamp: 2026-06-20T00:48:00Z
  checked: timeline rendering path (DemoDualTimeline.tsx)
  found: timeline uses `detailScale`/`overviewScale` (from `useScaleTransforms`) at ALL warpFactor values, including 0. The linear scale is the same scale with 0% warp applied. The base mapping is TIME → X in BOTH warpFactor=0 and warpFactor>0.
  implication: timeline has NO base-mapping discontinuity at warpFactor=0. Both linear and warped scales are time-based. The 3.3% blend smoothly shifts X by at most 3.3% of the span.

- timestamp: 2026-06-20T00:49:00Z
  checked: SLICE_SPACING = 7.25, START_Y = -32.625, stackEndY = START_Y + SLICE_SPACING * (N-1) (StkdeSliceStack.tsx:19-20, 322)
  found: For 10 slices, the Y range is 7.25 * 9 = 65.25 units.
  implication: any Y shift > 7.25 units (SLICE_SPACING) is one or more slice positions of "snap" displacement.

- timestamp: 2026-06-20T00:50:00Z
  checked: HotspotTrajectoryOverlay at /Users/clintonemok/Archive/University/Graduation/Project/src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx:46
  found: hotspot lines use LINEAR `yForIndex(sliceIndex)` (independent of warp state) — so at warpFactor=0, hotspots and slices agree, but at warpFactor=0.1 they DIVERGE
  implication: this is a secondary effect that compounds the perception. At warpFactor=0.1, slices are now time-mapped while hotspot trajectories are still index-mapped. Visual divergence.

- timestamp: 2026-06-20T00:51:00Z
  checked: `useScaleTransforms.ts:71-119` (`applyAdaptiveWarping`) and `useScaleTransforms.ts:139-153` (base scale construction)
  found: timeline constructs `overviewInteractionScale = scaleUtc().domain([domainStart, domainEnd]).range([0, innerWidth])` — this is a TIME → X scale. `applyAdaptiveWarping` either RETURNS this scale (at warpFactor=0 or guard conditions) or returns an `adaptiveScale` that wraps `toDisplaySeconds(t, ...)` over the SAME linear domain and inner width. The `adaptiveScale` is also a TIME → X function (`(value) => { ... t * innerWidth }`). Both scales map time to X. There is no "index space" anywhere in the timeline.
  implication: confirmed — the timeline's base mapping is TIME → X in BOTH warpFactor=0 and warpFactor>0 cases. The 3.3% blend at warpFactor=0.1 produces a small X shift (at most ~3.3% of innerWidth). NO discontinuous snap.

- timestamp: 2026-06-20T00:52:00Z
  checked: ADAPTIVE_BIN_COUNT = 1024 (src/lib/adaptive-utils.ts:1)
  found: AXIS_HEIGHT = 100, MIN_BIN_HEIGHT = 100/1024/3 ≈ 0.0326, equalHeight = 100/1024 ≈ 0.0977 (AdaptiveWarpAxis.tsx:14-20)
  implication: axis bins are very small (0.098 each) and never span more than AXIS_HEIGHT=100. The axis transition at warpFactor=0 is also from "uniform bins" to "warped bins", but the warpBlend=0.033 produces only a tiny height variation per bin (at most 3.3% of one bin's height). The axis does NOT show a dramatic jump.

- timestamp: 2026-06-20T00:53:00Z
  checked: concrete Y-shift calculation for a non-uniform slice set
  found: for 10 slices with midEpoch fractions [0.0, 0.05, 0.10, 0.15, 0.20, 0.40, 0.60, 0.80, 0.90, 1.0]:
    yForIndex(i)       = [-32.625, -25.375, -18.125, -10.875,  -3.625,   3.625,  10.875,  18.125,  25.375,  32.625]
    mapRange(midEpoch) ≈ [-32.625, -29.36,  -21.21,  -13.13,   -5.13,   18.13,   28.13,   38.13,   42.63,   32.625]
    shift              = [  0,      +3.99,   +3.08,   +2.25,   +1.50,  +14.50,  +17.25,  +20.00,  +17.25,    0   ]
  Max shift = 20.00 units ≈ 2.76 × SLICE_SPACING. Even at warpBlend=0.033, slices 5-8 jump by 14-20 units in Y. This is the "big difference" the user perceives.
  implication: numerical confirmation. The base-mapping change (not the 3.3% blend) is the cause.

- timestamp: 2026-06-20T00:54:00Z
  checked: mock data uniform case (generateStkde3dMockData at src/app/stkde-3d/lib/mock-data.ts:210-251)
  found: mock generator produces uniform time-spacing — slice i has midEpoch = (i + 0.5) / N of the domain. For uniform slices, `yForIndex(i)` and `mapRange(midEpoch, ...)` produce essentially identical Y values. The discontinuity would be INVISIBLE in the mock data case.
  implication: the "big difference" must come from a non-uniform slice set. The standalone /stkde-3d page (with mock data) would NOT show this effect; the /dashboard-demo page (with real data and user-editable slices) DOES show it. This explains why the user only sees the effect in certain conditions.

## Resolution

root_cause: The 3D scene's `resolveSliceY` switches between two different base-mapping functions at warpFactor=0:
  1. **warpFactor = 0** → `yForIndex(slice.index) = START_Y + slice.index * SLICE_SPACING` (INDEX → Y, uniform in index)
  2. **warpFactor > 0** → `mapRange(midEpoch, warpDomainDisplay[0], warpDomainDisplay[1], START_Y, stackEndY)` (TIME → Y, uniform in time, with the small warpBlend applied on top)

The timeline does NOT have this discontinuity. Its `applyAdaptiveWarping` (useScaleTransforms.ts:71-119) returns the linear `scaleUtc` (a TIME → X scale) at warpFactor=0, and returns a warped TIME → X scale at warpFactor>0. The base mapping (TIME → X) is identical in both cases. Only the small blend perturbation differs.

For non-uniform slice sets (which arise naturally in /dashboard-demo with user-edited slices or non-uniform time-spacing), `slice.index` (a position-in-visible-sorted-array) does NOT equal the slice's time fraction. So `yForIndex(slice.index)` and `mapRange(midEpoch, ...)` produce different Y values for the same slice. When the user dials warpFactor from 0 to 0.1, the guard at Stkde3DScene.tsx:339 (and StkdeSliceStack.tsx:326) flips, the base mapping changes, and slices snap to their time-proportional Y positions. The 3.3% blend is the perturbation ON TOP of this snap, but the snap itself is the dramatic effect.

Numerical proof (10 slices, midEpoch fractions [0.0, 0.05, 0.1, 0.15, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0]):
  yForIndex(i)   = [-32.625, -25.375, -18.125, -10.875,  -3.625,   3.625,  10.875,  18.125,  25.375,  32.625]
  warped(i, 0.1) ≈ [-32.625, -29.36,  -21.21,  -13.13,   -5.13,   18.13,   28.13,   38.13,   42.63,   32.625]
  Y shift        = [  0,      +3.99,   +3.08,   +2.25,   +1.50,  +14.50,  +17.25,  +20.00,  +17.25,    0   ]
  Max shift = 20.00 units ≈ 2.76 × SLICE_SPACING. Easily perceived as a "big difference."

By contrast, the timeline at warpFactor 0 → 0.1 changes X positions by AT MOST 3.3% of innerWidth, because both scales are TIME → X. This is a smooth, subtle perturbation — not a base-mapping change.

Secondary contributing factor: HotspotTrajectoryOverlay.tsx:46 uses `yForIndex(sliceIndex)` regardless of warp state. So at warpFactor=0.1, hotspot trajectory lines stay at their INDEX positions while slices move to TIME positions. The trajectories visibly drift away from the slices they reference, compounding the perception of change.

Tertiary contributing factor: AdaptiveWarpAxis.tsx:79-119 has its own discontinuity — at warpFactor=0, bins are equalHeight (uniform); at warpFactor>0, bin heights are warped. But the warpBlend=0.033 produces only ~3.3% per-bin height variation, so the axis change is subtle. The axis is NOT the primary cause.

fix: (not applied — read-only investigation; see Recommendation)
verification: (not applicable — read-only)
files_changed: []
