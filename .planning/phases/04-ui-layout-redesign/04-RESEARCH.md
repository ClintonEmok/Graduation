# Phase 04: UI Layout Redesign - Research

**Researched:** 2026-01-31
**Domain:** UI Layout & Visualization Integration
**Confidence:** HIGH

## Summary

This phase transitions the application from a simple view to a complex, research-grade dashboard. The core requirement is a "3-component layout" (Map, Cube, Timeline) which necessitates a robust split-pane architecture.

Research confirms that **`react-resizable-panels`** is the industry standard for this pattern in the React ecosystem, offering the performance and flexibility needed for scientific tools. It is also the underlying library for the `shadcn/ui` Resizable component, ensuring design system consistency.

For the map integration, **`react-map-gl`** using **`maplibre-gl`** is the recommended "research-grade" solution, offering better performance for large datasets (WebGL) compared to Leaflet, while remaining open-source.

**Primary recommendation:** Use `shadcn/ui`'s Resizable components to build a nested grid (Vertical split for Timeline, Horizontal split for Map/Cube) with `react-map-gl` and `react-three-fiber` as the primary visualization engines.

## Standard Stack

The established libraries/tools for this domain:

### Core Layout
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-resizable-panels` | ^2.0 | Layout Engine | Standard for IDE-like split views; handles resize events efficiently. |
| `shadcn/ui` (Resizable) | N/A | UI Components | Wraps `react-resizable-panels` with consistent styling. |

### Visualization Integration
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-map-gl` | ^7.1 | Map Wrapper | React wrapper for Mapbox/MapLibre. WebGL-accelerated (crucial for "research-grade"). |
| `maplibre-gl` | ^4.0 | Map Engine | Open-source fork of Mapbox GL. Avoids API keys/costs while keeping WebGL power. |
| `lucide-react` | Latest | Icons | Standard icon set for Shadcn UI. |

**Installation:**
```bash
npm install react-resizable-panels react-map-gl maplibre-gl
npx shadcn@latest add resizable
```

## Architecture Patterns

### Recommended Layout Structure

The user's "3 component layout" requires a nested panel approach:

```tsx
// Outer Group: Vertical (Content vs Timeline)
<ResizablePanelGroup direction="vertical">
  
  // Top Panel: Content Area
  <ResizablePanel defaultSize={75}>
    
    // Inner Group: Horizontal (Map vs Cube)
    <ResizablePanelGroup direction="horizontal">
      
      <ResizablePanel defaultSize={50} minSize={30}>
         {/* Map View */}
         <div className="relative w-full h-full">
           <MapComponent />
           {/* Map Controls Overlay */}
         </div>
      </ResizablePanel>
      
      <ResizableHandle /> {/* Draggable Divider */}
      
      <ResizablePanel defaultSize={50} minSize={30}>
         {/* 3D Cube View */}
         <div className="relative w-full h-full overflow-hidden">
           <Canvas>...</Canvas>
           {/* Cube Controls Overlay */}
         </div>
      </ResizablePanel>
      
    </ResizablePanelGroup>
    
  </ResizablePanel>

  <ResizableHandle /> {/* Draggable Divider */}

  // Bottom Panel: Timeline
  <ResizablePanel defaultSize={25} minSize={10} maxSize={40}>
     {/* Timeline Component */}
  </ResizablePanel>

</ResizablePanelGroup>
```

### Pattern 1: Absolute Positioning for Visualizations
**What:** Both Mapbox and R3F Canvases should be absolutely positioned inside their panels.
**Why:** Layout engines often use flex/grid, but WebGL canvases behave best when they fill a `relative` container.
**Example:**
```tsx
<div className="relative w-full h-full">
  <Canvas className="absolute inset-0" ... />
</div>
```

### Pattern 2: Persistent Layouts
**What:** Save the user's preferred panel sizes.
**How:** Use the `autoSaveId` prop on `ResizablePanelGroup` (requires client-side mounting check to avoid hydration mismatch).

## Common Pitfalls

### Pitfall 1: R3F Canvas Not Resizing
**What goes wrong:** The 3D scene looks squashed or stretched after dragging the resize handle.
**Why it happens:** The R3F `ResizeObserver` might not fire if the parent container doesn't have explicit dimensions or strict overflow handling.
**How to avoid:**
1. Wrap `<Canvas>` in a div with `style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}`.
2. Ensure the `ResizablePanel` itself has 100% width/height (usually handled by the library).

### Pitfall 2: Next.js Hydration Mismatch
**What goes wrong:** "Text content does not match server-rendered HTML" error when using persistent layouts (`autoSaveId`).
**Why it happens:** Server renders default sizes; client renders saved sizes from LocalStorage.
**How to avoid:**
- Use a `useMounted` hook to only render the `ResizablePanelGroup` on the client.
- OR use a `loading` state until mounted.

### Pitfall 3: Event Capture (Z-Index)
**What goes wrong:** You can't rotate the 3D cube because the mouse event is caught by an invisible overlay or the resize handle.
**How to avoid:**
- Visualization canvases should be `z-0`.
- Floating controls should be `z-10`.
- Resize handles usually handle their own Z-index, but ensure they aren't covered.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Split Panes** | Custom CSS Flexbox with mouse listeners | `react-resizable-panels` | Edge cases (iframe overlay, text selection, touch support) are brutal to solve manually. |
| **Map Engine** | `<div>` with background image | `react-map-gl` | Performance, interactions, and "research-grade" requirement imply vector data support. |

## Code Examples

### Standard Shadcn Resizable Implementation

```tsx
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export function DashboardLayout() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        {/* Main Content Area */}
        <ResizablePanel defaultSize={75}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Map View</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">3D Cube</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Timeline Area */}
        <ResizablePanel defaultSize={25}>
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Timeline</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
```

## Open Questions

1.  **Mobile Strategy:**
    -   *Current Assumption:* Research tools are desktop-first.
    -   *Recommendation:* On mobile, stack these panels vertically using a media query to disable the `ResizablePanelGroup` or switch to a "Tabs" view.
2.  **Map Provider:**
    -   *Assumption:* Using `maplibre-gl` to avoid API keys initially. If "Real Mapbox" is required, switch the import to `mapbox-gl` and add a token.

## Sources

### Primary (HIGH confidence)
-   **shadcn/ui** - [Resizable Component](https://ui.shadcn.com/docs/components/resizable)
-   **react-resizable-panels** - [Documentation](https://github.com/bvaughn/react-resizable-panels)

### Secondary (MEDIUM confidence)
-   **react-map-gl** - Comparison of Mapbox vs Leaflet for data viz.
-   **R3F Community** - Best practices for canvas resizing in flex containers.
