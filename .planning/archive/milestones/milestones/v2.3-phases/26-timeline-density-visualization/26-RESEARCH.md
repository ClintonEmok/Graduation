# Phase 26: Timeline Density Visualization - Research

**Researched:** 2026-02-17
**Domain:** React Visualization / Time Series / Density Charts
**Confidence:** HIGH

## Summary

This phase implements dual density visualizations on the timeline: an area chart for detailed density view and a compact heat strip for overview. The key decisions center on leveraging the existing **Visx + D3** stack already established in Phase 21, using **@visx/shape** with **@visx/gradient** for area charts with gradient fills, and **Canvas** for the heat strip visualization. The density data is already computed in the adaptive store (Phase 25) via Web Workers.

**Primary recommendation:** Use **@visx/shape AreaClosed** with **LinearGradient** for the area chart and **Canvas API** for the heat strip. This maintains consistency with the existing Visx-based timeline while providing optimal performance for the visualization requirements.

---

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@visx/shape` | 3.12.0 | Area/path primitives | Already used for histograms; supports gradient fills natively |
| `@visx/gradient` | 3.12.0 | SVG gradients | Zero-bundle-cost addition; integrates with existing area charts |
| `@visx/scale` | 3.12.0 | Time/linear scales | D3-scale wrappers; consistent with timeline architecture |
| `d3-array` | 3.2.4 | Data binning/utilities | Already installed; efficient max, extent operations |

### No Additional Libraries Required
The project already has everything needed. Avoid adding Recharts, Victory, or Nivo as they:
- Increase bundle size (Recharts: ~500KB, Nivo: ~200KB)
- Introduce conflicting scale/time libraries
- Duplicate existing Visx/D3 capabilities

---

## Architecture Patterns

### Pattern 1: Visx Area Chart with Gradient Fill
**What:** AreaClosed component with LinearGradient definition
**When to use:** Detail view where users need to see density magnitude clearly
**Implementation:**
```tsx
import { AreaClosed } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';

// Gradient definition (rendered once in <defs>)
<LinearGradient 
  id="density-gradient" 
  from="#3b82f6" 
  fromOpacity={0.6}
  to="#3b82f6" 
  toOpacity={0.1}
  vertical
/>

// Area component
<AreaClosed
  data={densityData}
  x={d => xScale(d.time)}
  y={d => yScale(d.density)}
  yScale={yScale}
  fill="url(#density-gradient)"
  stroke="#3b82f6"
  strokeWidth={1.5}
  strokeOpacity={0.8}
  curve={curveMonotoneX} // Smooth interpolation
/>
```
**Confidence:** HIGH - Verified from Visx docs and community patterns

### Pattern 2: Canvas Heat Strip
**What:** Compact density visualization using Canvas 2D API
**When to use:** Overview mode where vertical space is constrained
**Implementation:**
```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const ctx = canvasRef.current?.getContext('2d');
  if (!ctx || !densityMap) return;
  
  const imgData = ctx.createImageData(width, 1);
  const data = imgData.data;
  
  for (let x = 0; x < width; x++) {
    const idx = Math.floor((x / width) * densityMap.length);
    const val = densityMap[idx];
    const norm = val / maxDensity;
    
    const offset = x * 4;
    // Sequential blue color scheme (low→high)
    data[offset] = Math.floor(59 + norm * 135);     // R
    data[offset + 1] = Math.floor(130 + norm * 105); // G  
    data[offset + 2] = Math.floor(246 - norm * 100); // B
    data[offset + 3] = 255; // Alpha
  }
  
  ctx.putImageData(imgData, 0, 0);
}, [width, densityMap]);
```
**Confidence:** HIGH - Based on existing DensityTrack.tsx implementation

### Pattern 3: Sync with Timeline Brush/Zoom
**What:** Density visualization updates when brush/zoom changes visible domain
**When to use:** Always - maintains visual coherence
**Implementation:**
```tsx
// Derive visible data from brush range
const visibleData = useMemo(() => {
  if (!brushRange) return densityData;
  return densityData.filter(d => 
    d.time >= brushRange[0] && d.time <= brushRange[1]
  );
}, [densityData, brushRange]);

