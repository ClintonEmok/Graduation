# Codebase Structure - Timeline & Visualization

**Analysis Date:** 2026-03-30

## Directory Layout

```
src/components/timeline/
├── DualTimeline.tsx           # Main dual-pane timeline component
├── Timeline.tsx               # Single timeline variant
├── TimelineContainer.tsx      # Container with layout
├── TimelinePanel.tsx          # Panel wrapper
├── TimelinePoints.tsx         # Point-based rendering
├── TimelineBrush.tsx          # Brush selection component
├── DensityHeatStrip.tsx       # Canvas-based density visualization
├── DensityHistogram.tsx      # SVG histogram component
├── DensityTrack.tsx          # Track with density
├── DensityAreaChart.tsx      # Area chart variant
├── AdaptiveControls.tsx      # Adaptive mode controls
├── AdaptiveAxis.tsx          # Adaptive time axis
├── qa/
│   ├── TimelineQaContextCard.tsx  # QA context display
│   ├── timeline-qa-model.ts       # QA data model
│   └── timeline-qa-model.test.ts  # QA model tests
├── hooks/
│   ├── useScaleTransforms.ts      # Scale computation
│   ├── useScaleTransforms.test.ts # Scale tests
│   ├── useDensityStripDerivation.ts   # Density computation
│   ├── useDensityStripDerivation.test.ts
│   ├── useBrushZoomSync.ts        # Brush/zoom coordination
│   ├── useBrushZoomSync.test.ts
│   ├── usePointSelection.ts       # Point selection handling
│   └── usePointSelection.test.ts
├── layers/
│   ├── AxisLayer.tsx         # Time axis rendering
│   ├── HistogramLayer.tsx    # Histogram layer
│   └── MarkerLayer.tsx       # Marker/annotation layer
└── lib/
    ├── interaction-guards.ts  # Defensive utilities
    ├── interaction-guards.test.ts
    ├── tick-ux.ts             # Tick label formatting
    └── tick-ux.test.ts

src/app/stats/lib/components/
└── TemporalPatternChart.tsx  # Stats page temporal chart
```

## Component Hierarchy

```
DualTimeline (main)
├── DensityHeatStrip (overview)
│   └── Canvas rendering
├── DensityHeatStrip (detail)
│   └── Canvas rendering
├── TimelinePoints/Bins (detail view)
├── Slice geometries (ranges/points)
├── Cursor/Selection indicators
├── Axis ticks (overview)
└── Axis ticks (detail)
    └── AdaptiveAxis (optional)

TimelinePanel
└── DualTimeline

TemporalPatternChart (stats page)
├── Hourly bar chart
└── Monthly bar chart
```

## Key File Purposes

### Core Components

| File | Purpose |
|------|---------|
| `DualTimeline.tsx` | Main dual-pane timeline with overview + detail views |
| `DensityHeatStrip.tsx` | Canvas-based density heat map rendering |
| `DensityHistogram.tsx` | SVG-based histogram for data distribution |
| `AdaptiveAxis.tsx` | Time axis with adaptive tick scaling |

### Hooks (Business Logic)

| File | Purpose |
|------|---------|
| `useScaleTransforms.ts` | Computes D3 scales with optional adaptive warping |
| `useDensityStripDerivation.ts` | Derives density maps from point data |
| `useBrushZoomSync.ts` | Syncs brush selection with zoom state |
| `usePointSelection.ts` | Handles pointer interactions for point selection |

### Utilities

| File | Purpose |
|------|---------|
| `lib/interaction-guards.ts` | Defensive range/clamp utilities |
| `lib/tick-ux.ts` | Span-aware tick label formatting |

## Where to Add New Code

### New Timeline Feature
- **Component**: `src/components/timeline/`
- **Tests**: Co-located `.test.ts` files
- **Hooks**: `src/components/timeline/hooks/`

### New Visualization Type
- **Chart components**: Near existing chart in relevant feature area
- **Stats charts**: `src/app/stats/lib/components/`
- **3D visualizations**: `src/app/timeline-test-3d/`

### New Utility Function
- **Timeline utilities**: `src/components/timeline/lib/`
- **General visualization**: Consider `src/lib/` or `src/hooks/`

## Entry Points

| Entry | Location | Triggers |
|-------|----------|----------|
| Main Timeline | `src/components/timeline/DualTimeline.tsx` | Timeslicing page, dashboard |
| Stats Chart | `src/app/stats/lib/components/TemporalPatternChart.tsx` | Stats page |
| 3D Timeline | `src/app/timeline-test-3d/` | 3D timeline experiments |

## Store Dependencies

Timeline components consume from multiple Zustand stores:
- `useTimelineDataStore` - Crime data and timestamps
- `useFilterStore` - Time range filters
- `useTimeStore` - Current time, resolution, scale mode
- `useCoordinationStore` - Selection state, brush range
- `useAdaptiveStore` - Adaptive warp factor, density maps
- `useSliceDomainStore` - Slice definitions and overlaps
- `useTimeslicingModeStore` - Timeslicing mode state
- `useViewportStore` - Viewport bounds for lazy loading
- `useWarpSliceStore` - User-defined warp slices

---

*Structure analysis: 2026-03-30*
