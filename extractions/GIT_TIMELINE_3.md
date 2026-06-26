# Git Timeline: v2.0–v2.5 Route Evolution & Experimental Decisions

**Commit range**: `1e9c58d` → `3f47c6c`  
**Date range**: ~2026-03-02 to 2026-04-08  
**Period**: v1.3 completion → v2.0 (3D parity) → v2.1 (refactoring) → v2.2–v2.5 (algos, STKDE, neighbourhood, stats) → v3.0 start

---

## Routes: Before & After

### Before (1e9c58d)
```
src/app/
├── api/
│   ├── adaptive/
│   │   └── global/
│   ├── crime/
│   │   ├── bins/
│   │   ├── facets/
│   │   ├── meta/
│   │   └── stream/
│   ├── crimes/
│   │   └── range/
│   └── study/
│       └── log/
├── dashboard/
├── timeline-test/
│   ├── components/
│   ├── hooks/
│   └── lib/
└── timeslicing/
    └── components/
```

### After (3f47c6c)
```
src/app/
├── api/
│   ├── adaptive/global/
│   ├── crime/{bins,facets,meta,stream}/
│   ├── crimes/range/
│   ├── neighbourhood/poi/        ← NEW: Phase 58
│   ├── stkde/hotspots/            ← NEW: Phase 55
│   └── study/log/
├── dashboard/                     ← pre-existing
├── dashboard-v2/                  ← NEW: Phase 64 (consolidated wf)
│   └── hooks/
├── stats/                         ← NEW: Phase 59
│   ├── hooks/
│   └── lib/
├── stkde/                         ← NEW: Phase 55
│   └── lib/
├── timeline-test/                 ← pre-existing
│   ... 
├── timeline-test-3d/              ← NEW: Phase 43
│   ├── 3d/
│   ├── components/
│   └── lib/
├── timeslicing/                   ← pre-existing (enhanced)
│   └── components/
└── timeslicing-algos/             ← NEW: Phase 53
    └── lib/
```

**6 new routes added, 1 new API route family, 0 routes deleted.**

---

## Phase-by-Phase Timeline

---

### Phase 40-42: v1.3 Gap Closures (start of range)
**Commits**: `bc86c50` → `4457f60`

These were closing gaps on the v1.3 fully-automated timeslicing workflow before marking the milestone complete. No new routes.

| Commit | Change |
|--------|--------|
| `bc86c50` | Fix: clear time slices when accepting full-auto package |
| `606f13b` | Simplify full-auto to warp-only packages |
| `8b7187c` | Convert warp interval percentages to date ranges (AutoProposalSetCard) |
| `c652921` | Auto-switch to adaptive mode when warp is accepted |
| `8a9e8c7` | Align full-auto debug warp with slice-authored flow |

**Decision**: Full-auto packages simplified to **warp-only** (removed interval generation). Percentages replaced with human-readable date ranges. Auto-switch to adaptive mode on acceptance.

**Milestone**: `4457f60` — v1.3 shipped, milestone archived.

---

### Phase 43: Create `/timeline-test-3d` Route (cube sandbox)
**Commits**: `8ec908b` → `6a36fab`

The v2.0 milestone was rescoped from "Additional datasets and advanced analytics" to **"3D timeline-test parity"** — a focused route that duplicates timeline-test interaction in 3D.

#### v2.0 Re-scope
**Commit `8ec908b`**: `docs(v2.0): re-scope to 3d timeline-test parity`
> "Implementation policy for v2.0: favor 3D-specific logic copies for parity-critical flows; consolidation of duplicated 2D/3D logic is intentionally deferred."

This is the defining architectural decision of v2.0: **copy over consolidate**.

#### Route Scaffold
**Commit `cc569c1`**: `feat(43-01): scaffold timeline-test-3d route`

Created:
- `src/app/timeline-test-3d/page.tsx` — route shell, renders `DualTimeline` with header
- `src/app/timeline-test-3d/lib/route-orchestration.ts` — local copies of:
  - `buildSliceAuthoredWarpMap()` — warp density computation
  - `remapSelectionPercentToDomainPercent()` — coordinate remapping