// Scale updates with brush
const xScale = useMemo(() => scaleTime({
  domain: brushRange || [minTime, maxTime],
  range: [0, width]
}), [brushRange, width]);
```
**Confidence:** HIGH - Standard Visx/D3 pattern

### Anti-Patterns to Avoid
- **Don't use Recharts for a single area chart:** Adds unnecessary bundle weight when Visx already handles this perfectly
- **Don't update density on every mouse move:** Debounce to 300-500ms to prevent UI jank
- **Don't use SVG for heat strip:** Canvas performs better for pixel-density rendering

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Area path generation | Custom path math | `@visx/shape AreaClosed` | Handles curves, yScale, closure automatically |
| Gradient definitions | Inline SVG markup | `@visx/gradient LinearGradient` | Declarative React component; handles defs management |
| Time scaling | Manual calculations | `@visx/scale scaleTime` | Handles time zones, ticks, domains |
| Density binning | Raw for-loops | `d3.bin` | Already available; optimized for performance |
| Debouncing | setTimeout/clearTimeout | `lodash.debounce` | Already installed; battle-tested |

**Key insight:** The project already has Visx and D3. Adding another charting library creates confusion and bloat.

---

## Common Pitfalls

### Pitfall 1: Gradient Not Rendering
**What goes wrong:** Gradient appears as solid color or doesn't appear at all
**Why it happens:** Gradient ID not referenced correctly or gradient defined outside `<defs>`
**How to avoid:**
- Ensure `fill="url(#density-gradient)"` matches `<LinearGradient id="density-gradient" />`
- Place gradient component inside the SVG but outside rendering path
- Use unique IDs if multiple charts on same page

### Pitfall 2: Area Chart Baseline
**What goes wrong:** Area appears inverted or below the x-axis
**Why it happens:** yScale range is inverted (SVG y=0 is top)
**How to avoid:**
- Set `yScale.range([innerHeight, 0])` so larger values are at bottom
- Or use `yScale={yScale}` prop which handles this automatically

### Pitfall 3: Heat Strip Pixelation
**What goes wrong:** Heat strip looks blurry or has visible pixels
**Why it happens:** Not handling devicePixelRatio for retina displays
**How to avoid:**
```tsx
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);
// Draw at logical width/height, canvas handles resolution
```

### Pitfall 4: Debounce Breaking React State
**What goes wrong:** Debounced function uses stale state/closures
**Why it happens:** Debounce closure captures initial state
**How to avoid:**
```tsx
// Use ref for mutable value
const densityRef = useRef(densityData);
densityRef.current = densityData;

const debouncedUpdate = useCallback(
  debounce(() => {
    // Access latest via ref
    updateChart(densityRef.current);
  }, 300),
  []
);
```

---

## Code Examples

### Area Chart Component
```tsx
// components/timeline/DensityAreaChart.tsx
import { useMemo } from 'react';
import { AreaClosed } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { max } from 'd3-array';

interface DensityPoint {
  time: Date;
  density: number;
}

