# Git Timeline 4: Route Evolution & Experimental Decisions

**Extraction Date:** 2026-06-24
**Commit Range:** `3f47c6c` → `adb02e1` (commits ~1350–1727)
**Focus:** Route structure creation/evolution, workflow architecture decisions, planning context

---

## Initial Route Structure (at 3f47c6c — Phase 68 Start)

At the start of this range, the following App Router routes existed in `src/app/`:

```
api/            — Backend data endpoints
dashboard-v2/   — Workflow-driven dashboard variant
dashboard/      — Original dashboard route
stats/          — Statistics-focused route
stkde/          — 2D STKDE exploration route
timeline-test/  — Timeline QA/testing route
timeline-test-3d/ — 3D timeline QA route
timeslicing/    — Timeslicing workflow route
timeslicing-algos/ — Timeslicing algorithms reference
```

**Home page index** (`src/app/page.tsx`) linked to: `/timeline-test`, `/timeline-test-3d`, `/timeslicing`, `/timeslicing-algos` with the tagline "Built for current QA cycle."

---

## Phase 43–46: Cube Sandbox (Mar 5–10, pre-v3.0 foundation)

These phases preceded the main v3.0 thrust and created the isolated `/cube-sandbox` route as a 3D experimentation surface.

### Route Creation
- **`d484aa7`** — `feat(43-01): scaffold isolated cube sandbox route`
  - Created `src/app/cube-sandbox/page.tsx` — App Router entry, 5 lines
  - Created `src/app/cube-sandbox/components/SandboxShell.tsx` — cube-first layout with right-side context rail
  - Commits `bee4a20` and `82df9bd` also contributed to shell scaffolding

### Route Components Accumulated
- **`src/app/cube-sandbox/components/SandboxShell.tsx`** — Route shell
- **`src/app/cube-sandbox/components/SandboxContextPanel.tsx`** — Diagnostics rail
- **`src/app/cube-sandbox/components/SpatialConstraintManager.tsx`** — Constraint UI (Phase 44)
- **`src/app/cube-sandbox/components/WarpProposalPanel.tsx`** — Warp proposals (Phase 45)
- **`src/app/cube-sandbox/components/IntervalProposalPanel.tsx`** — Interval proposals (Phase 46)

### Route-Local Libraries
- `src/app/cube-sandbox/lib/warpProposalEngine.ts` + `.test.ts`
- `src/app/cube-sandbox/lib/intervalProposalEngine.ts` + `.test.ts`
- `src/app/cube-sandbox/lib/applyWarpProposal.ts`
- `src/app/cube-sandbox/lib/applyIntervalProposal.ts`
- `src/app/cube-sandbox/lib/resetSandboxState.ts` + `.test.ts`

### Architecture Decision
- Cube sandbox was built as a **self-contained route** (route-local components and lib) rather than shared components, allowing unconstrained 3D experimentation without touching dashboard code.
- This route persists to HEAD but is **not linked from the home page** — it became a development surface superseded by `/stkde-3d` and `/dashboard-demo`.

---

## Phase 68: Dashboard-v2 Flow Consolidation (Apr 8)

**`2f7abce`** — `feat(68-dashboard-v2-flow-consolidation): consolidate dashboard-v2 workflow shell`
- Modified `src/app/dashboard-v2/page.tsx` — 275-line rewrite
- Added `src/app/dashboard-v2/page.flow-consolidation.test.tsx` — flow contract test
- **Decision:** Surface "Generate Draft Slices" as primary CTA, gate STKDE behind apply/refine, default advanced panels off.

This was the last work on the `/dashboard-v2` route before the **Phase 02 pivot** that shifted focus to `/dashboard-demo`.

---

## Phase 02 Pivot: Dashboard-Demo Route Creation (Apr 9)

### Key Architectural Decision
The project had an existing `/dashboard` route and a `/dashboard-v2` workflow route. Rather than modifying either, a **new isolated route** was created for the demo prototype.

**`ce0e737`** — `feat(02-pivot): add isolated dashboard demo route shell`
```
Created:
  src/app/dashboard-demo/page.tsx                  (5 lines)
  src/app/dashboard-demo/page.shell.test.tsx       (24 lines)
  src/components/dashboard-demo/DashboardDemoShell.tsx  (84 lines)
```