**Route structure at creation** (commit `cc569c1`):
```
src/app/timeline-test-3d/
├── lib/
│   └── route-orchestration.ts    # local warp + remap helpers (copied from shared)
└── page.tsx                      # route shell with DualTimeline
```

#### 3D Scene Adapters
**Commits `a05585c` + `30bf663`**: Add `TimelineTest3DPoints`, `TimelineTest3DScene`

Created:
- `src/app/timeline-test-3d/components/TimelineTest3DPoints.tsx` — 3D crime point cloud with adaptive warp mapping
- `src/app/timeline-test-3d/components/TimelineTest3DScene.tsx` — R3F scene wrapper with CameraControls, CrimePoints, TimeSlices3D

**Commit `30bf663`**: Mounted scene in route + added homepage link
- `src/app/page.tsx` now links to both `/timeline-test` and `/timeline-test-3d`

#### Warp Fix
**Commit `e351507`**: Removed selection-range remapping that was collapsing authored warp impact — a critical fix showing the challenge of maintaining 2D/3D warp consistency.

#### Dedicated 3D Primitives
**Commit `6a36fab`**: Added `Scene3D.tsx` and `useCanonicalPoints.ts`

- `src/app/timeline-test-3d/3d/Scene3D.tsx` — standalone Canvas with OrbitControls, color-coded crime points
- `src/app/timeline-test-3d/3d/useCanonicalPoints.ts` — hook extracting canonical 3D points from `useDataStore` with adaptive mapping

**Route structure after Phase 43** (end `6a36fab`):
```
src/app/timeline-test-3d/
├── 3d/
│   ├── Scene3D.tsx                 # R3F Canvas + crime points
│   └── useCanonicalPoints.ts       # store extraction hook
├── components/
│   ├── TimelineTest3DPoints.tsx    # adaptive warp-aware points
│   ├── TimelineTest3DScene.tsx     # scene composition
│   └── TimeSlices3D.tsx            # (added Phase 44)
├── lib/
│   └── route-orchestration.ts
└── page.tsx
```

---

### Phase 44: 3D Interaction Parity
**Commits**: `6faa203` → `3aa361e`

Brought manual timeslicing and warp interactions to the 3D route.

#### 3D Slice Rendering
**Commits `1ae8572` + `27a6984` + `2cdc135`**: Created `TimeSlices3D.tsx`

- Double-click to create point slices from 3D position
- Click to select, canvas click to clear
- Point and range slice planes rendered in scene Y space
- Adaptive warp-aware percent-to-Y mapping via `sampleWarpSeconds`

**Critical architecture pattern**: The 3D slice component (`TimeSlices3D.tsx`) directly accesses **shared stores** (`useSliceStore`, `useAdaptiveStore`, `useDataStore`, `useTimeStore`) — no route-level prop drilling. Stores are the integration layer.

#### Warp Slices in 3D
**Commit `d3940e6`**: Imported `WarpSlices3D` into `TimelineTest3DScene` — layered warp intervals in the 3D scene.

#### Suggestion Panel Copy
**Commit `b2fd694`**: Copied 8 suggestion components into `timeline-test-3d/components/`:
- `SuggestionPanel.tsx`, `SuggestionCard.tsx`, `AutoProposalSetCard.tsx`, `ComparisonView.tsx`, `ConfidenceBadge.tsx`, `ContextBadge.tsx`, `ProfileManager.tsx`

**Decision (explicit)**: The suggestion components were **copied** (not shared), following the v2.0 "copy over consolidate" policy.

#### NaN Fix
**Commit `3aa361e`**: `fix(timeline): prevent NaN ranges from burst selection` — a cross-cutting bug fix found during 3D testing.

---

### Phase 45: 3D Suggestion & Acceptance Parity
**Commits**: `f31ef7a` → `f1a256a`

**Commit `f31ef7a`**: Created plan
**Commit `b2fd694`**: `feat(45-01): add 3D suggestion panel workflow parity`
- Wired `SuggestionPanel` into timeline-test-3d controls
- Enabled full-auto ranking, recommendation rationale, and score breakdown in 3D

**Commit `79c580b`**: `fix(burstlist): preserve hook order on empty state` — discovered during 3D parity testing.

---

### Phase 46-51: v2.1 Refactoring & Decomposition
**Commits**: `75c938d` → `dbfa06b`

