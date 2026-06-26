# Git Timeline 2: Route Evolution & Architecture Decisions (Phases 26-40)

**Commit Range:** `747805b` → `1e9c58d` (387 commits)
**Period:** Feb 17 – Mar 2, 2026
**Milestones:** v1.1 Manual Timeslicing → v1.2 Semi-Automated → v1.3 Fully Automated

---

## Initial Route Tree (at `747805b`)

```
src/app/
├── api/
│   ├── crime/bins/route.ts       # Aggregated bins
│   ├── crime/facets/route.ts     # Crime type facets
│   ├── crime/meta/route.ts       # Data metadata
│   ├── crime/stream/route.ts     # Crime data streaming
│   └── study/log/route.ts        # Study interaction logging
├── favicon.ico
├── globals.css
├── layout.tsx                    # Root layout (no QueryProvider yet)
└── page.tsx                      # = Full dashboard (Map + 3D + Timeline)
```

**Single page app at this point.** `/` renders the full dashboard with `DashboardLayout`, `MapVisualization`, `CubeVisualization`, `TimelinePanel`, `StudyControls`, `ContextualSlicePanel`. No route groups, no parallel routes, no experimental routes.

---

## Phase 26: Timeline Density Visualization — `/timeline-test` Born

**Context:** "Timeline is the engine" principle established. Need isolated test harness for density visualization.

| Commit | Event | Detail |
|--------|-------|--------|
| `c58070d` → `6d694c6` | Planning | Phase docs created, 3 plans |
| `1486c7a` | Dep install | `@visx/gradient` dependency |
| **`bad494d`** | **Route created** | **`/timeline-test` created** — `101 lines`, single page with mock Float32 density, renders `DensityAreaChart` (72px) + `DensityTrack` (12px) side by side |
| `a65ee1e` | Component | `DensityAreaChart` built |
| `46e6b34` | Summary | Phase 26-01 complete |

**Route at creation:**
```
src/app/timeline-test/
└── page.tsx              # 101 lines — mock data, area chart + heat strip
```

**Decision:** `/timeline-test` is an isolated route, NOT embedded in the dashboard. This allows rapid iteration without touching `page.tsx` (the dashboard). This becomes the pattern for all subsequent feature work.

---

## Phase 27: Manual Slice Creation — `/timeline-test` Grows

**Context:** Users need to create time slices by click/drag. All work happens in `/timeline-test`.

| Commit | Event | Detail |
|--------|-------|--------|
| `539da41` | Store | Slice creation transient store + mode toggle |
| `b1c98ad` | Hook | `useSliceCreation` drag interaction hook |
| `b8f34eb` | Component | Ghost preview creation layer |
| `0703e7d` | **Integration** | Slice creation layer wired into timeline test page |
| `d511153` | Cleanup | Stale references removed from old components |
| `6f4c923` | **Integration** | Slice list integrated into timeline test page |
| `7a051ae` | Lib | Slice utility helpers for snap and constraints |
| `56c2127` | Feature | Snap toggle + constrained previews |
| `e392e39` | Polish | Edge handling for slice creation |
| `fe7f1f8` | Component | Committed slice renderer |
| `b858cd5` | **Integration** | Committed slice layer mounted in detail overlay |
| `929c4e1` | Fix | Committed slices aligned with timeline zoom domain |

**Route-local modules accumulated:**
```
src/app/timeline-test/
├── page.tsx                       # Growing
├── components/
│   ├── SliceCreationLayer.tsx     # NEW — ghost preview
│   ├── CommittedSliceLayer.tsx    # NEW — committed render
│   ├── SliceList.tsx              # NEW — slice list panel
│   └── SliceToolbar.tsx          # NEW — mode controls
├── hooks/
│   ├── useSliceCreation.ts        # NEW — drag interaction
│   └── useSliceBoundaryAdjustment.ts  # Later (Phase 28)
└── lib/
    ├── slice-utils.ts             # Shared slice math
    ├── slice-adjustment.ts        # Boundary math
    └── dom-vector.ts              # DOM coordinate helpers
```

**Key decision:** Route-local components and hooks, not shared in `src/components/`. The `/timeline-test` route is self-contained, making it fast to iterate but introducing the risk of divergence from the main dashboard.

