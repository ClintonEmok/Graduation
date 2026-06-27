# Map Heatmaps & STKDE — What Each View Answers

> Status: **Dashboard demo only.** Visible on the `/dashboard-demo` route
> for evaluators. Wired into the 2D map and 3D cube viewports; the
> timeline shows a separate density strip, not a heatmap.
>
> A frequent source of confusion is that **multiple heatmaps are
> visible at once** and they answer different questions. This document
> names those questions, identifies the source code for each heatmap,
> and explains when to use 2D vs 3D.

## 1. The Two Heatmaps on the 2D Map

The 2D map viewport always renders **two independently togglable**
heatmaps. They are not the same visualisation; they answer different
analytical questions, and they are powered by different rendering
pipelines.

| Toggle | Source file | Question it answers |
| ------ | ----------- | ------------------- |
| **Heatmap** (Layers3 icon) | `src/components/map/MapHeatmapOverlay.tsx` (R3F GPGPU) | *"Where did crime actually happen?"* |
| **STKDE** (Flame icon) | `src/components/map/MapStkdeHeatmapLayer.tsx` (MapLibre native) | *"Where are the statistically significant hotspots?"* |

The two layers coexist deliberately. An evaluator can turn them on
together, turn them off together, or inspect either in isolation.

### 1.1 Crime Point Heatmap — descriptive

The crime point heatmap is a **raw event density** visualisation.

- **Question it answers:** *Where did the most crime actually occur
  in the time window I am looking at?*
- **Data source:** the filtered crime point set (resolves all active
  filters: time range, crime type, district, spatial brush).
- **Algorithm:** a straightforward point density sum — every event
  contributes 1 to its cell, the GPU bins those points and colours
  cells by count.
- **Interpretation:** *literal*. A hot cell means "many events
  happened here." It is the same kind of signal a histogram would
  show, projected onto the map.
- **What it does NOT do:** it does not tell you whether a dense area
  is statistically anomalous. A downtown commercial district will
  always light up because there are simply more events there, even
  when nothing unusual is happening.

### 1.2 STKDE Heatmap — inferential

The STKDE heatmap is a **kernel density estimate of event intensity,
thresholded for statistical significance**. It is the
`MapStkdeHeatmapLayer`, fed by the `stkdeResponse.heatmap` field
computed in `src/lib/stkde` and surfaced via `useDemoStkde`.

- **Question it answers:** *Which areas are exhibiting more crime
  than we would expect, given the surrounding baseline?*
- **Data source:** crime points within the active time range and
  district selection (no crime-type or spatial-brush filter — STKDE
  is a statistical model that needs a representative population).
- **Algorithm:** a spatiotemporal kernel density estimate with
  significance thresholding (see `src/lib/stkde/`). Cells below the
  significance cutoff are suppressed, so what you see is the
  *non-random* portion of the spatial signal.
- **Interpretation:** *inferential*. A hot cell means "this area is
  significantly hotter than its neighbourhood baseline." The same
  downtown commercial area may be cool here if its event count is
  consistent with what we would predict from population / commercial
  activity.
- **What it does NOT do:** it does not show you the underlying event
  count. Two areas with the same STKDE intensity can have very
  different raw counts if the local baseline is different.

### 1.3 Why both

Showing only the crime point heatmap makes "busy areas" dominate the
view and obscures anomalies. Showing only STKDE hides the raw signal
and only answers "where is the anomaly?" — not "where is the crime?"
A participant needs both to reason about whether a hotspot is
genuine or expected.

The recommended pattern during evaluation:

1. Start with the **crime point heatmap** to ground yourself in the
   raw distribution of events.
2. Layer **STKDE** on top to surface the anomalies — places where
   the count is higher than baseline.

## 2. STKDE in 2D vs 3D — Same Model, Different Scope

