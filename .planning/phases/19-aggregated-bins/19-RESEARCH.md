# Phase 19: Aggregated Bins (LOD) - Research

**Researched:** 2026-02-05
**Domain:** Spatial-Temporal Data Aggregation & Level-of-Detail (LOD) Visualization
**Confidence:** HIGH

## Summary

This phase introduces a "Macro View" for the Space-Time Cube (STC). As the user zooms out, individual data points (spheres) transition into aggregated 3D bars (boxes) that represent the density of events in spatial-temporal bins. This solves the visual "soup" and performance degradation caused by rendering thousands of overlapping points at a distance.

The implementation relies on a grid-based binning algorithm that groups points by X, Y (Time), and Z coordinates. A distance-based LOD controller will cross-fade between the `DataPoints` (InstancedMesh of spheres) and the new `AggregatedBars` (InstancedMesh of boxes).

**Primary recommendation:** Implement a dedicated `AggregationManager` that performs grid-based binning on the filtered dataset. Use a shader-based cross-fade (uLODFactor) triggered by camera distance for smooth transitions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | ^0.182.0 | 3D Rendering | Project core |
| `@react-three/fiber` | ^9.5.0 | React integration | Scene management |
| `d3-array` | ^3.2.4 | Data processing | efficient min/max and binning utilities |
| `zustand` | ^5.0.10 | State management | Store bin results and LOD state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-three/drei` | ^10.7.7 | Helpers | Accessing `CameraControls` or `LOD` component |
| `lodash.debounce` | ^4.0.8 | Performance | Debouncing binning calculations |

**Installation:**
```bash
# No new packages required; using existing project stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── viz/
│   │   ├── AggregationManager.tsx   # Calculates bins (Logic-only)
│   │   ├── AggregatedBars.tsx       # Renders InstancedMesh boxes
│   │   └── LODController.tsx        # Manages transition factor based on zoom
├── store/
│   └── useAggregationStore.ts       # Stores current binned data
```

### Pattern 1: Grid-Based 3D Binning
**What:** Partition the STC volume into a 3D grid and count points per cell.
**When to use:** When you need a regular, predictable overview of density.
**Logic:**
1. Calculate `binX = floor(point.x / stepX)`, `binY = floor(point.y / stepY)`, `binZ = floor(point.z / stepZ)`.
2. Generate a key: `const key = `${bx}_${by}_${bz}`;`.
3. Accumulate: `counts[key] = (counts[key] || 0) + 1;`.

### Pattern 2: Distance-Based LOD Factor
**What:** Calculate a continuous value [0, 1] based on camera distance.
**When to use:** To drive smooth shader transitions (fading points out while fading bars in).
**Example:**
```typescript
// In LODController.tsx
useFrame(({ camera }) => {
  const distance = camera.position.length(); // distance from origin
  const factor = MathUtils.clamp((distance - NEAR_LIMIT) / (FAR_LIMIT - NEAR_LIMIT), 0, 1);
  setLodFactor(factor); // Store or Uniform
});
```

### Anti-Patterns to Avoid
- **Recalculating Bins on Every Frame:** Binning is an O(N) operation. Only recalculate when the data/filters change or the grid resolution changes.
- **Using 3D Binning for 2D Maps:** If the user is in "Map Mode" (Top-down), the temporal (Y) bins might overlap. Ensure the "Macro View" works well in both Abstract and Map modes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geometry Instancing | Individual `<mesh>` tags | `instancedMesh` | Scaling to thousands of bins without draw-call overhead. |
| Binning Utilities | Manual loop (sometimes okay) | `d3.bin()` / `d3.rollup()` | D3 is highly optimized for data grouping and rollups. |
| Smooth Damping | `setTimeout` or raw math | `MathUtils.damp()` | Standard Three.js way to handle frame-rate independent smoothing. |

## Common Pitfalls

### Pitfall 1: Overlapping Bars (Z-Fighting)
**What goes wrong:** During transition (LOD factor between 0 and 1), spheres and boxes occupy the same space.
**How to avoid:** Use `transparent: true` on both materials. Offset the boxes slightly or ensure the boxes only reach full opacity when points are at 0 opacity.

### Pitfall 2: Height vs. Time Axis
**What goes wrong:** If height proportional to count is applied to the Y-axis (which is Time), bars in the same spatial column but different time bins will overlap vertically.
**How to avoid:**
- Option A: Bars have a fixed height (matching the temporal bin size) and use **color/opacity** for density.
- Option B: Use **scale** on all axes (Voxels) instead of just height.
- Option C: "Macro View" only applies to spatial aggregation (X, Z) while collapsing Time (Y) into height. *Note: Requirement AGG-01 specifies spatial-temporal bins, so Option A or B is preferred.*

## Code Examples

### 3D Binning with D3 Rollup
```typescript
// Source: https://d3js.org/d3-array/group#rollup
import { rollup, sum } from 'd3-array';

const bins = rollup(
  data,
  v => ({
    count: v.length,
    dominantType: getDominantType(v),
    avgX: (Math.floor(v[0].x / step) * step) + step/2,
    // ...
  }),
  d => `${Math.floor(d.x/step)}_${Math.floor(d.y/step)}_${Math.floor(d.z/step)}`
);
```

### Shader Cross-Fade (Snippet)
```glsl
// In Vertex/Fragment shader
uniform float uLodFactor; // 0: Points, 1: Bins

void main() {
  // In DataPoints shader
  float opacity = 1.0 - uLodFactor;
  // In AggregatedBars shader
  float opacity = uLodFactor;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discrete LOD | Continuous LOD | Three r100+ | Smooth transitions instead of "popping" |
| CPU Binning | GPU Binning (Compute) | WebGPU/Recent | Faster for millions of points, but CPU is sufficient for 10-100k. |

## Open Questions

1. **Grid Resolution:** Should the bin size be user-configurable or automatic based on data bounds?
   - *Recommendation:* Start with a fixed 3D grid (e.g., 32x32x16) and adjust in a later refinement phase if needed.
2. **"Height = Count" vs Time Axis:** If we are in the 3D cube, does a tall bar mean "High count" or "Long duration"?
   - *Recommendation:* Follow the prompt "height = count" but use a scaling factor to ensure bars don't obscure the entire cube.

## Sources

### Primary (HIGH confidence)
- Three.js Documentation - `LOD` and `InstancedMesh`
- React Three Fiber - `useFrame` and `useThree`
- Project Source: `src/components/viz/DataPoints.tsx` (Current rendering foundation)
- Project Source: `src/components/viz/ClusterManager.tsx` (Logic-only pattern)

### Metadata
**Confidence breakdown:**
- Standard stack: HIGH - Built on existing proven stack.
- Architecture: HIGH - Follows established patterns in the codebase.
- Pitfalls: MEDIUM - Requires visual tuning during implementation.

**Research date:** 2026-02-05
**Valid until:** 2026-03-05
