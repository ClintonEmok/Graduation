# Space-Time Cube Design Decisions

**Purpose:** Document the rationale behind the 3D Space-Time Cube visualization design.

**Last updated:** 2026-03-31

---

## Overview

The Space-Time Cube (STC) is a classic visualization technique that maps spatial dimensions to X-Z plane and temporal dimension to Y-axis. This implementation extends the traditional STC with **adaptive time scaling** to better reveal bursty patterns in spatiotemporal data.

---

## Core Design Decisions

### D1: 3D Rendering with React Three Fiber

**Decision:** Implement STC using React Three Fiber (R3F) with Three.js.

**Rationale:**
- React ecosystem integration (component-based architecture)
- Declarative 3D scene definition
- Efficient instanced rendering for 1.2M points
- GPU-accelerated shaders for adaptive warping
- Mature ecosystem with good DX

**Implementation:** `src/components/viz/CubeVisualization.tsx`

**Alternatives Considered:**
| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Raw Three.js | Maximum control | Imperative, harder state sync | Rejected |
| Deck.gl | Geospatial focus | Less suited for 3D timeline | Rejected |
| Vega 3D bindings | Declarative | Limited customization | Rejected |

---

### D2: Vertical Time Axis

**Decision:** Map time to Y-axis (vertical), space to X-Z plane (horizontal).

**Rationale:**
- Matches conventional timeline metaphors (later = higher)
- Separates spatial and temporal interpretation
- Allows "looking down" at spatial distribution at any time slice
- Supports intuitive panning through time via vertical navigation

**Coordinate System:**
```
        Y (Time: 0-100 normalized)
        │
        │
        └──────── X (Longitude)
       ╱
      Z (Latitude)
```

---

### D3: Instance-Based Point Rendering

**Decision:** Use instanced mesh for point rendering instead of individual meshes.

**Rationale:**
- Single draw call for all points (vs. millions of draw calls)
- GPU-friendly attribute buffers
- Supports per-instance color via `instanceColor`
- Maintains 60fps with 1.2M points

**Implementation:** `src/components/viz/DataPoints.tsx`

```typescript
<instancedMesh args={[geometry, material, count]}>
  {colors && (
    <instancedBufferAttribute 
      attach="instanceColor" 
      args={[colors, 3]} 
    />
  )}
</instancedMesh>
```

**Performance:**
| Point Count | Draw Calls | Frame Rate |
|-------------|------------|------------|
| 10,000 | 1 | 60fps |
| 100,000 | 1 | 60fps |
| 1,200,000 | 1 | 60fps (with LOD) |

---

### D4: GPU-Based Adaptive Warping

**Decision:** Compute adaptive Y positions in vertex shader via texture lookup.

**Rationale:**
- Warping 1.2M points on CPU would block UI thread
- GPU texture lookup is O(1) per vertex
- Smooth interpolation between uniform and adaptive modes
- Web Worker computes warp map, GPU applies it

**Shader Pipeline:**

```
┌─────────────────────────────────────────────────────────────┐
│ Warp Computation (Web Worker)                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Input: timestamps, domain, config                        │ │
│ │ Process: KDE smoothing → weight calculation → CDF       │ │
│ │ Output: Float32Array warpMap (size = binCount)          │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Transfer to GPU
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Vertex Shader (GPU)                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Normalize linearY to 0-1                              │ │
│ │ 2. Sample warp texture at normalizedTime                 │ │
│ │ 3. Mix: currentY = mix(linearY, adaptiveY, warpFactor)  │ │
│ │ 4. Apply to world position                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:** `src/components/viz/shaders/ghosting.ts:86-133`

```glsl
// Normalize linearY to 0-1 for texture lookup
float warpSpan = max(0.0001, uWarpDomainMax - uWarpDomainMin);
float normalizedTime = clamp((linearY - uWarpDomainMin) / warpSpan, 0.0, 1.0);

// Sample adaptive position from texture
float adaptiveY = texture2D(uWarpTexture, vec2(normalizedTime, 0.5)).r;

// Mix based on uWarpFactor (0 = Linear, 1 = Adaptive)
float currentY = mix(linearY, adaptiveY, uWarpFactor);
```

---

### D5: Focus+Context via Shader Dithering

**Decision:** Use stochastic dithering for ghosting non-selected points.

**Rationale:**
- Uniform transparency creates alpha blending artifacts
- Dithering ensures stable appearance at any density
- GPU-friendly (no blending state changes)
- Perceptually smooth transition between focus and context

**Implementation:** `src/components/viz/shaders/ghosting.ts:226-265`

---

### D6: Coordinate Normalization

**Decision:** Normalize all coordinates to a 100-unit cube (0-100 on each axis).

**Rationale:**
- Consistent scale for shaders and interactions
- Avoids floating-point precision issues
- Simplifies camera and lighting setup
- Easy to reason about (percentage of range)

**Normalization:**
```typescript
// Spatial (X, Z)
const x = ((longitude - lonMin) / (lonMax - lonMin) * 100) - 50;
const z = ((latitude - latMin) / (latMax - latMin) * 100) - 50;