**Rationale** (from commit message):
> "introduce /dashboard-demo with map-first shared viewport orchestration"
> "reuse map, cube, timeline, and STKDE primitives in a demo-specific shell"
> "keep existing /dashboard route unchanged while enabling phase2 handoff demo"

### Initial Shell Architecture
- `DashboardDemoShell` — `"use client"`, map/cube viewport toggle, fixed right-side STKDE rail panel
- Reused shared components: `MapVisualization`, `CubeVisualization`, `TimelinePanel`, `DashboardStkdePanel`
- **Explicit isolation test**: shell asserts NO `TimeslicingWorkflowShell|BinningControls|SuggestionToolbar`

### Immediate Evolution (Phase 02-05)
- **`ce0e737`** → Shell with viewport toggle (map/cube)
- **`725bdbb`** — `docs(02-pivot): record phase2 demo-route direction override`
- **`9153648`** — `feat(02-05): simplify dashboard demo shell chrome`
- **`cf67b3d`** — `feat(02-05): add nested dashboard demo workflow drawer`

---

## Demo/Non-Uniform-Time-Slicing Route (Apr 17)

**`cab79a8`** — `feat(demo): add non-uniform burstiness showcase`

This created a parallel demo route at `/demo/non-uniform-time-slicing` alongside the `/dashboard-demo` route:
```
Created:
  src/app/demo/non-uniform-time-slicing/page.tsx   (11 lines)
  src/app/demo/non-uniform-time-slicing/showcase.tsx (582 lines)
  src/app/demo/non-uniform-time-slicing/selection.ts (30 lines)
  src/app/demo/non-uniform-time-slicing/selection.test.ts (29 lines)
  src/app/docs/page.tsx                            (497 lines)
```

### What This Route Showcases
- Standalone `Showcase` component demonstrating non-uniform burstiness
- Selection-first draft workflow
- **Not** a full dashboard shell — a focused feature demo

### Docs Route
- `src/app/docs/page.tsx` (497 lines) — algorithmic documentation page, created in same commit

---

## Phase 03–14: Dashboard-Demo Route Maturation (Apr 9–27)

### Phase 03: Demo Timeline Rewrite
- **`a832ee5`** — `feat(03-01): build demo timeline wrapper and companion panel`
- **`4154a0e`** — Added demo shell route isolation test

### Phase 04: Demo Stats + STKDE
- **`21515c9`** — `feat(04-01): add demo-local analysis state and hooks`
- **`3fd98a1`** — `feat(04-01): add demo stats and STKDE rail panels`

### Phase 05: Stats/STKDE Interaction
- **`914dd50`** — `feat(05-stats-stkde-interaction-01): make stats the demo entry surface`
- **`ead105e`** — `feat(05-stats-stkde-interaction-02): thread district filters through STKDE`
- **`0cd48e4`** — `feat(05): add police-district demo stats overlay`

### Phase 06: Timeline Polish
- **`7ba6d72`** — `feat(06-demo-timeline-polish-01): soften the slice companion rail`
- **`a6b16fd`** — `feat(06-demo-timeline-polish-02): add demo slice-authored warp controls`

### Phase 07: Preset Thresholds
- **`acc36f2`** — `feat(07-01): add demo-local per-preset Bias state`
- **`aba841c`** — `feat(07-02): add demo-local generation from preset Bias`

### Phase 09–10: Burstiness Engine
- **`6d32ef6`** — `feat(09-01): add burst draft conversion helper`
- **`a032dc5`** — `feat(09-02): add burst draft generation control`
- **`1ba5092`** — `feat(10-01): add non-uniform draft partition helpers`
- **`cab79a8`** — `feat(demo): add non-uniform burstiness showcase`
- **`1085642`** — `feat(10-03): add slice details dialog`

### Phase 11: Comparable-Bin Warp Scoring
- **`b042ac29`** — `feat(11-...01): add comparable-bin warp scoring engine`
- **`03c405d`** — `feat(11-...02): wire comparable warp scoring into the demo routes`
- **`74fee6c`** — `feat(11-02): surface shared comparable warp scoring in the showcase`