---

## Phase 28: Slice Boundary Adjustment

| Commit | Event | Detail |
|--------|-------|--------|
| `95c78e7` | Math | Deterministic boundary adjustment math |
| `c7f720d` | Fix | Constraint validation + snap tie-break |
| `b295c84` | Store | Transient slice adjustment store |
| `9534d61` | Component | Boundary handles layer + drag tooltip |
| `b4b97e7` | **Integration** | Handle layer + dimming wired into timeline test |
| `dc5f3c3` | Controls | Snap controls in timeline toolbar |
| `e1ce744` | Harden | Drag interaction bypass feedback |
| `c61c762` | State | Transient live boundary drag state |
| `b51c045` | Fix | Remove trailing handle artifact |

**Route-local boundary handling complete.** All interaction logic lives in `/timeline-test`.

---

## Phase 29: Burstlist as First-Class Slices

**Context:** Existing burst list (showing density bursts in timeline) was a separate visualization. This phase reworks it to produce real slices.

| Commit | Event | Detail |
|--------|-------|--------|
| `c178306` | Logic | Burst slice metadata + reuse |
| `3503c18` | Utils | Range matching for slices |
| `bced479` | Sort | Slices kept sorted by timeline start |
| `c9b7501` | Chip | Burst-origin chip in slice list |
| `521f67b` | Rename | Inline rename in slice list |
| `1efdc62` | Effect | Auto burst slice creation |
| `521a1c3` | Convert | Burst clicks from create → select |
| `5d184cc` | UI | Burst slices orange-adjustable |
| `cc73346` | Hint | UI hint for slice boundary adj |
| `3d6ee96` | Refactor | Remove redundant burst overlays |

**Outcome:** `/timeline-test` now fully subsumes the burst list functionality. The original `BurstList` component (in `src/components/viz/`) is partially deprecated.

---

## Phase 30: Timeline Adaptive Time Scaling

| Commit | Event | Detail |
|--------|-------|--------|
| `ec9c6e9` | Controls | Time-scale mode selector in timeline toolbar |
| `5fd6448` | Warping | Adaptive axis warping in DualTimeline |
| `3b89baf` | Indicator | Amber gradient axis tint for adaptive mode |
| `938c5bb` | **Fix** | Slice overlays aligned with adaptive scale — detail overlay gets adaptive warp parity |

**Route impact:** `/timeline-test` extended with adaptive time scale mode. No new routes.

---

## Phase 31-32: Multi-Slice Management + Metadata UI

| Commit | Phase | Event |
|--------|-------|-------|
| `90f9940` | 31-01 | Density strip adaptive support |
| `88694ba` | 31-02 | Multi-slice selection store |
| `9fc6743` | 31-02 | Multi-select click in committed slice layer |
| `d0448ea` | 31-02 | Multi-select count in toolbar |
| `84b2f98` | 31-03 | `mergeSlices` action |
| `b502b29` | 31-03 | Merge/delete bulk actions |
| `af9f63a` | 32-01 | TimeSlice metadata fields |
| `a93d977` | 32-02 | Color selector (8-color palette) |
| `8dccfd2` | 32-02 | Committed slices render with colors |
| `96fd817` | 32-03 | Inline notes editing |

All work in `/timeline-test`. No new routes or route changes.

---

## Phase 33: Data Integration — API Routes Updated for CSV

**Context:** Real crime data moved from DuckDB in-memory to CSV files. All API routes must be updated.

| Commit | Route | Change |
|--------|-------|--------|
| `b4b1ada` | `db.ts` | Updated for CSV support |
| `e6adecf` | **`/api/crime/stream`** | Query CSV instead of in-memory |
| `5697d2a` | **`/api/crime/meta`** | Updated for real date range |
| `13ea1c2` | All routes | DuckDB date parsing fix for CSV |
| `816e7b2` | **`/api/crime/stream`** | Mock fallback added |
| `5b2d7c7` | **`/api/crime/meta`** | Mock fallback added |
| `d3ba1f4` | **`/api/crime/bins`** | CSV + mock fallback |
| `b57fa29` | Bins | Coordinate bounds fix |
| `335312c` | DataStore | Real metadata wiring |
| `6ec5afd` | **Timeline** | Wired to real data |
| `ce83be6` | `stream` | LIMIT 50000 added for perf |

