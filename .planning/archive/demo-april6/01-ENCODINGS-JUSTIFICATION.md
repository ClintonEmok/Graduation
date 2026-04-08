# Visual Encodings Justification

**Purpose:** Document the rationale for visual channel mappings in the Adaptive Space-Time Cube.

**Last updated:** 2026-03-31

---

## Overview

The Adaptive Space-Time Cube uses multiple visual channels to encode spatiotemporal crime data. Each encoding choice is justified by perceptual principles, task requirements, and the need to reveal bursty patterns.

---

## Primary Visual Encodings

### 1. Position (X, Y, Z in 3D Space)

| Dimension | Encoding | Justification |
|-----------|----------|---------------|
| **X-axis** | Longitude (spatial) | Direct geographic mapping preserves mental map correspondence |
| **Z-axis** | Latitude (spatial) | Direct geographic mapping; X-Z plane matches 2D map view |
| **Y-axis** | Time (vertical) | Vertical axis for time is intuitive (later = higher); separates spatial from temporal |

**Rationale:** Position is the most accurate perceptual channel for quantitative data. Spatial (X, Z) and temporal (Y) separation allows independent interpretation while maintaining relationship visibility.

**Implementation:** `src/components/viz/DataPoints.tsx`

```typescript
// Points positioned at (x, y, z) where:
// x = normalized longitude (-50 to 50)
// y = time (0 to 100, with adaptive warping)
// z = normalized latitude (-50 to 50)
```

---

### 2. Color (Hue)

