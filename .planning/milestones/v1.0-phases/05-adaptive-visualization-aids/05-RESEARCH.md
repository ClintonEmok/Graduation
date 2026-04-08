# Phase 05: Adaptive Visualization Aids - Research

**Researched:** 2026-01-31
**Domain:** Time Visualization / D3 Scales
**Confidence:** HIGH

## Summary

This phase implements visual aids to explain the "Adaptive" time deformation. The core challenge is visualizing a non-linear time scale where high-density periods are expanded (take up more screen space) and low-density periods are compressed.

The recommended approach uses a **Polylinear Scale** (a `linear` scale with a multi-segment domain) to map time to screen pixels. This scale is generated from the data's cumulative density. The visualization consists of a customized **Axis** (showing distorted ticks) and a **Density Histogram** (showing event distribution). To satisfy the "animated transition" requirement, we interpolate the *domain* of the scale between the Uniform (linear) state and the Adaptive (polylinear) state.

**Primary recommendation:** Use **Visx** components for the axis/histogram rendering, driven by a custom `d3-scale` that interpolates its domain for smooth transitions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@visx/axis** | ^3.x | Axis Rendering | Declarative, handles DOM/math split correctly for React |
| **@visx/scale** | ^3.x | Scale Helpers | Compatible with D3 scales, strongly typed |
| **@visx/group** | ^3.x | SVG Grouping | Simplifies coordinate offsets |
| **d3-scale** | ^4.x | Scale Logic | Industry standard for non-linear mappings |
| **d3-array** | ^3.x | Binning/Stats | Efficient data binning for histograms |
| **framer-motion** | ^11.x | Animation | Interpolating scale domains smoothly |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@visx/responsive** | ^3.x | Auto-sizing | Making the timeline fit the panel width |

**Installation:**
```bash
npm install @visx/axis @visx/scale @visx/group @visx/shape @visx/responsive framer-motion
```
*(Note: `d3-scale` and `d3-array` are already installed).*

## Architecture Patterns

### 1. The Polylinear Adaptive Scale
Instead of a complex custom scale, use `d3.scaleLinear` with a **polylinear domain** and a **uniform range**.
- **Uniform Scale:**
  - Domain: `[minTime, maxTime]`
  - Range: `[0, width]`
- **Adaptive Scale:**
  - Domain: `[t_0, t_1, t_2, ..., t_100]` (Percentiles of the dataset)
  - Range: `[0, w/100, 2w/100, ..., width]` (Uniform steps)

This naturally expands dense regions (where `t_i` and `t_i+1` are close, but map to the same pixel delta).

### 2. Animated Interpolation (Domain Morphing)
To animate between Uniform and Adaptive, do not interpolate the pixel values. Instead, **interpolate the scale's domain vector**.
- Create a `motion` value or spring that goes from `0` (Uniform) to `1` (Adaptive).
- On every frame (or via `useTransform`), calculate an intermediate domain:
  `domain_current[i] = lerp(domain_uniform[i], domain_adaptive[i], t)`
- Pass this dynamic scale to the Axis and Histogram components.

### 3. Collision-Aware Axis
In "compressed" regions of the Adaptive scale, time ticks will bunched up.
- **Pattern:** Don't rely on `scale.ticks()`.
- **Solution:** Filter ticks based on *projected pixel distance*.
  ```javascript
  const allTicks = scale.ticks(20);
  const visibleTicks = allTicks.filter((t, i, arr) => {
    if (i === 0) return true;
    const px = scale(t);
    const prevPx = scale(arr[i-1]);
    return (px - prevPx) > MIN_LABEL_WIDTH;
  });
  ```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Axis Rendering** | Manual `<line>`/`<text>` mapping | `@visx/axis` | Handles tick formatting, offsets, and orientation robustly. |
| **Histogram Binning** | Custom loop | `d3.bin()` | Handles edge cases, dates, and domain alignment correctly. |
| **Tick Formatting** | Manual Date string manip | `d3.timeFormat` | Standard, localized, flexible. |

## Common Pitfalls

### Pitfall 1: Over-emphasized Histogram
**What goes wrong:** In Adaptive mode, a dense bin becomes both **wide** (due to scale) and **tall** (due to count). This visually squares the "importance" ($Area \approx Count^2$).
**How to avoid:** Consider normalizing the histogram height in Adaptive mode (Density vs Count).
**Recommendation:** Stick to "Count" on Y-axis for simplicity first, but be aware visually. The "Width" is the primary cue for the *scale* deformation.

### Pitfall 2: Label Overlap
**What goes wrong:** Fast-forwarding through time or compressing empty periods makes ticks overlap unreadably.
**How to avoid:** Implement the "Pixel Distance Filtering" logic described in Architecture. Visx does *not* do this automatically.

### Pitfall 3: React/D3 Sync
**What goes wrong:** Using `useEffect` to manipulate D3 DOM nodes causes lag or conflicts with React updates.
**How to avoid:** Use Visx (Declarative SVG). React renders the `<path>` and `<text>`, D3 just provides the `d=""` strings.

## Code Examples

### Generating the Scales
```typescript
// Source: D3 + Custom Logic
import { scaleLinear, scaleTime } from '@visx/scale';
import { extent, bin } from 'd3-array';

// 1. Uniform Scale
const uniformScale = scaleTime({
  domain: extent(data, d => d.date),
  range: [0, width]
});

// 2. Adaptive Scale (Polylinear)
const createAdaptiveScale = (data, width) => {
  const dates = data.map(d => d.date.getTime()).sort((a, b) => a - b);
  const percentiles = [];
  const range = [];
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const index = Math.floor((i / steps) * (dates.length - 1));
    percentiles.push(new Date(dates[index])); // Domain: Input Time
    range.push((i / steps) * width);          // Range: Output Pixels (Uniform)
  }

  return scaleLinear({
    domain: percentiles,
    range: range
  }); // Maps Time -> Pixels
};
```

### Interpolated Axis Component
```tsx
import { AxisBottom } from '@visx/axis';
import { useMemo } from 'react';

const AdaptiveAxis = ({ progress, uniformDomain, adaptiveDomain, width }) => {
  // progress: 0 (Uniform) -> 1 (Adaptive)
  
  const currentScale = useMemo(() => {
    // Interpolate domain
    const currentDomain = uniformDomain.map((t, i) => {
      const tUnif = t.getTime();
      const tAdapt = adaptiveDomain[i].getTime();
      return new Date(tUnif + (tAdapt - tUnif) * progress);
    });

    return scaleLinear({
      domain: currentDomain,
      range: uniformRange // [0, ..., width]
    });
  }, [progress, width]);

  return (
    <AxisBottom 
      scale={currentScale} 
      tickFormat={d => d3.timeFormat("%H:%M")(d)}
    />
  );
};
```

## State of the Art
| Old Approach | Current Approach | Why |
|--------------|------------------|-----|
| `d3-selection` + `refs` | `Visx` / Declarative SVG | Better React integration, SSR support, cleaner code. |
| JS Animation Loop | CSS/Spring Animation | Smoother 60fps transitions, less main-thread blocking. |

## Open Questions

1.  **Histogram Binning:** Should the histogram bins be "Time-based" (e.g. 1 hour) or "Count-based" (e.g. 100 events)?
    -   *Recommendation:* Use **Time-based** bins (Uniform time). In Adaptive mode, their *width* will vary. This is the most intuitive visualization of "Time Deformation".

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH (Visx is standard for React D3)
- Architecture: HIGH (Polylinear scale is standard for density distortion)
- Pitfalls: MEDIUM (Visual balance of the histogram needs testing)

**Research date:** 2026-01-31