This was a massive refactoring wave that touched no routes but fundamentally changed the store architecture.

#### Store Consolidation (Phase 51 — 12 plans)
The key architectural transformation: **replace `useDataStore` with domain-specific stores**.

| Commit | Change |
|--------|--------|
| `bdfe4c4` | Created `useSliceDomainStore` (bounded slice-domain store) |
| `01c178b` | Created `useTimelineDataStore` (canonical timeline data surface) |
| `e8d433a` | Converted deprecated data store to compatibility shim |
| `9c1451f` | **Deleted `useDataStore.ts`** after zero-import gate |
| `55651fe` | Fix: persist worker count map for parity |

**What this meant for routes**:
- `useDataStore` → `useTimelineDataStore` across all routes
- `timeline-test-3d/components/TimelineTest3DPoints.tsx` rewired in commit `2e98257` (Phase 51-05)
- `timeline-test` rewired in `f214d1b` (Phase 51-04)
- `advanced viz` components rewired in `78450f9` (Phase 51-11)
- Import gates (`chore` commits) enforced zero-deprecated-import policy

**Decision**: The store migration was done as a **replace-in-place** with import gates rather than creating a parallel store layer. This meant routes saw internal API changes but no new route creation.

#### Guardrails Extraction (Phase 46)
**Commit `771b6f5`**: Extracted `DualTimeline` interaction guard helpers — brush zoom and selection guard functions moved to shared utils.

#### Dead Code Removal (Phase 47)
**Commit `dcc713b`**: Deleted `src/hooks/useSuggestionTrigger.ts` — a legacy hook.

#### API Stabilization (Phase 48)
- Fixed coordinate normalization: `f59b279` — added shared adapter
- Removed client-side crime range buffering: `09eea47`

#### Hook Decomposition (Phase 49)
Extracted from `DualTimeline`:
- Scale transform hook (`deb617e`)
- Density strip derivation hook (`83bffec`)
- Brush/zoom synchronization hook (`1a80067`)
- Point-selection hook (`7b0377b`)

**Decision**: `DualTimeline` was decomposed from a monolithic component into composable hooks while keeping the same route surfaces.

#### Query Layer Decomposition (Phase 50)
**Commit `8f81438`**: Added query fragment and sanitization boundary modules.
- Extracted filter/aggregation query scaffolds from `queries.ts`
- Parameterized hot-path query builders

---

### Phase 52-53: v2.2 Timeslicing Fidelity & `/timeslicing-algos` Route
**Commits**: `9d92cc4` → `1e7dcc8`

#### Adaptive Mode Cache (Phase 52)
- `c3e7e5b`: Uniform-events binning mode support
- `ac894c5`: Timeslicing recompute wiring
- `0dc9a6e` + `95cd525`: Global adaptive query cache extension

### Phase 53: Create `/timeslicing-algos` Route
**The major route creation event of this period.**

**Commit `5148a14`**: `feat(53-01): add timeslicing-algos shell with mode controls`
- `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` — 195 lines
- `src/app/timeslicing-algos/lib/algorithm-options.ts` — algorithm registry

**Commit `da9b4f8`**: `feat(53-01): add /timeslicing-algos route entry page`
- `src/app/timeslicing-algos/page.tsx` — 5-line thin wrapper

**Commit `8fbbd8b`**: `refactor(53-02): centralize MainScene route mode resolution` — the first cross-cutting route change that extracted shared mode resolution logic.

**Route structure at creation**:
```
src/app/timeslicing-algos/
├── lib/
│   ├── TimeslicingAlgosRouteShell.tsx   # main route logic
│   └── algorithm-options.ts             # registry of algorithms
└── page.tsx                             # entry point
```

**Key architectural pattern**: The route shell uses URL search params (`?mode=uniform-events`) for mode selection instead of store state. This is the **URL-as-state pattern** (as opposed to store-as-state used by other routes).

---

### Phase 54: v2.3 Algos Hardening (with tech debt)
**Commits**: `91b8e7e` → `ec5f56f`

Extended `/timeslicing-algos` with diagnostics, strategy, and timeline parity.