// Temporal (Y)
const y = ((timestamp - timeMin) / (timeMax - timeMin) * 100);
```

---

### D7: Time Slice Visualization

**Decision:** Render time slices as semi-transparent planes perpendicular to Y-axis.

**Rationale:**
- Clear visual indication of selected time regions
- Matches spatial extent of cube (full X-Z coverage)
- Supports multiple simultaneous slices
- Clickable for selection

**Implementation:** `src/components/viz/SlicePlane.tsx`

```tsx
<mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
  <planeGeometry args={[100, 100]} />
  <meshBasicMaterial 
    color={color} 
    transparent 
    opacity={0.1} 
    side={THREE.DoubleSide} 
  />
</mesh>
```

---

### D8: Heatmap Overlay Integration

**Decision:** Render STKDE heatmap as a 2D plane at base of cube.

**Rationale:**
- Shows spatial density independent of time
- Allows comparison with point distribution
- GPU-accelerated shader for smooth rendering
- Toggleable without affecting point visibility

**Implementation:** `src/components/viz/HeatmapOverlay.tsx`

---

## Scene Composition

### Layer Structure

```
Scene
├── MainCamera (PerspectiveCamera)
├── OrbitControls
├── TimeGrid (horizontal grid lines)
├── DataPoints (instanced point cloud)
├── TimeSlices (slice planes)
├── HeatmapOverlay (optional)
├── TrajectoryLayer (optional)
├── ClusterHighlights (optional)
└── TimePlane (base reference plane)
```

### Lighting Model

**Decision:** Use minimal lighting for point cloud.

**Rationale:**
- Points are rendered with vertex colors
- Lighting would interfere with color perception
- Scene is predominantly self-illuminated
- Grid and planes use basic materials (unlit)

---

## Interaction Handling

### Raycasting for Point Selection

**Implementation:** `src/components/viz/RaycastLine.tsx`

```typescript
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

const intersects = raycaster.intersectObject(instancedMesh);
if (intersects.length > 0) {
  const instanceId = intersects[0].instanceId;
  // Handle selection
}
```

### Camera Controls

**Implementation:** `src/components/viz/Controls.tsx`

| Action | Effect |
|--------|--------|
| Left drag | Orbit (rotate around center) |
| Right drag | Pan |
| Scroll | Zoom |
| Double-click | Reset camera |

---

## Performance Optimizations

### LOD (Level of Detail)

**Decision:** Reduce point size and fade points at distance.

**Implementation:** `src/components/viz/shaders/ghosting.ts:118-119,183-189`

```glsl
// Shrink points as we zoom out
vec3 transformedCopy = transformed * (1.0 - uLodFactor);

// Dither out points at extreme zoom
if (uLodFactor > 0.05) {
  float dither = mod(gl_FragCoord.x + gl_FragCoord.y, 2.0);
  if (uLodFactor > 0.8 || (uLodFactor > 0.4 && dither > 0.5)) {
    discard;
  }
}
```

### Frustum Culling

Points outside camera frustum are automatically culled by Three.js.

### Batch Updates

Warp texture updates use `needsUpdate = false` for intermediate frames, only uploading to GPU on final frame.

---

## Visual Design Choices

### Color Palette

**Decision:** Dark background with high-contrast categorical colors.

**Rationale:**
- Points visible against dark background
- Reduces eye strain for extended use
- Matches common visualization tools (dark IDEs, etc.)
- Alternative themes available (light, colorblind-safe)

**See:** `src/lib/palettes.ts`

### Grid Design

**Decision:** Subtle gray horizontal lines for temporal reference.

**Rationale:**
- Provides temporal orientation without visual clutter
- 10% opacity for unobtrusive reference
- Orange highlight lines for special time markers

**Implementation:** `src/components/viz/TimeGrid.tsx`

---

## Key Architectural Patterns

### Pattern 1: Store-Driven Rendering

```
┌─────────────────────────────────────────────────────────────┐
│ Zustand Store (useAdaptiveStore)                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ densityMap, burstinessMap, warpMap                       │ │
│ │ warpFactor, burstThreshold                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Reactive subscription
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ CubeVisualization Component                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Subscribes to store state                                │ │
│ │ Passes uniforms to shader                                │ │
│ │ Re-renders on state changes                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: Worker-Based Computation

```
┌─────────────────────────────────────────────────────────────┐
│ Main Thread                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ computeMaps(timestamps, domain, config)                  │ │
│ │ - Posts message to worker                                │ │
│ │ - Sets isComputing = true                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ postMessage
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Web Worker                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ computeAdaptiveMaps(timestamps, domain, config)         │ │
│ │ - KDE smoothing                                          │ │
│ │ - Weight calculation                                      │ │
│ │ - Warp map generation                                     │ │
│ │ - postMessage result                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ onmessage
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Main Thread (Store Update)                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ - Receives densityMap, warpMap                           │ │
│ │ - Updates store state                                    │ │
│ │ - Triggers shader uniform update                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparison with Traditional Space-Time Cube

| Aspect | Traditional STC | Adaptive STC (this implementation) |
|--------|-----------------|-----------------------------------|
| Time axis | Uniform (linear) | Uniform + Adaptive (non-linear) |
| Burst visibility | Hidden in dense regions | Expanded for visibility |
| Interaction | Static view | Dynamic warp control |
| Point density | All visible | Focus+Context ghosting |
| Performance | Limited points | GPU-accelerated (1.2M) |
| Linked views | Typically single view | Coordinated multi-view |

---

## References

- Hägerstraand, T. (1970). *What about people in regional science?*
- Kraak, M.J. & Koussoulakou, A. (2005). *A visualization environment for the space-time cube*
- Andrienko, G. & Andrienko, N. (2010). *Visual analytics of movement: An overview*
