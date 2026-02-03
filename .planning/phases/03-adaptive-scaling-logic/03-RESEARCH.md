# Phase 03: Adaptive Scaling Logic - Research

**Researched:** 2026-01-31
**Domain:** 3D Data Visualization / Temporal Scaling
**Confidence:** HIGH

## Summary

This phase focuses on transforming the Z-axis (time) based on data density and smoothly transitioning between this adaptive state and a linear baseline.

The core challenge is calculating a mapping function $f(t) \rightarrow z$ such that the derivative $dz/dt$ (visual space per unit time) is proportional to data density, while respecting the constraint that "low-density areas maintain their scale." This requires a **1D Density Estimation** approach, specifically a modified Cumulative Distribution Function (CDF).

For the transition, simply interpolating geometry on the CPU is too slow for large datasets. The standard high-performance pattern is **GPU-side Vertex Interpolation** using a custom shader or `onBeforeCompile` hook, driven by a uniform.

**Primary recommendation:** Use `d3-array` for density binning and a **Vertex Shader Mix** pattern for the transition.

## Standard Stack

The established libraries for data density and 3D transitions.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `d3-array` | ^3.2 | Binning/Histograms | Industry standard for data statistics and bucketing. |
| `d3-scale` | ^4.0 | coordinate mapping | Robust logic for mapping domains to ranges. |
| `three` | ^0.182 | WebGL Renderer | Existing project core. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-three/drei` | Existing | `shaderMaterial` | simplifying shader boilerplate. |
| `lodash.debounce` | ^4.0 | Performance | Debouncing the density calculation during interaction. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `d3-array` | `kernel-smooth` | `kernel-smooth` is pure stats, `d3` is better suited for viz/binning integration. |
| Custom Shader | `framer-motion-3d` | Framer is easier for props, but shader attributes are required for 10k+ points performance. |

**Installation:**
```bash
npm install d3-array d3-scale lodash.debounce
npm install -D @types/d3-array @types/d3-scale @types/lodash.debounce
```

## Architecture Patterns

### Recommended Logic Flow

1.  **Input:** `points[]` (raw data), `timeRange` (filtered start/end).
2.  **Compute (Debounced):**
    *   Bin data into $N$ buckets (e.g., 100-200 bins).
    *   Compute smoothed density $\rho_i$ for each bin.
    *   Compute "Adaptive Scale Factor" $S_i = \max(1, \frac{\rho_i}{\rho_{baseline}})$.
    *   Integrate $S_i$ to get $Z$ offsets: $Z_{map}[t]$.
    *   Generate `adaptiveZ` Float32Array for all points by looking up their $t$ in $Z_{map}$.
3.  **Render:**
    *   Pass `adaptiveZ` as a custom attribute to the Points/Mesh.
    *   Pass `uTransition` (0=Linear, 1=Adaptive) as a uniform.
    *   Vertex Shader mixes `position.z` and `adaptiveZ`.

### Pattern 1: GPU-Side Attribute Transition
**What:** Interpolating between two structural states using shaders instead of CPU loops.
**When to use:** When animating the position of >1000 objects/points.
**Example:**
```typescript
// Material
const AdaptivePointsMaterial = shaderMaterial(
  { uTransition: 0, color: new THREE.Color() },
  // Vertex Shader
  `
    attribute float adaptiveZ;
    uniform float uTransition;
    void main() {
      vec3 pos = position;
      // Mix between linear (original z) and adaptive (calculated z)
      pos.z = mix(position.z, adaptiveZ, uTransition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 5.0;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
    }
  `
)
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Histogram/Binning | Custom `for` loops | `d3-array.bin()` | Handles edge cases, thresholds, and accessors correctly. |
| Smooth Transition | `useFrame` manual lerp | `MathUtils.damp` | Built-in frame-independent smoothing prevents jitter. |
| Color Scales | Custom arrays | `d3-scale-chromatic` | (If needed) Perceptually uniform color maps. |

**Key insight:** Writing a density algorithm from scratch usually leads to edge cases with empty bins or floating point errors. D3 is battle-tested.

