# Stack Research — Visualization Level-Up

**Domain:** Spatiotemporal crime pattern visualization (burst rendering, temporal evolution, 3D cognitive load reduction)
**Researched:** 2026-05-26
**Confidence:** HIGH (all versions verified via Context7 + npm registry)

## Executive Summary

This research identifies stack additions for a visualization level-up milestone on an existing Adaptive Space-Time Cube prototype. The project already has Three.js 0.182 + React Three Fiber 9.5 + drei 10.7 for 3D, MapLibre 5.17 for maps, and @visx for 2D charts. The level-up needs burst visibility (bloom, particle systems), temporal evolution (smooth interpolation, aging trails), constrained cameras, GPU-based density layers, and performance monitoring.

**Key finding:** The existing stack already covers most needs. Only three strategic additions are justified: (1) `@react-three/postprocessing` for bloom and selective bloom effects, (2) `deck.gl` with `@deck.gl/aggregation-layers` for GPU-based heatmap density overlays, and (3) `GSAP` for sequenced temporal animations that don't fight React reconciliation. Camera controls need no new library — the existing `CameraControls` from drei can be constrained via its API. Web Workers already handle off-main-thread computation; GPU.js and WebGPU compute shaders are NOT recommended (premature/overkill for this prototype).

## Recommended Stack

### Core Visualization (Existing — No Changes Needed)

| Technology | Version | Purpose | Why Already Correct |
|------------|---------|---------|---------------------|
| Three.js | ^0.182.0 | 3D rendering engine | Provides ShaderMaterial, InstancedMesh, Points system, BufferGeometry — all necessary for burst rendering |
| @react-three/fiber | ^9.5.0 | React renderer for Three.js | useFrame for per-frame animation, ShaderMaterial with stable uniforms pattern, Canvas with dpr/frameloop config |
| @react-three/drei | ^10.7.7 | Helpers for R3F | Instances (wraps InstancedMesh), CameraControls, OrbitControls, Bounds, Stats, PerformanceMonitor, AdaptiveDpr |
| @types/three | ^0.182.0 | TypeScript types | Must stay version-matched with three |

**Rationale:** These are already installed and working. The existing ShaderMaterial + Instances + Points stack in drei/R3F is sufficient for burst rendering. No upgrade needed.

### Additions for Burst Visibility

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @react-three/postprocessing | ^3.0.4 | Post-processing effects pipeline | Provides Bloom (full-scene glow), SelectiveBloom (glow only on burst-highlighted meshes), DepthOfField, custom effects |
| — | — | Custom ShaderMaterial | Already in Three.js — write custom GLSL for burst opacity, kernel size amplification, color intensity shifts |
| — | — | drei `<Instances>` | Already installed — use with custom instanced attributes for per-burst color/opacity/scale |

**Version context:**
- `@react-three/postprocessing@3.0.4` is current (verified npm registry 2026-05-26)
- Compatible with @react-three/fiber >=9 and postprocessing (the lower-level lib it wraps)

### Additions for GPU-Based Density / Heatmap

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| deck.gl | ^9.3.2 | WebGL2/WebGPU data visualization framework | HeatmapLayer uses **GPU-based Gaussian kernel density estimation** — real-time density without CPU bottlenecks |
| @deck.gl/aggregation-layers | ^9.3.2 | GPU-accelerated aggregation layers | HeatmapLayer, ScreenGridLayer, HexagonLayer with `gpuAggregation: true` |
| @deck.gl/mapbox | ^9.3.2 | Interleaved rendering within MapLibre | `MapboxOverlay` lets deck.gl layers render inside the MapLibre GL scene (beforeId for layer ordering) |

**Why deck.gl, not alternatives:**
- MapLibre's built-in `heatmap` layer is good but doesn't support GPU aggregation beyond basic weighted rendering
- GPU.js (2.16.0) is deprecated-feeling — transpiles JS → GLSL with overhead, no maintained ecosystem for this use case
- WebGPU compute shaders have insufficient browser support (Chrome-only effectively)
- deck.gl is actively maintained (visgl/uber), integrates directly with react-map-gl/maplibre

### Additions for Temporal Evolution

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GSAP | ^3.15.0 | Professional animation sequencing | Animates camera fly-throughs, transition between time slices, aging/fading trails — runs outside React render cycle, no reconciliation issues |

