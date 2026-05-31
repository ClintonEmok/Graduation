# Phase 78: Burst Visibility + Visual Consistency — Research

**Researched:** 2026-05-31
**Phase:** 78-burst-visibility-visual-consistency
**Domain:** Burst visual encoding, GPU shader migration, unified color scales, shared legends
**Confidence:** HIGH (codebase analysis + Context7-verified Three.js/R3F shader patterns)

## Summary

Phase 78 is about making burst intensity the clearest signal in the dashboard-demo system while keeping that signal visually consistent across the cube and timeline, with the map staying density-only spatial context.

**What currently exists:**
- Phase 77 delivered depth-aware slab rendering, volume-normalization helpers, and duration-volume state in the coordination store. The cube's `StkdeSliceStack` uses Canvas2D → `CanvasTexture` → `meshBasicMaterial` for KDE heatmap rendering — CPU-bound, no per-cell burst encoding.
- The timeline (`DualTimelineSurface`) renders slice geometries with a boolean `isBurst` flag for color selection (warm orange vs default), but no continuous burstScore-to-opacity encoding.
- The map has its own burst pipeline via `useAdaptiveStore` (separate from the coordination store) with `burstMetric`/`burstCutoff` controls. The map is already density-only and does NOT encode burst visually.
- At least 3 different color scales exist (`StkdeSliceStack`'s `kdeColor`, `STKDE_HEATMAP_COLOR_STOPS`, timeline's `DENSITY_COLOR_LOW/HIGH`). No shared burst color scale.
- No `burstViewMode` toggle exists in the coordination store. No shared burst intensity legend exists.

**What must change:**
The 8 BVS requirements fall into three natural groups: (1) state + color + legend (non-3D), (2) GPU shader pipeline + cube burst encoding (the heavy engineering), (3) timeline burst encoding + visual verification. The render-path migration (Canvas2D → ShaderMaterial) is the critical dependency.

**Primary recommendation:** 3 sequential plans — state/color/legend first (parallel-safe), then the ShaderMaterial migration (high-risk, requires careful shader design), then timeline burst encoding + consistency verification.

---

## Current State: What Exists and Works

### Cube 3D Rendering Pipeline (`StkdeSliceStack.tsx`)

| Aspect | Current | Status for Phase 78 |
|--------|---------|---------------------|
| **KDE rendering** | Canvas2D `buildHeatmapTexture()` — creates 256×256 canvas, draws radial gradients per KDE cell, wraps as `THREE.CanvasTexture` on `meshBasicMaterial` | **Needs replacement** (BVS-01) |
| **Burst encoding** | Only via HTML label: `burst ${(slice.burstScore * 100).toFixed(0)}%` in `<Html>` overlay | **Needs per-slice opacity/intensity encoding** (BVS-02) |
| **Opacity model** | Index-distance-based: active=1, adjacent=0.35, other=0.1 — no burstScore contribution | **Needs burstScore to modulate** (BVS-02, BVS-05) |
| **Color scale** | Hardcoded `kdeColor()` with 6 stops (blue→cyan→green→yellow→orange→red) | **Needs unification with timeline** (BVS-04) |
| **Volume/depth** | Phase 77 delivered slab structure with `thickness`, `opacity`, `falloff` from `volume-encoding.ts` | **Preserve** — stays as-is, shader only replaces surface plane material |
| **Active rings** | Three ring meshes: 49.2-50 ring (active) + 48.5-49.8 ring (active glow) + adjacent ring | **Preserve** — rings stay as mesh overlays |
| **Grid helper** | `gridHelper` per slice with distance-based opacity | **Preserve** — grid stays |

### Timeline (`DualTimelineSurface.tsx`)

| Aspect | Current | Status for Phase 78 |
|--------|---------|---------------------|
| **Slice burst encoding** | Boolean `isBurst` flag → warm orange fill vs default color. No continuous burstScore scaling. | **Needs burstScore-to-opacity/intensity** (BVS-04) |
| **Color scale** | `DENSITY_COLOR_LOW` (blue) → `DENSITY_COLOR_HIGH` (red), used for `DensityHeatStrip` | **Needs shared scale with cube** (BVS-04) |
| **Burst window markers** | `burstWindows` prop declared but NOT visually rendered — only wired for `onBurstWindowClick` | **Define if Phase 78 scope includes timeline burst markers** |
| **Slice geometry rendering** | `resolvedDraftPalette()` for burst class colors (prolonged-peak, isolated-spike, valley) | **Should use shared burst color scale** (BVS-04) |

