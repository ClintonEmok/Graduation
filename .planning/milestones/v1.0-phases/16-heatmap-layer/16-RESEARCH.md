# Phase 16: Heatmap Layer - Research

**Researched:** 2026-02-05
**Domain:** Spatial Density Visualization (Heatmaps) in Three.js
**Confidence:** HIGH

## Summary

This phase implements a 2D spatial density overlay (heatmap) that visualizes the "footprint" of crime events on the spatial plane ($X, Z$ at $Y=0$). The research identifies a **two-pass GPU-based aggregation pattern** as the most performant and visually consistent approach for the Adaptive Space-Time Cube.

The primary recommendation is to use a **WebGL Render Target (FBO)** to accumulate point densities using additive blending, followed by a fragment shader pass to apply logarithmic scaling and the monochromatic color ramp. This ensures real-time performance even with 10,000+ points and provides the high-tech HUD aesthetic requested.

**Primary recommendation:** Use a two-pass `ShaderMaterial` approach with `@react-three/drei`'s `useFBO` for GPU-side density aggregation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | 0.182.0 | WebGL Engine | Native support for RenderTargets and custom Shaders. |
| `@react-three/fiber` | 9.5.0 | React Integration | Declarative management of the scene graph. |
| `@react-three/drei` | 10.7.7 | Helper Utilities | `useFBO` and `OrthographicCamera` simplify offscreen rendering. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | 4.x | State Management | For toggling the heatmap feature flag and intensity params. |

**Installation:**
No additional packages required beyond current project dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
└── components/
    └── viz/
        ├── HeatmapLayer.tsx      # Main component (Pass 2 + Plane)
        └── HeatmapIntensity.tsx  # aggregation pass (Pass 1)
```

### Pattern 1: Two-Pass GPU Aggregation
**What:** Render points as blurred circles into an offscreen buffer (Pass 1) with additive blending, then render that buffer as a texture onto a plane (Pass 2) with color mapping.
**When to use:** When visualizing density for >1,000 points with real-time updates.
**Example:**
```typescript
// Pass 1: Aggregation (Fragment)
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float intensity = exp(-d * d * 10.0); // Gaussian falloff
  gl_FragColor = vec4(intensity, 0.0, 0.0, 1.0);
}

// Pass 2: Color Mapping (Fragment)
void main() {
  float density = texture2D(tIntensity, vUv).r;
  float logDensity = log(1.0 + density * uIntensityScale) / log(1.0 + uMaxDensity);
  vec3 color = mix(uCyan, uWhite, logDensity);
  gl_FragColor = vec4(color, logDensity * 0.6); // 60% opacity
}
```

### Anti-Patterns to Avoid
- **CPU Iteration:** Avoid calculating density in JavaScript (e.g., Grid-based counting) for 10k+ points during timeline scrubbing. It will cause frame drops.
- **Single Pass Rendering:** Don't render log-scaled points directly. Log(A) + Log(B) != Log(A+B). Aggregation must happen in linear space first.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offscreen Buffers | Custom `WebGLRenderTarget` logic | `useFBO` (drei) | Handles resize, pixel ratio, and cleanup automatically. |
| Additive Blending | Custom blend equations | `THREE.AdditiveBlending` | Standard, well-tested, and hardware-accelerated. |
| Log Compression | Custom math curves | `log1p(x)` | Mathematically standard for density maps. |

## Common Pitfalls

### Pitfall 1: Texture Clipping
**What goes wrong:** Densities over 1.0 are clipped to 1.0 in standard textures, losing detail in "hotspots".
**How to avoid:** Use `THREE.FloatType` or `THREE.HalfFloatType` for the RenderTarget to allow intensities > 1.0.

### Pitfall 2: Coordinate Misalignment
**What goes wrong:** Heatmap doesn't align with 3D points because the FBO camera doesn't match the scene data bounds.
**How to avoid:** Use an `OrthographicCamera` in the FBO pass with `left/right/top/bottom` set exactly to the data `minX/maxX/minZ/maxZ`.

### Pitfall 3: Real-time Scrubbing Lag
**What goes wrong:** Re-rendering the FBO every frame for 50k points might jitter on slow GPUs.
**How to avoid:** Use `THREE.Points` (gl_Points) instead of `InstancedMesh(Planes)` for the aggregation pass. It's the fastest way to render many points.

## Code Examples

### Logarithmic Color Mapping
```glsl
// Source: https://github.com/uber/deck.gl/blob/master/modules/aggregation-layers/src/heatmap-layer/heatmap-layer-utils.js
uniform float uMaxIntensity;
uniform float uIntensityScale;

void main() {
    float intensity = texture2D(uTexture, vUv).r * uIntensityScale;
    // Logarithmic scale to compress the dynamic range
    float normalizedIntensity = log(1.0 + intensity) / log(1.0 + uMaxIntensity);
    
    // Cyan to White ramp
    vec3 color = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0), normalizedIntensity);
    gl_FragColor = vec4(color, normalizedIntensity * 0.6);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas 2D `simpleheat` | WebGL GPGPU Aggregation | ~2018 | 100x performance increase for large datasets. |
| Linear Scaling | Logarithmic Scaling | - | Better visibility of low-density clusters. |

## Open Questions

1. **Exact Dynamic Radius?**
   - Recommendation: Start with a fixed world-space radius (e.g., 2.0 units ≈ 40 meters). Since Three.js units are fixed, it will naturally look larger on screen when zooming in, satisfying the "consistent in meters" requirement.
2. **Feature Flag location?**
   - Recommendation: Add to `src/lib/feature-flags.ts` as `heatmap` (default: false).

## Sources

### Primary (HIGH confidence)
- Three.js Docs: `WebGLRenderTarget`, `AdditiveBlending`
- `@react-three/drei` Docs: `useFBO`
- kepler.gl / deck.gl: Heatmap Layer implementation patterns.

### Secondary (MEDIUM confidence)
- Various "Three.js Heatmap" shader tutorials (verified with local knowledge).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: MEDIUM (Performance depends on target hardware)

**Research date:** 2026-02-05
**Valid until:** 2026-03-05
