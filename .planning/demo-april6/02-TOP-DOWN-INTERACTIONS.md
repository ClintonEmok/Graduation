# Top-Down Interactions Design

**Purpose:** Document the top-down interaction paradigm for the Adaptive Space-Time Cube.

**Last updated:** 2026-03-31

---

## Overview

The system employs a **top-down interaction paradigm** where users start with an overview and progressively drill down into specific temporal regions of interest. This approach is essential for exploring large spatiotemporal datasets where bursty patterns may be hidden at global scales.

---

## Interaction Hierarchy

### Level 1: Global Overview

| Interaction | Purpose | Implementation |
|-------------|---------|----------------|
| **View entire timeline** | See full temporal range | Timeline brush/pan at overview level |
| **Rotate 3D cube** | Orient spatial view | OrbitControls on 3D scene |
| **Toggle adaptive warp** | Compare uniform vs adaptive | Warp slider (0-100%) |
| **View density distribution** | Identify potential bursts | Density histogram on timeline |

**Goal:** Establish context and identify regions of interest.

**User Actions:**
1. Load dataset (full range or viewport)
2. Observe overall temporal distribution
3. Toggle adaptive mode to see where warping occurs
4. Identify visually dense periods

---

### Level 2: Region Selection

| Interaction | Purpose | Implementation |
|-------------|---------|----------------|
| **Timeline brush** | Select time range for detail | DualTimeline overview+detail brushing |
| **Spatial bounds** | Filter by geographic area | Map draw-bounds interaction |
| **Crime type filter** | Focus on specific categories | Filter panel multiselect |
| **District filter** | Focus on neighborhood | Filter panel multiselect |

**Goal:** Narrow focus to a specific temporal/spatial region.

**User Actions:**
1. Brush a time range on the overview timeline
2. Optionally draw spatial bounds on the 2D map
3. Optionally filter by crime type or district
4. Observe detail view updates

---

### Level 3: Time Slice Operations

| Interaction | Purpose | Implementation |
|-------------|---------|----------------|
| **Create slice** | Mark a time region for analysis | Timeline range selection + add button |
| **Auto-generate slices** | Get suggested burst periods | Suggestion generation workflow |
| **Adjust slice boundaries** | Fine-tune temporal focus | Drag slice edges on timeline |
| **Merge/split slices** | Combine or divide regions | Slice CRUD operations |

**Goal:** Define precise temporal windows for analysis.

**User Actions:**
1. Create manual slice OR accept suggested slices
2. Adjust boundaries by dragging
3. Optionally merge adjacent slices or split wide slices
4. View slice-specific statistics

---

### Level 4: Detailed Investigation

| Interaction | Purpose | Implementation |
|-------------|---------|----------------|
| **View slice points** | See all events in slice | Slice filtering + point rendering |
| **Inspect heatmap** | See spatial density in slice | STKDE hotspot overlay |
| **View trajectories** | Trace event sequences | Trajectory layer toggle |
| **Compare slices** | Contrast multiple periods | Multi-slice selection + sync |

**Goal:** Analyze specific events and patterns within slices.

**User Actions:**
1. Select a slice to view its points
2. Toggle heatmap to see spatial hotspots
3. Inspect individual points via hover/click
4. Compare multiple slices side-by-side

---

## Top-Down Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: GLOBAL OVERVIEW                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Full Timeline + 3D Cube + 2D Map                         │ │
│ │ - See entire temporal range                              │ │
│ │ - Identify potential bursty regions visually             │ │
│ │ - Toggle adaptive warp to see density emphasis           │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ User selects region of interest
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 2: REGION SELECTION                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Timeline Brush + Spatial Bounds + Filters                │ │
│ │ - Narrow temporal focus                                  │ │
│ │ - Optionally filter by location/type                     │ │
│ │ - Detail view shows selected region                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ User defines time slices
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 3: TIME SLICE OPERATIONS                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Manual/Auto Slices + CRUD Operations                     │ │
│ │ - Create, adjust, merge, split slices                    │ │
│ │ - View slice statistics                                  │ │
│ │ - Synchronized across all views                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ User investigates slice contents
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 4: DETAILED INVESTIGATION                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Point Inspection + STKDE Heatmap + Trajectories          │ │
│ │ - See all events in slice                                │ │
│ │ - Identify spatial hotspots                              │ │
│ │ - Trace event sequences                                  │ │
│ │ - Compare multiple slices                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Coordinated Multi-View Interactions

The top-down paradigm operates across all views simultaneously:

### Timeline → Cube → Map Synchronization