### Coordination Store (`useDashboardDemoCoordinationStore.ts`)

| Field | Current | Status for Phase 78 |
|-------|---------|---------------------|
| `viewMode` | `'stack' | 'focus'` — 3D camera layout, NOT rendering mode | **Add `burstViewMode: 'density' | 'burst-emphasized'`** (BVS-06) |
| `burstThreshold` | Number 0-1 — for detection, not rendering mode | **Preserve**, unrelated to mode toggle |
| `inspectSliceOpacity` | Global opacity slider — affects all slices uniformly | **Preserve** — global opacity is orthogonal to burst emphasis |
| Volume state | `volumeScaleSeconds`, `volumeExaggeration`, `volumeNormalizationMode` | **Preserve** — Phase 77 delivered |

### Map (`DemoMapVisualization.tsx`, `MapVisualization.tsx`)

| Aspect | Current | Status for Phase 78 |
|--------|---------|---------------------|
| **Burst pipeline** | Reads `burstMetric`/`burstCutoff` from `useAdaptiveStore` (separate store from coordination) | **Stays untouched** — density-only per BVS-03 |
| **Burst encoding** | `DataPoints.tsx` has `uBurstThreshold`/`uDensityTexture` in the ghosting shader for point highlight | **Stays untouched** — this is the map's existing behavior, not new burst encoding |
| **Coordination** | `DemoMapVisualization` wraps `MapVisualization` with store overrides | **Verify** mode toggle doesn't leak into map (already isolated) |

### Color Scales (at least 3, divergent)

| Scale | Location | Stops | Used By |
|-------|----------|-------|---------|
| `kdeColor()` | `StkdeSliceStack.tsx` | Blue→Cyan→Green→Yellow→Orange→Red (6 stops, 0-1) | Cube slice heatmap texture |
| `STKDE_HEATMAP_COLOR_STOPS` | `heatmap-scale.ts` | Transparent blue→Blue→Green→Yellow→Orange→Red (6 stops, 0-1) | STKDE heatmap on map |
| `DENSITY_COLOR_LOW/HIGH` | `DualTimelineSurface.tsx` | Blue→Red (2 stops, 0-1) | DensityHeatStrip on timeline |

---

## What Needs to Change: BVS Requirement Mapping

### BVS-01: ShaderMaterial GPU Rendering

**What:** Replace `buildHeatmapTexture()` Canvas2D → `CanvasTexture` → `meshBasicMaterial` with a custom `ShaderMaterial` that accepts KDE cell data as a GPU data texture.

**Current implementation to replace:**
```
StkdeSliceStack.tsx:66-100 — buildHeatmapTexture()
StkdeSliceStack.tsx:119-128 — useMemo creating Map<number, CanvasTexture>
StkdeSliceStack.tsx:180-204 — <meshBasicMaterial map={texture}>
```

**Target architecture:**
- New shader module: `src/app/stkde-3d/shaders/burst-slice-shader.ts`
- Vertex shader: passes UV coordinates for plane geometry
- Fragment shader: samples KDE data texture, applies color scale (shared), modulates by burstScore/burstConfidence uniforms
- Uniforms needed: `uBurstScore: float`, `uBurstConfidence: float`, `uBurstClass: int`, `uActiveIntensity: float`, `uViewMode: float` (0=density, 1=burst), `uKdeTexture: sampler2D` (data texture with cell positions + intensities)
- R3F approach: `<shaderMaterial>` on a plane mesh, wrapped in a custom component

**Risks:**
- ShaderMaterial replaces `meshBasicMaterial` on the surface plane — the existing slab/sub-surface/underlay mesh hierarchy (from Phase 77) stays intact, but the surface material changes. Must ensure depth ordering and transparency remain correct.
- KDE cell data must be packed into a 2D data texture (Float32 values). The current `KdeCell[]` array has x, z, intensity, support per cell. For the shader, we need at minimum: position (2 floats) + intensity (1 float) per cell.
- Texture size: if there are ~100-200 KDE cells per slice, a 16×16 or 32×32 data texture suffices.
- Fragment shader must render radial gaussian falloff per KDE cell (emulating the Canvas2D `createRadialGradient`). This is straightforward GLSL.

