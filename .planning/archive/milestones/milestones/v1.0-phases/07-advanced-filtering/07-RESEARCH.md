# Phase 07: Advanced Filtering - Research

**Researched:** 2026-02-02
**Domain:** Interactive Data Filtering & Visualization
**Confidence:** HIGH

## Summary

This phase implements multi-faceted filtering for the Chicago crime dataset, allowing users to slice data by attributes (Crime Type) and geography (Districts) while maintaining spatial context through "ghosting."

The research confirms a **hybrid architecture**:
1.  **Backend (DuckDB):** Handles "Broad" filtering (Date Range) and metadata aggregations (Facet Counts).
2.  **Client (GPU/Deck.gl):** Handles "Fine" filtering and visual "Ghosting" (opacity reduction) using custom shaders.

This approach satisfies the conflicting requirements of "Instant Feedback" and "Ghosting" (which requires retaining excluded points in memory) without overwhelming the Node.js backend with rapid re-queries for every checkbox toggle.

**Primary recommendation:** Implement "Ghosting" via **Deck.gl Custom Shader Modules** that modify the alpha channel based on Uniform inputs, rather than using the standard `DataFilterExtension` (which strictly hides data).

## Standard Stack

The established libraries for high-performance filtering:

### Core Logic
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `duckdb` | ^1.0.0 | Backend Aggregation | Fastest OLAP engine for generating facet counts from Arrow files. |
| `deck.gl` | ^8.9 | Visual Filtering | Standard for GPU-based filtering of millions of points. |
| `zustand` | ^4.4 | State Management | Lightweight store to sync Filter UI with Map Layers. |

### UI Components (shadcn/ui)
| Component | Purpose | Implementation |
|-----------|---------|----------------|
| `Popover` | Filter Overlay | Floating panel triggered by a button. |
| `Command` | Faceted Search | Filterable list of crime types with checkboxes. |
| `Slider` | Date Range | Range selector for years/months. |

## Architecture Patterns

### Pattern 1: Visual Ghosting via Shaders
**What:** Instead of removing points (discarding fragments), we lower their opacity in the shader.
**Why:** The standard `DataFilterExtension` hides points completely. "Ghosting" requires them to remain visible but dim.
**Implementation:**
Use the `extensions` prop on the Deck.gl layer to inject custom shader code.

```javascript
// src/components/map/layers/extensions/GhostingExtension.ts
import { LayerExtension } from '@deck.gl/core';

export class GhostingExtension extends LayerExtension {
  getShaders() {
    return {
      inject: {
        'fs:DECKGL_FILTER_COLOR': `
          // 'filterValue' is the attribute (e.g., crime type ID)
          // 'selectedCategories' is a uniform bitmask or texture
          
          bool isSelected = checkSelection(filterValue, selectedCategories);
          
          if (!isSelected) {
            color.a *= 0.05; // Ghost opacity
            // Optional: Desaturate
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = vec3(gray);
          }
        `
      }
    };
  }
}
```

### Pattern 2: The "Facet & Count" Pipeline
**What:** Separate the "Data Stream" from the "Metadata Counts".
**Why:** Streaming 8M rows takes time. Facet counts (GROUP BY) are instant and should load first/independently.
**Flow:**
1.  **User** toggles "Theft".
2.  **State** updates in `useFilterStore`.
3.  **Map** immediately updates Uniforms (Ghosting).
4.  **Debounced Effect** triggers API call: `GET /api/crime/facets?type=Theft`.
5.  **UI** updates the *other* facet counts (e.g., District counts reflect "Theft" selection).

