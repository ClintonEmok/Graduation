---
status: diagnosed
trigger: "Read-only investigation: how can the 3D adaptive warp scene behave more like the timeline (DemoDualTimeline)? Focus on identifying the exact gaps and proposing a concrete alignment plan."
created: 2026-06-20T00:00:00Z
updated: 2026-06-20T00:30:00Z
---

## Current Focus

hypothesis: 3D scene applies warp per-slice via `resolveSliceY`, but several components silently bypass the warp and at least one is not even using its `resolveSliceY` prop
test: traced `resolveSliceY` definition, all call sites, and `warpDomainDisplay` use
expecting: confirmed — found two real bugs and three design inconsistencies
next_action: deliver gap analysis report (read-only)

## Symptoms

expected: 3D slices, raw events, hotspot trajectories, axis bins, and volume slabs should all reflect the warped timeline such that bursty intervals stretch and sparse intervals compress
actual: slices + raw events are warped per-point; hotspot trajectories remain linear; warp math is duplicated across 3 files; standalone /stkde-3d has a fragile warpDomain fallback
errors: none reported
reproduction: open /dashboard-demo (or /stkde-3d), turn on adaptive warp factor
started: investigation 2026-06-20

## Eliminated

- hypothesis: "3D scene applies warp to the domain range only, not per-slice"
  evidence: `Stkde3DScene.resolveSliceY` (line 338-346) and `StkdeSliceStack.resolveSliceY` (line 324-335) both call `toDisplaySeconds(midEpoch, …)` per slice, then `mapRange` to Y
  timestamp: 2026-06-20T00:25:00Z

- hypothesis: "AdaptiveWarpAxis uses linear bin positions"
  evidence: positions are computed cumulatively from warped bin heights (`previousTop + binHeight/2` in `AdaptiveWarpAxis.tsx:107-111`), which is mathematically equivalent to a per-tick warp
  timestamp: 2026-06-20T00:28:00Z

- hypothesis: "Volume thickness needs to be warped to match timeline"
  evidence: thickness is a presentation concern (linear seconds → 3D thickness unit). Timeline width IS warped, but timeline has no 3D thickness analog. Not a strict bug.
  timestamp: 2026-06-20T00:30:00Z

## Evidence

- timestamp: 2026-06-20T00:20:00Z
  checked: `Stkde3DScene.tsx:295-354` (the main `Stkde3DScene` export)
  found:
    - Reads `warpFactor`, `warpMap`, `timeScaleMode`, `mapDomain` from `useDashboardDemoCoordinationStore` (lines 309-313)
    - `warpBlend = normalizeWarpBlend(warpFactor)` (line 312) — i.e. `warpFactor / 3` clamped to [0,1]
    - `warpDomain` falls back to viewport range when `mapDomain` is degenerate (lines 324-326)
    - `warpDomainDisplay` is computed once for the overall range via `toDisplaySeconds` (lines 327-336)
    - `resolveSliceY` (lines 338-346) DOES warp per-slice:
      - guard: `timeScaleMode === 'adaptive' && warpBlend > 0 && warpMap?.length >= 2`
      - per-slice math: `midEpoch = (start + end)/2`; `displayEpoch = toDisplaySeconds(midEpoch, …)`; `y = mapRange(displayEpoch, warpDomainDisplay[0], warpDomainDisplay[1], START_Y, stackEndY)`
    - `yToEpoch` (lines 348-354) provides the inverse via bisection (24 iters) through `toLinearSeconds`
  implication: 3D scene has the per-slice warp math correct, but it lives in the wrong place (lives in the parent and is duplicated, not all children consume it)

- timestamp: 2026-06-20T00:21:00Z
  checked: `StkdeSliceStack.tsx:268-845` (the slice mesh component)
  found:
    - Re-reads `warpFactor`, `warpMap`, `timeScaleMode`, `mapDomain` from the same store (lines 280-284)
    - DUPLICATES the `warpDomainDisplay` computation (lines 308-320) — same code as `Stkde3DScene` lines 327-336
    - DUPLICATES the `resolveSliceY` (lines 324-335) — same code as `Stkde3DScene` lines 338-346
    - DUPLICATES the `yToEpoch` (lines 348-358)
    - Receives NO `resolveSliceY` prop from its parent (`Stkde3DScene` line 259-266 mounts it without `resolveSliceY`)
    - Uses the duplicated `resolveSliceY` for: slice `position={[0, y, 0]}` (line 624), drag `centerY` (line 440), drag preview (line 452)
    - Uses linear `yForIndex(slice.index)` only in the `compact === true && warp-off` branch (line 327) — this is the focused-view fallback
  implication: the 3D scene's slice positions ARE warped, but the warp logic is duplicated and the parent never passes its own `resolveSliceY` down

