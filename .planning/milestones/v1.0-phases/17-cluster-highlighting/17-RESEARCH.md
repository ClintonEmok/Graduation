# Phase 17: Cluster Highlighting - Research

**Researched:** 2026-02-05
**Domain:** Spatial-Temporal Clustering & 3D Annotation
**Confidence:** HIGH

## Summary

Phase 17 focuses on automated discovery and visualization of high-density regions within the Space-Time Cube. This involves implementing a CPU-side clustering algorithm (DBSCAN) that respects both spatial coordinates (X, Z) and the temporal dimension (Y), while being fully aware of the "Adaptive Time" distortion.

The standard approach for this domain in WebGL/Three.js is to perform clustering on the CPU (using filtered point data) and render highlights using a combination of semi-transparent geometry and billboarded labels.

**Primary recommendation:** Use DBSCAN on the CPU for cluster detection, using the already-computed adaptive Y positions to ensure visual accuracy, and visualize with `@react-three/drei`'s `Html` and `Box` primitives.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ml-dbscan` | ^3.1.0 | DBSCAN Algorithm | Robust, handles noise, easy to implement distance weighting. |
| `three` | ^0.182.0 | 3D Rendering | Core engine for geometry and math. |
| `@react-three/drei` | ^10.7.7 | Helper Components | Provides `Html` (billboarding), `Line`, and `Edges`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `camera-controls` | ^2.9.0 | Camera Navigation | Used for `fitToBox` animated transitions. |
| `zustand` | ^5.0.10 | State Management | Storing cluster metadata and sensitivity settings. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ml-dbscan` | Custom implementation | Custom allows for zero dependencies and manual optimization. |
| `Html` | `Text` (Troika) | `Text` is more performant for 100+ labels; `Html` is better for complex UI styles. |

**Installation:**
```bash
npm install ml-dbscan
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/viz/
│   ├── ClusterHighlight.tsx    # Renders boxes and labels for a single cluster
│   ├── ClusterManager.tsx      # Orchestrates clustering logic and visibility
│   └── ClusterLabels.tsx       # Parent for billboarded HTML labels
├── store/
│   └── useClusterStore.ts      # Stores sensitivity, active clusters, and selection
└── hooks/
    └── useClustering.ts        # Hook to compute clusters when data/filters change
```

### Pattern 1: Weighted Distance Metric
DBSCAN requires a distance function. To emphasize spatial over temporal proximity:
```typescript
const distanceFn = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  const dy = (p1.y - p2.y) * Y_WEIGHT; // Y_WEIGHT ~ 0.5
  return Math.sqrt(dx*dx + dz*dz + dy*dy);
};
```

### Pattern 2: Adaptive-Aware Clustering
Since `DataPoints.tsx` already calculates `adaptiveYValues` on the CPU, the clustering logic should consume these values instead of raw timestamps when Adaptive Mode is active.
- **Source:** `src/components/viz/DataPoints.tsx` (Prop or context)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera Transitions | Custom Tweening | `controls.fitToBox()` | Handles zoom, rotation, and clipping prevention. |
| 3D Labels | Custom Sprites | Drei `<Html>` | Easiest way to use Tailwind CSS in 3D space. |
| AABB Calculation | Custom Math | `THREE.Box3.setFromPoints()` | Optimized and handles edge cases. |

## Common Pitfalls

### Pitfall 1: Filtering Mismatch
**What goes wrong:** Clusters appear for points that are hidden by the UI (e.g., filtered by type).
**Why it happens:** Clustering runs on the full dataset while the shader handles filtering.
**How to avoid:** The clustering hook must replicate the filtering logic (Type, District, Time, Spatial) from `useFilterStore` before passing points to DBSCAN.

### Pitfall 2: Performance Bottleneck
**What goes wrong:** UI freezes for 100ms-500ms when moving filters.
**Why it happens:** DBSCAN is O(N^2) or O(N log N).
**How to avoid:** 
- Debounce clustering on filter changes.
- Use a Web Worker for data sets > 10,000 points.
- Limit max points processed (e.g., only cluster first 5,000 points).

## Code Examples

### Cluster Focus (Camera)
```typescript
// Source: https://github.com/yomotsu/camera-controls#readme
const focusOnCluster = (clusterBox: THREE.Box3) => {
  const controls = cameraControlsRef.current;
  if (!controls) return;
  
  controls.fitToBox(clusterBox, true, {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2
  });
};
```

### Billboard Label with Leader Line
```typescript
// Source: https://drei.docs.pmnd.rs/components/html
<group position={center}>
  <Line 
    points={[[0, 0, 0], [0, 5, 0]]} 
    color="white" 
    lineWidth={1} 
    transparent 
    opacity={0.5} 
  />
  <Html position={[0, 5, 0]} center transform>
    <div className="bg-slate-900/80 p-2 rounded border border-cyan-500">
       {label}
    </div>
  </Html>
</group>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| K-Means | DBSCAN | N/A | DBSCAN doesn't require "K" and finds density-based shapes. |
| CSS2DObject | Drei `<Html>` | 2022 | Easier React integration and better performance via `transform`. |

## Open Questions

1. **Worker Necessity:** Is 10,000 points on the main thread acceptable for DBSCAN? 
   - *Recommendation:* Start with debounced main-thread; move to Worker only if JANK is observed.
2. **Dynamic Weighting:** Should the spatial-temporal weighting be a user setting?
   - *Decision:* Hardcode 2:1 ratio (Spatial:Time) for now to keep UI simple.

## Sources

### Primary (HIGH confidence)
- `camera-controls` - Official README for `fitToBox` API.
- `@react-three/drei` - Documentation for `Html`, `Line`, and `Edges`.
- `three.js` - `Box3` and `EdgesGeometry` documentation.

### Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are mature and standard in R3F.
- Architecture: HIGH - Follows existing store/component patterns in project.
- Pitfalls: HIGH - Based on common performance/logic issues in spatial apps.

**Research date:** 2026-02-05
**Valid until:** 2026-03-05