**Route pattern established:**
1. All API routes (`/api/crime/*`) serve DuckDB CSV data
2. Each route has a mock fallback (returns synthetic data when DuckDB unavailable)
3. Routes are `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`

**Testing added:**
- `86af217` — DB + date normalization tests
- `aad8b07` — Crime API route tests
- `8831782` — Test failure fixes

---

## Phase 34: Performance Optimization + MAJOR UX PIVOT

**Context:** Data architecture overhaul (8.4M records). TanStack Query replaces direct DataStore access. **The home page route relationship is completely restructured.**

### Part A: Route-Agnostic Infrastructure

| Commit | Change | Detail |
|--------|--------|--------|
| `7a2e34d` | **`src/app/layout.tsx`** | `QueryProvider` wraps all routes — TanStack Query added to root layout |
| `84ea25a` | Dep install | `@tanstack/react-query@^5` |
| `e174e70` | Store | Zustand viewport store with fine-grained selectors |
| `b1f8500` | Provider | TanStack Query provider setup |
| `cbec827` | Hook | `useViewportCrimeData` with query keys |
| `8f54345` | Hook | `useCrimePointCloud` with LOD |
| `9e26da2` | Component | `TimelinePoints` for crime data rendering |

### Part B: New API Routes

| Commit | Route | Purpose |
|--------|-------|---------|
| `40620b6` | **`/api/adaptive/global`** | Global adaptive maps — density map, burstiness map, warp map. Cached with `s-maxage=60`. |
| `40620b6` | **`/api/crimes/range`** | Viewport-range crime data — startEpoch, endEpoch, bufferDays, limit, crimeTypes, districts |

These two API routes were created at `40620b6` and expanded at `eb4120a` (merge of `opencode/witty-moon` branch).

### Part C: UX/IA REDESIGN — Routes Restructured

**The single-biggest route change in this entire range.**

| Commit | Change | Detail |
|--------|--------|--------|
| **`ebdde1d`** | **`/` → Landing page** | Home page stripped of dashboard content. Now a landing page with link to `/timeline-test`. |
| **`ebdde1d`** | **`/dashboard` created** | Original dashboard pattern moved here: `DashboardPage` with Map + Cube + Timeline |
| `05b25fe` | **`/` redesigned** | Apple-style dark landing page with "Quiet Tiger" branding |
| `361cfb6` | Onboarding restricted | Onboarding tour limited to `/dashboard` only |

```
BEFORE:                    AFTER:
/ (dashboard)              / (landing page → links to /timeline-test)
                           /dashboard (original dashboard)
                           /timeline-test (experimental workspace — already existed)
```

**Route after pivot:**
```
src/app/
├── api/
│   ├── adaptive/global/route.ts   # NEW
│   ├── crime/bins/route.ts
│   ├── crime/facets/route.ts
│   ├── crime/meta/route.ts
│   ├── crime/stream/route.ts
│   ├── crimes/range/route.ts      # NEW
│   └── study/log/route.ts
├── dashboard/
│   └── page.tsx                   # NEW — moved from /
├── timeline-test/
│   ├── page.tsx                   # Existing — now the primary workspace
│   ├── components/...
│   └── hooks/...
├── layout.tsx                     # Updated — QueryProvider added
└── page.tsx                       # Rewritten — landing page
```

### Part D: Data Architecture Overhaul

| Commit | Change | Detail |
|--------|--------|--------|
| `598a007` | Type | Canonical `CrimeRecord` type |
| `6999c03` | Hook | Unified `useCrimeData` hook |
| `cd6bf23` | Hook | `useViewportCrimeData` uses canonical types |
| `939f59b` | Component | `SimpleCrimePoints` uses `useCrimeData` |
| `f4bb6e6` | Component | `MapVisualization` uses `useCrimeData` |
| `6548019` | **Deprecation** | `useDataStore` gets `@deprecated` notice — "Use useCrimeData hook instead" |

**Architectural shift:** From Zustand DataStore → TanStack Query with REST API endpoints. The DataStore is retained only for metadata (min/max timestamps, bounds).