interface DensityAreaChartProps {
  data: DensityPoint[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export function DensityAreaChart({
  data,
  width,
  height,
  margin = { top: 10, right: 10, bottom: 20, left: 30 }
}: DensityAreaChartProps) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const { xScale, yScale } = useMemo(() => {
    const xScale = scaleTime({
      domain: [data[0].time, data[data.length - 1].time],
      range: [0, innerWidth]
    });
    
    const yMax = max(data, d => d.density) || 0;
    const yScale = scaleLinear({
      domain: [0, yMax],
      range: [innerHeight, 0] // Inverted for SVG
    });
    
    return { xScale, yScale };
  }, [data, innerWidth, innerHeight]);
  
  return (
    <svg width={width} height={height}>
      <defs>
        <LinearGradient
          id="density-area-gradient"
          from="#3b82f6"
          fromOpacity={0.5}
          to="#3b82f6"
          toOpacity={0.05}
          vertical
        />
      </defs>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <AreaClosed
          data={data}
          x={d => xScale(d.time)}
          y={d => yScale(d.density)}
          yScale={yScale}
          fill="url(#density-area-gradient)"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          curve={curveMonotoneX}
        />
      </g>
    </svg>
  );
}
```

### Heat Strip Component
```tsx
// components/timeline/DensityHeatStrip.tsx
import { useRef, useEffect } from 'react';

interface DensityHeatStripProps {
  densityMap: Float32Array;
  width: number;
  height: number;
  colorLow?: [number, number, number];  // RGB
  colorHigh?: [number, number, number]; // RGB
}

export function DensityHeatStrip({
  densityMap,
  width,
  height,
  colorLow = [59, 130, 246],   // Blue-500
  colorHigh = [239, 68, 68]    // Red-500
}: DensityHeatStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || densityMap.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Handle retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Find min/max for normalization
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < densityMap.length; i++) {
      const v = densityMap[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    
    // Create 1-pixel high strip
    const imgData = ctx.createImageData(width, 1);
    const data = imgData.data;
    
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const idx = Math.min(Math.floor(t * densityMap.length), densityMap.length - 1);
      const val = densityMap[idx];
      const norm = (val - min) / range;
      
      const offset = x * 4;
      // Interpolate between low and high colors
      data[offset] = Math.floor(colorLow[0] + norm * (colorHigh[0] - colorLow[0]));
      data[offset + 1] = Math.floor(colorLow[1] + norm * (colorHigh[1] - colorLow[1]));
      data[offset + 2] = Math.floor(colorLow[2] + norm * (colorHigh[2] - colorLow[2]));
      data[offset + 3] = 255;
    }
    
    // Draw single row
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imgData, 0, 0);
    
    // Stretch to full height
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, width, 1, 0, 0, width, height);
  }, [width, height, densityMap, colorLow, colorHigh]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      className="rounded-sm"
    />
  );
}
```

### Debounced Filter Update
```tsx
// hooks/useDebouncedDensity.ts
import { useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore } from '@/store/useDataStore';