### Phase 12: Major Refactoring
- **Utility library consolidation**: `src/lib/math.ts`, `src/lib/date-formatting.ts`, `src/lib/stats.ts`, `src/lib/downsample.ts`, `src/lib/bounds.ts`, `src/lib/formatting.ts`, `src/lib/state-machine.ts`
- **Store splitting**: Extracted `usePresetStore`, `useSuggestionHistoryStore`, `useSuggestionComparisonStore` from monolithic `useSuggestionStore`
- **Timeline refactoring**: `DualTimeline.tsx` → shared core with `DemoDualTimeline.tsx` thin wrapper

### Phase 13: UX/IA Redesign
- **`9d5b681`** — `feat(13-01): reframe demo shell as guided workflow`
  - Added explanation rail panel
  - Rewrote workflow drawer as manual stepper
- **`c563fbe`** — `feat(13-02): frame dual timeline as analysis driver`
- **`edfc148`** — `feat(13-03): reframe cube shell as relational analysis surface`
- **`0d4f0e5`** — `feat(13-04): add shared selection story helper`
  - Syncs map/cube/timeline to shared selection state

### Phase 14: Demo Shell Refinement
- **`5b14d49`** — `feat(dashboard-demo): add temporal pulse trends`
- **`e5afd65`** — `fix(dashboard-demo): debounce selection-driven data updates`
- **`9194d5c`** — `Refine dashboard demo selection flow`
- **`d5c8fa5`** — `Refine dashboard demo shell layout`

**Phase renumbering note:** After Phase 14, the phase numbering was **reset** (Phases 01–06 under a new numbering scheme), as seen in the commit messages starting from `9194d5c`. This coincides with the introduction of 3D STKDE work.

---

## 3D STKDE Route Creation: `/stkde-3d` (May 9)

**`cb0e1e7`** — `feat: add stkde-3d chicago scene`
```
Created (8 files, 1116 insertions):
  src/app/stkde-3d/page.tsx                        (104 lines)
  src/app/stkde-3d/components/Stkde3DScene.tsx     (255 lines)
  src/app/stkde-3d/components/StkdeSliceStack.tsx  (222 lines)
  src/app/stkde-3d/components/SliceScrubber.tsx    (159 lines)
  src/app/stkde-3d/lib/slice-kde.ts                (82 lines)
  src/app/stkde-3d/lib/mock-data.ts                (236 lines)
  src/app/stkde-3d/lib/chicago-bounds.ts           (26 lines)
  src/app/stkde-3d/lib/types.ts                    (32 lines)
```

### Architecture Decision
- A **completely new self-contained route** independent of `dashboard-demo`
- Route-local components and lib: no shared dependencies on dashboard stores
- Chicago-specific hardcoded bounds (`chicago-bounds.ts`)
- Mock data system (`mock-data.ts`) with its own slice-KDE pipeline
- This route is specifically the **3D STKDE visualization surface** — it does NOT include dashboard chrome, workflow stepper, or the Generate/Slices/Inspect/Configure rail

### Evolution
- **`8beec79`** — `feat: tune stkde slice contrast`
- **`0074da4`** — `feat(stkde-3d): add raw event overlay toggle`
- **`02741ea`** — v3.0 shipped — added KDE panel, slice computation
- **Phase 72:** Added `KdeTuningPanel`, `SliceInspector`, Chicago bounds update
- **Phase 77:** Volumetric duration depth encoding in slices
- **Phase 78:** Temporal evolution (interpolation, aging trails) + compact controls
- **Phase 79 (Jun 10–16):**
  - `60fbf4e` — Adaptive warp axis component (`AdaptiveWarpAxis.tsx`, 127 lines)
  - `3634e91` — Interactive 3D slice controls
  - `23a1f27` — Adaptive timeline density strip
  - Volumetric ribbon, adaptive axis volume experiments (later hidden)
- **Phase 82:** `be21e10`, `fafdd59`, `67641d4` — Fixed warp domain window alignment in 3D scene

---

## V3.0 Milestone: Burstiness-Driven Slicing (May 11)

**`02741ea`** — `feat: ship v3.0 burstiness-driven slicing`

### New API Route
- **`src/app/api/adaptive/bursts/route.ts`** (206 lines) — Server-side burst detection endpoint