- timestamp: 2026-06-20T00:22:00Z
  checked: `Stkde3DScene.tsx:148-196` (`RawEventPoints`)
  found:
    - Receives `resolveSliceY` as a prop (line 152-154)
    - Uses it correctly: `const y = resolveSliceY(slice) + 0.15` (line 167)
  implication: raw event dots ARE warped consistently with the slice meshes

- timestamp: 2026-06-20T00:23:00Z
  checked: `HotspotTrajectoryOverlay.tsx:1-82`
  found:
    - Interface declares `resolveSliceY` as a prop (line 14-15)
    - Destructuring at line 19 ONLY takes `slices`, `sliceResults`, `viewMode` — `resolveSliceY` is NOT destructured
    - Line 46: `const y = yForIndex(sliceIndex) + 0.38;` — uses LINEAR Y, ignoring the warp
    - Parent (`Stkde3DScene.SceneContent` lines 268-273) DOES pass `resolveSliceY={resolveSliceY}` to it — but the prop is dead
  implication: hotspot trajectory lines and points stay at their linear Y while the slices warp above/below them. As warp factor increases, trajectories visibly drift away from the slices they reference. This is a real visual divergence.

- timestamp: 2026-06-20T00:24:00Z
  checked: `AdaptiveWarpAxis.tsx:55-161` (the warped Y axis)
  found:
    - Reads `densityMap`, `warpMap`, `timeScaleMode`, `warpFactor`, `mapDomain` from store (lines 57-62)
    - Computes its own `warpDomainDisplay` (lines 68-77) — third copy of the same math
    - For each of `ADAPTIVE_BIN_COUNT = 1024` bins:
      - `boundaryStart`, `boundaryEnd` come from LINEAR domain (lines 88-89)
      - `displayedStart`, `displayedEnd` come from `toDisplaySeconds` (warped) (lines 95-100)
      - `binHeight` = `(displayedEnd - displayedStart) / totalDisplaySpan * AXIS_HEIGHT` (line 102-103)
      - `centerY` is cumulative: `previousTop + binHeight / 2` (lines 105-111)
    - Renders via `InstancedMesh` with per-instance matrix and color (lines 121-143)
  implication: axis bin positions ARE warped (through the cumulative height trick), and density values drive both color and bin height. Mathematically equivalent to a per-tick warp like the timeline. NOT a bug. BUT the warp math is duplicated a third time.

- timestamp: 2026-06-20T00:25:00Z
  checked: `useScaleTransforms.ts:19-69`
  found:
    - `toDisplaySeconds(linearSec, warpFactor, warpMap, warpDomain)` = `linearSec * (1 - warpFactor) + sampleWarpSeconds(linearSec, warpMap, warpDomain) * warpFactor`
    - `sampleWarpSeconds` does linear-interpolated lookup of `warpMap` based on `linearSec` normalized into `warpDomain` (clamped to [0,1])
    - `toLinearSeconds` is a 24-iteration bisection that inverts `toDisplaySeconds` over a given linear domain
  implication: the 3D scene's per-slice math is using the same primitive the timeline uses. The blend math is identical.

- timestamp: 2026-06-20T00:26:00Z
  checked: `DemoDualTimeline.tsx:175-825`
  found:
    - Reads `timeScaleMode`, `warpFactor`, `warpMap`, `mapDomain` from the SAME store (lines 206-211)
    - `effectiveWarpFactor` (line 332) and `effectiveWarpBlend = normalizeWarpBlend(effectiveWarpFactor)` (line 333) — same `warpFactor / 3` pattern as 3D
    - `effectiveWarpMap` (line 330) supports TWO sources: density (store precomputed) OR slice-authored (`buildDemoSliceAuthoredWarpMap`)
    - Calls `useScaleTransforms` to get `overviewScale`, `detailScale`, `overviewInteractionScale`, `detailInteractionScale` (line 387-419)
    - Uses `detailScale(date)` for: cursor X, selection X, slice box left/width, pending generated bin geometry, tick X position
    - Uses `overviewScale(date)` for: strip selection, overview bin rects, user warp overlay bands, overview tick X positions
  implication: timeline warps EVERY visible x position (data points, slices, ticks, cursor, selection, brush selection) through the same `detailScale` / `overviewScale` functions. No per-component drift.

- timestamp: 2026-06-20T00:27:00Z
  checked: `DualTimelineSurface.tsx:266-273` (the tick render)
  found:
    - `overviewTicks` come from `useDualTimelineViewModel` which builds them from the LINEAR base scale (line 81-103 of useDualTimelineViewModel.ts)
    - Tick VALUES are linear (uniform), tick POSITIONS are warped via `overviewScale(tick)` (DualTimelineSurface line 267)
  implication: confirms user's analysis — timeline's ticks have linear VALUES but warped POSITIONS. AdaptiveWarpAxis achieves the same effect via the cumulative-height trick.

