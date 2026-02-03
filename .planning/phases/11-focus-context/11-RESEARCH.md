# Research: Focus+Context Visualization

**Phase:** 11
**Topic:** Focus+Context Visualization
**Status:** Complete

## Objective
Implement Focus+Context visualization techniques to support user exploration of the Space-Time Cube. This involves highlighting selected data points while maintaining context of the surrounding dataset, often through visual de-emphasis (ghosting) or aggregation.

## Core Concepts

### Focus+Context
- **Definition:** A visualization technique that allows users to see an object of primary interest (focus) in detail while preserving an overview of all surrounding information (context).
- **Application in STC:** When a user filters or selects a subset of crime data (e.g., "Theft" in "District 1"), these points should be visually prominent. The remaining data should not disappear entirely but recede visually to provide density and distribution context.

### Visual Techniques
1.  **Ghosting / Transparency:** Reduce alpha/opacity of non-selected points.
2.  **Desaturation:** Convert context points to grayscale.
3.  **Size Reduction:** Shrink context points.
4.  **Wireframe/Silhouette:** Render context as simplified shapes.

## Current Architecture Analysis

### Shader Implementation (`ghosting.ts`)
- **Existing Logic:**
  - `uUseColumns`: Switches between instanced attributes and columnar buffers.
  - `uTransition`: Animates between uniform and adaptive states.
  - **Filtering Logic:**
    - `uTypeMap` & `uDistrictMap`: Uniform arrays (36 floats) used as bitmasks/flags.
    - Fragment shader checks `vFilterType` against `uTypeMap`.
    - **Effect:** Currently, if a point is NOT selected, it is heavily dimmed:
      ```glsl
      if (typeSelected < 0.5 || districtSelected < 0.5) {
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = mix(vec3(luminance), gl_FragColor.rgb, 0.2); // Mostly grayscale
        gl_FragColor.a *= 0.05; // Very transparent
      }
      ```
  - **Time Range Logic:**
    - `uTimeMin` / `uTimeMax`.
    - Points outside range are also dimmed.

### Data Store (`useDataStore.ts`)
- **Columnar Data:** `Float32Array` for positions and timestamps, `Uint8Array` for categorical IDs.
- **Selection State:** Managed by `useFilterStore` (global filters) and `useCoordinationStore` (specific point selection).

## Implementation Plan

### 1. Refine Ghosting Logic
- The current implementation is a good start ("Focus" = full color/opacity, "Context" = faint gray).
- **Goal:** Add more nuance or control. Maybe "Near Context" vs "Far Context"?
- **Problem:** When 1.2M points are "ghosted" at 0.05 opacity, they might still occlude the focus points due to depth testing/sorting issues in WebGL with transparency.
- **Solution:**
  - **Depth Write:** Context points should probably NOT write to depth buffer, or rendering order needs management.
  - **Discard:** Maybe discard context points that are too far or irrelevant? Or is visual density enough?
  - **Styling:** Allow user to toggle "Show Context" on/off or adjust intensity.

### 2. Aggregation (Spatial/Temporal)
- **Concept:** Instead of drawing 1M faint points, draw aggregated "blocks" or "bins" for context.
- **Feasibility:**
  - **Client-side:** Binning 1M points in JS is heavy.
  - **Shader-side:** Can't easily aggregate in vertex shader without compute shaders (WebGPU).
  - **Backend:** DuckDB can generate aggregation tiles/cubes.
- **Decision:** For Phase 11, stick to **Visual Ghosting** (Plan A) as it leverages the existing high-performance instanced mesh. Aggregation is a V2 feature if performance degrades.

### 3. Interaction
- **Selection:** Clicking a point -> Highlight specific point, dim everything else.
- **Brushing:** Dragging a box (already implemented in Map, need in Cube?) -> Focus on region.
- **Hover:** Tooltip + momentary focus.

## Risks & Mitigations
- **Transparency Sorting:** Creating 1M transparent points causes overdraw and sorting artifacts.
  - *Mitigation:* Use `alphaTest` or opaque pass for context (stippling/dithering) instead of true alpha blending. `dithering_fragment` includes some logic, but explicit screen-door transparency is faster and order-independent.
- **Performance:** 1.2M fragments is cheap, but overdraw kills fill rate.
  - *Mitigation:* If context is too dense, increase discard threshold or reduce point size for context points.

## Recommendations
1.  **Enhance `ghosting.ts`:** Implement screen-door transparency (dithering) for context points to avoid alpha sorting issues.
2.  **Context Toggle:** Add UI control to show/hide context or adjust its visibility.
3.  **Selection Focus:** Ensure "Selected Point" (clicked) overrides filter states (always visible).

## Research Complete
Enough context exists in `src/components/viz/shaders/ghosting.ts` and `src/components/viz/DataPoints.tsx` to plan the refinements.
