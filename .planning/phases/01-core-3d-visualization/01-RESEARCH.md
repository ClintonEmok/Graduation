# Phase 01: Core 3D Visualization - Research

**Researched:** 2025-01-31
**Domain:** 3D Visualization & Geospatial Integration
**Confidence:** HIGH

## Summary

Phase 01 requires establishing a 3D environment that can toggle between a geospatial view (MapLibre) and an abstract visualization (Space-Time Cube), while maintaining high-performance rendering for data points.

The core technical challenge is synchronizing the 3D scene (React Three Fiber) with the 2D map (MapLibre). While "Deep Integration" (rendering R3F inside MapLibre's GL context) is the standard for map-centric apps, it limits camera freedom (pitch/rotation). For a Space-Time Cube where users must inspect data from all angles, a **Synced Overlay** architecture or **Custom Layer** with "Center-Relative" coordinates is required.

**Primary recommendation:** Use **MapLibre GL JS** (via `react-map-gl`) as the "World Container" and render the visualization using **React Three Fiber** inside a custom MapLibre layer for perfect sync, utilizing `InstancedMesh` for performance.

## Standard Stack

The established libraries for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 18.x | UI Framework | Project Standard |
| `@react-three/fiber` | 8.x | 3D Renderer | The standard React reconciler for Three.js |
| `@react-three/drei` | 9.x | 3D Helpers | Essential utilities (CameraControls, Html, Stats) |
| `three` | 0.160+ | 3D Engine | Core WebGL library |

### Geospatial & Navigation
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `maplibre-gl` | 4.x | Map Engine | Open-source fork of Mapbox GL JS (Decision: VIS-05) |
| `react-map-gl` | 7.1+ | Map Wrapper | React bindings for MapLibre; simplifies state management |
| `camera-controls` | via Drei | Navigation | Superior to OrbitControls for programmatic smooth transitions (VIS-02) |

### Supporting
| Library | Version | Purpose |
|---------|---------|---------|
| `@math.gl/web-mercator` | Latest | Coordinate Sync | Projecting Lng/Lat to 3D World Coordinates (if manual sync needed) |

**Installation:**
```bash
npm install three @types/three @react-three/fiber @react-three/drei
npm install maplibre-gl react-map-gl
```

## Architecture Patterns

### Recommended Integration: Custom Layer Pattern
Instead of two separate canvases (which causes "floaty" visual disconnects), render R3F *inside* the MapLibre context.

```
src/
├── components/
│   ├── map/
│   │   ├── MapContainer.tsx    # Handles MapLibre instance
│   │   └── ThreeLayer.tsx      # The Bridge: R3F Canvas inside Map Layer
│   └── visualization/
│       ├── SpaceTimeCube.tsx   # The actual 3D content
│       └── Controls.tsx        # Camera Logic
```

### Pattern 1: The "Threebox" Bridge (Custom Layer)
**What:** Using MapLibre's `CustomLayerInterface` to render Three.js scenes.
**When to use:** When 3D objects must stick perfectly to the map during zoom/pan.
**Example:**
```typescript
// Conceptual implementation
import { useControl } from 'react-map-gl';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';

function ThreeLayer() {
  useControl(() => ({
    id: 'r3f-layer',
    type: 'custom',
    renderingMode: '3d',
    onAdd: (map, gl) => {
      // Create a virtual root to render R3F into the Map's GL context
      // Note: Requires careful context sharing
    },
    render: (gl, matrix) => {
      // Update Camera Projection Matrix here to match MapLibre
    }
  }));
  return null;
}
```

### Pattern 2: Center-Relative Coordinates (Jitter Prevention)
**What:** Subtracting the "Map Center" coordinates from all data points.
**Why:** WebGL floats lose precision at global Mercator scales (millions of units), causing "shaking" models.
**Implementation:**
1. Pick a center (e.g., Chicago centroid).
2. Convert Center to World Coords (`Cx, Cy`).
3. For each point `P`, render at `(Px - Cx, Py - Cy)`.
4. Move the Three.js camera to match the map, offset by `Cx, Cy`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Navigation** | Custom mouse listeners | `drei/CameraControls` | Handles damping, constraints, and smooth resets correctly. |
| **Projections** | Custom Lat/Lon math | `mapbox-gl` / `maplibre-gl` internal or `@math.gl/web-mercator` | Mercator projection is non-linear and complex. |
| **Point Rendering** | `THREE.Points` or Loops | `InstancedMesh` | Loops kill CPU. `Points` have size limitations. Instancing handles 100k+ objects. |

**Key insight:** Coordinate synchronization between "Map World" and "Three.js World" is the #1 source of bugs. Use established libraries to handle the matrices.

## Common Pitfalls

### Pitfall 1: Double Event Handling
**What goes wrong:** User drags to rotate cube, but Map pans instead (or vice versa).
**Why it happens:** Both MapLibre and R3F canvas listen to DOM events on overlapping elements.
**How to avoid:**
- **Mode A (Map Active):** Disable R3F controls, let MapLibre drive the camera.
- **Mode B (Abstract):** Disable MapLibre interaction, let R3F drive.
- **Better:** Use a single event source (MapLibre) and sync the camera, accepting MapLibre's navigation constraints (no looking from underground).

### Pitfall 2: The "Floaty" Overlay
**What goes wrong:** 3D points drift away from map buildings during fast pans.
**Why:** Two separate Canvases updating on different frames or with slight matrix mismatches.
**How to avoid:** Use the **Custom Layer** approach (single WebGL context) or `deck.gl`. For this project, Custom Layer with `react-map-gl` is the React-native way.

### Pitfall 3: Z-Fighting with Map
**What goes wrong:** 3D points at `z=0` flicker against the map tiles.
**How to avoid:** Raise the base of the Space-Time Cube slightly (`y > 0.1`) or disable depth testing against the map background if using an overlay.

## Code Examples

### Efficient Point Rendering (InstancedMesh)
```typescript
// Source: @react-three/drei docs
import { Instances, Instance } from '@react-three/drei'

function DataPoints({ data }) {
  return (
    <Instances range={1000}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="hotpink" />
      {data.map((point, i) => (
        <Instance key={i} position={[point.x, point.y, point.z]} />
      ))}
    </Instances>
  )
}
```

### Camera Smooth Reset (VIS-02)
```typescript
import { CameraControls } from '@react-three/drei'

function Scene() {
  const ref = useRef()
  // VIS-02: Reset behavior
  const reset = () => ref.current?.reset(true) // true = animated
  return <CameraControls ref={ref} smoothTime={0.25} />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|------------------|--------------|
| `OrbitControls` only | `CameraControls` | 2023 (Drei v9) |
| Canvas Overlay | Custom Layer Interface | 2021 (Mapbox/MapLibre) |
| `THREE.Points` | `InstancedMesh` | Three r110+ |

## Open Questions

1. **Map Interaction Limits**
   - What we know: MapLibre clamps pitch at 85°.
   - What's unclear: Is this sufficient for a "Space-Time Cube" which ideally allows full 360° inspection?
   - Recommendation: Accept the limit for Phase 01. If users complain in testing, switch to "Abstract Mode" being a pure R3F scene with a static map image (allowing full rotation).

## Sources

### Primary (HIGH confidence)
- **React Three Fiber Docs** - Scene setup and ecosystem.
- **MapLibre GL JS Docs** - Custom Layer Interface specifications.

### Secondary (MEDIUM confidence)
- **WebSearch** - Confirmation of `react-map-gl/maplibre` as the standard React wrapper.
- **WebSearch** - Verified `CameraControls` smooth transition capabilities.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Very stable React ecosystem.
- Architecture: HIGH - Custom Layers are the documented way to mix GL contexts.
- Pitfalls: HIGH - Common issues well documented in community.

**Research date:** 2025-01-31
**Valid until:** 2025-06-30