### Pattern 3: Bitmask Filtering (Optimization)
**What:** Mapping categorical strings ("BATTERY", "THEFT") to integer IDs (0-31) and using a Bitmask Uniform.
**Why:** Sending string comparisons to the GPU is impossible/slow. 
**Constraint:** If > 32 categories, use two Uint32 uniforms or a 1D Texture lookup. (Chicago has ~35 primary types).
**Recommendation:** Use a **Uint8Texture** of size [256, 1]. 
- Index `i` represents Category ID `i`.
- Pixel value `255` = Selected, `0` = Unselected.
- Shader: `float status = texture(categoryTexture, vec2(id / 255.0, 0.5)).r;`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Filtering Logic** | `array.filter()` in JS | GPU Shaders | CPU filtering 8M rows freezes the main thread. GPU is instant. |
| **Facet UI** | Custom Dropdowns | `shadcn/ui` Popover + Command | Handles keyboard nav, focus management, and a11y correctly. |
| **State Sync** | Prop Drilling | `zustand` | Filter state is needed deeply in the Map and the Overlay. |

## Common Pitfalls

### Pitfall 1: "Ghosting" Performance Cost
**What goes wrong:** Rendering 8M "Ghost" points causes framerate drop.
**Why it happens:** Even transparent points require vertex processing and fragment shading (overdraw).
**How to avoid:** 
1. If FPS < 30, switch from "Ghosting" to "Hiding" dynamically.
2. Ensure `alphaCutoff` is not interfering with ghosts.

### Pitfall 2: String vs Integer Categories
**What goes wrong:** Filter doesn't work or is slow.
**Why it happens:** Trying to filter by string "THEFT" on the GPU.
**How to avoid:** 
1. Create a `category_map.json` (Theft -> 1, Battery -> 2).
2. During Data Ingestion (Phase 6 stream), convert strings to Uint8 IDs.
3. Pass `Uint8Array` as the attribute to Deck.gl.

### Pitfall 3: Stale Facet Counts
**What goes wrong:** User selects "2024", but Crime Type counts still show total historical data.
**How to avoid:** The Facet API must accept the *current* filter state as query params. `SELECT type, count(*) WHERE year = 2024...`

## Code Examples

### Facet API Endpoint (DuckDB)
```typescript
// app/api/crime/facets/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearStart = searchParams.get('start');
  
  const conn = await db.connect();
  
  // Parallel Aggregation
  const [types, districts] = await Promise.all([
    conn.all(`SELECT "Primary Type", COUNT(*) as c FROM data WHERE Year >= ? GROUP BY 1`, [yearStart]),
    conn.all(`SELECT "District", COUNT(*) as c FROM data WHERE Year >= ? GROUP BY 1`, [yearStart])
  ]);
  
  return Response.json({ types, districts });
}
```

### Visual Filter Hook (Frontend)
```typescript
// Uses a 1D texture to store selection state for up to 256 categories
function useCategoryFilterTexture(selectedIds: number[]) {
  const texture = useMemo(() => {
    const data = new Uint8Array(256).fill(0); // Default: Ghost/Hidden
    selectedIds.forEach(id => data[id] = 255); // Visible
    
    return new DataTexture({
      data,
      width: 256,
      height: 1,
      format: GL.RED,
      type: GL.UNSIGNED_BYTE
    });
  }, [selectedIds]);
  
  return texture;
}
```

## State of the Art

| Old Approach | Current Approach | Why Changed |
|--------------|------------------|-------------|
| Client-side `filter()` | GPU Shaders (Deck.gl) | Dataset size (8M) makes CPU loop too slow (>100ms). |
| Hard hiding | "Ghosting" | UX Requirement for maintaining spatial context. |
| String comparison | Integer ID Mapping | GPU efficiency (floats/ints only). |

## Open Questions

1.  **Selection Limit:**
    *   **Context:** Chicago has ~77 communities, 50 wards, 35 crime types.
    *   **Risk:** Texture lookup handles 256 IDs easily. If we filter by *multiple* dimensions (Type AND District), we need multiple textures or a combined ID strategy.
    *   **Recommendation:** Use independent textures/uniforms for each dimension: `checkType() && checkDistrict()`.

## Metadata

**Confidence breakdown:**
- Architecture: HIGH - Standard High-Performance WebGL pattern.
- Stack: HIGH - Consistent with Phase 6 & Phase 4.
- Ghosting Logic: HIGH - Custom Shaders are the only viable path for this requirement.

**Research date:** 2026-02-02