**Why GSAP, not alternatives:**
- **@react-spring/three (10.1.0):** Spring physics is overkill for this use case (we need sequenced transitions, not physics-driven inertia). Adds 30KB+ bundle. The `animated` wrapper pattern can cause re-render overhead when updating many Three.js objects.
- **Framer Motion / Motion for R3F:** Only supports React 18 (confirmed in Motion docs — "currently only compatible with React 18"). The project uses React 19.2.3. **Incompatible.**
- **useFrame:** Still the right tool for per-frame interpolation (position.lerp, opacity ramps) — use for simple persistent animations without adding a dep.

**GSAP integration pattern:**
```typescript
// Target Three.js object refs directly — no React state, no re-renders
import gsap from 'gsap'

function animateSliceTransition(meshRef: THREE.Mesh, targetOpacity: number) {
  gsap.to(meshRef.current.material, {
    opacity: targetOpacity,
    duration: 0.5,
    ease: 'power2.inOut',
  })
}
```

### Camera Controls (Already Present — Configure, Don't Add)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| drei `<CameraControls>` | 10.7.7 | Full camera rig with constraints | Already used in `MainScene.tsx` and `Stkde3DScene.tsx` |
| drei `<OrbitControls>` | 10.7.7 | Orbit-style camera | Already used in `TimelineTest3DScene.tsx` |
| drei `<Bounds>` | 10.7.7 | Auto-framing scene objects | Available, not yet used |

**No new camera library needed.** The existing CameraControls can be configured with:
- `minPolarAngle` / `maxPolarAngle` (prevents below-horizon / overhead flip)
- `minDistance` / `maxDistance` (prevents zoom-through or too-far-out)
- `azimuthRotateSpeed` / `polarRotateSpeed` (slow rotation for analytical viewing)
- `mouseButtons` — configure left=rotate, middle=dolly, right=disable (prevents accidental pan)
- `dollyToCursor: false` (predictable zoom behavior)

For an eagle-eye default: set camera at position `[0, highY, highZ]` looking at origin, restrict polar angle to `[0, Math.PI/3]` (never below horizon, never top-down), restrict azimuth to configurable range if analyzing specific city quadrant.

### Performance Monitoring (All Available in Existing Stack)

| Tool | Source | Purpose |
|------|--------|---------|
| `<Stats />` | drei | FPS / frame-time monitor panel |
| `<PerformanceMonitor>` | drei | Adaptive quality — `onIncline`/`onDecline` callbacks trigger dpr changes |
| `<AdaptiveDpr>` | drei | Automatically lowers pixel ratio during interaction |
| `<AdaptiveEvents>` | drei | Disables raycasting during performance regression |
| `frameloop="demand"` | R3F Canvas | Only render on state changes or `invalidate()` calls |
| `performance={{ min: 0.5 }}` | R3F Canvas | Quality-of-service: drops resolution when framerate dips |
| Spector.js | External browser extension | Capture/interact WebGL frame for shader debugging |

**External profiling tools:** Chrome DevTools Performance tab + Spector.js (0.9.30) for GPU frame inspection. No npm package needed.

## What NOT to Add

| Technology | Why NOT | Use Instead |
|-----------|---------|-------------|
| GPU.js | Deprecated-maintenance feel. Transpiles JS→GLSL with 10-50% overhead. No integration with Three.js scene graph. Cannot access WebGL2 features well. | Deck.gl GPU aggregation layers, or existing Web Workers for CPU-heavy computation |
| @react-spring/three | Spring physics adds bundle bloat (30KB+) for this use case. animated wrapper causes re-renders. Adds unnecessary abstraction over direct Three.js ref mutation. | GSAP for sequencing, useFrame for per-frame interpolation |
| Framer Motion / Motion for R3F | Declared React 18-only in docs. Project uses React 19.2.3. Incompatible. | GSAP + useFrame |
| WebGPU Compute (WGSL) | Insufficient browser adoption. Chrome-only effectively. No Three.js integration layer yet. | Deck.gl GPU aggregation (WebGL2) |
| Three.js LOD / BVH | Premature optimization. Current scene complexity doesn't warrant LOD or raycast acceleration structures. | Test with real data first, add if profiling shows need |
| Custom WebGL postprocessing | The postprocessing library handles all the GL state management, render target swapping, and shader compilation. | `@react-three/postprocessing` |
| Custom heatmap/particle system | MapLibre built-in heatmap + deck.gl HeatmapLayer cover density visualization for all scales. | MapLibre heatmap layer + deck.gl HeatmapLayer |

## Integration Points

### EffectComposer Wrapping Existing Scenes

The `@react-three/postprocessing` EffectComposer wraps the entire R3F `<Canvas>` scene. This means existing components in `MainScene.tsx`, `Stkde3DScene.tsx`, and `TimelineTest3DScene.tsx` will automatically receive bloom/DOF effects. SelectiveBloom adds a `selection` prop to target only burst-highlighted meshes:

