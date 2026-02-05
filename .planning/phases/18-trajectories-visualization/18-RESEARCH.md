# Phase 18: Trajectories Visualization - Research

**Researched:** 2026-02-05
**Domain:** 3D Path Rendering, Temporal Visualization, React Three Fiber
**Confidence:** HIGH

## Summary

This research explores the implementation of trajectories within a Space-Time Cube using React Three Fiber (R3F) and Three.js. The goal is to connect related event sequences over time, using the vertical axis (Y) to represent temporal progression. 

The primary recommendation is to use `@react-three/drei`'s `<Line />` component, which utilizes `Line2` (Fat Lines) for high-quality, constant-width rendering with support for vertex-based gradients. Directionality will be indicated through color gradients (representing time) and arrowheads at the temporal "head" of each trajectory.

**Primary recommendation:** Use `@react-three/drei`'s `<Line />` with `vertexColors` for temporal gradients and a custom arrowhead mesh for direction.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-three/drei` | ^10.7.7 | `<Line />` Component | Reliable wrapper for `Line2`, handles screen-space width and gradients. |
| `three` | ^0.182.0 | `CatmullRomCurve3` | For smoothing paths if discrete segments are too jagged. |
| `d3-group` | ^3.2.4 | Data Grouping | Standard utility for grouping flat event arrays into sequences. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `three-stdlib` | Included | `Line2`, `LineGeometry` | Direct access if `<Line />` props are insufficient. |

**Installation:**
```bash
npm install @react-three/drei three d3-array
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── viz/
│       ├── TrajectoryLayer.tsx    # Manages all trajectories
│       └── Trajectory.tsx         # Individual path + arrow
└── lib/
    └── trajectories.ts            # Grouping and path generation logic
```

### Pattern 1: Temporal Gradient
**What:** Assigning colors to vertices based on their relative time within the sequence.
**When to use:** To satisfy Requirement TRAJ-02 (show temporal direction).
**Example:**
```typescript
// Source: https://github.com/pmndrs/drei#line
const points = [[x1, y1, z1], [x2, y2, z2], ...];
const colors = points.map((_, i) => {
  const t = i / (points.length - 1);
  return [t, 0.5, 1 - t]; // Gradient from Blue to Red
});

<Line 
  points={points} 
  vertexColors={colors} 
  lineWidth={2} 
/>
```

### Anti-Patterns to Avoid
- **Native `THREE.Line`:** Standard GL lines have a fixed width of 1px on most systems (especially Windows/Chrome). Avoid them for trajectories where visibility is key.
- **Over-smoothing:** Using high-degree splines on sparse temporal data can create "loop-de-loops" that don't represent real movement. Prefer linear polylines or low-tension Catmull-Rom.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screen-space lines | Custom shaders | `Line2` / `drei/Line` | Handles mitering, thickness, and anti-aliasing. |
| Grouping logic | Manual loops | `d3.group` | Handles complex multi-key grouping efficiently. |
| Curve math | Manual Bézier | `CatmullRomCurve3` | Handles N-point paths out of the box. |

## Common Pitfalls

### Pitfall 1: Stationary Objects
**What goes wrong:** A trajectory for a stationary object appears as a perfectly vertical line.
**Why it happens:** In a Space-Time Cube, $X$ and $Z$ stay constant while $Y$ (Time) increases.
**How to avoid:** This is actually correct behavior. However, you may want to add a small horizontal jitter or "halo" to make vertical lines easier to pick in 3D.

### Pitfall 2: Sorting
**What goes wrong:** Path segments "criss-cross" or jump backwards in time.
**Why it happens:** Events are not sorted by timestamp before generating the path.
**How to avoid:** Always sort grouped events by `timestamp` before mapping to coordinates.

## Code Examples

### Trajectory Grouping
```typescript
import { group } from 'd3-array';

export function groupToTrajectories(data: DataPoint[]) {
  // Group by entity ID (e.g., 'track_id' or 'case_id')
  const groups = group(data, d => d.entityId || d.type);
  
  return Array.from(groups.entries()).map(([id, points]) => ({
    id,
    points: points.sort((a, b) => a.timestamp - b.timestamp)
  }));
}
```

### Directional Arrowheads
```typescript
// Position at the last point, orient towards (last - second_to_last)
const last = points[points.length - 1];
const prev = points[points.length - 2];
const direction = new THREE.Vector3().subVectors(last, prev).normalize();

<mesh position={last} quaternion={getQuaternionFromDir(direction)}>
  <coneGeometry args={[0.2, 0.5, 8]} />
  <meshStandardMaterial color={headColor} />
</mesh>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `THREE.Line` | `Line2` (Fat Lines) | ~2018 | controllable width, better quality |
| Canvas 2D Overlays | R3F `<Line />` | 2020+ | Full 3D integration, depth sorting |

## Open Questions

1. **Entity Identification:** Does the current dataset provide a reliable grouping key (e.g., `track_id`)?
   - *Recommendation:* If not, mock data should be updated to simulate sequences, and real data should use `primary_type` or similar as a fallback grouping.
2. **Path Complexity:** For very long sequences, should we simplify the path?
   - *Recommendation:* Use Ramer-Douglas-Peucker simplification if performance drops.

## Sources

### Primary (HIGH confidence)
- `@react-three/drei` Documentation - [Line Component](https://github.com/pmndrs/drei#line)
- Three.js Examples - [Fat Lines](https://threejs.org/examples/?q=line#webgl_lines_fat)

### Secondary (MEDIUM confidence)
- "Space-Time Cube" Visualization Research - General patterns for trajectory mapping (X/Z for space, Y for time).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `drei/Line` is the industry standard for R3F paths.
- Architecture: HIGH - Grouping-then-sorting is the correct data pattern.
- Pitfalls: MEDIUM - Based on common issues in temporal 3D viz.

**Research date:** 2026-02-05
**Valid until:** 2026-05-05
