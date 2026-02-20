# Phase 30 Context: Timeline Adaptive Time Scaling

## Phase Overview

**Goal:** Add adaptive (non-uniform) time scaling visualization to timeline-test, enabling users to compare uniform vs adaptive time mapping on the timeline axis itself.

## Background

The timeline-test (`/timeline-test`) currently uses uniform (linear) time scaling via `scaleUtc()`. The main application has adaptive time scaling infrastructure:
- `timeScaleMode` in time store ('linear' | 'adaptive')
- `warpFactor` in adaptive store (controls warping intensity)
- Density-based time warping computed in adaptive store

However, DualTimeline doesn't utilize this - it's hardcoded to linear time.

## User Need

Users need to see HOW time is being mapped on the timeline, not just in the 3D cube. The adaptive time scaling should be visible as:
- Non-linear tick spacing on the axis (expanded dense regions, compressed sparse ones)
- Visual indication of time warping
- Toggle to switch between uniform and adaptive views

## Technical Requirements

### Must Have
1. **Time scale toggle** - Button/control to switch between linear and adaptive
2. **Adaptive time axis** - DualTimeline renders with warping when adaptive mode active
3. **Warp factor control** - Slider or input to adjust warping intensity (0-2 range)
4. **Visual feedback** - Clear indication when adaptive mode is active
5. **Sync with main app** - Optionally share state with main time store

### Should Have
1. **Comparison mode** - Show both side-by-side or toggle quickly
2. **Density integration** - Use existing density data for warping
3. **Responsive updates** - Axis updates smoothly when toggling

### Could Have
1. **Axis tick labels** - Show original time alongside warped position
2. **Gradient overlay** - Visual density heat on the axis

## Existing Assets

- `useAdaptiveStore` - provides `warpFactor`, `densityMap`, `mapDomain`
- `useTimeStore` - provides `timeScaleMode`, `setTimeScaleMode`
- `DualTimeline` - main timeline component (needs modification)
- `DensityHeatStrip` - density visualization (could inform warping)
- `TimelinePanel` - has adaptive toggle logic (reference)

## Files Likely to Modify

1. `src/app/timeline-test/page.tsx` - Add controls
2. `src/components/timeline/DualTimeline.tsx` - Add adaptive scaling
3. `src/store/useTimeStore.ts` - Ensure timeScaleMode available (may already be)
4. `src/components/timeline/TimelineAxis.tsx` (if exists) - Axis rendering

## Open Questions

1. Should timeline-test share time store with main app or have isolated state?
2. Should warping use the same density data as the 3D cube?
3. How to handle zoom/brush interactions in adaptive mode?

## Success Criteria

- [ ] Toggle switches timeline between uniform and adaptive display
- [ ] Adaptive mode shows density-based time expansion/compression
- [ ] Warp factor slider controls warping intensity
- [ ] Visual indicator shows current mode
- [ ] All existing slice functionality works in both modes