### Major Dashboard-Demo Changes
- Added `Demo3dSpatialView.tsx` (539 lines) — 3D cube with burst overlay
- Replaced `DemoComparisonPanel` with `DemoInspectPanel` (112 lines)
- Added `DemoDetectPanel.tsx` (402 lines) — Detect workflow surface
- Added `DemoConfigurePanel.tsx` (122 lines) — Configuration rail tab
- Created `src/lib/burst-detection.ts` (109 lines)
- Created `src/lib/kde/compute-slice-kde.ts` (90 lines)
- Created `src/lib/slice-allocator.ts` (90 lines)
- Removed old panels: `DemoExplainPanel.tsx`, `DemoEvolutionPanel.tsx`

### Workflow Rail Evolution
Rail tabs at this point: Detect → Slice → Configure (with Inspect replacing Comparison and Evolution panels).

---

## Phase 72: Workflow Clarity (May 20–21)

**Commit series:** `e53f03f` → `eb68c27`

### Key Route Changes
- **`e53f03f`** — `feat(72-01): clarify Detect workflow entry`
  - Put **Detect first** in workflow rail, relabel "Scan" as "Overview"
  - Added workflow-direction copy above rail tabs
  - Rewrote Detect panel around scan-then-generate

- **`18bc852`** — `feat(72-02): route showcase into Slices first`
  - **Decision:** Generated drafts now land in the **Slices rail** instead of auto-applying
  - 3D viewport stays inactive until a slice is actually applied
  - Files changed: only `DashboardDemoShell.tsx` (29 lines)

- **`6fe21c7`** — `feat(72-02): frame inspect as post-apply analysis`
  - Inspect copy updated to say it is for **applied slices only**
  - Empty state points users back to Slices for review/apply
  - Files changed: only `DemoInspectPanel.tsx` (384 lines, +304/-80)

### Final Workflow Rail Order (after Phase 72)
```
Overview → Detect → Slices → Inspect → Configure
```

### Full Commit (`eb68c27`):
- 36 files changed, 1358 insertions, 1451 deletions
- DemoDetectPanel: clearer scan-then-generate copy and flow
- DemoSlicePanel: routed generated drafts to Slices first for review/apply
- DemoInspectPanel: framed as post-apply analysis surface
- DemoConfigurePanel: STKDE section with scope mode, presets, sliders
- DemoStkdePanel: restored in Configure tab
- DemoMapVisualization: wired heatmap toggle to shared map-layer store
- MapVisualization: `disableHeatmapOverlay` prop for demo route
- Burst generation: partitioned fetch by granularity to avoid 50k cap
- stkde-3d: KdeTuningPanel, chunked computation, Chicago bounds update
- Home page (`page.tsx`): link updated to `/demo/non-uniform-time-slicing`
- v3.0 milestone audit created

---

## Phase 74–75: Coordination Polish + Presentation Cleanup (May 26)

**`0885868`** — `feat(74-75): coordination polish and presentation cleanup`

### Key Renamings
- **Decision:** "Showcase" → **"Generate"** (button labels, toasts, variable names)
- **Decision:** "Catalyst cue" → plain language in DemoStatsPanel
- **Decision:** "Choose a slice from Inspect" → **"Select a slice to compare"**
- **Decision:** Left/right comparison simplification

### Architecture Changes
- Bridge effect: `activeSliceIndex` → `activeSliceId` for timeline sync
- Immediate `activeSliceIndex` on apply in `DemoSlicePanel`
- Map filters crime data by active slice time range with label
- 3D view refetch guard preserves scrub position
- `DemoStkdeTrigger` for eager STKDE init

---

## V3.2 Milestone: Volumetric + Temporal (May 31–Jun 5)

**`9d03b97`** — `feat(v3.2): Phase 76-78 foundation, volumetric duration, and map burst cleanup`

### Phase 76: Foundation Cleanup
- Installed deck.gl + GSAP dependencies
- Created `DeckGlHeatmapOverlay` GPU heatmap layer (`src/components/map/DeckGlHeatmapOverlay.tsx`)
- Consolidated 3 drift-prone stores into coordination store
- Fixed shader caching (hardcoded array sizes, customProgramCacheKey)
- Enabled frustum culling on 6 geometry components
- Offloaded KDE computation to Web Worker (`src/workers/kdeSlice.worker.ts`)
- Built motion scaffolding (`src/lib/motion/easing.ts`, `src/lib/motion/aging.ts`)

