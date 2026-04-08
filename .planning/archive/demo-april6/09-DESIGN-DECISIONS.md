# Design Decisions Rationale

**Purpose:** Document key design decisions and their rationale for the Adaptive Space-Time Cube.

**Last updated:** 2026-03-31

---

## Overview

This document captures the major design decisions made during development, providing context for future maintainers and demo preparation.

---

## Architecture Decisions

### A1: React Three Fiber for 3D Rendering

**Decision:** Use React Three Fiber (R3F) instead of raw Three.js.

**Rationale:**
- Declarative scene composition matches React mental model
- Automatic React-Three.js state synchronization
- Component-based architecture for scene elements
- Ecosystem: drei helpers, postprocessing, leva controls

**Trade-offs:**
| Aspect | R3F | Raw Three.js |
|--------|-----|--------------|
| DX | Excellent | Good |
| Performance | Slight overhead | Maximum |
| Learning curve | React developers: easy | Three.js knowledge required |
| Debugging | React DevTools | Custom tooling |

**Evidence:** `src/components/viz/CubeVisualization.tsx`

---

### A2: Zustand for State Management

**Decision:** Use Zustand instead of Redux or React Context.

**Rationale:**
- Minimal boilerplate (no actions/reducers)
- Built-in middleware (persist, devtools)
- Hook-based API matches React patterns
- External store usage for non-React integration

**Store Structure:**
```
src/store/
├── useAdaptiveStore.ts      # Density, burstiness, warp maps
├── useBinningStore.ts       # Binning engine state
├── useCoordinationStore.ts  # Cross-view synchronization
├── useDataStore.ts          # Data loading and caching
├── slice-domain/            # Time slice management
│   ├── createSliceCoreSlice.ts
│   ├── createSliceSelectionSlice.ts
│   ├── createSliceAdjustmentSlice.ts
│   └── types.ts
```

---

### A3: Web Workers for Heavy Computation

**Decision:** Offload adaptive computation to Web Workers.

**Rationale:**
- 1.2M points require significant computation
- Main thread must remain responsive for UI
- Workers enable parallel computation
- Transferable objects minimize copy overhead

**Workers:**
| Worker | Purpose | Input | Output |
|--------|---------|-------|--------|
| `adaptiveTime.worker.ts` | Density/warp computation | Timestamps, config | Float32Array maps |
| `stkdeHotspot.worker.ts` | STKDE computation | Points, bandwidth | Hotspot data |

**Communication Pattern:**
```
Main Thread                    Web Worker
    │                              │
    │──── computeMaps() ──────────>│
    │                              │ (computing...)
    │<─── postMessage(result) ─────│
    │                              │
   (update store)                  │
```

---

### A4: GPU Shaders for Point Rendering

**Decision:** Use custom GLSL shaders instead of standard materials.

**Rationale:**
- Per-point color (crime type)
- Dynamic opacity (focus+context)
- Adaptive Y-positioning via texture lookup
- Burst highlighting via threshold comparison

**Shader Features:**
| Feature | Implementation | File |
|---------|---------------|------|
| Instance color | `instanceColor` attribute | `DataPoints.tsx` |
| Dithered transparency | Hash-based discard | `ghosting.ts:226-265` |
| Burst highlight | Texture threshold comparison | `ghosting.ts:269-275` |
| LOD scaling | Uniform-based point size | `ghosting.ts:183-189` |
| Adaptive Y | Texture lookup + mix | `ghosting.ts:86-133` |

---

## Visualization Decisions

### V1: Vertical Time Axis

**Decision:** Map time to Y-axis (vertical), space to X-Z plane.

**Rationale:**
- Matches timeline metaphors ("higher = later")
- Separates spatial interpretation (X-Z plane)
- Enables "looking down" at spatial distribution
- Natural vertical navigation through time

**Alternatives Considered:**
| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Horizontal time (X-axis) | Matches 2D timelines | Conflicts with longitude | Rejected |
| Depth time (Z-axis) | "Back in time" metaphor | Conflicts with latitude | Rejected |

---

### V2: Adaptive Time Scaling

**Decision:** Non-linear time axis that expands dense regions.