```tsx
import { EffectComposer, Bloom, SelectiveBloom } from '@react-three/postprocessing'

<Canvas>
  <EffectComposer>
    <Bloom luminanceThreshold={0.5} intensity={1.5} />
    {/* Or for burst-specific glow: */}
    <SelectiveBloom
      lights={[lightRef]}
      selection={[burstMeshRef1, burstMeshRef2]}
      intensity={2.0}
      luminanceThreshold={0.2}
    />
  </EffectComposer>
  {/* Existing scene contents */}
</Canvas>
```

### Deck.gl MapOverlay for Density Overlays

Deck.gl's `MapboxOverlay` integrates with the existing MapLibre instance via `react-map-gl`. The overlay renders deck.gl layers (HeatmapLayer, ScreenGridLayer) on top of or interleaved with map layers:

```tsx
import { DeckGL } from '@deck.gl/react'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Map } from 'react-map-gl/maplibre'

<DeckGL
  initialViewState={{ longitude, latitude, zoom }}
  layers={[
    new HeatmapLayer({
      id: 'crime-density',
      data: crimePoints,
      getPosition: d => d.coordinates,
      getWeight: d => d.count,
      aggregation: 'SUM',
      radiusPixels: 30,
      intensity: 1,
      threshold: 0.05,
    })
  ]}
>
  <Map mapStyle={style} />
</DeckGL>
```

### GSAP + Three.js Ref-Based Animation

GSAP targets Three.js objects through refs — no React reconciliation involvement. This is critical for smooth temporal transitions:

```typescript
import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'

function AgingTrail({ points }: { points: THREE.Vector3[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  useEffect(() => {
    // Animate all instances fading out over time
    const dummy = new THREE.Object3D()
    const timeline = gsap.timeline()

    points.forEach((pos, i) => {
      dummy.position.copy(pos)
      meshRef.current.setMatrixAt(i, dummy.matrix)
      // Staggered fade-out per particle
      timeline.to(meshRef.current.instanceMatrix, {
        // GSAP cannot animate instanceMatrix directly
        // Instead, animate individual instance opacity in custom shader uniform
      }, i * 0.05)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [points])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]}>
      <sphereGeometry />
      <meshBasicMaterial transparent opacity={0.6} />
    </instancedMesh>
  )
}
```

**Practical pattern:** Use GSAP for camera/opacity/position transitions, useFrame for persistent per-frame interpolation (e.g., `position.lerp` for smooth drift).

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @react-three/postprocessing@3.x | @react-three/fiber >=9, postprocessing >=6.x, three >=0.150 | Current major version; hooks into R3F render loop via EffectComposer |
| deck.gl@9.x | @react-three/fiber >=8 (via @deck.gl/react), react-map-gl/maplibre >=8, MapLibre GL >=5 | deck.gl 9 is WebGL2-first with WebGPU support in beta; uses @luma.gl for WebGL |
| @deck.gl/mapbox@9.x | MapLibre GL >=4, maplibre-gl | Provides MapboxOverlay for interleaved rendering |
| GSAP@3.15.x | Any framework (framework-agnostic) | No React dependency; targets DOM or JS objects directly |
| drei@10.7.x | @react-three/fiber >=9, three >=0.150 | CameraControls wraps camera-controls package; Stats wraps three/addons |
| drei Stats/PerformanceMonitor | @react-three/fiber >=9 | Built-in, no extra install needed |

## Alternative Patterns Considered

| Approach | Considered | Verdict | Reason |
|----------|-----------|---------|--------|
| **Burst rendering** | Use Three.js Points with custom shader for burst particles | ✓ Keep as option | Already installed; use for per-burst particle effects (explosion/sparkle on burst detection) |
| **Burst rendering** | Write custom WebGL blur/composite pipeline | ✗ Reject | @react-three/postprocessing handles all GL state management |
| **Density overlay** | MapLibre heatmap layer only | ✗ Insufficient | MapLibre heatmap is fixed-renderer, no GPU aggregation control; deck.gl HeatmapLayer gives GPU KDE |
| **Density overlay** | Custom compute-shader density via GPU.js | ✗ Reject | Deprecated ecosystem, transpilation overhead, no Three.js integration |
| **Temporal animation** | useFrame + lerp for everything | ✗ Limited | Good for persistent animations, but sequenced transitions need timeline control |
| **Temporal animation** | @react-spring/three animated wrapper | ✗ Reject | Adds 30KB+, React 19 concerns, spring physics unnecessary |
| **Camera control** | Custom camera controller | ✗ Reject | drei CameraControls already handles this — just configure constraints |
| **Performance** | Custom FPS monitor | ✗ Reject | drei Stats + PerformanceMonitor covers it |
| **GPU compute** | Web Workers for density computation | ✓ Keep for CPU tasks | Workers already used for adaptive-time/STKDE; keep for data processing, use deck.gl for GPU rendering |