### Phase 77: Volumetric Duration
- Duration-volume state in coordination store
- Normalization helpers (`src/app/stkde-3d/lib/volume-encoding.ts`)
- Threaded normalized volume data into 3D scene
- Replaced flat slice planes with depth-aware volumetric rendering

### Phase 78: Temporal Evolution
- **`4892c9e`** — `feat(78-01): add shared temporal playback state`
- **`00db363`** — `feat(78-01): drive demo 3d playback loop`
- **`df0d604`** — `feat(78-01): compact the inspect temporal controls`
- **`67c3c42`** — `feat(78-02): add interpolation and aging trails`

### Route Structure at v3.2 (`84bcd19`)
```
algorithms/ — NOT YET (added Jun 5)
api/
cube-sandbox/
dashboard-demo/
dashboard-v2/
dashboard/
demo/ (non-uniform-time-slicing)
docs/
evaluation/ — NOT YET (added Jun 19)
figures/ — NOT YET (added Jun 24)
stats/
stkde-3d/
stkde/
timeline-test-3d/
timeline-test/
timeslicing-algos/
timeslicing/
```

---

## Algorithms Reference Page (Jun 5)

**`7c9ad50`** — `feat: add algorithms reference page and extend demo warp factor to 0-3`

- Added `/algorithms` route (`src/app/algorithms/page.tsx`, 655 lines)
- Static server component with metadata — pure documentation surface
- Analyzes time/space complexity for every analytics path (STKDE, KDE, adaptive binning, interpolation, etc.)
- **Decision:** Extended demo warp factor slider from 0–1 to 0–3

---

## Phase 79: Adaptive 3D Visualization (Jun 10–16)

### Volume/Spacing Changes
- **`60fbf4e`** — `feat(79-01): add adaptive warp axis and variable slice spacing`
  - Created `src/app/stkde-3d/components/AdaptiveWarpAxis.tsx` (127 lines)
  - 1024-bin volumetric warp axis behind the slice stack
  - Slice Y positions driven by adaptive warp sampling when enabled
  - Linear spacing fallback for non-adaptive mode

- **`3634e91`** — `feat(79-02): add interactive 3D slice controls`
- **`e5e006b`** — `feat(79-01): add adaptive warp axis component` (dedicated mount in scene)

### Axis Volume Experiments
The adaptive axis went through **multiple iterations:**
1. `72b4fe5` — Adaptive axis volume hidden
2. `4482cd0` — Replaced with back ribbon
3. `96ba3b9` — Ribbon hidden again
4. Phase 82: `be21e10`, `fafdd59`, `67641d4` — Fixed warp domain window alignment

---

## Phase 80: Evaluation Route Creation (Jun 16–19)

### Research & Planning
- **`d50b4d8`** — `feat(experiments): add burst-aware figure generator`
- **`538a6bd`** — `docs(80): capture phase context`
- **`d0bcd91`** — `docs(80): split evaluation readiness plan`
- **`8550e38`** — `docs(80): add phase research`

### Key Architectural Decision (D-01 from 80-CONTEXT.md)
> **"Dedicated `/evaluation` route that imports `DashboardDemoShell` without modifying it. No changes to the existing `/dashboard-demo` route."**

### Study Protocol + Logging
- **`1924cb8`** — `feat(80-01): codify protocol, condition order, and audited reset checklist`
- **`c60e238`** — `feat(80-01): replace JSONL logging with acknowledged DuckDB study writes`
  - `src/app/api/study/log/route.test.ts` — test for study log endpoint

### Evaluation Route Created
**`ffe28e9`** — `feat(80-02): build /evaluation route shell, researcher header, and training gate`
```
Created (5 files, 1150 insertions):
  src/app/evaluation/page.tsx                        (20 lines)
  src/components/evaluation/EvaluationShell.tsx      (289 lines)
  src/components/evaluation/EvaluationHeader.tsx     (475 lines)
  src/components/evaluation/EvaluationTrainingGate.tsx (153 lines)
  src/components/onboarding/OnboardingTour.tsx       (modified, +279/-66)
```

### Evaluation Architecture
- **Server component** at route entry (`page.tsx`)
- **Client component** `EvaluationShell` wraps `DashboardDemoShell` with:
  - Three-zone header (session metadata, researcher stepper, utilities)
  - Training gate with 5-item checklist
  - Participant-mode disabled affordance
  - Condition badge (researcher-only, D-04)
  - Unlabeled time-scale toggle (D-05/D-06)
  - 8-step stepper: Welcome → Training → Tasks-A → Questionnaire-A → Tasks-B → Questionnaire-B → Interview → Done