---

## Phase 35: Semi-Automated Timeslicing — `/timeslicing` Born

**The second experimental workspace route is created.**

| Commit | Event | Detail |
|--------|-------|--------|
| `943eadf` | Planning | Research docs for semi-automated timeslicing |
| `3ca7344` | Planning | Phase 35 plans created |
| **`67a01a7`** | **Route created** | **`/timeslicing` — 6 files, 529 lines** |
| `671c8c4` | Toolbar | `SuggestionToolbar` + `useSuggestionTrigger` hook |

**Route at creation:**
```
src/app/timeslicing/
├── layout.tsx                     # Minimal — just bg-slate-950 wrapper
├── page.tsx                       # 142 lines — DualTimeline + useCrimeData + SuggestionPanel
└── components/
    ├── ConfidenceBadge.tsx        # NEW
    ├── SuggestionCard.tsx         # NEW — warp profile + interval boundary cards
    └── SuggestionPanel.tsx        # NEW — side panel for suggestions
```

**The `/timeslicing` route is distinct from `/timeline-test`:**
- `/timeline-test` → Manual slice creation, boundary adjustment, metadata, density
- `/timeslicing` → Suggestion-driven workflow, confidence scoring, accept/modify/reject

Both routes use `DualTimeline` from shared components, but the surrounding UI and store integrations are totally different. This route duplication becomes increasingly apparent over subsequent phases.

### Phase 36: Suggestion Generation Algorithms

| Commit | Event | Detail |
|--------|-------|--------|
| `3870625` | Algorithm | Confidence scoring module |
| `399f4ec` | Algorithm | Warp profile generation |
| `1cb2a15` | Algorithm | Interval boundary detection |
| `04349d7` | Hook | `useSuggestionGenerator` — wires all 3 algorithms |
| `a201a8e` | UI | SuggestionToolbar controls |
| `cd82574` | Panel | Context display in SuggestionPanel |
| `ccaee57` | Warning | Low-confidence visual warning |

All work in `/timeslicing`. Algorithms are in `src/hooks/`, not route-local.

---

## Phase 37: Algorithm Integration — `/timeslicing` Expands Dramatically

**Context:** The suggestion algorithms need full UI integration. This is the largest content phase for `/timeslicing`.

| Commit | Event | Detail |
|--------|-------|--------|
| **`b19d6b0`** | **Major integration** | `/timeslicing/page.tsx` grows significantly. Accept workflow creates real warp/time slices from suggestions. |
| | | Warp count (0-6) and interval count config added |
| | | 500ms debounced auto-regeneration on filter changes |
| | | Visual badges: warp (violet), intervals (teal) |
| `87b5847` | UX | Collapsible suggestion cards |
| `6bb5b50` | Constraint | Single active warp tracking |
| `d778c0e` | Indicators | Active warp badges in suggestion UI |
| `ce41517` | Warning | Replacement warning tooltip |
| `5e6562a` | Enforcement | Replace existing warp on new accept |
| `1159394` | Highlight | Accepted suggestion warps on timeline |
| **`db73891`** | **Terminology pivot** | **"warp" → "time-scale" in all timeslicing UI** — 5 files renamed. Strategic rename to clarify UX terminology. |
| `bee3772` | Preview | Timeline hover preview for suggestions |
| `06da717` | Compare | Side-by-side comparison mode |
| `e650ad3` | Bulk | Bulk selection actions |
| `6c5a773` | Config | Generation presets persistence |
| `f302cba` | History | Accepted suggestion history + reapply |
| `ed2c773` | Stateful | Processed suggestions section |
| `8603167` | Complete | Phase 37-01 generation triggers |
| `ff3d739` | Fix | Suggestions aligned with selection range |
| `25d3934` | Fix | Suggestion types aligned with time-scale data |

**Route-local component count at peak:**
```
src/app/timeslicing/
├── layout.tsx
├── page.tsx                              # ~600+ lines
└── components/
    ├── SuggestionCard.tsx                # Heavily evolved
    ├── SuggestionPanel.tsx               # Heavily evolved
    ├── SuggestionToolbar.tsx             # Heavily evolved
    └── ConfidenceBadge.tsx               # Existing
```