| Timeline Action | Cube Response | Map Response |
|-----------------|---------------|--------------|
| Brush time range | Zoom Y-axis to range | Show only points in range |
| Create slice | Add slice plane at Y | Highlight slice points |
| Adjust warp factor | Animate Y positions | Update point visibility |
| Select slice | Highlight slice plane | Focus map on slice bounds |

### Cube → Timeline → Map Synchronization

| Cube Action | Timeline Response | Map Response |
|-------------|-------------------|--------------|
| Click point | Scroll to point time | Highlight point location |
| Rotate view | No direct response | Sync camera (optional) |
| Toggle slice visibility | Update slice display | Update point filtering |

### Map → Timeline → Cube Synchronization

| Map Action | Timeline Response | Cube Response |
|------------|-------------------|---------------|
| Draw spatial bounds | No direct response | Filter points by bounds |
| Click point | Scroll to point time | Highlight point in cube |
| Pan/zoom | No direct response | Sync camera (optional) |

---

## Justification

### Why Top-Down?

**Information Foraging Theory:** Users start with broad information scent (visual density patterns) and progressively narrow to specific patches (time slices) based on expected value.

**Benefits:**
1. **Scalability:** Works with 1.2M points without overwhelming user
2. **Efficiency:** Users quickly identify promising regions before drilling down
3. **Flexibility:** Supports both manual exploration and automated suggestions
4. **Cognitive Load:** Gradual focus prevents information overload

### Alternative: Bottom-Up Considered and Rejected

**Bottom-up approach:** Start with individual events and aggregate upward.

**Problems:**
- Does not scale to 1.2M points
- Loses overview context
- Requires pre-knowledge of interesting events
- Overwhelming initial display

---

## Interaction Affordances

### Timeline Interactions

| Affordance | Visual Cue | Action |
|------------|------------|--------|
| **Brush handle** | `< >` shapes on edges | Drag to resize brush |
| **Brush area** | Highlighted region | Drag to pan brush |
| **Slice edge** | Vertical line at boundary | Drag to adjust slice |
| **Density histogram** | Bar heights | Click to set brush |

### Cube Interactions

| Affordance | Visual Cue | Action |
|------------|------------|--------|
| **Orbit controls** | Mouse cursor change | Drag to rotate |
| **Scroll wheel** | Implicit | Zoom in/out |
| **Point hover** | Point highlight | Click to inspect |
| **Slice plane** | Semi-transparent plane | Click to select slice |

### Map Interactions

| Affordance | Visual Cue | Action |
|------------|------------|--------|
| **Draw bounds** | Button + cursor change | Click-drag rectangle |
| **Point click** | Point highlight | View details |
| **Pan/zoom** | Standard map gestures | Navigate spatial view |

---

## Implementation References

| Component | File |
|-----------|------|
| Dual Timeline | `src/components/timeline/DualTimeline.tsx` |
| Timeline Brush | `src/components/timeline/TimelineBrush.tsx` |
| Slice Creation | `src/app/timeline-test/hooks/useSliceCreation.ts` |
| Slice Adjustment | `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx` |
| Cube Controls | `src/components/viz/Controls.tsx` |
| Point Picking | `src/components/viz/RaycastLine.tsx` |
| Map Bounds | `src/components/map/MapVisualization.tsx` |

---

## User Flow Example

**Scenario:** Investigate a burst of thefts in downtown area.

1. **Level 1:** Load dataset, see timeline with density spike around March 15
2. **Level 2:** Brush around March 15, filter to THEFT type
3. **Level 3:** Accept suggested slice for March 14-16 burst, adjust boundaries slightly
4. **Level 4:** View heatmap, identify hotspot near Loop district, click points to inspect details

**Time estimate:** 30-60 seconds for experienced user.

---

## Key Design Decisions

### D1: Why overview+detail instead of zoomable interface?

**Decision:** Use separate overview and detail timelines rather than pure zoom.

**Rationale:**
- Overview maintains global context while examining details
- Dual-view reduces navigation errors (lost in zoom)
- Matches Information Visualization best practices (Shneiderman, 1996)

### D2: Why synchronized views instead of independent views?

**Decision:** All views (timeline, cube, map) stay synchronized.

**Rationale:**
- Reduces cognitive load (no manual coordination)
- Supports cross-view pattern recognition
- Matches "Overview First, Zoom and Filter, Details on Demand" mantra

### D3: Why both manual and auto slice generation?

**Decision:** Support manual slice creation AND automated suggestions.

**Rationale:**
- Manual: Expert users may have specific hypotheses
- Auto: Novice users benefit from guidance
- Both: Different tasks require different approaches

---

## References

- Shneiderman, B. (1996). *The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations*
- Pirolli, P. & Card, S. (1999). *Information Foraging*
- Heer, J. & Shneiderman, B. (2012). *Interactive Dynamics for Visual Analysis*