**Rationale:**
- Uniform time hides bursty patterns in dense clusters
- Adaptive scaling reveals temporal patterns
- User-controlled via slider (0-100%)
- Smooth interpolation between modes

**Implementation:**
```typescript
// Warp weight: 1 + (normalized_density × 5)
// Dense bins get 6× visual space
// Sparse bins get 1× visual space (minimum)
```

**Key Insight:** This is the core innovation of the visualization.

---

### V3: Focus+Context via Dithering

**Decision:** Use stochastic dithering for ghosting non-selected points.

**Rationale:**
- Uniform transparency causes alpha blending artifacts
- Dithering ensures each pixel is visible or discarded
- More stable appearance at varying densities
- GPU-friendly (no blending state changes)

**Comparison:**
| Method | Appearance | Performance | Artifacts |
|--------|------------|-------------|-----------|
| Uniform transparency | Semi-transparent | Moderate | Blending overlaps |
| Dithering | Pointillist | Excellent | No overlap issues |
| Discard entirely | Binary | Best | No context |

---

### V4: Color for Crime Type, Size Fixed

**Decision:** Use hue for categorical crime type; size remains constant (except LOD).

**Rationale:**
- Color supports 5-7 categories effectively
- Size perception is less accurate for categories
- Size variation would obscure dense clusters
- LOD already uses size for performance

**Palette:** `src/lib/palettes.ts`
- Dark theme default
- Light theme alternative
- Okabe-Ito for colorblind accessibility

---

## Interaction Decisions

### I1: Overview+Detail Timeline

**Decision:** Use dual timeline (overview + detail) instead of pure zoom.

**Rationale:**
- Overview maintains global context
- Detail shows selected region
- Reduces navigation errors ("lost in zoom")
- Matches Shneiderman's mantra

**Implementation:** `src/components/timeline/DualTimeline.tsx`

---

### I2: Brush-Driven Filtering

**Decision:** Timeline brush controls all views simultaneously.

**Rationale:**
- Coordinated multi-view pattern
- Reduces cognitive load
- Supports cross-view pattern recognition
- Single gesture updates all displays

**Synchronization:**
```
Timeline Brush → Cube Y-range → Map point filter → Density histogram
```

---

### I3: Slice-Based Analysis

**Decision:** Use time slices as primary unit for detailed analysis.

**Rationale:**
- Slices mark regions of interest
- Support CRUD operations (create, adjust, merge, split)
- Named for reference
- Enable cross-slice comparison

**Slice Types:**
| Type | Source | Naming |
|------|--------|--------|
| Manual | User-created | Custom name |
| Burst | Auto-detected | "Burst 1", "Burst 2" |
| Suggested | System-suggested | "Suggested N" |

---

### I4: Drag-Based Boundary Adjustment

**Decision:** Drag slice edges on timeline to adjust boundaries.

**Rationale:**
- Direct manipulation pattern
- Visual feedback during adjustment
- Preserves slice identity (no recreation needed)
- Keyboard alternative for precision

**Implementation:** `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx`

---

## Data Decisions

### D1: Progressive Loading via Viewport

**Decision:** Load only data within spatial/temporal viewport.

**Rationale:**
- 1.2M points cannot be loaded at once
- Viewport-based loading matches user focus
- Worker-based preprocessing
- Cached chunks for re-visiting regions

**Implementation:** `src/lib/data-provisioning.ts`

---

### D2: Web Worker for Adaptive Computation

**Decision:** Compute density/warp maps in Web Worker.

**Rationale:**
- Main thread remains responsive
- Parallel computation (multi-core)
- Transferable objects for efficiency
- Progress reporting possible

**Performance:**
| Dataset Size | Worker Time | Main Thread Impact |
|--------------|-------------|-------------------|
| 10K points | ~50ms | None |
| 100K points | ~200ms | None |
| 1.2M points | ~2s | None |

---

### D3: GPU Texture for Warp Map

**Decision:** Store warp map as GPU texture, sample in shader.

**Rationale:**
- O(1) lookup per vertex (constant time)
- No CPU-side iteration over 1.2M points
- Smooth interpolation via texture filtering
- Updates only require new texture upload