| Category | Encoding | Justification |
|----------|----------|---------------|
| **Crime type** | Categorical hue | Distinguishes crime categories for type-specific analysis |
| **Burst highlighting** | Orange overlay (#FF8B1A) | High-visibility color draws attention to bursty periods |
| **Slice highlighting** | White blend | Maintains original color identity while indicating slice membership |

**Color Palette Choices:**

| Theme | Rationale |
|-------|-----------|
| **Dark (default)** | High contrast for point visibility; reduces eye strain |
| **Light** | Alternative for presentations/light environments |
| **Colorblind-safe** | Okabe-Ito palette ensures accessibility |

**Implementation:** `src/lib/palettes.ts`

```typescript
const DEFAULT_CATEGORY_COLORS = {
  'THEFT': '#FFD700',     // Gold - high visibility, most common crime
  'ASSAULT': '#FF4500',   // OrangeRed - urgency, violence indicator
  'BURGLARY': '#1E90FF',  // DodgerBlue - property crime
  'ROBBERY': '#32CD32',   // LimeGreen - street crime
  'VANDALISM': '#DA70D6', // Orchid - property damage
  'OTHER': '#FFFFFF',     // White - catch-all
};
```

**Burst Highlight Shader:** `src/components/viz/shaders/ghosting.ts:269-275`

```glsl
// Burst highlight (based on density)
if (burstDensity >= uBurstThreshold) {
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.55, 0.1), 0.6);
}
```

---

### 3. Opacity (Transparency)

| Context | Encoding | Justification |
|---------|----------|---------------|
| **Focus+Context** | Dithered transparency for non-selected points | Maintains context while emphasizing focus region |
| **Ghosted points** | 10-40% effective opacity | Reduces visual clutter while preserving pattern visibility |
| **Brush range dimming** | Extra 90% dimming outside brush | Guides attention to selected time region |

**Perceptual Basis:** Stochastic dithering is more perceptually stable than uniform transparency for overlapping points. Each pixel is either visible or discarded, avoiding alpha blending artifacts.

**Implementation:** `src/components/viz/shaders/ghosting.ts:226-265`

```glsl
// Dynamic opacity-based dithering
float opacity = uContextOpacity;

// Brush Range Check - "Dim Others" logic
bool inBrushRange = vLinearY >= uBrushStart && vLinearY <= uBrushEnd;
if (!inBrushRange) {
  opacity *= 0.1; // Extra ghosting for points outside brush range
}

// Hash-based dither for smoother appearance
if (opacity < 0.99) {
  float ditherValue = mod(gl_FragCoord.x * 0.37 + gl_FragCoord.y * 0.73, 1.0);
  float threshold = 1.0 - opacity;
  if (ditherValue < threshold) {
    discard;
  }
}

// Desaturate and dim based on opacity
float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.3);
gl_FragColor.rgb *= 0.3 + (opacity * 0.4);
```

---

### 4. Size (Point Scale)

| Context | Encoding | Justification |
|---------|----------|---------------|
| **LOD zoom-out** | Progressive point shrinking | Maintains frame rate at distance; reduces visual clutter |
| **LOD fade** | Dithered discard at extreme zoom | Smooth transition from dense to sparse view |

**Implementation:** `src/components/viz/shaders/ghosting.ts:118-119`

```glsl
// Shrink points as we zoom out (LOD)
vec3 transformedCopy = transformed * (1.0 - uLodFactor);
```

---

### 5. Vertical Warp (Adaptive Time Scaling)

| Mode | Encoding | Justification |
|------|----------|---------------|
| **Uniform time** | Linear Y = time | Equal visual space for equal time spans |
| **Adaptive** | Warped Y = f(density) | Dense periods get more visual space; bursty patterns become prominent |

**Warp Formula:**

```
adaptiveY = linearY * (1 - warpFactor) + warpedY * warpFactor
```

Where `warpedY` is computed from density-weighted cumulative distribution.

**Implementation:** `src/workers/adaptiveTime.worker.ts:170-192`

```typescript
// Weight bins by density: weight = 1 + (normalized_density * 5)
// This gives dense bins 6x the visual space of empty bins
const weights = new Float32Array(safeBinCount);
let totalWeight = 0;
for (let i = 0; i < safeBinCount; i++) {
  const normalized = smoothedDensity[i] / maxDensity;
  const weight = 1 + normalized * 5;
  weights[i] = weight;
  totalWeight += weight;
}

// Cumulative distribution -> warp map
const warpMap = new Float32Array(safeBinCount);
let accumulated = 0;
for (let i = 0; i < safeBinCount; i++) {
  const warped = tStart + (accumulated / totalWeight) * tSpan;
  warpMap[i] = warped;
  accumulated += weights[i];
}
```

---

## Encoding Hierarchy

Following Cleveland's hierarchy of perceptual accuracy:

1. **Position** (X, Y, Z) - Most accurate for quantitative comparison
2. **Color** (Hue) - Categorical discrimination
3. **Opacity** - Focus+context layering
4. **Size** - LOD optimization (not used for data encoding)

---

## Justification Summary

| Visual Channel | Primary Use | Perceptual Strength |
|----------------|-------------|---------------------|
| Position (X, Z) | Geographic location | Highest accuracy for spatial tasks |
| Position (Y) | Time representation | High accuracy; intuitive vertical timeline |
| Color (Hue) | Crime type categories | Strong categorical discrimination |
| Color (Overlay) | Burst highlighting | Attention-grabbing; preserves base color |
| Opacity | Focus+Context | Contextual awareness without overwhelming focus |
| Warp (Y) | Density emphasis | Reveals hidden bursty patterns |

---

## Key Design Decisions

### D1: Why vertical time?

**Decision:** Y-axis encodes time (vertical).

**Rationale:**
- Vertical axis for time is conventional (timeline metaphors)
- Separates spatial plane (X-Z) from temporal axis
- Allows "looking down" at spatial distribution at any time slice
- Matches user mental model: "higher = later"

### D2: Why color for crime type instead of size?

**Decision:** Use hue for crime type; size is fixed (with LOD scaling only).

**Rationale:**
- Color supports 5-7 categories effectively (matching crime types)
- Size perception is less accurate for categorical data
- Size variation would obscure dense clusters
- LOD already uses size reduction for performance

### D3: Why dithering instead of uniform transparency?

**Decision:** Use stochastic dithering for ghosted points.

**Rationale:**
- Uniform transparency creates alpha blending artifacts with overlapping points
- Dithering ensures each pixel is either visible or not (no partial opacity)
- More stable appearance at various zoom levels
- Better performance on GPU (no blending state changes)

### D4: Why separate burst highlighting from color?

**Decision:** Burst highlighting is an orange overlay, not a color replacement.

**Rationale:**
- Preserves crime type information (color identity)
- Allows simultaneous burst detection AND type analysis
- Overlay blend (60%) maintains original color recognition
- Toggle-able without losing primary encoding

---

## References

- Cleveland, W.S. (1985). *The Elements of Graphing Data*
- Ware, C. (2012). *Information Visualization: Perception for Design*
- Okabe, M. & Ito, K. (2008). *Color Universal Design*