**Key constraint:** The shader does NOT replace the entire slice stack. It replaces only the surface heatmap rendering. Labels, active rings, grid helpers, and the volumetric slab from Phase 77 all stay as separate meshes.

**Confidence:** MEDIUM (shader patterns are standard Three.js, but the integration with existing slab hierarchy and depth-aware Phase 77 rendering needs care)

### BVS-02: Per-slice burstScore → Opacity

**What:** Wire `burstScore` (normalized 0-1) to per-slice rendering so burstier slices are more opaque/intense.

**Current state:** Opacity is determined by index distance to active slice (active→adjacent→other). burstScore is only shown as a text label.

**Implementation:**
- In the ShaderMaterial, `uBurstScore` modifies the output alpha: `baseAlpha *= (0.3 + uBurstScore * 0.7)` 
- In `density` view mode: burst has a mild effect (e.g., `0.2 + burstScore * 0.3`)
- In `burst-emphasized` view mode: burst drives most of the opacity (`0.1 + burstScore * 0.85`)
- The timeline also maps burstScore to fill opacity for its rects: `fillOpacity = 0.15 + burstScore * 0.55`

**Confidence:** HIGH (trivial when the ShaderMaterial exists)

### BVS-03: Map Stays Density-Only

**What:** Exclusion requirement — no burst encoding on the map. Not implementation work, just verification.

**Current state:** The map has its own burst detection pipeline (`useAdaptiveStore` > `burstMetric`/`burstCutoff`) but this drives heatmap density rendering, not burst-specific visual encoding. The map does NOT currently show burst-specific glyphs, colors, or overlays. Already compliant.

**Verification checklist:**
- [ ] `DemoMapVisualization.tsx` does not read `burstViewMode` from coordination store
- [ ] `MapVisualization.tsx` does not forward burstViewMode to any rendering layer
- [ ] `DataPoints.tsx` shader does not use burstScore for visual encoding (uses density only)
- [ ] Map heatmap layers use density-based color mapping, not burst-score-based

**Confidence:** HIGH (easy to verify, already compliant)

### BVS-04: Unified Color Scale — Shared Domain Across Cube and Timeline

**What:** One color scale/domain across cube and timeline so the same burst score means the same color everywhere.

**Current state:** Cube uses its own `kdeColor()` (blue→red via 6 stops). Timeline uses `DENSITY_COLOR_LOW/HIGH` (blue→red 2 stops). Different stops produce different colors for the same intensity value.

**Implementation:**
- New file: `src/lib/viz/burst-color-scale.ts`
- Export canonical color stops: 6-8 stops that produce a perceptually uniform gradient from low burst (cool) to high burst (warm)
- Export `sampleBurstColor(t: number): string` for CSS/SVG use (timeline)
- Export `burstColorGLSL(): string` for GLSL integration (cube shader)
- Export `BURST_COLOR_STOPS` constant for programmatic use
- Both cube and timeline import from the same module
- The color domain (0-1 normalized burstScore) is shared — no remapping needed since both use normalized burstScore

**Which color scale?** The existing `kdeColor()` from `StkdeSliceStack` (blue→cyan→green→yellow→orange→red) is a good starting point — it's perceptually varied and already used for KDE heatmap. We should extract it to the shared module and use it for both cube and timeline. The STKDE heatmap scale (`STKDE_HEATMAP_COLOR_STOPS`) is similar but shifted toward blue — we can unify.

**Recommended scale:** Extract the 6-stop `kdeColor()` gradient and add 2 additional stops for finer low-end differentiation:
```
0.0  → #224CFF (deep blue)
0.2  → #00D4FF (cyan)
0.4  → #2AFFA3 (teal/green)
0.6  → #FFD640 (yellow)
0.8  → #FF7A2A (orange)
1.0  → #FF4060 (hot pink/red)
```

**Confidence:** HIGH (straightforward module extraction)

### BVS-05: Active Burst Emphasis — Static Opacity/Intensity

**What:** Active burst slice gets emphasis through opacity/intensity boost, NOT pulse/glow animations.

**Current state:** Active slice already gets:
- `opacityMultiplier = 1` (vs 0.35 adjacent, 0.1 other)
- Full-brightness ring at `opacity=0.2`
- Glow ring at `opacity=0.08`
- Full label visibility