export function useDebouncedDensity(delay = 400) {
  const { computeMaps } = useAdaptiveStore();
  const { columns, minTimestampSec, maxTimestampSec } = useDataStore();
  
  // Ref to access latest data without closure issues
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  
  const debouncedCompute = useCallback(
    debounce((timestamps: Float32Array, domain: [number, number]) => {
      computeMaps(timestamps, domain);
    }, delay),
    [computeMaps, delay]
  );
  
  useEffect(() => {
    if (!columnsRef.current || minTimestampSec === null) return;
    
    // Convert columns to timestamps array
    const timestamps = new Float32Array(columnsRef.current.length);
    for (let i = 0; i < columnsRef.current.length; i++) {
      timestamps[i] = columnsRef.current.timestamp[i];
    }
    
    debouncedCompute(timestamps, [minTimestampSec, maxTimestampSec || 100]);
    
    return () => {
      debouncedCompute.cancel();
    };
  }, [minTimestampSec, maxTimestampSec, debouncedCompute]);
}
```

---

## Best Practices & Recommendations

### Area Chart Configuration

**Optimal height:** 60-80px for the area chart track
- Below 60px: Hard to see density variations
- Above 80px: Takes too much vertical space from timeline
- **Recommendation:** 72px (6 Tailwind spacing units)

**Gradient configuration:**
- Use `fromOpacity={0.5}` to `toOpacity={0.05}` for subtle fade
- Match stroke color to fill's "from" color for cohesion
- Use `curveMonotoneX` for smooth interpolation without overshoot

**Y-axis decision:** Visual-only (no labels)
- Users care about relative density, not absolute values
- Labels add clutter and require extra margin space
- Keep clean aesthetic matching existing timeline

### Heat Strip Configuration

**Color scheme:** Sequential (blue → red)
- Blue = Low density (compressed areas)
- Red = High density (expanded areas)
- Consistent with Phase 25's heatmap coloring
- Avoids diverging schemes (which imply negative values)

**Height:** 12-16px
- Already implemented at 12px in DensityTrack.tsx
- Provides enough visual presence without dominating
- Matches track-based UI pattern

**Data type:** Continuous (not binned)
- KDE from Phase 25 is already continuous
- Binned data would introduce artificial steps
- Canvas handles continuous rendering efficiently

### Density Encoding

**Primary encoding:** Height for area chart, color for heat strip
- **Rationale:** Height is easier to judge precisely; color works in compact space
- **Dual encoding option:** Could combine height + color in area chart, but unnecessary complexity

**Scaling behavior:** Fixed global scale
- Dynamic scaling to visible range can be misleading
- Fixed scale maintains consistent meaning across zooms
- Users learn what "tall" means across different time ranges

**Zero/null handling:**
- Render as minimum-height line (not zero) to maintain visual continuity
- Use very low opacity (0.1) to indicate no data vs low density

### Timeline Integration

**Sync strategy:**
- Density visualization renders the FULL time range always
- Brush overlay highlights the selected sub-range
- This shows context (where the selection sits in overall density)

**Update behavior:**
- Debounce filter changes at 400ms (balanced between responsive and performant)
- Show loading state when `isComputing` from adaptive store
- Keep previous density visible during computation to prevent flash

**Performance considerations:**
- Canvas heat strip: 60fps capable, negligible CPU
- SVG area chart: Re-renders on brush changes (acceptable for <1000 points)
- Use `useMemo` for scales and derived data
- Skip updates when width/height unchanged (ParentSize handles this)

---

## State of the Art

| Aspect | Old Approach | Current Approach | Impact |
|--------|--------------|------------------|--------|
| Density computation | CPU main thread | Web Worker | No UI blocking, smooth interactions |
| Density viz | None | Dual representation | Context + detail views supported |
| Gradient fills | Manual SVG | @visx/gradient | Cleaner code, standard patterns |
| Chart library | D3 imperative | Visx declarative | React-native, easier maintenance |

**Already established in codebase (Phase 25):**
- Web Worker for KDE computation
- Canvas heat strip (12px, red/blue)
- Float32Array density map
- Zustand adaptive store

---

## Open Questions

1. **Dual view toggle?**
   - Should users be able to switch between area chart and heat strip?
   - Or show both simultaneously (area chart for detail, heat strip always)?
   - **Recommendation:** Show heat strip always (compact), add area chart on hover/expand

2. **Animation on density update?**
   - Smooth transition when filters change looks nice but adds complexity
   - **Recommendation:** No animation for now; maintain snappy feel

3. **Mobile timeline?**
   - Phase 21 deferred mobile support
   - Heat strip works on mobile, area chart may need height reduction
   - **Recommendation:** Out of scope; follow Phase 21's mobile block pattern

---

## Sources

### Primary (HIGH confidence)
- [Visx Gradient Documentation](https://visx.airbnb.tech/docs/gradient) - Official gradient API
- [Visx Shape Documentation](https://airbnb.io/visx/docs/shape) - AreaClosed component
- [GitHub Discussion: XYChart AreaSeries Gradient](https://github.com/airbnb/visx/discussions/1001) - Community pattern
- Codebase: `DensityTrack.tsx` - Existing heat strip implementation
- Codebase: `useAdaptiveStore.ts` - Established density data flow

### Secondary (MEDIUM confidence)
- [LogRocket: Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) - Library comparison
- [Embeddable: React Chart Libraries 2025](https://embeddable.com/blog/react-chart-libraries) - Ecosystem overview
- [Observable: Area Chart with Gradient](https://observablehq.com/@observablehq/plot-area-chart-with-gradient) - Pattern inspiration

### Verification
- Checked `package.json` - Visx @3.12.0 already installed
- Verified `@visx/gradient` available (not yet used in codebase)
- Confirmed `lodash.debounce` available for debouncing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Visx already in use, no new dependencies
- Architecture patterns: HIGH - Established Visx/D3 patterns
- Pitfalls: MEDIUM-HIGH - Based on existing implementation experience

**Research date:** 2026-02-17
**Valid until:** 2026-06-17 (Visx 3.x stable until major version change)

**Next steps for planner:**
1. Create test route at `/timeline-test`
2. Build `DensityAreaChart` component (Visx-based)
3. Build `DensityHeatStrip` component (Canvas-based)
4. Integrate with existing `DensityTrack` or create unified track
5. Add debounced filter updates to adaptive store