**Texture Size:** 100×1 (one value per bin)

---

## Binning Decisions

### B1: Strategy-Based Generation

**Decision:** User selects from 13 binning strategies.

**Rationale:**
- Different analysis tasks need different binning
- Domain knowledge informs strategy choice
- Auto-adaptive provides default
- Custom for expert users

**Strategies:**
| Strategy | Use Case | Bin Logic |
|----------|----------|-----------|
| `daytime-heavy` | Business hours analysis | 3hr daytime, 4hr nighttime |
| `nighttime-heavy` | Night crime analysis | 4hr nighttime, 3hr daytime |
| `burstiness` | Burst detection | Gap-based splitting |
| `uniform-distribution` | Balanced analysis | Equal events per bin |
| `uniform-time` | Temporal comparison | Equal time per bin |
| `auto-adaptive` | Default | CV-based selection |

---

### B2: Constraint Validation

**Decision:** Enforce constraints (minEvents, maxBins, contiguous).

**Rationale:**
- Prevents degenerate bins (empty, too small)
- Ensures visualization quality
- User-configurable thresholds
- Real-time validation feedback

---

### B3: Modification Tracking

**Decision:** Track user modifications with `isModified` flag and history.

**Rationale:**
- Distinguishes generated vs adjusted bins
- Enables undo/reset functionality
- Supports future analytics
- Preserves modification provenance

---

## Performance Decisions

### P1: Instanced Rendering

**Decision:** Use instanced mesh for points.

**Rationale:**
- Single draw call for all points
- Per-instance attributes (color, position)
- GPU-accelerated
- 60fps with 1.2M points

---

### P2: Level of Detail (LOD)

**Decision:** Reduce point size and density at distance.

**Rationale:**
- Maintains frame rate at zoom-out
- Reduces visual clutter
- Smooth transition via dithering
- Automatic based on camera distance

---

### P3: Texture-Based Warp

**Decision:** Apply warp via texture sampling, not CPU computation.

**Rationale:**
- 1.2M point positions updated in one operation
- No CPU-side iteration
- GPU-parallel execution
- Texture upload is fast

---

## Accessibility Decisions

### AC1: Colorblind-Safe Palette

**Decision:** Include Okabe-Ito palette option.

**Rationale:**
- ~8% of population has color vision deficiency
- Okabe-Ito designed for colorblind distinction
- Easy toggle in settings
- Maintains functionality for all users

---

### AC2: Numerical Burst Indication

**Decision:** Show count alongside visual burst indication.

**Rationale:**
- Not all users can distinguish orange overlay
- Count provides unambiguous information
- Matches accessibility best practices
- Alternative channel for burst detection

---

## Future Considerations

### Deferred Decisions

| Decision | Status | Reason |
|----------|--------|--------|
| Multi-scale burstiness | Deferred | Requires significant refactoring |
| Confidence intervals | Deferred | Research needed |
| Adaptive bin count | Deferred | Complexity vs benefit unclear |
| Pattern overlay | Deferred | Accessibility enhancement |

---

## Decision Audit Trail

| ID | Date | Decision | Status |
|----|------|----------|--------|
| A1 | 2025-01 | R3F for 3D | Active |
| A2 | 2025-02 | Zustand for state | Active |
| A3 | 2025-02 | Web Workers | Active |
| A4 | 2025-03 | Custom shaders | Active |
| V1 | 2025-01 | Vertical time | Active |
| V2 | 2025-03 | Adaptive scaling | Active |
| V3 | 2025-03 | Dithering | Active |
| V4 | 2025-01 | Color for type | Active |
| I1 | 2025-02 | Overview+Detail | Active |
| I2 | 2025-02 | Brush-driven | Active |
| I3 | 2025-02 | Slice-based | Active |
| I4 | 2025-02 | Drag adjustment | Active |
| B1 | 2025-03 | 13 strategies | Active |
| B2 | 2025-03 | Constraints | Active |
| B3 | 2025-03 | Modification tracking | Active |

---

## References

- Shneiderman, B. (1996). *The Eyes Have It*
- Cleveland, W.S. (1985). *Elements of Graphing Data*
- Ware, C. (2012). *Information Visualization*