- timestamp: 2026-06-20T00:28:00Z
  checked: `useDashboardDemoCoordinationStore.ts:188-425` (default state and setters)
  found:
    - `warpFactor: 0` default, clamped to [0, 3] by `setWarpFactor` (line 371)
    - `timeScaleMode: 'linear'` default (line 217)
    - `warpSource: 'density'` default (line 218)
    - `mapDomain: [0, 100]` default (line 222) — NOT the actual data range
    - `warpMap: null` default (line 221) — must be populated via `setPrecomputedMaps`
    - `setPrecomputedMaps` is called from `DemoDualTimeline.tsx:322-325`, populating `warpMap` and `mapDomain = [minTimestampSec, maxTimestampSec]`
  implication: in the standalone /stkde-3d page, `mapDomain` stays at the default `[0, 100]` because the page never calls `setPrecomputedMaps`. Slice epochs are real timestamps (1.5e9 scale), so the warp math effectively clamps to boundary. Without an explicit warpMap the guard at line 339 short-circuits, so the 3D scene is linear in standalone mode. With a parent-provided warpMap, the warp would be a no-op (all slices clamped to same Y).

- timestamp: 2026-06-20T00:29:00Z
  checked: `Demo3dSpatialView.tsx:54-324` (parent in /dashboard-demo)
  found:
    - Builds `orderedSlices` with `startEpoch`/`endEpoch` from `useSliceDomainStore` (lines 79-108)
    - Uses `useTimelineDataStore.minTimestampSec` / `maxTimestampSec` for epoch range
    - Fetches crime data per slice via `/api/crimes/range` (lines 110-170)
    - Computes `sliceKdes` via `kdeSlice.worker.ts` (lines 191-244)
    - Computes `volumeProfile` via `buildDurationVolumeProfile` from `volume-encoding.ts` (lines 182-189)
    - Passes `slices`, `sliceKdes`, `volumeProfile`, `hotspotSliceResults` to `Stkde3DScene` (line 314-322)
    - Does NOT compute a warpMap or call `setPrecomputedMaps` — relies on the timeline sibling component to populate those
  implication: when mounted inside /dashboard-demo, the warp math works because the timeline sibling populates the store. When mounted standalone in /stkde-3d, the store stays unpopulated and the warp is a no-op (linear).

- timestamp: 2026-06-20T00:30:00Z
  checked: `volume-encoding.ts:40-85`
  found:
    - `resolveDuration(slice) = max(0, endEpoch - startEpoch)` — LINEAR seconds
    - `thickness = clamp(lerp(0.85, 5.8, eased) * exaggeration, 0.6, 8.5)` — pure function of linear duration
  implication: slab thickness is a presentation choice. Could optionally be warped for full consistency, but is not strictly wrong.

## Resolution

root_cause: (analysis, not a single bug)
  The 3D scene DOES apply per-slice warping through `resolveSliceY`, but the implementation has these concrete divergences from the timeline's pattern:
  1. **HotspotTrajectoryOverlay silently uses linear Y** — it declares `resolveSliceY` as a prop, the parent passes it, but the component does NOT use it (drops to `yForIndex(sliceIndex) + 0.38` at HotspotTrajectoryOverlay.tsx:46)
  2. **Warp math is triplicated** — `Stkde3DScene`, `StkdeSliceStack`, and `AdaptiveWarpAxis` each compute the same `warpDomainDisplay` / `resolveSliceY` / `yToEpoch` from scratch
  3. **The parent `resolveSliceY` is never passed to `StkdeSliceStack`** — only to `RawEventPoints` and (attempted, not consumed) `HotspotTrajectoryOverlay`
  4. **Standalone /stkde-3d has a broken warpDomain fallback** — `mapDomain` defaults to `[0, 100]`, slice epochs are 1.5e9-scale; `toDisplaySeconds` clamps the normalized position to 1.0, collapsing the warp
  5. **`warpSource: 'slice-authored'` is not honored by the 3D** — the timeline supports both density and slice-authored sources (line 330 of DemoDualTimeline), but 3D reads only the precomputed `warpMap` from store
  6. **No view-model abstraction** — the timeline has `useScaleTransforms` + `useDualTimelineViewModel`; the 3D has inline `useCallback`/`useMemo` in 3 different files

fix: (not applied — read-only investigation; see Recommendation)
verification: (not applicable — read-only)
files_changed: []