## Common Pitfalls

### Pitfall 1: The "Squashed" Timeline
**What goes wrong:** High density areas expand, but empty areas shrink to zero height, making events in low-density areas overlap or disappear.
**Why it happens:** Using pure density $\rho$ for scale. If $\rho \approx 0$, then $\Delta z \approx 0$.
**How to avoid:** Implement the "Minimum Scale" rule ($S = \max(S_{linear}, S_{density})$). This ensures time never stops flowing visually.

### Pitfall 2: Axis/Grid Misalignment
**What goes wrong:** The points deform, but the grid lines (10:00, 11:00) stay linear.
**Why it happens:** Calculating point positions but failing to apply the same transform to the axis ticks.
**How to avoid:** Use the exact same `Z_{map}` lookup function to generate the Z-positions for your axis ticks.

### Pitfall 3: Buffer Attribute Desync
**What goes wrong:** The number of filtered points changes, but the `adaptiveZ` buffer is not resized/updated, causing a crash or garbage render.
**How to avoid:** React keys! If the *dataset* changes (filter applied), change the `key` of the Mesh to force a full re-mount, or carefully manage buffer updates in `useEffect`.

## Code Examples

### Density Calculation (The "Variable Height" Logic)
```typescript
import { bin, max, sum } from 'd3-array';

export function computeAdaptiveOffsets(
  data: Point[], 
  timeKey: string = 'timestamp',
  heightPerSecond: number = 1, // Linear baseline
  binCount: number = 100
) {
  // 1. Setup Binning
  const timeExtent = [minTime, maxTime];
  const binner = bin()
    .value(d => d[timeKey])
    .domain(timeExtent)
    .thresholds(binCount);
    
  const buckets = binner(data);
  
  // 2. Calculate Density Factors
  // "Low-density areas maintain their scale" implies factor >= 1.0
  // We normalize so the average density implies a factor > 1? 
  // Context: "Grow taller". So we add height.
  
  const binDensities = buckets.map(b => b.length);
  const maxDensity = max(binDensities) || 1;
  
  // Heuristic: Max density expands by Factor X (e.g., 5x)
  // Or simply: Scale proportional to count.
  // Let's use the "Maintain Scale" strict rule:
  // dz = dt * (1 + strength * (density / maxDensity))
  
  const zMap = [];
  let currentZ = 0;
  
  // We need to map bins back to time
  const timeStep = (timeExtent[1] - timeExtent[0]) / binCount;
  
  for (let i = 0; i < buckets.length; i++) {
    const density = binDensities[i];
    
    // Scale Logic:
    // Base height = timeStep * heightPerSecond
    // Added height = proportional to density
    const expansionFactor = (density / maxDensity) * 5; // Configurable strength
    const scale = 1 + expansionFactor; 
    
    const segmentHeight = timeStep * heightPerSecond * scale;
    
    zMap.push({
      time: buckets[i].x0, // Start of bin
      z: currentZ
    });
    
    currentZ += segmentHeight;
  }
  
  return { zMap, totalHeight: currentZ };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CPU Interpolation | GPU Vertex Shader | ~2018 (WebGL2) | 60fps with 100k+ points |
| Linear Histograms | Kernel Density Est. | ~2015 | Smoother visual curves |

## Open Questions

1.  **Grid Line Smoothing:**
    *   What we know: Points are exact.
    *   What's unclear: Should the grid lines be curved (splines) or just straight lines at variable intervals?
    *   Recommendation: Start with straight lines at variable intervals (simple Z-lookup). If jagged, upgrade to splines later.

2.  **Performance limit:**
    *   If points > 500k, `d3-array.bin` on main thread might frame-drop.
    *   Recommendation: Monitor perf. If needed, move `computeAdaptiveOffsets` to a Web Worker.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core d3/three stack is definitive.
- Architecture: HIGH - Shader transitions are the only performant way.
- Pitfalls: HIGH - Clipping and sync are classic issues.

**Research date:** 2026-01-31
**Valid until:** 2026-06-30
