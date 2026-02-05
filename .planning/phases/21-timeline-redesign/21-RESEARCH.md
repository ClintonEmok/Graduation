# Phase 21: Timeline Redesign - Research

**Researched:** 2026-02-05
**Domain:** Temporal Data Visualization & Interaction
**Confidence:** HIGH

## Summary

This phase redesigns the timeline into a detailed, integrated, and interactive control. The primary goal is to implement a "Focus + Context" pattern using a zoomable brush timeline, allowing users to switch between high-level distribution views (Histogram) and granular detail (Event Markers).

**Primary recommendation:** Use **Visx** (Airbnb's visualization primitives) for the React-D3 integration, specifically leveraging `@visx/brush` for the complex interaction logic, while keeping `d3-array` for data processing (binning).

## Standard Stack

The project already includes `@visx/axis` and `d3-*` libraries. We should expand the Visx usage to avoid hand-rolling complex D3 interaction logic in React.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@visx/brush** | ^3.x | Zoom/Selection interaction | Handles D3 brush events/state in React natively |
| **@visx/shape** | ^3.x | Rendering Bars/Lines | Declarative SVG paths for React |
| **@visx/scale** | ^3.x | Time/Linear scales | React wrappers for d3-scale |
| **@visx/responsive** | ^3.x | Auto-sizing | Essential for the "Integrated" anchor requirement |
| **d3-array** | ^3.x | Data binning | Efficient histogram generation (`d3.bin`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@visx/event** | ^3.x | Tooltip/Click handling | Simplifies pointer events on SVG elements |
| **lucide-react** | Existing | Icons | UI controls (zoom in/out, mode toggle) |

**Installation:**
```bash
npm install @visx/brush @visx/shape @visx/scale @visx/responsive @visx/group
```
*(Note: `@visx/axis` and `d3-array` are already installed)*

## Architecture Patterns

### Recommended Project Structure
```
src/components/timeline/
├── TimelineContainer.tsx     # Handles responsive width/height
├── Timeline.tsx              # Main orchestrator (Scales, State)
├── TimelineBrush.tsx         # @visx/brush implementation
├── layers/
│   ├── HistogramLayer.tsx    # Bar chart visualization
│   └── MarkerLayer.tsx       # Dot/Scatter visualization
└── utils/
    └── binning.ts            # d3-array logic
```

### Pattern 1: Visx Brush (Focus + Context)
**What:** A dedicated area that handles drag-to-select and resize interactions.
**When to use:** For the "Zoomable Timeline" requirement.
**Example:**
```typescript
// Pattern for a controlled brush
import { Brush } from '@visx/brush';

// In render
<Brush
  xScale={timeScale}
  yScale={yScale}
  width={width}
  height={height}
  handleSize={8}
  resizeTriggerAreas={['left', 'right']}
  brushRegion="xAxis"
  selectedBoxStyle={{ fill: 'rgba(255, 255, 255, 0.1)', stroke: 'white' }}
  onChange={onBrushChange} // Returns { bounds: { x0, x1, ... } }
/>
```

### Pattern 2: Switchable Visualization Layers
**What:** Conditional rendering of visual layers based on user preference, sharing the same X-scale.
**When to use:** Toggling between "Histogram" and "Event Markers".
**Integration:**
- **Histogram:** Uses `d3.bin()` to aggregate data, renders `<Bar>` components.
- **Markers:** Renders `<Circle>` components directly from raw data (filtered by current view).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Brush/Zoom Interactions** | `useRef` + `d3.brush` inside `useEffect` | `@visx/brush` | React reconciliation conflicts with D3's DOM mutation; Visx handles this elegantly. |
| **Resizing/Responsiveness** | `window.addEventListener('resize')` | `@visx/responsive` (`ParentSize`) | Handles debouncing and container boundaries automatically. |
| **Mobile Detection** | `navigator.userAgent` parsing | CSS Media Queries (Tailwind) | User agent sniffing is unreliable; CSS is robust and zero-runtime cost. |

## Common Pitfalls

### Pitfall 1: The "Single Point" Selection Bug
**What goes wrong:** Clicking a bar in a histogram typically returns the *center* value or a single index.
**Why it happens:** Click handlers often grab the mapped value directly from the scale without accounting for bin width.
**How to avoid:**
1. In the click handler, identify the **bin** corresponding to the click.
2. Return the bin's start (`x0`) and end (`x1`) time.
3. Update `useTimeStore` with `setRange([x0, x1])`.

### Pitfall 2: SVG Performance (Event Markers)
**What goes wrong:** Rendering 1000+ individual SVG `<circle>` elements causes significant DOM lag.
**Warning signs:** Timeline animation stutters when in "Event Markers" mode with large datasets.
**Prevention:**
- **Soft Limit:** If points > 500, auto-switch to Histogram or Canvas-based rendering (though Visx Canvas is more complex).
- **Optimization:** Use `React.memo` on the MarkerLayer to prevent re-renders when only the Brush changes (unless the brush *drives* the data filtering).

### Pitfall 3: Brush Z-Index
**What goes wrong:** Visuals (bars/dots) block the brush interaction if rendered on top.
**Solution:** Ensure `<Brush />` is the **last** child in the `<SVG>` element (or has a higher z-index if positioned absolutely), so it captures pointer events.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| **Raw D3** | **Visx (React D3 primitives)** | Better React integration, easier maintenance, type safety. |
| **JS Media Queries** | **Tailwind CSS (`hidden md:block`)** | No hydration mismatch, cleaner code. |
| **Global Timeline** | **Context-aware Timeline** | Timeline reflects current filtering/focus rather than just static data. |

## Code Examples

### Mobile Blocking (Tailwind)
```tsx
// src/components/timeline/TimelineContainer.tsx
export function TimelineContainer() {
  return (
    <>
      {/* Mobile Overlay */}
      <div className="md:hidden fixed inset-0 z-50 bg-background flex items-center justify-center p-6 text-center">
        <p>Please use a larger screen to interact with the timeline.</p>
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block w-full h-32">
        <TimelineContent />
      </div>
    </>
  );
}
```

### Histogram Binning
```typescript
import { bin } from 'd3-array';

const bucketGenerator = bin()
  .value((d: DataPoint) => d.timestamp)
  .domain(timeScale.domain())
  .thresholds(timeScale.ticks(40)); // Adjust bin count based on width

const bins = bucketGenerator(data);
// Result: Array of bins, each with .x0 and .x1 properties
```

## Sources

### Primary (HIGH confidence)
- **Visx Docs** (`airbnb.io/visx`): Confirmed availability of `<Brush />`, `<Bar />`, `<Axis />`.
- **D3 Docs** (`d3-array`): Confirmed `bin()` usage for histograms.
- **Existing Project**: `package.json` confirms `@visx/axis` and `d3-array` are already dependencies.

### Secondary (MEDIUM confidence)
- **React Patterns**: usage of `ParentSize` for responsive D3 charts is a standard established pattern.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (Visx is the de-facto React standard for this complexity)
- Architecture: HIGH (Standard composition pattern)
- Pitfalls: MEDIUM (Performance limits of SVG are known, but specific dataset size is unknown)

**Research date:** 2026-02-05