### Locking Dashboard-Demo (Phase 80-03)
- **`1c98780`** — `feat(80-03): add evaluation locks to dashboard-demo rail tabs and panels`
- **`c4f4189`** — `feat(80-03): add researcher-only warp factor controls with acknowledged event logging`

### Verification Paused
- **`cf99f86`** — `docs(state): pause phase 80 pilot verification until after phase 81`

---

## Phase 81: DuckDB Persistence + API Cutover (Jun 19–23)

### New API Routes
- **`d8c2e19`** — `feat(81-01): persist canonical DuckDB fact table, metadata table, and overview bins`
- **`60ee70d`** — `feat(81-01): cut /api/crime/meta and /api/crime/overview to persisted reads`
  - Created `src/app/api/crime/meta/route.ts`
  - Created `src/app/api/crime/overview/route.ts` + `route.test.ts`

- **`dab3818`** — `feat(81-03): rebuild /api/crimes/range as exact paged guardrailed reads`
  - Refactored `src/app/api/crimes/range/route.ts`
- **`0f7c9d2`** — `feat(81-03): migrate dashboard consumers to paged contract + D-15 active-first`

### Architecture Decisions
- Summary-first timeline: separate overview data from detail data
- `loadDetailOnIntent` — explicit user intent required for detail loading
- D-15 active-first: last 15 days shown by default

### Rollback
- **`2e78df1`** — `revert: roll back phase 81 summary-first timeline changes`
  - The summary-first approach was rolled back (reverted); the API routes (`/api/crime/meta`, `/api/crime/overview`) persisted
- **`21da429`** — `test: add route tests for /api/crime/meta and /api/crime/overview`
  - API route tests added post-rollback

---

## Phase 82: POI Map Layers (Jun 23–24)

### Context & Planning
- **`4403797`** — `docs(82): smart discuss context`
- **`bc710f5`** — `docs(82-01): plan wire MapPoiLayer into demo map`
- **`2269aae`** — `docs(82): add phase to ROADMAP and STATE roadmap evolution`

### Implementation
- **`fd8c1d9`** — `feat(82): wire MapPoiLayer into dashboard-demo 2D map with toggle`
  - Wired existing `MapPoiLayer` into the dashboard-demo map
  - Used existing `useDashboardDemoMapLayerStore` (no new store)
- **`2567f05`** — `feat(82): merge POI/STKDE/Heatmap toggles into viewport pill as icon buttons`
  - Consolidated layer toggles into a single compact pill

### 3D Fixes (Late Stage)
- **`be21e10`** — `fix(3d-stkde): use fixed warpDomain window for slice Y in Stkde3DScene`
- **`fafdd59`** — `fix(3d-stkde): use fixed warpDomain window for slice Y in StkdeSliceStack`
- **`67641d4`** — `fix(3d-stkde): align axis bin layout with fixed warpDomain window in AdaptiveWarpAxis`
- **`765435c`** — `fix(timeline): normalize demo warp blend`

---

## Figures Route (Jun 24)

**`0aba6a7`** — `feat(figures): add figures gallery route under /figures`
```
Created (7 files, 597 insertions):
  src/app/figures/page.tsx               — Gallery index
  src/app/figures/_components/SketchShell.tsx — Reusable shell
  src/app/figures/overview/page.tsx      — Overview figure
  src/app/figures/map/page.tsx           — Map figure
  src/app/figures/cube/page.tsx          — 3D cube figure
  src/app/figures/timeline/page.tsx      — Timeline figure
  src/app/figures/controls/page.tsx      — Controls figure
```

---

## Home Page Route Consolidation (Evolution Across Range)

| Initial (`3f47c6c`) | Final (`adb02e1`) |
|---|---|
| `/timeline-test` | `/demo/non-uniform-time-slicing` (renamed) |
| `/timeline-test-3d` | `/stkde-3d` (renamed) |
| `/timeslicing` | *(removed from nav, route still exists)* |
| `/timeslicing-algos` | *(removed from nav, route still exists)* |
| — | `/algorithms` (new) |
| — | `/figures` (new) |
| — | `/evaluation` (new) |

