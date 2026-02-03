# Summary: Focus+Context Visualization

**Phase:** 11 (Focus Context)
**Plan:** 01 (Implement Dithered Transparency)
**Date:** 2026-02-03

## Overview
Implemented advanced Focus+Context visualization techniques to address occlusion and depth-sorting issues when rendering large datasets (1.2M points). The system now uses dithered transparency (screen-door effect) for context points instead of simple alpha blending, and provides user controls for context visibility.

## Key Changes

### Shader Logic (`ghosting.ts`)
- **Dithering:** Replaced `gl_FragColor.a` modulation with `discard` based on a screen-space modulo pattern (`(x+y)%2`). This creates a semi-transparent look without sorting artifacts.
- **Selection Logic:** Refined shader logic to clearly distinguish "Focus" (selected/filtered) from "Context" (unselected) points.
- **Context Toggle:** Added `uShowContext` uniform to completely hide context points if desired.

### State Management (`useUIStore.ts`)
- Added `showContext` (boolean) and `contextOpacity` (number) to the UI store.
- Added actions to toggle context visibility.

### Components
- **DataPoints:** Connected to `useUIStore` to pass new uniforms (`uShowContext`, `uContextOpacity`) to the shader.
- **Controls:** Added an eye icon button to toggle context visibility directly from the main view.

## Verification results
- **Visuals:** Focus points remain fully opaque and colored. Context points appear "ghosted" via dithering, maintaining density cues without solid walls of color.
- **Performance:** Dithering (`discard`) is performant and avoids expensive alpha sorting.
- **Interaction:** Toggling the eye icon instantly shows/hides the context layer.

## Next Steps
- Validate with full 1.2M dataset in a live session.
- Fine-tune dithering patterns if moiré patterns become distracting at certain zoom levels.
