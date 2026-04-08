# April 10 Implementation Findings

**Purpose:** Map the current implementation, show how sampling affects the workflow, and identify what is overengineered for the demo freeze.

**Last updated:** 2026-04-03

---

## Bottom Line

The codebase already supports a rich multi-view system, but the April 10 demo should only expose the smallest path that explains the workflow from raw data to user-made timeslices. Timeline and 2D map should carry the opening story. 3D and STKDE are useful depth, but secondary for the demo.

---

## Current Implementation Map

| Area | Current implementation | Demo role |
|------|------------------------|-----------|
| `src/app/dashboard-v2/page.tsx` | Loads crime data, seeds timeline/adaptive stores, infers workflow phase from multiple stores, and wires the main dashboard panels. | Demo shell |
| `src/components/dashboard/DashboardHeader.tsx` | Shows workflow state, sync status, strategy/granularity, and applied vs draft slice counts. | Supporting status bar |
| `src/components/timeline/DualTimeline.tsx` | Provides overview/detail timelines, brush and zoom sync, adaptive warping, and slice selection. | Essential |
| `src/components/map/MapVisualization.tsx` | Shows events, heatmap, clusters, trajectories, selection, and overlays. | Essential |
| `src/components/viz/CubeVisualization.tsx` | Full 3D scene with legend, selection, and STKDE context. | Secondary |
| `src/store/useTimeslicingModeStore.ts` | Holds draft bins, apply/review flow, auto/manual modes, presets, and generation state. | Essential, but too flexible |
| `src/store/useSliceDomainStore.ts` | Stores applied slices and visible generated slices. | Essential |
| `src/store/useCoordinationStore.ts` | Coordinates workflow phase and cross-panel sync. | Essential |
| `src/store/useFilterStore.ts` | Holds time and spatial focus filters. | Essential |
| `src/store/useTimelineDataStore.ts` | Seeds timeline data and bounds. | Essential |
| `src/store/useAdaptiveStore.ts` | Computes adaptive maps and warp state. | Essential |
| `src/lib/binning/*` and `src/store/useBinningStore.ts` | Full strategy-based binning engine with many presets and controls. | Important, but likely over-scoped for the demo |
| `src/components/timeslicing/*` | Manual editing and toolbar flows for slice authoring. | Supportive, not core |
| `src/components/stkde/*` | Hotspot analysis and inspection. | Secondary |

---

## How Sampling Affects The Workflow

Sampling is not just a technical choice. It changes the story the user experiences.

| Sampling choice | Workflow effect | Demo implication |
|-----------------|-----------------|------------------|
| `uniform-time` | Makes the user compare equal time windows. | Good baseline for comparison. |
| `uniform-events` / `uniform-distribution` | Makes the user compare equal event counts with different span widths. | Good for rate thinking. |
| `burstiness` / adaptive gap-based splitting | Highlights dense bursts and isolates gaps. | Best match for the demo story. |
| Manual timeslices | Makes the user author the analysis directly. | Good for showing user control, but keep the interaction simple. |
| `auto-adaptive` | Lets the system choose the lens. | Useful as a fallback, but can blur the user-made workflow. |

### What this means for April 10

- The demo should not try to show every strategy.
- The most legible story is one baseline sampling mode plus one burst-sensitive mode.
- The workflow should read as: raw data -> choose lens -> review draft timeslices -> adjust bins -> apply to shared views.
- If too many strategies are exposed, the demo becomes a feature tour instead of a workflow demo.
- Sampling should not decide the boundaries before the slice exists; if downsampling is needed, do it after slice creation or inside each slice for display.

### Rejected Paths

| Alternative path | Why it did not make the cut |
|------------------|----------------------------|
| Expose the full sampling catalog live | It makes the demo feel like a strategy browser instead of a workflow demo. |
| Start the demo from 3D or STKDE | It hides the raw data -> timeslice story behind heavier views. |
| Let API sampling define slice boundaries | It can skew burst structure before the user sees the slices. |
| Show deep manual editing by default | It adds too many branches to a demo that needs a tight live script. |

---

## Workflow Decisions That Still Need To Be Made

| Decision | Why it matters | Recommendation |
|----------|----------------|----------------|
| Which sampling presets are shown live? | This determines whether the demo feels like comparison, discovery, or authoring. | Show a small curated set, not the full catalog. |
| Which preset is the default? | The default controls the first impression and the first visible pattern. | Use a burst-sensitive or adaptive default, with one baseline contrast. |
| How much manual editing is in the demo? | Deep editing can make the story harder to follow. | Keep resizing and apply/review; hide deeper CRUD unless needed. |
| Is 3D part of the opening story? | 3D adds depth but also cognitive load. | Make it secondary. |
| Is STKDE part of the main path? | It adds analysis power but expands the surface area. | Keep it as supporting investigation. |
| How do we label burstiness vs event rate? | The labels need to be fast to read in a live demo. | Use the shortest unambiguous labels possible. |
| Should the demo start from timeline or cube? | Starting point determines the narrative shape. | Start from timeline. |

---

## What Already Supports The Demo Well

- Clear workflow state in the dashboard header.
- Draft bins and explicit apply/review behavior.
- Shared slice truth across timeline, map, and filters.
- Timeline brush driving the rest of the views.
- Map selection feeding back into shared time and spatial focus.
- Adaptive scaling that can make dense time regions visually distinct.

---

## What Looks Overengineered For The Demo

### High-value complexity worth keeping

- Web worker-based adaptive computation.
- Shared stores for synchronization.
- Explicit apply/review separation.
- Adaptive warp and focus+context behavior.

### Complexity that is probably too broad for April 10

- A 13-strategy binning surface in the UI.
- Auto/manual mode split plus templates plus deep slice authoring.
- Cube-first framing in the main route.
- STKDE as a first-class live demo panel.
- Extra layer-management and debug surfaces in the opening path.
- Workflow phase inferred from multiple stores instead of a single obvious user journey.

### Why this matters

The current app is not overengineered in the core research sense, but it is broader than the demo freeze needs. The risk is not the algorithms. The risk is that the UI exposes too many valid paths, which makes the narrative harder to explain and easier to derail.

---

## Recommendation

1. Keep the opening demo focused on raw data -> timeline -> map -> user-made timeslices.
2. Treat 3D as a secondary proof of depth, not the main hook.
3. Limit live sampling choices to a small curated pair or trio.
4. Keep apply/review visible so the user-made timeslice workflow is obvious.
5. Hide or defer advanced STKDE, layer, and deep editing surfaces unless the demo needs them.
6. Keep the slice boundary decision upstream of any display sampling so the workflow stays faithful.

---

## Short Version For The Team

The implementation is strong, but the demo should be narrower than the full system. The main story is sampling-driven workflow from raw data to user-made timeslices, best shown with the timeline and 2D map. 3D is useful, but secondary. Sampling strategy choice is a workflow decision, not just a backend detail. The current surface area is a bit overengineered for the demo, mostly because there are too many valid interaction paths.