## Installation

```bash
# Core additions
pnpm add @react-three/postprocessing@^3.0.4

# GPU-based density overlay (deck.gl)
pnpm add deck.gl@^9.3.2 @deck.gl/aggregation-layers@^9.3.2 @deck.gl/mapbox@^9.3.2

# Animation sequencing
pnpm add gsap@^3.15.0

# Total new dependencies: 6 packages
# No new devDependencies needed
```

**Bundle impact estimate:**

| Package | Estimated Size (min+gzip) | Notes |
|---------|--------------------------|-------|
| @react-three/postprocessing | ~12 KB | EffectComposer + Bloom are tree-shakable |
| postprocessing (peer dep) | ~25 KB | Lower-level library, already pulled by above |
| deck.gl (core) | ~60 KB | Large but tree-shakable; HeatmapLayer pulls @deck.gl/aggregation-layers |
| deck.gl aggregation-layers | ~30 KB | HeatmapLayer, ScreenGridLayer, HexagonLayer |
| deck.gl mapbox | ~8 KB | MapboxOverlay + interleaved renderer |
| GSAP | ~12 KB (tree-shaken core) | Core GSAP without plugins; gzip-friendly |
| **Total estimated addition** | **~147 KB gzip** | Acceptable for desktop-first prototype |

## Stack Patterns by Variant

**If building burst-highlight particles:**
- Use drei `<Instances>` with custom instanced attributes for per-burst color/opacity/scale
- Use `<Points>` + `<PointMaterial>` for cloud-of-points burst effects
- Use custom `ShaderMaterial` (vertex + fragment GLSL) for opacity/alpha scaling in shader
- Add `<SelectiveBloom>` from postprocessing to make burst particles glow

**If building temporal layer on the map:**
- Use MapLibre built-in heatmap layer for single-time-window density
- Use deck.gl HeatmapLayer for GPU-accelerated density with temporal updates
- Use `map.getSource('source').setData(newGeoJSON)` for time-slice updates on the map
- Use `map.setFilter('layer', filterExpr)` for temporal filtering without data reload

**If building camera fly-through or transition:**
- Use GSAP timeline to animate CameraControls position + target simultaneously
- Sequence: 1) fly to overview, 2) zoom into burst, 3) rotate around, 4) return
- Use `camera.position.lerp(target, 0.02)` in useFrame for smooth follow

**If optimizing for performance:**
- Wrap Canvas with `<Stats />` during development to track FPS
- Add `<PerformanceMonitor>` to auto-lower quality on slow machines
- Use `frameloop="demand"` when scene is static (time-slice is not animating)
- Keep heavy STKDE/density computation in existing Web Workers

## Sources

### Primary (HIGH confidence — Context7 verified)

- `/pmndrs/react-postprocessing` — Bloom, SelectiveBloom, EffectComposer API, integration with R3F
- `/pmndrs/react-three-fiber` (v9+) — useFrame, Canvas props, performance options, ShaderMaterial with stable uniforms
- `/pmndrs/drei` — Instances with custom attributes, CameraControls, Stats, PerformanceMonitor, AdaptiveDpr, AdaptiveEvents, Bounds
- `/mrdoob/three.js` (r182+) — ShaderMaterial, InstancedMesh, Points, BufferGeometry, OrbitControls min/max angle
- `/visgl/deck.gl` — HeatmapLayer GPU KDE, MapboxOverlay integration, aggregation layers
- `/maplibre/maplibre-gl-js` — heatmap layer type, custom layers with WebGL, setData/setFilter for temporal updates

### Secondary (MEDIUM confidence — official docs fetched)

- GSAP documentation (gsap.com/docs) — npm install, timeline/tween API, framework-agnostic
- @react-spring/three docs — animated wrapper, useSpring hook, React 18 focus
- deck.gl documentation — HeatmapLayer GPU gpuAggregation prop, version 9.x

### Tertiary (LOW confidence — needs validation during implementation)

- None — all critical findings verified with Context7 or npm registry sourced versions

---

*Stack research for: Adaptive Space-Time Cube — Visualization Level-Up Milestone*
*Researched: 2026-05-26*
*Valid until: 2026-07-26 (60 days — Three.js/R3F/deck.gl ecosystems are relatively stable)*
