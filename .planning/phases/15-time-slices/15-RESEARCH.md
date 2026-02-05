# Phase 15: Time Slices Visualization - Research

**Researched:** 2026-02-05
**Domain:** 3D Visualization & Interaction
**Confidence:** HIGH

## Summary

Phase 15 implements user-manageable "Time Slices" — horizontal planes that cut through the 3D data cube. These slices serve as visual markers and data probes. The implementation leverages the existing `React Three Fiber` stack, `d3-scale` for coordinate mapping, and custom shader modifications for point highlighting.

The core challenge is ensuring slices align correctly with data in both **Linear** and **Adaptive** time modes. This requires using the existing adaptive scale logic to map `Time <-> Y-Position` bi-directionally. Highlighting is handled efficiently via shader uniforms rather than CPU-side filtering.

**Primary recommendation:** Implement a dedicated `TimeSlices` component that manages `SlicePlane` instances, synchronizes with a new `useSliceStore`, and injects slice data into the `DataPoints` shader for proximity highlighting.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@react-three/fiber** | ^9.5.0 | 3D Scene Management | Project standard |
| **@react-three/drei** | ^10.7.7 | Helpers (Text, Html) | Project standard for R3F utilities |
| **three** | ^0.182.0 | 3D Rendering | Core dependency |
| **zustand** | ^5.0.10 | State Management | Project standard |
| **d3-scale** | ^4.0.2 | Coordinate Mapping | Robust Linear/Adaptive scaling with `.invert()` |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| **src/lib/adaptive-scale.ts** | Time/Y Calculation | Use to generate D3 scales for slice positioning |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── viz/
│   │   ├── TimeSlices.tsx       # Manager component (scales, events)
│   │   ├── SlicePlane.tsx       # Individual slice (visuals, drag handle)
│   │   └── SliceManagerUI.tsx   # Sidebar controls
├── store/
│   └── useSliceStore.ts         # Zustand store for slices
```

### Pattern 1: Bi-Directional Mapping (Time <-> Y)
Slices store **Time**, but render at **Y**.
**Why:** In Adaptive mode, Y is non-linear. The UI (Date picker) controls Time, while the 3D Handle controls Y.
**Implementation:**
```typescript
// Inside TimeSlices.tsx
import { scaleLinear } from 'd3-scale';
import { getAdaptiveScaleConfig } from '@/lib/adaptive-scale';

// Memoize scale based on data
const scale = useMemo(() => {
  const config = getAdaptiveScaleConfig(data, ...);
  return scaleLinear().domain(config.domain).range(config.range);
}, [data, timeScaleMode]);

// To Render: y = scale(slice.time)
// To Update (Drag): newTime = scale.invert(newY)
```

### Pattern 2: Shader-Based Highlighting
Avoid re-computing colors on CPU. Pass slice times to shader.
**Implementation:**
Modify `ghosting.ts`:
```glsl
uniform float uSlices[MAX_SLICES];
uniform int uSliceCount;

// Fragment Shader
for(int i = 0; i < MAX_SLICES; i++) {
  if (i >= uSliceCount) break;
  if (abs(vLinearY - uSlices[i]) < uSliceThreshold) {
    // Brighten pixel
  }
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Dragging Logic** | Custom mouse listeners on window | **R3F Events** (`onPointerDown`) | R3F handles raycasting and 3D coordinates automatically. |
| **Coordinate Mapping** | Custom interpolation functions | **d3-scale** | Handles domain/range mapping and `.invert()` robustly. |
| **Grid Lines** | Custom shader grid | **GridHelper** | Built-in, efficient, supports size/divisions natively. |

## Common Pitfalls

### Pitfall 1: Visual Desynchronization
**What goes wrong:** Slices appear at the wrong height when switching between Linear and Adaptive modes.
**Why it happens:** Storing `yPosition` in the state instead of `time`.
**How to avoid:** Always store `time` as the source of truth. Compute `yPosition` on-the-fly using the memoized D3 scale.

### Pitfall 2: Shader Loop Overhead
**What goes wrong:** Passing too many slices or using non-constant loop limits causes compile errors or performance drops.
**How to avoid:** Define a strict `MAX_SLICES` (e.g., 20) in the shader and break early using `uSliceCount`.

### Pitfall 3: Double-Click Detection
**What goes wrong:** Clicking "empty space" in the cube doesn't trigger events.
**How to avoid:** Render an invisible `BoxGeometry` (opacity 0, `visible={false}` but `onClick` active? No, `visible={false}` disables raycast). Use `meshBasicMaterial` with `transparent={true}` and `opacity={0}` (or `visible={false}` only if using a specific raycaster, but simple R3F events require the mesh to be in the scene graph).
**Better approach:** Use a "hit box" mesh that matches the cube bounds, with `visible={false}` acts as a hit target? No, R3F objects must be visible to raycast. Use `opacity={0}` and `transparent`.

## Code Examples

### Slice Store Structure
```typescript
interface TimeSlice {
  id: string;
  time: number; // 0-100 (normalized) or timestamp
  isLocked: boolean;
  isVisible: boolean;
}

interface SliceStore {
  slices: TimeSlice[];
  addSlice: (time: number) => void;
  removeSlice: (id: string) => void;
  updateSlice: (id: string, updates: Partial<TimeSlice>) => void;
}
```

### Shader Uniform Injection (`ghosting.ts`)
```typescript
// In applyGhostingShader
shader.uniforms.uSliceCount = { value: 0 };
shader.uniforms.uSlices = { value: new Float32Array(20) };
shader.uniforms.uSliceThreshold = { value: 1.0 }; // Threshold in data space

// In TimeSlices component useEffect
material.userData.shader.uniforms.uSliceCount.value = activeSlices.length;
material.userData.shader.uniforms.uSlices.value.set(activeSlices.map(s => s.time));
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| **CPU Filtering** | **Shader Highlighting** | Instant feedback, zero geometry regeneration. |
| **Fixed Y-Planes** | **Data-Driven Time Planes** | Planes respect adaptive temporal density (burstiness). |

## Open Questions

1.  **Label Positioning:**
    *   **Context:** "Label attached to the axis handle".
    *   **Solution:** Use `@react-three/drei`'s `<Text>` or `<Html>` component parented to the handle mesh. `<Text>` is better for 3D integration, `<Html>` better for readability.
    *   **Recommendation:** Use `<Html>` for the handle label to ensure it's always readable and sits "on top" of the 3D scene.

## Sources

### Primary (HIGH confidence)
- **Codebase Analysis:** `src/components/viz/DataPoints.tsx` (Shader logic verified)
- **Codebase Analysis:** `src/lib/adaptive-scale.ts` (Math verified)
- **Library Check:** `d3-scale`, `@react-three/drei` present in `package.json`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified existing dependencies.
- Architecture: HIGH - Consistent with existing `DataPoints` pattern.
- Pitfalls: MEDIUM - Shader loop limits are standard GLSL constraints.

**Research date:** 2026-02-05