Old route files were **NOT deleted** — they persist on disk for development/QA but are no longer linked from the home page.

---

## Current Route Structure (at HEAD `adb02e1`)

### Page Routes (15 total)
```
src/app/
├── algorithms/           — Complexity analysis docs (static)
├── cube-sandbox/         — 3D experimentation surface
│   ├── components/       — SandboxShell, SpatialConstraintManager, WarpProposalPanel, IntervalProposalPanel
│   └── lib/              — warpProposalEngine, intervalProposalEngine, resetSandboxState
├── dashboard-demo/       — PRIMARY PROTOTYPE (map-first, workflow rail)
├── dashboard-v2/         — Legacy workflow dashboard
├── dashboard/            — Original dashboard
├── demo/
│   └── non-uniform-time-slicing/  — Burstiness showcase
├── docs/                 — Algorithm documentation (static)
├── evaluation/           — Study evaluation route (wraps DashboardDemoShell)
├── figures/              — Thesis figure gallery
│   ├── _components/
│   ├── controls/
│   ├── cube/
│   ├── map/
│   ├── overview/
│   └── timeline/
├── stats/                — Statistics route
├── stkde-3d/             — 3D STKDE Chicago scene (self-contained)
│   ├── components/       — Stkde3DScene, StkdeSliceStack, SliceScrubber, AdaptiveWarpAxis, HotspotTrajectoryOverlay
│   └── lib/              — chicago-bounds, mock-data, volume-encoding, types
├── stkde/                — 2D STKDE route
├── timeline-test-3d/     — Legacy QA route
├── timeline-test/        — Legacy QA route
├── timeslicing-algos/    — Legacy QA route
└── timeslicing/          — Legacy QA route
```

### API Routes (6 endpoint groups)
```
src/app/api/
├── adaptive/
│   ├── bursts/           — Burst detection endpoint
│   └── global/           — Global adaptive params
├── crime/
│   ├── bins/             — Binned crime data
│   ├── facets/           — Crime facets
│   ├── meta/             — Crime metadata (persisted DuckDB)
│   ├── overview/         — Overview aggregation (persisted DuckDB)
│   ├── stats-summary/    — Statistics summary
│   └── stream/           — Streaming crime data
├── crimes/
│   └── range/            — Paged crime detail (guardrailed)
├── neighbourhood/
│   └── poi/              — Points of interest (with 24h cache)
├── stkde/
│   └── hotspots/         — STKDE hotspot detection
└── study/
    └── log/              — Study event logging (DuckDB writes)
```

### Key Untracked Routes (on disk, not yet committed)
- `src/app/api/crime/around/route.ts` — Nearby crime query (Phase 82 work-in-progress)

---

## Summary of Architectural Decisions

| Decision | Commit(s) | Rationale |
|---|---|---|
| **Isolated dashboard-demo route** | `ce0e737` | Preserve existing `/dashboard` unchanged; avoid workflow shell coupling |
| **Self-contained stkde-3d route** | `cb0e1e7` | Independent 3D experimentation without dashboard dependencies |
| **Dedicated evaluation route** | `ffe28e9` | Phase 80 D-01: wraps `DashboardDemoShell` without modifying it |
| **Workflow: Generate → Slices → Inspect** | `e53f03f`–`eb68c27` | Phase 72: generated drafts land in Slices for review, Inspect is post-apply only |
| **"Showcase" → "Generate" rename** | `0885868` | Phase 74: plain language for participant clarity |
| **Summary-first timeline (rolled back)** | `2e78df1` | Phase 81: attempted memory optimization, reverted after issues |
| **POI toggle consolidated into viewport pill** | `2567f05` | Phase 82: unified layer controls reduces chrome |
| **Home page de-emphasizes QA routes** | Incremental | Legacy routes persist for dev but are not publicly linked |
| **Volumetric depth encoding** | `8ea168b` | Phase 77: flat slice planes replaced with depth-aware rendering |
| **Adaptive warp axis** | `60fbf4e` | Phase 79: non-linear slice spacing driven by adaptive time scaling |

---

*Generated from `git log --oneline --reverse 3f47c6c..adb02e1` (418 commits)*
*Route structure extracted from `git show <hash>:src/app` for key commits*