**Marked as complete with tech debt** at `51f36cc`:
> 4 incomplete plans: 54-02 (verbose diagnostics — superseded by Phase 57), 54-03 (regression coverage), 54-06 (DualTimeline tick UX), 54-08 (timeline semantics)

Key evolutions to timeslicing-algos:

| Commit | Change |
|--------|--------|
| `cf288d4` | Added algos mode intent resolver helper |
| `180137e` | Added strategy and timescale selection contract |
| `0454a50` | Added strategy stats, stabilized selector snapshots |
| `5860798` | Aligned algos timeline lifecycle with timeslicing semantics |
| `ef19e5d` | Added worker-aligned bin diagnostics model |
| `2a48e19` | Added per-bin diagnostics panel |
| `1942474` | Rewired timeslicing routes with explicit QA panel roles |
| `428baff` | Wired dual-fetch selection detail path |
| `b8227f9` | Surfaced selection detail provenance in route shell |

---

### Phase 55: Create `/stkde` Route (STKDE QA Surface)
**Commits**: `f38d061` → `c37c74a`

**Commit `ef36450`**: `feat(55-01): implement /stkde QA route with linked map and panel`

Created:
- `src/app/stkde/page.tsx` — thin wrapper
- `src/app/stkde/lib/StkdeRouteShell.tsx` — 250-line route shell with API fetch, parameter controls, heatmap layer
- `src/app/stkde/lib/HotspotPanel.tsx` — hotspot selection list
- `src/app/stkde/lib/stkde-query-state.ts` — URL state serialization
- `src/app/stkde/lib/stkde-view-model.ts` — view model builder
- `src/components/map/MapStkdeHeatmapLayer.tsx` — reusable heatmap component
- `src/store/useStkdeStore.ts` — dedicated STKDE store
- `src/app/api/stkde/hotspots/` — POST API endpoint

**Commit `dc4ac3e`**: Added STKDE guardrails, worker projection, and rollback flag.

**Commit `4d93bfd`**: Added compute mode controls (full-pop vs sample) and provenance UI.

**Route structure at creation**:
```
src/app/stkde/
├── lib/
│   ├── HotspotPanel.tsx
│   ├── StkdeRouteShell.tsx
│   ├── stkde-query-state.ts
│   └── stkde-view-model.ts
├── page.stkde.test.ts
└── page.tsx
src/app/api/stkde/
└── hotspots/
    └── route.ts         # POST endpoint
```

**Improvements** (later commits in range):
- `a065f46`: Date inputs for domain start/end
- `b4f4900`: Lifted full-pop span cap, clarified zoom radius semantics

---

### Phase 57: Context Diagnostics Engine
**Commits**: `9343ea0` → `f1cd1af`

Extended the timeslicing ecosystem with a deterministic diagnostics engine. No new routes, but significant enhancements to existing ones.

| Commit | Change |
|--------|--------|
| `e4233e9` | Temporal and spatial diagnostics extractors |
| `670fa58` | Deterministic dynamic profile scoring |
| `aa50404` | Diagnostics into suggestion generation metadata |
| `6a24a42` | Compact diagnostics summary UI |
| `ede05f2` | Strategy comparison model → surfaced on `/timeslicing-algos` |
| `11b87b1` | Per-bin trait labeling thresholds |
| `090524c` | Bin characterization rendered in algos diagnostics |
| `4d34e1c` | Pagination for bin characterization table |

---

### Phase 58: Create `/api/neighbourhood/poi` Route
**Commits**: `b070242` → `cd33b24`

**Commit `2c1facf`**: `feat(58-02): create /api/neighbourhood/poi server-side route`

Created:
- `src/app/api/neighbourhood/poi/route.ts` — GET endpoint with 24h in-memory cache

Also created client libraries:
- `src/lib/neighbourhood/types.ts` — neighbourhood types module
- `src/lib/neighbourhood/client/osm-overpass.ts` — OSM Overpass API client
- `src/lib/neighbourhood/client/chicago-data-portal.ts` — Chicago Data Portal client
- `src/lib/neighbourhood/summary.ts` — neighbourhood summary builder

Integrated into `/timeslicing-algos` via `NeighbourhoodDiagnosticsPanel`.

---

### Phase 59: Create `/stats` Route
**Commits**: `0f5cdca` → `6082ab5`

