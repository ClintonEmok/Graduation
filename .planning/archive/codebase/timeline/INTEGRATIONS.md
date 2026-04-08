# External Integrations - Timeline & Visualization

**Analysis Date:** 2026-03-30

## D3 Integration

### Direct D3 Usage

**d3-array (Binning)**
```typescript
import { bin, max } from 'd3-array';

const binner = bin<number, number>()
  .value((d) => d)
  .domain([domainStart, domainEnd])
  .thresholds(50);

const bins = binner(values);
```

**d3-scale (Time Scaling)**
```typescript
import { scaleUtc } from 'd3-scale';

const overviewScale = scaleUtc()
  .domain([new Date(domainStart * 1000), new Date(domainEnd * 1000)])
  .range([0, overviewInnerWidth]);
```

**d3-time (Interval Handling)**
```typescript
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time';

// Used for tick generation based on time resolution
detailScale.ticks(timeHour.every(step) ?? timeHour);
```

**d3-brush & d3-zoom (Interactions)**
```typescript
import { brushX } from 'd3-brush';

const brush = brushX()
  .extent([[0, 0], [width, height]])
  .on('brush end', handleBrush);
```

### Visx Integration (React Wrappers)

**@visx/axis**
```typescript
import { AxisBottom } from '@visx/axis';

<AxisBottom
  scale={xScale}
  top={height}
  stroke="#333"
  tickLabelProps={{ fill: '#666', fontSize: 10, textAnchor: 'middle' }}
/>
```

**@visx/brush**
- Provides React component wrappers around D3 brush
- Used in timeline for range selection

**@visx/scale, @visx/shape**
- Scale utilities for converting data to visual coordinates
- Shape primitives for area/line charts

## Three.js / React-Three-Fiber

### 3D Timeline Rendering

**@react-three/fiber**
```typescript
import { Canvas } from '@react-three/fiber';

<Canvas camera={{ position: [0, 0, 5] }}>
  <TimelineTest3DScene />
</Canvas>
```

**@react-three/drei**
```typescript
import { OrbitControls, Text, Line } from '@react-three/drei';

// Useful helpers: OrbitControls, Text, Line, Points, etc.
```

### Three.js Direct Usage
- `three.js` 0.182.0 for WebGL primitives
- Custom shaders for 3D temporal visualization
- Integration via `@types/three` for TypeScript

## Data Fetching Integration

### Viewport-Based Crime Data
```typescript
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';

const { data: viewportCrimes, isLoading } = useViewportCrimeData({
  bufferDays: 30,
});
```
- Lazy loads data based on visible viewport
- Buffers to prevent excessive re-fetches

## Store Integrations

Timeline components integrate with multiple Zustand stores:

| Store | Purpose |
|-------|---------|
| `useTimelineDataStore` | Raw crime data, timestamps, min/max |
| `useFilterStore` | Selected time range |
| `useTimeStore` | Current time cursor, resolution |
| `useCoordinationStore` | Selected index, brush range |
| `useAdaptiveStore` | Warp factor, density maps |
| `useSliceDomainStore` | Slice definitions |
| `useViewportStore` | Viewport bounds |

## Rendering Target Integration

### DOM Measurement
```typescript
import { useMeasure } from '@/hooks/useMeasure';

const [containerRef, bounds] = useMeasure<HTMLDivElement>();
const width = bounds.width ?? 0;
```

### High-DPI Canvas
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.floor(width * dpr);
canvas.height = Math.floor(height * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

## No External Chart Libraries

The codebase does NOT use:
- Chart.js
- Recharts
- Victory
- Nivo

All visualization is custom-built using:
- Raw SVG (via React)
- Canvas 2D API
- Three.js for 3D

---

*Integration audit: 2026-03-30*