---

## Phase 38: Context-Aware Timeslicing

| Commit | Event | Detail |
|--------|-------|--------|
| `33969d3` | Hook | Context extraction hook |
| `f6e5b55` | Store | Persisted context profile store |
| `390feb6` | Detection | Smart profile detection |
| `b5e160e` | Toggle | Analysis scope toggle in toolbar |
| `f2e763e` | Manager | Profile manager UI |
| `8040be3` | Component | Context badge — visual tag on suggestions |
| `07cf249` | Badge | Context badge component |
| `48eba39` | Persist | Context metadata in suggestion history |
| `0ffe580` | Apply | Context mode applied to generation |

New route-local components:
```
src/app/timeslicing/components/
├── ContextBadge.tsx            # NEW
└── ProfileManager.tsx          # NEW
```

---

## Phase 39: Timeline UX Improvements

| Commit | Event | Detail |
|--------|-------|--------|
| `626eb53` | Badge | Timeline time-scale mode badge |
| `8aa37e2` | Legend | Compact density color legend |
| `64c6a0a` | Header | Live brush date range |
| `d8ca769` | Feedback | Debounced warp preview |
| `bc87062` | Cursor | Grab affordance |
| `6abccef` | Empty | No-data messaging |
| `a267faf` | Overlap | Overlapping slice visualization |

All UX improvements hit both `/timeline-test` and `/timeslicing` (they share `DualTimeline`).

---

## Phase 40: Fully Automated Timeslicing Orchestration

| Commit | Event | Detail |
|--------|-------|--------|
| `070b745` | Contract | Full-auto proposal set domain contract |
| `be51e8e` | Core | Ranked full-auto orchestration |
| `64d1b4f` | Integration | Full-auto ranking into generation |
| `8ebf467` | Store | Ranked full-auto package state |
| `a4324d4` | Card | Package-level proposal card |
| `5552469` | Review | Ranked package review in panel |
| `1547c26` | Hybrid | Hybrid generation orchestration |
| **`72dce56`** | **Atomic accept** | Package-level accept applies warp + interval in one guarded action with rollback |
| `814e120` | Safeguards | Toolbar controls for full-auto mode |

New route-local component:
```
src/app/timeslicing/components/AutoProposalSetCard.tsx   # NEW
```

---

## Final Route Tree (at `1e9c58d`)

```
src/app/
├── api/
│   ├── adaptive/global/route.ts       # Global adaptive maps (density, burstiness, warp)
│   ├── crime/bins/route.ts            # Aggregated bins (CSV + mock fallback)
│   ├── crime/facets/route.ts          # Crime type facets
│   ├── crime/meta/route.ts            # Data metadata (CSV + mock fallback)
│   ├── crime/stream/route.ts          # Crime data stream (CSV + mock fallback, LIMIT 50000)
│   ├── crimes/range/route.ts          # Viewport-range crime data via TanStack Query
│   └── study/log/route.ts             # Interaction logging
├── dashboard/
│   └── page.tsx                       # Original full dashboard (Map + 3D Cube + Timeline)
├── timeline-test/
│   ├── page.tsx                       # 662 lines — slice workspace
│   ├── components/
│   │   ├── CommittedSliceLayer.tsx
│   │   ├── SliceBoundaryHandlesLayer.tsx
│   │   ├── SliceCreationLayer.tsx
│   │   ├── SliceList.tsx
│   │   ├── SliceToolbar.tsx
│   │   └── WarpSliceEditor.tsx
│   ├── hooks/
│   │   ├── useSliceBoundaryAdjustment.ts
│   │   └── useSliceCreation.ts
│   └── lib/
│       ├── dom-vector.ts
│       ├── slice-adjustment.test.ts
│       ├── slice-adjustment.ts
│       └── slice-utils.ts
├── timeslicing/
│   ├── layout.tsx                     # Minimal wrapper
│   ├── page.tsx                       # 684 lines — suggestion workspace
│   └── components/
│       ├── AutoProposalSetCard.tsx
│       ├── ComparisonView.tsx
│       ├── ConfidenceBadge.tsx
│       ├── ContextBadge.tsx
│       ├── ProfileManager.tsx
│       ├── SuggestionCard.tsx
│       ├── SuggestionPanel.tsx
│       └── SuggestionToolbar.tsx
├── favicon.ico
├── globals.css
├── layout.tsx                         # QueryProvider + ThemeProvider + Toaster + OnboardingTour
└── page.tsx                           # Apple-style dark landing page → links to /timeline-test
```