**What changes:**
- In `density` view mode: existing behavior preserved
- In `burst-emphasized` view mode: if the active slice has high burstScore, boost its surface opacity and intensity further
- `uActiveIntensity` uniform: `baseOpacity * (1.0 + uActiveIntensity * burstScore * 0.3)`
- Active ring can get brighter when active slice is also bursty: `ringOpacity * (1 + burstScore * 0.5)`
- "Static" enforced: opacity changes must be frame-constant, no time-based animation

**Confidence:** MEDIUM (straightforward shader uniform, but tuning the emphasis factor needs visual validation)

### BVS-06: Density vs Burst-Emphasized Toggle

**What:** Shared `burstViewMode: 'density' | 'burst-emphasized'` toggle that persists across the cube and timeline pair.

**Implementation:**
- Add to coordination store: `burstViewMode: 'density' | 'burst-emphasized'` with default `'density'`
- Add setter: `setBurstViewMode(mode)` 
- Add reset: `resetBurstViewMode()`
- Add UI control in the Inspect panel (or Configure panel) — a toggle/segmented control
- Cube reads `burstViewMode` and passes to shader as `uViewMode`
- Timeline reads `burstViewMode` and adjusts slice fill opacity/color accordingly
- Map does NOT read `burstViewMode` (BVS-03)

**View mode behavior:**
- `density` (default): Mild burst effect — `burstScore` modulates opacity by ~30%. Safe, familiar view.
- `burst-emphasized`: Strong burst effect — `burstScore` drives 70-85% of opacity. Non-burst slices are very dim. Active slice gets extra boost. Maximum burst saliency.

**Where to put the toggle:** The Inspect panel (`DemoInspectPanel.tsx`) already has slice opacity controls. A small toggle row: `"View: ○ Density ● Burst"` between the opacity slider and playback controls. Or in the Configure panel as "Burst visualization mode" — the CONTEXT.md says to "bridge existing burst controls" so the Configure panel's existing burst controls should be co-located with the new toggle.

**Confidence:** HIGH (standard Zustand extension + UI toggle)

### BVS-07: Shared Legend for Burst Intensity

**What:** A visual legend showing the burst intensity scale (0-1) with the shared color gradient, readable at 40-80px width.

**Implementation:**
- New component: `src/components/viz/BurstIntensityLegend.tsx`
- Props: `viewMode?: 'density' | 'burst-emphasized'` (to optionally show which mode)
- Renders: gradient bar (linear gradient of shared color stops), "Low"/"High" labels, optional "Burst intensity" title
- Positioned in the dashboard shell or near the cube/timeline pair
- Does NOT display on the map (density-only per BVS-03)

**Confidence:** HIGH (standard UI component)

### BVS-08: Confidence-Based Kernel Softness

**What:** Burst confidence (0-1) shapes how tight or soft the burst emphasis appears. High confidence → tighter, stronger emphasis. Low confidence → softer, wider emphasis.

**Current state:** No confidence is used in rendering. `burstConfidence` exists in `DemoBurstWindowSelection` but is not passed through to the rendering pipeline.

**Implementation:**
- Add `burstConfidence` to the cube's per-slice data (currently `SceneSlice` and `EvolvingSlice` lack this field)
- In the ShaderMaterial: `uBurstConfidence` drives a gaussian falloff exponent:
  - `high confidence (0.8+)`: sharp falloff (`exp(-dist² / (0.15 + confidence * 0.1))`)
  - `low confidence (<0.3)`: soft falloff (`exp(-dist² / (0.4 + confidence * 0.05))`)
- The confidence shapes the intensity gradient of each KDE cell's contribution
- For the Canvas2D version (pre-migration): the `kdeColor(intensity * confidenceScalar)` approach could work, but since we're migrating to ShaderMaterial, implement it in GLSL.

**Constraint:** Confidence shapes the *kernel softness*, not the burstScore or slice ordering (per CONTEXT.md). So it's purely a rendering parameter.

**Confidence:** MEDIUM (the shader math is standard, but the visual impact needs tuning)

---

## Dependencies Between Requirements

