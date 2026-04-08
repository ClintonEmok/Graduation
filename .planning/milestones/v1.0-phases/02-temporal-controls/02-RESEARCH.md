# Phase 02: Temporal Controls - Research

**Researched:** 2026-01-31
**Domain:** 3D Time Navigation & Animation State
**Confidence:** HIGH

## Summary

This phase implements time manipulation (play, pause, scrub) for the 3D visualization. The core challenge is bridging the React state (UI controls) with the 3D animation loop (60fps updates) without causing performance-killing re-renders.

The recommended approach uses **Zustand** for state management, but with a strict separation between "reactive state" (UI) and "frame-loop state" (3D). The visual metaphor (Moving Plane) should be implemented as a simple R3F mesh, while the "highlighting" of events must use **shader modification** (`onBeforeCompile`) rather than JavaScript-based filtering to maintain 60fps with thousands of points.

**Primary recommendation:** Use `useFrame` with Refs for the animation loop, syncing to Zustand only for UI updates, and use `Material.onBeforeCompile` for efficient point cloud highlighting.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **zustand** | ^5.0 | State Management | Standard for R3F; supports transient updates to avoid re-renders. |
| **@react-three/fiber** | ^9.0 | 3D Rendering | Already in use; `useFrame` is the standard animation loop. |
| **shadcn/ui** | Latest | UI Components | Standard for modern Next.js; provides accessible Slider/Select components. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **lucide-react** | ^0.563 | Icons | Play/Pause/Step icons (already installed). |
| **clsx / tailwind-merge** | Any | Styling | Dynamic class names for UI (already installed). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Shader Modification** | `PointsMaterial` (CPU update) | **Performance risk:** Updating colors for 10k+ points every frame in JS is too slow. |
| **Zustand** | `React.Context` | **Performance risk:** Context updates often trigger full tree re-renders, bad for 60fps time values. |

**Installation:**
```bash
# Recommended for UI controls
npx shadcn@latest add slider button select label
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── store/
│   └── useTimeStore.ts      # Logic: isPlaying, speed, actions
├── components/
│   ├── viz/
│   │   ├── TimePlane.tsx    # 3D: Visual plane moving in Y
│   │   └── DataPoints.tsx   # Update: Add shader logic for highlighting
│   └── ui/
│       └── TimeControls.tsx # 2D: Play/Pause, Slider, Step select
```

### Pattern 1: Transient Animation Loop
**What:** Decoupling the 60fps animation loop from React's render cycle.
**When to use:** Whenever a value changes every frame (like `currentTime` during playback).
**Example:**
```typescript
// store/useTimeStore.ts
// Store the "static" state here
export const useTimeStore = create((set) => ({
  isPlaying: false,
  currentTime: 0,
  actions: { ... }
}))

// components/viz/TimeLoop.tsx
function TimeLoop() {
  useFrame((state, delta) => {
    // Read state without subscribing
    const { isPlaying, speed, currentTime, actions } = useTimeStore.getState()
    
    if (isPlaying) {
      // Calculate new time
      const nextTime = currentTime + delta * speed
      
      // Update refs/shaders DIRECTLY (bypassing React)
      // ...
      
      // Update store explicitly (maybe throttled, or use transient update)
      actions.setTime(nextTime) 
    }
  })
}
```

### Pattern 2: Shader Injection (Highlighting)
**What:** modifying built-in materials to handle custom logic (highlighting by time) on the GPU.
**When to use:** Filtering or coloring thousands of points based on a global value (`uTime`).
**Example:**
```typescript
// Inside DataPoints.tsx
const onBeforeCompile = (shader) => {
  shader.uniforms.uTimePlane = { value: 0 };
  shader.uniforms.uRange = { value: 2.0 }; // +/- range
  
  shader.vertexShader = `
    varying float vY;
    ${shader.vertexShader}
  `.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    vY = (instanceMatrix * vec4(position, 1.0)).y; // Get world Y
    `
  );
  
  shader.fragmentShader = `
    uniform float uTimePlane;
    uniform float uRange;
    varying float vY;
    ${shader.fragmentShader}
  `.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    float dist = abs(vY - uTimePlane);
    if (dist > uRange) {
        // Option A: Discard (Filter)
        // discard; 
        
        // Option B: Dim (Highlight)
        diffuseColor.rgb *= 0.1; 
        diffuseColor.a *= 0.2;
    }
    `
  );
  material.userData.shader = shader; // Save reference to update uniform later
};
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Slider Interaction** | `<input type="range">` | `shadcn/ui` Slider | Accessibility, keyboard nav, and styling consistency are hard to get right manually. |
| **Animation Loop** | `requestAnimationFrame` | `useFrame` | `useFrame` automatically manages cleanup, priority, and sync with R3F render loop. |
| **Icons** | SVGs from scratch | `lucide-react` | Consistent style, already installed. |

## Common Pitfalls

### Pitfall 1: React Render Thrashing
**What goes wrong:** Connecting the slider value directly to the store and subscribing the entire 3D scene to it.
**Why it happens:** React re-renders components whenever the store changes. If `currentTime` changes 60 times/sec, React dies.
**How to avoid:**
1. Only subscribe UI components that *need* to show the numbers.
2. For the 3D scene, use `useFrame` and update Refs/Uniforms directly.
3. If using Zustand, use `useStore.subscribe` inside a `useEffect` to bridge changes to non-React targets if needed.

### Pitfall 2: Coordinate Space Mismatch
**What goes wrong:** The visual "Time Plane" moves in World Space, but Data Points are in Local Space (or vice versa).
**Warning signs:** The plane cuts through the data at the wrong height or angle.
**How to avoid:** Ensure both the Plane and the Points use the same coordinate system. Since `DataPoints` uses `InstancedMesh`, the shader must calculate the *World Position* (using `instanceMatrix`) to compare with the Plane's Y.

## Code Examples

### Standard Shadcn Slider Implementation
```tsx
import { Slider } from "@/components/ui/slider"

export function TimeSlider({ value, max, onChange }) {
  return (
    <Slider
      defaultValue={[0]}
      value={[value]}
      max={max}
      step={0.1}
      onValueChange={(vals) => onChange(vals[0])}
      className="w-full"
    />
  )
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| **JS Filtering** | **Shader Discarding** | JS is O(N) every frame on CPU. Shader is O(1) on GPU. Massive performance difference for >1k points. |
| **SetState Loop** | **Ref Mutation** | `useState` triggers React Reconciliation. Refs allow direct DOM/WebGL updates without overhead. |

## Open Questions

1.  **Exact "Step" Semantics:**
    *   *Constraint:* "Step by: Hour / Day".
    *   *Implementation:* Needs conversion factor (e.g., 1 Y unit = 1 Day).
    *   *Recommendation:* Add `timeScale` constant in `useTimeStore` to handle conversion.

## Sources

### Primary (HIGH confidence)
- **Official R3F Docs:** `useFrame` for animation loops.
- **Three.js Docs:** `Material.onBeforeCompile` for shader modifications.
- **Project Context:** `DataPoints.tsx` uses `InstancedMesh` (verified).

### Secondary (MEDIUM confidence)
- **Zustand Recipes:** Transient update patterns are standard but exact implementation varies.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - R3F/Zustand is verified present.
- Architecture: HIGH - Moving Plane + Shader is standard for this problem.
- Pitfalls: HIGH - React render cycle issues are the #1 killer in 3D apps.

**Research date:** 2026-01-31