STKDE appears in both viewports. They use the **same colour scale
function** (`sampleStkdeHeatmapColor` from `src/lib/stkde/heatmap-scale`)
but read from **different fields of the same `stkdeResponse` object**,
so they show different scopes of the data.

| Viewport | Field read | Question it answers |
| -------- | ---------- | ------------------- |
| **2D map** (`MapStkdeHeatmapLayer.tsx:60`) | `stkdeResponse.heatmap.cells` | *"What is the overall hotspot pattern across the full time range?"* |
| **3D cube** (`TimeSlices.tsx:153` → `SlicePlane.tsx`) | `stkdeResponse.sliceResults[sliceId].heatmap.cells` | *"What does the hotspot pattern look like at this moment?"* |

The 2D STKDE is an **aggregate** across all time slices. The 3D
STKDE is the **per-slice** layer, stacked MRI-style through the
time axis.

### 2.1 2D STKDE — aggregate

- One heatmap is drawn on the 2D map.
- Each cell's value is the STKDE intensity summed (or pooled,
  depending on the implementation in `src/lib/stkde`) across every
  time slice that intersects the active range.
- Best for: "Is there a hotspot somewhere in this city that I
  should care about, in general?"

### 2.2 3D STKDE — per-slice

- A separate heatmap is drawn on **each slice plane** in the 3D cube.
- Each cell's value is the STKDE intensity computed **only for events
  in that slice's epoch range**.
- The slices are stacked vertically in time, with Y mapped to the
  slice's centre epoch (via `resolveSliceY` in
  `src/app/stkde-3d/components/Stkde3DScene.tsx`).
- Best for: "How does the hotspot pattern move, grow, or fade as
  time progresses through the slices?"

### 2.3 When to use which

Use the **2D STKDE** when you want a single, summary view of where
hotspots exist. It is the right layer to glance at when asking
*"where should I focus?"*.

Use the **3D STKDE** when you want to see **temporal dynamics**: a
hotspot that appears in slice 2, intensifies in slice 4, and fades
by slice 6 will show that life cycle clearly when the slices are
stacked, but will be invisible (averaged out) in the 2D aggregate.

A useful mental model: the 2D heatmap is the **shadow** of the 3D
heatmap. The shadow tells you the *footprint*; the stack tells you
the *motion*.

## 3. Implementation References

- Crime point heatmap: `src/components/map/MapHeatmapOverlay.tsx`
  (R3F GPGPU) — driven by `filteredData` (crime points filtered to
  the active time slice and respecting all map filters).
- STKDE 2D layer: `src/components/map/MapStkdeHeatmapLayer.tsx`
  (MapLibre native heatmap) — reads `stkdeResponse.heatmap.cells`.
- STKDE 3D layer: `src/app/stkde-3d/components/TimeSlices.tsx` and
  `src/app/stkde-3d/components/SlicePlane.tsx` — reads
  `stkdeResponse.sliceResults[sliceId].heatmap.cells` per slice.
- STKDE pipeline: `src/lib/stkde/` — significance thresholding,
  colour scale, hotspot extraction.
- STKDE hook (dashboard demo): `src/components/dashboard-demo/lib/useDemoStkde.ts`
  — debounced 150 ms fetch from `POST /api/stkde/hotspots`, with
  scope mode (`'applied-slices'` vs `'full-viewport'`) controlling
  whether the per-slice results are populated.

## 4. Common Misreadings

- *"The two heatmaps on the map disagree."* They are answering
  different questions. A high crime count that is consistent with
  the local baseline will show on the point heatmap but not on
  STKDE — that is the point of STKDE.
- *"STKDE in 2D and 3D shows the same thing."* Only when there is
  a single slice. With multiple slices, the 2D is an aggregate and
  the 3D is per-slice.
- *"STKDE is filtered by crime type and spatial brush."* It is
  filtered by time range and district only. Crime type and spatial
  brush are deliberately excluded because STKDE is a statistical
  model that requires a representative input population.
