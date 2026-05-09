# Cyclic Workflow Vision

## Core Insight

**"Apply" is not a terminal step.** Apply is a mid-workflow action that warps the timeline
to make spatial patterns visible. The whole point of adaptive time slicing is to enable
inspection — warping is the lens, not the output.

## Current Problem

The workflow is linear and terminal:
```
Orient → Find → Compare → Inspect → Explain → Apply
                                                    ↑
                                             dead end — "done"
```

- Burst detection is purely temporal (inter-event intervals)
- STKDE-3D is a separate route (`/stkde-3d`) with a broken burstiness score
- Spatial inspection (STKDE panel) is a disconnected tab, not part of the flow
- Applying slices is the end, not the beginning of spatial exploration

## Proposed Cyclic Workflow

```
                ┌─────────────────────────────────┐
                │                                 │
                ↓                                 │
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐
  │  Detect  │ → │  Apply as   │ → │  Inspect         │
  │  Bursts  │    │  Warp Lens  │    │  Spatially       │
  └──────────┘    └──────────────┘    └────────┬─────────┘
                                               │
                          ┌────────────────────┘
                          │
                          ↓
                ┌──────────────┐
                │   Refine     │── back to Detect with slices preserved
                └──────────────┘
```

### Phase 1 — Workflow Architecture

- Remove "Apply" as a terminal phase in the coordination store
- After `applyGeneratedBins()`, auto-transition to spatial inspection view
- Workflow phases become: `detect` → `inspecting` → `refining` (returns to `detect`)
- "Refining" means: user goes back to adjust slice boundaries, re-generate, re-apply, re-inspect

### Phase 2 — Two-Axis Burstiness

Add spatial concentration as a second dimension alongside temporal burstiness:

- **Temporal B** (existing): `(σ − μ) / (σ + μ)` from inter-event intervals
- **Spatial concentration** (new): Quick KDE peak ÷ expected uniform peak per partition
- Combined ranking: `0.5 × temporal_B + 0.5 × spatial_concentration`
- Add `spatialBurstCoefficient` to `TimeBin` type
- Show both scores in draft UI: "Temporal: +0.62 · Spatial: 3.4× concentrated"

Candidate windows must be both temporally bursty AND spatially concentrated to be
recommended as draft slices.

### Phase 3 — STKDE-3D as Spatial Inspection View

The stacked 3D KDE scene (currently at `/stkde-3d`) becomes the primary spatial
inspection tool within the dashboard demo:

- After applying slices, the 3D scene auto-populates with applied slices' KDE heatmaps
- Each slice displays its burstiness score (temporal + spatial components)
- Evolution playback animates through the 3D stack
- Replaces or augments the existing flat STKDE panel

### Phase 4 — Workflow UI

- Left stepper: `Scan → Detect & Apply → Inspect Spatially → Refine → Conclude`
- Right rail tabs: `Stats | Burst Detection | Spatial View | Compare | Evolution`
- Auto-tab-switching on workflow transitions:
  - Generating drafts → show Burst Detection tab
  - Applying → auto-switch to Spatial View tab
  - Selecting slice in Spatial View → auto-select in Compare/Evolution

## Burstiness Score (for STKDE-3D)

The broken `maxIntensity / count * 24` should be replaced with the same two-axis
approach used in the dashboard demo detection pipeline:

```ts
// Temporal factor — reuse dashboard demo formula
const temporalB = (stdDev - mean) / (stdDev + mean);

// Spatial factor — KDE concentration
const expectedUniform = events.length / gridCells;
const spatialConcentration = kde.maxIntensity / expectedUniform;

// Combined
const burstScore = 0.5 * normalize(temporalB) + 0.5 * clamp(spatialConcentration / 20, 0, 1);
```

This ensures the STKDE-3D scene's burstiness scores are semantically compatible
with the dashboard demo's detection pipeline.

## Key Principle

The workflow should feel like a single continuous workspace, not a sequence of
isolated steps. Detection, warping, and spatial inspection are the same activity
at different zoom levels — the UI should reflect that unity.