---

## Key Architecture Decisions & Pivots

### 1. Experimental Route Pattern (`747805b` → `1e9c58d`)
**Decision:** Feature development happens in isolated routes before being productized.
- `/timeline-test` (Phase 26): Slicing incubator
- `/timeslicing` (Phase 35): Suggestion workflow incubator
- These routes accumulate route-local components that duplicate patterns found in `src/components/`
- They diverge significantly — `DualTimeline` is the only shared component

**Tradeoff:** Fast iteration cycles. But no route group sharing, no layout nesting for shared UI.

### 2. UX/IA Redesign — The `/` Pivot (`ebdde1d`, Phase 34 boundary)
**Decision:** The single-page dashboard is split. `/` becomes a marketing-style landing page. `/dashboard` preserves the original full-dashboard experience. `/timeline-test` becomes the primary work route.

**Why:** The project shifts from "demonstrate the 3D cube" to "develop the timeline as analysis tool." The landing page routes users to the experimental workspace.

**Impact:**
- Onboarding tour restricted to `/dashboard` only (`361cfb6`)
- The `dashboard` route persists but receives no further feature development in this range
- `/timeline-test` and `/timeslicing` are the active development targets

### 3. Data Architecture Migration (Phase 34)
**Decision:** Move from Zustand DataStore → TanStack Query with `/api/crimes/range` endpoint.

**Evidence:**
- `6548019` — `useDataStore` marked `@deprecated`
- `7a2e34d` — `QueryProvider` added to root layout
- All crime data fetching now goes through `useCrimeData` hook → `/api/crimes/range` → DuckDB

**Why:** 8.4M records need viewport-based loading with caching, deduplication, and refetch policies. The Zustand store pattern doesn't scale.

### 4. Terminology Pivot (`db73891`, Phase 37)
**Decision:** "warp" → "time-scale" in all `/timeslicing` UI. The term "warp" was confusing to users. "Time-scale" better describes the adaptive compression/stretching of timeline regions.

**Scope:** 5 files, purely UI labels. The internal algorithm code still uses "warp" (variables, function names, API params).

### 5. API Route Pattern Established
**Pattern for all API routes:**
- `runtime = 'nodejs'` (DuckDB requires Node.js)
- `dynamic = 'force-dynamic'` (no static generation)
- Mock fallback when DuckDB unavailable
- DuckDB queries parameterized with `?` placeholders
- `/api/adaptive/global` uses `s-maxage=60` cache headers

---

## Notable Experimental Routes That Went Nowhere (in this range)

**None in this range.** All route efforts converged into either `/timeline-test` or `/timeslicing`. No routes were created and deleted within `747805b..1e9c58d`.

However, outside this range, these routes exist (from earlier `git log --diff-filter=A` findings):
- `/timeslicing-algos` (Phase 53-54) — algorithm comparison route, not yet created in this range
- `/timeline-test-3d` (Phase 43-45) — 3D slice variant, not yet created in this range
- `/stkde-3d` — STKDE 3D widget route, not yet created in this range

---

## Route Files Size Progression

| Route | Start (Phase 26) | Mid (Phase 34) | End (Phase 40) |
|-------|------------------|----------------|----------------|
| `/page.tsx` | 25 lines (dashboard) | 48 lines (landing) | 49 lines (Apple redesign) |
| `/dashboard/page.tsx` | — | 27 lines (just moved) | 27 lines (no changes) |
| `/timeline-test/page.tsx` | 101 lines | 662 lines | 662 lines (frozen) |
| `/timeslicing/page.tsx` | — | — | 684 lines |
| `/api/adaptive/global/route.ts` | — | 46 lines | 46 lines |
| `/api/crimes/range/route.ts` | — | 131 lines | 131 lines |

---

*Generated from `git log --oneline --reverse 747805b..1e9c58d` — 387 commits spanning Phases 26-40 (v1.1 → v1.3)*