```
BVS-06 (mode toggle)
  ↓
BVS-04 (shared color scale) — defines the scale the mode uses
  ↓
BVS-07 (legend) — renders the scale from BVS-04

BVS-01 (ShaderMaterial GPU) — prerequisite for all cube burst encoding
  ├── BVS-02 (burstScore → opacity) — runs in the shader
  ├── BVS-05 (active burst emphasis) — extends BVS-02's shader
  └── BVS-08 (confidence kernel) — extends BVS-02's shader

BVS-04 (shared color scale) — timeline uses the scale independently of shader work
  └── (timeline doesn't need ShaderMaterial, uses SVG fills)

BVS-03 (map density-only) — independent, just verification
```

**Critical path:** BVS-01 → BVS-02 → BVS-05/BVS-08 (sequential, same files)
**Parallel-safe:** BVS-06 + BVS-04 + BVS-07 (state + color, don't need BVS-01)
**Timeline:** BVS-04 (timeline portion) is independent of BVS-01

---

## Recommended Plan Split: 3 Plans

### Plan 78-01: Burst State + Color Scale + Legend

**Requirements:** BVS-06, BVS-04 (definition), BVS-07

**Scope:**
1. Add `burstViewMode: 'density' | 'burst-emphasized'` to `useDashboardDemoCoordinationStore` with setter/reset
2. Extract current `kdeColor()` stops → canonical `src/lib/viz/burst-color-scale.ts`
3. Create `src/components/viz/BurstIntensityLegend.tsx`
4. Wire timeline (`DualTimelineSurface.tsx`) to use shared color scale for burst slice fills
5. Add mode toggle UI to `DemoInspectPanel.tsx` (or `DemoConfigurePanel.tsx`)
6. Timeline slice opacity responds to burstViewMode

**Key files to modify:**
- `src/store/useDashboardDemoCoordinationStore.ts` — add burstViewMode
- `src/components/dashboard-demo/DemoInspectPanel.tsx` — add mode toggle
- `src/components/timeline/DemoDualTimeline.tsx` — forward burstViewMode
- `src/components/timeline/DualTimelineSurface.tsx` — use shared scale + burstViewMode
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — place legend

**Key files to create:**
- `src/lib/viz/burst-color-scale.ts` (shared color stops + samplers)
- `src/components/viz/BurstIntensityLegend.tsx` (legend component)

**Dependencies:** None on other Phase 78 plans. Can be done first or in parallel.

---

### Plan 78-02: ShaderMaterial GPU Migration + Cube Burst Encoding

**Requirements:** BVS-01, BVS-02, BVS-05, BVS-08

**Scope:**
1. Create `src/app/stkde-3d/shaders/burst-slice-shader.ts` — custom ShaderMaterial
   - Input: KDE cell data as 2D Float32 data texture
   - Fragment shader: per-cell radial gaussian → accumulate → color from shared scale → opacity from burstScore
   - Uniforms: uKdeTexture, uBurstScore, uBurstConfidence, uBurstClass, uActiveIntensity, uViewMode, uActiveIndex
2. Replace `buildHeatmapTexture()` in `StkdeSliceStack.tsx` with ShaderMaterial approach
   - Pack KdeCell[] into Float32Array for data texture
   - Create ShaderMaterial per slice with burst uniforms
   - Handle texture lifecycle (dispose on re-render)
3. Preserve all existing visual structure:
   - Volumetric slab (Phase 77) — thickness, opacity, falloff
   - Active rings (3 meshes per slice)
   - Grid helper
   - HTML labels
4. Wire `burstScore` → shader uniform for per-slice opacity modulation
5. Wire `burstConfidence` → shader uniform for kernel softness
6. Implement `uViewMode` switching (density vs burst-emphasized) in shader
7. Active slice burst emphasis (boost when active AND bursty)

**Key files to modify:**
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — replace texture rendering with ShaderMaterial
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — forward new burst props
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — forward burstViewMode, burstConfidence
- `src/app/stkde-3d/lib/types.ts` — add burstConfidence to EvolvingSlice
- `src/store/useDashboardDemoCoordinationStore.ts` — already updated by Plan 78-01; ensure burstViewMode consumed here

**Key files to create:**
- `src/app/stkde-3d/shaders/burst-slice-shader.ts` — ShaderMaterial with burst uniforms

**Dependencies:** Best done after Plan 78-01 (so burstViewMode + color scale exist), but the shader work can be designed/implemented standalone with placeholder uniforms.

**Risks:**
- ShaderMaterial + depth-aware slab interaction needs careful testing
- Data texture packing/unpacking must match between CPU and GPU
- Volume profile from Phase 77 uses `slabOpacity`/`surfaceOpacity` — the new shader replaces `surfaceOpacity` computation; must match behavior in density mode

---

### Plan 78-03: Timeline Burst Encoding + Visual Verification

**Requirements:** BVS-04 (timeline integration), BVS-03 (verification), end-to-end consistency

**Scope:**
1. Timeline slice opacity encodes burstScore:
   - In `density` mode: `fillOpacity = 0.2 + burstScore * 0.3`
   - In `burst-emphasized` mode: `fillOpacity = 0.08 + burstScore * 0.75`
2. Timeline uses shared burst color scale from Plan 78-01 for slice fill
3. Integrate `BurstIntensityLegend` into dashboard shell
4. Map density-only verification:
   - Check DemoMapVisualization doesn't read burstViewMode
   - Check MapVisualization doesn't forward burst encoding
   - Check DataPoints shader is density-only
5. End-to-end visual consistency check:
   - Same burstScore → same color in cube and timeline
   - Mode toggle affects both cube and timeline identically
   - Map unaffected by mode toggle
   - Active slice emphasis works consistently

**Key files to modify:**
- `src/components/timeline/DualTimelineSurface.tsx` — burstScore-driven opacity
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — place legend
- `src/components/dashboard-demo/DemoMapVisualization.tsx` — verify/guard (BVS-03)

**Dependencies:** After Plan 78-01 (color scale exists) and Plan 78-02 (cube burst encoding done — allows end-to-end check).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **ShaderMaterial + slab depth interaction** | Medium | High — broken depth ordering makes all slices look wrong | Plan 78-02 must preserve the existing slab/surface/underlay mesh hierarchy precisely. Test density mode matches Phase 77 rendering exactly before adding burst encoding. |
| **Data texture packing complexity** | Low | Medium — wrong data layout produces garbage rendering | Use a known-good Float32Array layout (x, z, intensity packed) with cellCount uniform. Start with 32×32 max texture size. |
| **GPU texture update performance** | Low | Medium — re-creating textures every frame | Memoize texture creation on `sliceKdes` changes. Use `needsUpdate = true` pattern, not re-creation. |
| **Color scale mismatch** | Low | Medium — cube and timeline show different colors for same burstScore | Plan 78-01 extracts canonical stops. Both cube and timeline import the same module. No divergence possible. |
| **Phase 77 artifact regression** | Medium | Medium — ShaderMaterial replacement accidentally breaks volume rendering | Run visual regression: compare density mode rendering before and after Plan 78-02. Slab thickness, underlay, falloff must match. |
| **Timeline burstWindow markers not showing** | High (current state) | Low — the `burstWindows` prop is already defined but not visually rendered | Clarify scope: Phase 78 adds burstScore encoding to timeline slice fills. Timeline burst markers (separate SVG elements) are a future enhancement, not in scope. |

---

## Key Files That Will Be Modified

### Modified (existing)
| File | Plan | Change |
|------|------|--------|
| `src/store/useDashboardDemoCoordinationStore.ts` | 78-01 | Add `burstViewMode` state + setter/reset |
| `src/components/dashboard-demo/DemoInspectPanel.tsx` | 78-01 | Add mode toggle UI control |
| `src/components/timeline/DemoDualTimeline.tsx` | 78-01 | Forward burstViewMode to DualTimelineSurface |
| `src/components/timeline/DualTimelineSurface.tsx` | 78-01, 78-03 | Use shared color scale; burstScore-driven opacity |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | 78-03 | Place BurstIntensityLegend |
| `src/app/stkde-3d/components/StkdeSliceStack.tsx` | 78-02 | Replace Canvas2D texture with ShaderMaterial |
| `src/app/stkde-3d/components/Stkde3DScene.tsx` | 78-02 | Forward burst props to SliceStack |
| `src/components/dashboard-demo/Demo3dSpatialView.tsx` | 78-02 | Forward burstViewMode, burstConfidence per slice |
| `src/app/stkde-3d/lib/types.ts` | 78-02 | Add `burstConfidence` to `EvolvingSlice` |

### Created (new)
| File | Plan | Purpose |
|------|------|---------|
| `src/lib/viz/burst-color-scale.ts` | 78-01 | Canonical shared burst color scale |
| `src/components/viz/BurstIntensityLegend.tsx` | 78-01 | Shared legend for burst intensity |
| `src/app/stkde-3d/shaders/burst-slice-shader.ts` | 78-02 | Custom ShaderMaterial for GPU burst rendering |

### Verified only (no changes needed)
| File | Plan | Verification |
|------|------|--------------|
| `src/components/dashboard-demo/DemoMapVisualization.tsx` | 78-03 | Does not read burstViewMode (BVS-03) |
| `src/components/map/MapVisualization.tsx` | 78-03 | Does not forward burst encoding to map layers |
| `src/components/viz/DataPoints.tsx` | 78-03 | Shader uses density only, not burstScore |

---

## Open Questions / Unknowns

1. **Data texture layout for ShaderMaterial:** What's the optimal packing of KDE cells into a Float32 data texture? Current `KdeCell[]` has x, z, intensity, support per cell. For the shader we need position and intensity at minimum. A 32×32 texture could hold 1024 cells, far more than the typical ~100-200 KDE cells per slice. Recommend: `[x, z, intensity, 0]` per cell in a R32F texture with nearest filtering.

2. **Timeline burst window markers:** The `burstWindows` prop exists in `DualTimelineSurface` but is never rendered. Phase 78 scope (BVS-04, BVS-07) is about the color scale and legend. Should the Phase 78 timeline work also render the burst window visual markers? The CONTEXT.md says "The timeline should remain a comparison surface, not a second heatmap; it should use the same burst scale with lighter emphasis." This suggests burst window markers on the timeline are deferred.

3. **Mobile/responsive for legend:** The `BurstIntensityLegend` needs to work at 40-80px width. Should use the same gradient approach as the existing density heat strip in `DualTimelineSurface`.

4. **Where to place the mode toggle:** Inspect panel (`DemoInspectPanel.tsx`) or Configure panel? The Inspect panel has slice controls (opacity, playback). The Configure panel has burst threshold controls. CONTEXT.md says to "bridge existing burst controls into it rather than duplicated." This suggests the mode toggle should be in the Configure panel alongside existing burst threshold. However, the Inspect panel is where users see the effect of the toggle most directly. Recommendation: Add to Configure panel with the burst threshold, and also make the Inspect panel's existing opacity slider context-aware (label changes based on mode).

---

## Sources

### Primary (HIGH confidence — codebase analysis)
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — current Canvas2D texture pipeline (BVS-01 target)
- `src/store/useDashboardDemoCoordinationStore.ts` — current coordination state (BVS-06 target)
- `src/components/timeline/DualTimelineSurface.tsx` — timeline burst rendering (BVS-04 target)
- `src/components/timeline/DemoDualTimeline.tsx` — timeline logic and burst windows (BVS-04 target)
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — cube orchestration (BVS-02/BVS-08 target)
- `src/app/stkde-3d/lib/volume-encoding.ts` — Phase 77 duration-volume helpers (preservation target)
- `src/app/stkde-3d/lib/types.ts` — EvolvingSlice type (burstConfidence addition target)
- `.planning/phases/78-burst-visibility-visual-consistency/78-CONTEXT.md` — phase decisions
- `.planning/REQUIREMENTS.md` — BVS-01 through BVS-08 definitions
- `.planning/ROADMAP.md` — Phase 78 section with success criteria

### Secondary (MEDIUM confidence — WebSearch verified)
- Three.js ShaderMaterial with data textures — standard pattern, well-documented
- Color scale design for spatiotemporal data — based on existing codebase patterns (kdeColor, STKDE_HEATMAP_COLOR_STOPS)

### Tertiary (LOW confidence — unverified assumptions)
- KDE cell data texture packing strategy — needs validation during Plan 78-02 implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; all within existing Three.js/R3F/shader stack
- Architecture: HIGH — clear boundary between state (plan 78-01), shader (plan 78-02), and verification (plan 78-03)
- Pitfalls: MEDIUM — ShaderMaterial + slab depth interaction is the main unknown; cannot fully verify without implementation
- Color scale: HIGH — straightforward module extraction
- Timeline burst encoding: HIGH — standard SVG fill modifications

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (stable codebase, no fast-moving dependencies)