**Commit `9f10cd2`**: `feat(59): add stats page with visualizations`

Created (14 files, 1267 lines):
- `src/app/stats/page.tsx` — thin wrapper
- `src/app/stats/lib/StatsRouteShell.tsx` — 92-line route shell
- `src/app/stats/lib/stats-view-model.ts` — 128-line view model
- `src/app/stats/lib/components/StatsOverviewCards.tsx` — metric cards
- `src/app/stats/lib/components/CrimeTypeBreakdown.tsx` — bar chart
- `src/app/stats/lib/components/TemporalPatternChart.tsx` — hourly/monthly chart
- `src/app/stats/lib/components/NeighborhoodSelector.tsx` — district picker
- `src/app/stats/lib/components/TimeRangeSelector.tsx` — date range picker
- `src/app/stats/hooks/useNeighborhoodStats.ts` — data hook
- `src/store/useStatsStore.ts` — route-local state store
- `src/lib/stats/aggregation.ts` — pure aggregation helpers

**Commit `c84b1fb`**: Added hotspot map and neighbourhood context:
- `src/app/stats/lib/components/SpatialHotspotMap.tsx` — 168-line MapLibre map with heatmap/points toggle
- `src/app/stats/lib/components/NeighborhoodContext.tsx` — 208-line POI breakdown panel
- `src/app/stats/lib/components/StatsSectionLayout.tsx` — reusable section wrapper

**Route structure at end**:
```
src/app/stats/
├── hooks/
│   └── useNeighborhoodStats.ts
├── lib/
│   ├── StatsRouteShell.tsx
│   ├── stats-view-model.ts
│   └── components/
│       ├── CrimeTypeBreakdown.tsx
│       ├── NeighborhoodContext.tsx
│       ├── NeighborhoodSelector.tsx
│       ├── SpatialHotspotMap.tsx
│       ├── StatsOverviewCards.tsx
│       ├── StatsOverview.tsx
│       ├── StatsSectionLayout.tsx
│       ├── TemporalPatternChart.tsx
│       └── TimeRangeSelector.tsx
├── page.stats.test.ts
└── page.tsx
```

**Decision**: `/stats` is a **self-contained route** with its own store (`useStatsStore`), hooks, and components. It shares `MapBase` and MapLibre infrastructure but has route-specific aggregation logic.

---

### Phase 61: Flexible Binning Engine
**Commits**: `d52e53e` → `661e10e`

No new routes. Dynamic rule-based binning system added as a shared library.

- `8e53cab`: User-driven timeslicing controls
- `486a8cf`: OSM-ready map layers for POI and districts
- `60e0004`: Integrated DashboardHeader with controls

Commit `711e049`: docs(03-01) — note: the phase numbering jumped forward (Phase 03-01 inside v3.0 context, not the original Phase 3).

---

### Phase 62-64: Dashboard-v2 Unification
**Commits**: `6919bbc` → `2b6e396`

#### Coordination Store
**Commit `9ee8141`**: Expanded coordination store synchronization contract with deterministic invariants.

#### Dashboard-v2 Header Unification
**Commit `fa64ed7`**: Unify dashboard-v2 route header and status narrative
- Replaced ad-hoc top bar with `DashboardHeader` as canonical status surface
- Renders workflow/sync badges, strategy granularity, slice summary
- `src/app/dashboard-v2/page.tsx` became 334 lines

**Commit `ba552bd`**: Persist cube visibility in dashboard layout store.

**Route structure at end**:
```
src/app/dashboard-v2/
├── hooks/              # route-specific hooks added later
└── page.tsx            # unified dashboard orchestration page
```

---

### Phase 65: STKDE Integration into Dashboard-v2
**Commits**: `d7d4858` → `14ca1f7`

Integrated STKDE into the dashboard-v2 route (previously only available on `/stkde`).

| Commit | Change |
|--------|--------|
| `e578a8b` | Expanded STKDE store for dashboard run lifecycle |
| `13e713e` | Added dashboard STKDE orchestration hook |
| `2da19ca` | Added dashboard-native STKDE control panel |
| `7d7f44e` | Wired shared STKDE layer state into map rendering (new `useMapLayerStore.ts`) |
| `ae21ead` | Committed hotspot selection into global dashboard focus |

**Key architecture decision**: STKDE moved from isolated route (`/stkde`) to integrated dashboard-v2 layer. New `useMapLayerStore.ts` manages visibility/opacity for all map overlays including STKDE.

---

### Phase 66-67: Workflow Hardening & Burst Taxonomy
**Commits**: `46c903b` → `3f47c6c`

#### Phase 66: Full Workflow Validation
- `e209418`: Blocker-journey regression tests
- `c8f8518`: Sync and edge-state store contracts

#### Phase 67: Burst Taxonomy
**Commit `b42aa0a`**: `feat(67-01): add deterministic burst taxonomy core`
- `src/lib/binning/burst-taxonomy.ts` — 182-line burst classifier with confidence scoring
- Prolonged peaks, spikes, valleys, and tie cases covered

**Commit `2741d45`**: `feat(67-02): surface burst taxonomy in review ui`
- Taxonomy chips in generation and timeline surfaces
- Class, confidence, rationale, provenance in burst review

#### Phase 68
**Commit `3f47c6c`**: `docs(68): create phase plan` (last commit in range)

---

## Abandoned/Deferred Routes & Dead Ends

| Phase | Status | Why |
|-------|--------|-----|
| **Phase 56** (Variable sampling API) | **Planned, never executed** | 0/3 plans done. Registered at commit `a8cf726` but never built. |
| **Phase 54 plans 02/03/06/08** | **Tech debt, superseded** | Verbose diagnostics (superseded by Phase 57), regression coverage, tick UX, timeline semantics — left incomplete at `51f36cc` |
| **Phase 60** | **Never created** | Skipped entirely in the numbering scheme (jumped 59→61) |
| **Phase 42 "interval packages"** | **Simplified** | Full-auto packages went from warp+interval to warp-only (`606f13b`) |

---

## Key Architectural Decisions

### 1. "Copy over Consolidate" (v2.0 Policy)
At `8ec908b`: The entire v2.0 milestone was defined by the decision to **copy 3D-specific logic** into `timeline-test-3d/` rather than extracting shared abstractions. This includes:
- Route-local warp map generation (`route-orchestration.ts`)
- Copied suggestion components (8 files at `b2fd694`)

### 2. URL-as-State for Algorithmic Routes
The `/timeslicing-algos` route uses URL search params (`?mode=uniform-events`) instead of store-level state for mode selection. This is explicit at `5148a14`.

### 3. Store as Integration Layer
3D components (`TimeSlices3D`, `TimelineTest3DPoints`) access shared stores directly rather than receiving props from the route. The store consolidation (Phase 51) hardened this pattern by creating domain-specific stores with import gates.

### 4. Isolated Route Pattern for Stats
`/stats` is deliberately self-contained with its own store (`useStatsStore`), hooks, and components — contrasting with `/timeline-test-3d` which shares stores with `/timeline-test`.

### 5. Progressive Route Integration (STKDE)
STKDE evolved from isolated route (`/stkde`) → shared library component (`MapStkdeHeatmapLayer`) → integrated dashboard-v2 feature. This three-stage pattern (standalone → shared → integrated) appears to be the intended lifecycle.

### 6. No Route Deletions
Throughout ~450 commits covering ~6 major versions, **not a single route was deleted**. Old routes (`/dashboard`, `/timeline-test`, `/timeslicing`) remain alongside their successors. Technical debt from dual maintenance is explicitly acknowledged.

---

## Route Interaction Model (Summary)

| Route | Purpose | State Model | 3D? |
|-------|---------|-------------|-----|
| `/timeline-test` | 2D interaction sandbox | Shared stores | No |
| `/timeline-test-3d` | 3D parity surface | Shared stores + copied logic | Yes |
| `/timeslicing` | Full auto/semi-auto workflow | Shared stores | No |
| `/timeslicing-algos` | Algorithm comparison | URL search params | No |
| `/stkde` | STKDE QA exploration | `useStkdeStore` | No (map) |
| `/stats` | Neighbourhood statistics | `useStatsStore` | No |
| `/dashboard-v2` | Consolidated workflow | Shared stores + coordination | Yes (CubeViz) |
| `/dashboard` | Legacy (pre-v2 workflow) | Unknown | ? |
