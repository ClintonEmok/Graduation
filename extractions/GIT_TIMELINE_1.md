# Git Timeline: Route Evolution & Experimental Decisions

**Range:** `d0fbfb0` → `747805b` (449 commits)
**Period:** Phases 1–27 (v1.0 Thesis Prototype → early v1.1 Manual Timeslicing)
**Last commit:** `747805b docs(27-01): complete slice store & types plan`

---

## Route Structure at End of Range

At `747805b` (end of range), the app had only **one page route** and **five API routes**:

```
src/app/page.tsx                  # / - The single dashboard page
src/app/layout.tsx                # Root layout
src/app/api/crime/stream/route.ts # /api/crime/stream - Arrow IPC streaming
src/app/api/crime/facets/route.ts # /api/crime/facets - Crime type/district facets
src/app/api/crime/meta/route.ts   # /api/crime/meta - Dataset metadata (bounds)
src/app/api/crime/bins/route.ts   # /api/crime/bins - Server-side 3D bin aggregation
src/app/api/study/log/route.ts    # /api/study/log - Interaction logging
```

> **Note:** All dedicated page routes (dashboard, dashboard-v2, cube-sandbox, stats, stkde, stkde-3d, timeslicing, timeslicing-algos, timeline-test, algorithms, docs, dashboard-demo) were created **after** this commit range (between commits `747805b` and `HEAD`).

---

## Phase-by-Phase Timeline

---

### ═══════════════════════════════════════════
### PRE-PHASE: Project Setup & Research (3 commits)
### ═══════════════════════════════════════════

**Commits:** `03c416b` → `ff618f1`

| Commit | Description |
|--------|-------------|
| `03c416b` | chore: add project config |
| `9521946` | docs: research spatiotemporal visualization ecosystem |
| `3a84090` | docs: define v1 requirements |
| `ff618f1` | docs: create roadmap (9 phases) |

#### Key Decisions Made

- **Stack chosen:** Next.js 15 (later 16), React Three Fiber 9, Zustand, MapLibre GL, DuckDB, Apache Arrow
- **Pattern:** Coordinated Multiple Views (CMV) architecture
- **Map library:** **MapLibre GL JS** (open-source fork of Mapbox GL JS v1) via `react-map-gl/maplibre` — avoids API key dependency
- **Map style:** Carto Dark Matter (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`)
- **3D navigation:** `CameraControls` from drei (not OrbitControls) for smooth programmatic transitions
- **Point rendering:** `InstancedMesh` for performance at 1000+ points
- **State management:** Zustand (same ecosystem as R3F/drei)
- **9-phase roadmap** defined: Core 3D → Temporal Controls → Adaptive Scaling → Viz Aids → Data Backend → Filtering → Coordinated Views → Study Logging → Study Content

#### Routes Created
None — research and planning only.

---

### ═══════════════════════════════════════════
### PHASE 1: Core 3D Visualization (10 commits)
### ═══════════════════════════════════════════

**Commits:** `7c686fd` → `a925790`

| Commit | Description | File Change Significance |
|--------|-------------|------------------------|
| `b4c0d28` | chore(01-01): initialize next.js project | **`src/app/page.tsx` + `src/app/layout.tsx` created** — default Next.js scaffold |
| `2d4ca7d` | chore(01-01): install core dependencies | three, @react-three/fiber, @react-three/drei, maplibre-gl, react-map-gl, zustand, camera-controls |
| `a7aefd6` | chore(01-01): establish folder structure | Creates `src/components/map/`, `components/ui/`, `components/viz/`, `lib/`, `store/`, `types/` |
| `6845ce7` | feat(01-02): create Scene container component | |
| `97173d6` | feat(01-02): implement Navigation Controls | CameraControls setup |
| `58566b7` | feat(01-03): define crime types + mock data | |
| `e195cec` | feat(01-03): implement InstancedMesh renderer | Core rendering pipeline |
| `3fdf656` | feat(01-04): create projection utilities | `@math.gl/web-mercator` for coordinate projection |
| `5abc3e7` | feat(01-04): implement MapBase component | MapLibre GL map with Chicago initial view |
| `07ded6f` | feat(01-05): integrate MainScene and Overlay into page | **First major page.tsx rewrite** |

#### Initial `page.tsx` (b4c0d28):
```tsx
export default function Home() {
  return (
    <main className="...">
      <h1>Adaptive Space-Time Cube</h1>
      <p>Visualization initialized.</p>
    </main>
  );
}
```

#### After Phase 1 `page.tsx` (07ded6f):
```tsx
export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative">
      <MainScene />
      <Overlay />
    </main>
  );
}
```

#### Key Architecture Decisions

- **Y-axis = Time** in Three.js (standard Y-up compatibility)
- **Center scene at (0,0)** for floating-point precision
- **InstancedMesh** over individual mesh objects for performance
- **MapLibre over Mapbox** — open source, no API key needed
- **Synced Overlay architecture** (not deep integration of R3F inside MapLibre's GL context) — because deep integration limits camera freedom needed for Space-Time Cube exploration
- **Dark mode default** (black background, neon points)

#### Routes Created
- `src/app/page.tsx` (initial scaffold)
- `src/app/layout.tsx` (initial scaffold)

---

### ═══════════════════════════════════════════
### PHASE 2: Temporal Controls (9 commits)
### ═══════════════════════════════════════════

**Commits:** `74a5d6d` → `d63aeb7`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `2fe18b1` | fix(02): revise plans to include step forward/backward controls | Late requirement addition |
| `99a153e` | feat(02-01): define time control constants | |
| `530fd2e` | feat(02-01): create zustand time store | |
| `a875ed6` | feat(02-02): create TimePlane component | 3D horizontal plane showing current time |
| `d3ab87f` | feat(02-02): inject shader logic into DataPoints | `onBeforeCompile` pattern for GLSL injection |
| `4311936` | feat(02-03): create TimeControls UI component | |
| `00d362f` | feat(02-03): integrate TimeControls and TimeLoop into main scene | **`page.tsx` modified** — added `<TimeControls />` |

#### `page.tsx` after Phase 2 (00d362f):
```tsx
export default function Home() {
  return (
    <main>
      <MainScene />
      <Overlay />
      <TimeControls />
    </main>
  );
}
```

#### Key Decisions
- **Time range 0-100** (abstract units, aligns with mock data Y-axis)
- **`meshBasicMaterial` for TimePlane** (no lighting dependency)
- **`onBeforeCompile` for shader injection** (avoids custom ShaderMaterial complexity)
- **Points dimmed outside time range** (not discarded) — maintains spatial context
- **`useFrame` for animation loop** (decoupled from React render cycle)
- **shadcn component initialization** with New York style, neutral base color

---

### ═══════════════════════════════════════════
### PHASE 3: Adaptive Scaling Logic (10 commits)
### ═══════════════════════════════════════════

**Commits:** `20b0ba6` → `65498ac`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `e7ffe73` | chore(03-01): install d3-array, d3-scale, lodash.debounce | **First D3 dependency** |
| `3fc36cc` | chore(03-01): add vitest test runner | Test infrastructure |
| `95979ac` | feat(03-01): implement adaptive scaling algorithm [Rule 1 - TDD] | **Core adaptive algorithm** |
| `ce16c6f` | feat(03-02): add time scale mode toggle UI | |
| `2e8a78a` | feat(03-02): implement adaptive visualization shader logic | GLSL attribute mixing between linear Y and adaptive Y |
| `3376514` | fix(03-02): fix invisible points shader logic | |
| `e512c35` | fix(03-02): resolve missing points in DataPoints visualization | |

#### Key Decisions
- **D3 for scaling math** (`d3-array`, `d3-scale`) — not a full charting library; just for density computation and scale transforms
- **vitest over Jest** as test runner
- **TDD approach** for the adaptive algorithm (commit message explicitly marks `[Rule 1 - TDD]`)
- **Attribute-based shader mixing**: `adaptiveY` computed as `InstancedBufferAttribute`, shader interpolates between `originalY` and `adaptiveY` via `uTransition` uniform

---

### ═══════════════════════════════════════════
### PHASE 4: UI Layout Redesign (20 commits — the largest Phase 1-9 phase)
### ═══════════════════════════════════════════

**Commits:** `14784f0` → `d0988f4`

This phase was **inserted** into the roadmap after Phase 3 (commit `14784f0`), which is a notable roadmap restructure event.

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `14784f0` | docs(roadmap): insert Phase 4 for UI Layout Redesign | **Roadmap restructure** — Phase 4 was added retroactively |
| `032872a` | fix(04-01): install react-resizable-panels + fix TimeLoop types | `react-resizable-panels` for resizable 3-pane layout |
| `110d1d9` | feat(04-01): create DashboardLayout shell | **`/test-layout` route created** (temp test route) |
| `54e7679` | feat(04-02): create MapVisualization component | |
| `0da7bfa` | feat(04-02): create MapVisualization component | Left panel |
| `7693cb9` | feat(04-02): integrate map into layout | |
| `66aa922` | feat(04-04): create TimelinePanel component | Bottom panel |
| `c41d0cb` | feat(04-04): assemble main dashboard with 3-pane layout | **Major `page.tsx` rewrite** — switches to DashboardLayout |
| `a1e2894` | fix(04): consolidate component organization | **Deleted `/test-layout` route** + moved DashboardLayout |
| `8505e91` | feat(04-05): update layout store keys for top-bottom split | Layout restructured to top-map-cube/bottom-timeline |
| `cf14748` | feat(04-06): add showMapBackground prop to MainScene | |
| `f9bafd3` | feat(04-06): integrate MainScene into CubeVisualization | |

#### `page.tsx` after Phase 4 (c41d0cb):
```tsx
export default function Home() {
  return (
    <main>
      <DashboardLayout
        leftPanel={<MapVisualization />}
        topRightPanel={<CubeVisualization />}
        bottomRightPanel={<TimelinePanel />}
      />
    </main>
  );
}
```

#### ⚠️ Experimental Dead End: `/test-layout` Route
- **Created:** `110d1d9` — a temporary test route to validate the resizable 3-pane layout
- **Deleted:** `a1e2894` — removed during component consolidation (existed only ~4 commits)
- **Purpose:** Prototype the DashboardLayout with placeholder panels
- **Lesson:** Route was never intended for production; reinforced the pattern of doing layout work on the primary `/` route

#### Key Decisions
- **`react-resizable-panels`** over custom CSS Grid for resizable panes
- **Layout architecture:** Left panel (map) + Right split-top (cube) / Right split-bottom (timeline)
- **Component hierarchy consolidated:** Components moved to `components/layout/`, `components/map/`, `components/viz/`, `components/timeline/`
- **Layout store** for panel size persistence

---

### ═══════════════════════════════════════════
### PHASE 5: Adaptive Visualization Aids (7 commits)
### ═══════════════════════════════════════════

**Commits:** `93478c9` → `1a4756b`

| Commit | Description |
|--------|-------------|
| `0653884` | feat(05-02): create adaptive scale hook and store |
| `7fe008b` | feat(05-02): create density histogram component |
| `c2b7e9c` | feat(05-02): create adaptive axis component |
| `a43af49` | feat(05-03): integrate adaptive viz aids into timeline panel |

#### Key Decisions
- **Separate store** for adaptive scale state (not merged into coordination store)
- **D3-based histogram** for density visualization (extended D3 usage beyond scaling math)

---

### ═══════════════════════════════════════════
### PHASE 6: Data Backend & Loading (14 commits)
### ═══════════════════════════════════════════

**Commits:** `9bdf7d3` → `4f9560f`

This was the most technically challenging phase — integrating DuckDB with Next.js.

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `629ea1c` | chore(06-01): install duckdb and arrow dependencies | duckdb + apache-arrow |
| `5d000da` | feat(06-01): create data setup script | Python script to generate parquet |
| `9bb299b` | feat(06-02): create database utility | Singleton DuckDB connection in `src/lib/db.ts` |
| **`8a7a6dd`** | **fix(06-02): update serverExternalPackages config for Next.js 16** | ⚠️ **Next.js 16 breaking change** — `serverComponentsExternalPackages` renamed to `serverExternalPackages` (critical discovery) |
| **`a1e6513`** | **feat(06-02): implement streaming route** | **`/api/crime/stream` route created** — Arrow IPC streaming endpoint |
| `b82a01c` | feat(06-03): implement stream consumer hook | Frontend `useCrimeStream` hook |
| `ab82595` | feat(06-03): update store for columnar data loading | Store adapted for Arrow columnar format |
| `db51ab0` | feat(06-03): adapt visualization for columnar attributes | |
| `ab24167` | feat(06-03): add load real data button | |

#### API Route: `/api/crime/stream` (a1e6513)
- **Runtime:** `nodejs` (DuckDB native bindings don't work on Edge)
- **Dynamic:** `force-dynamic` (prevents static optimization)
- **Architecture:** Query Parquet → JSON rows → Arrow IPC Table → binary stream
- **Content-Type:** `application/vnd.apache.arrow.stream`
- **Fallback strategy:** DuckDB's `to_arrow_ipc` extension was broken, so data goes through `JSON → tableFromJSON → tableToIPC` pipeline
- **Cache:** No cache (`no-store`)

```ts
// Pattern: DuckDB → Connection → SQL query → JSON rows → Arrow serialization
const rows = await new Promise((resolve, reject) => {
  connection.all(query, (err, res) => { ... });
});
const table = tableFromJSON(rows);
const ipcBuffer = tableToIPC(table, 'stream');
```

#### ⚠️ Critical Insigh: DuckDB + Next.js 16 Struggle
The project hit **three separate DuckDB issues**:
1. **Config change** (`8a7a6dd`): Next.js 16 renamed `serverComponentsExternalPackages` → `serverExternalPackages`
2. **Build panic** (`54eaa34`): Turbopack + DuckDB triggered a native module build panic; required `node-pre-gyp` patching
3. **Runtime error** (`54eaa34`): node-pre-gyp runtime error resolved by patching DuckDB's `package.json` in `patches/duckdb+1.4.4.patch`

The **patch** modified DuckDB's binary config to add `napi_versions` and correct `module_path` for the `{napi_build_version}` pattern.

#### Routes Created
- `src/app/api/crime/stream/route.ts` — Arrow streaming endpoint (first API route)

---

### ═══════════════════════════════════════════
### PHASE 7: Advanced Filtering (20 commits)
### ═══════════════════════════════════════════

**Commits:** `0a6cbd0` → `27e7131`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `4b906dc` | feat(07-02): add crime facets endpoint | **`/api/crime/facets` route created** |
| `10c677b` | feat(07-03): implement ghosting shader logic | GLSL ghosting for filtered-out points |
| `d88fa61` | feat(07-04): connect filter overlay to facets and store | |
| `25401de` | feat(07-05): add preset manager UI | Filter preset persistence (localStorage) |
| `b298771` | feat(07-06): persist raw time bounds for normalization | |
| `052ba6e` | feat(07-07): add map region selection overlay | Spatial filtering via map drawing |

#### Routes Created
- `src/app/api/crime/facets/route.ts` — Crime type and district facet data

#### Key Decisions
- **Ghosting shader** (not hard filtering) for filtered-out points — maintains spatial reference
- **Facets from DuckDB** — distinct crime types and districts queried from Parquet
- **Presets stored in localStorage** (not backend)
- **Map region selection** using custom overlay (no external drawing library)

---

### ═══════════════════════════════════════════
### PHASE 8: Coordinated Views (7 commits)
### ═══════════════════════════════════════════

**Commits:** `f1bc01d` → `b356d70`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `3a12628` | chore(08-01): add d3 brush and zoom deps | `d3-brush`, `d3-zoom`, `d3-selection` |
| `41d8436` | feat(08-01): add epoch domain normalization helpers | |
| `c4c7fbf` | feat(08-01): add dual-scale focus timeline | Overview + detail (focus+context pattern) |
| `bb7962e` | feat(08-02): enable cube selection highlight | |
| `c2e4037` | feat(08-02): sync map and timeline selection | **Cross-view synchronization** |
| `d2159c6` | feat(08-03): create time-filtered map event layer | |

#### Key Decisions
- **D3 brush for timeline selection** (not native HTML range input)
- **Focus+Context pattern** (dual-scale timeline: overview + zoomed detail)
- **Epoch domain normalization** for consistent timeline math
- **Bidirectional sync** across Map ↔ Cube ↔ Timeline

---

### ═══════════════════════════════════════════
### PHASE 9: Study Logging & Fixes (15 commits)
### ═══════════════════════════════════════════

**Commits:** `74404ed` → `210d648`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `74404ed` | feat(pipeline): preprocessing pipeline | Python pipeline for district/IUCR data merging |
| `c56c9b5` | feat(study): implement logging infrastructure | **`/api/study/log` route created**; `page.tsx` modified — added `<StudyControls />` |
| `5528ec4` | fix(store): prevent stack overflow on large dataset min/max | Performance bug |
| `1404a09` | refactor(data): move min/max calculation to backend metadata endpoint | **`/api/crime/meta` route created** |
| `f6fa7bc` | fix(api): correct duckdb usage in stream endpoint | `db.connect()` → `db` instance |
| `84d120b` | plan(viz): create plan to fix 3d cube visualization | **"Duct tape" fix** for 3D visualization regression |
| `5e05e9b` | fix(viz): update data points to use store columns and correct scale | |
| `c3a0652` | fix(viz): normalize columnar x/z coordinates to scene grid | |

#### `page.tsx` after Phase 9 (c56c9b5):
```tsx
export default function Home() {
  return (
    <main>
      <DashboardLayout ... />
      <StudyControls />
    </main>
  );
}
```

#### Routes Created
- `src/app/api/study/log/route.ts` — Interaction logging endpoint
- `src/app/api/crime/meta/route.ts` — Dataset metadata (min/max bounds)

#### Key Decisions
- **Python preprocessing pipeline** for data preparation (not DuckDB for ETL)
- **Server-side metadata extraction** (fixed stack overflow from computing min/max on 1.2M points in browser)
- **Logging routes** use Next.js API (no separate logging service)
- **Phase 10 (Study Content) deferred to v2** — too much scope for thesis timeline

---

### ═══════════════════════════════════════════
### ⚡ EXPERIMENTAL DIVERSION: Phase 10 Deferred (2 commits)
### ═══════════════════════════════════════════

| Commit | Description |
|--------|-------------|
| `dbb3b16` | docs(roadmap): defer phase 10 to v2 |
| `704fd1e` | docs(state): update phase 10 status to deferred |

**Decision:** The study content/tutorial phase was deferred because:
- Phase 9 (logging infrastructure) was technically complete
- The tutorial/task system required significant UX work
- The thesis could proceed without guided tutorial mode
- Deferring allowed focus on visualization features (Phases 11+)

---

### ═══════════════════════════════════════════
### PHASE 11: Focus+Context Visualization (7 commits)
### ═══════════════════════════════════════════

**Commits:** `704fd1e` → `0808c36`

| Commit | Description |
|--------|-------------|
| `3505343` | feat(11-01): implement dithered transparency shader logic |
| `5d47f52` | feat(11-01): connect data points to context state |
| `a0dabe9` | feat(11-01): add context visibility toggle to controls |
| `0808c36` | fix(09-02): resolve build errors and restore DataPoints logic |

#### Key Decisions
- **Dithered transparency** (stipple pattern via GLSL) over alpha blending — avoids alpha sorting artifacts with transparent 3D points
- **UI toggle** for context visibility

---

### ═══════════════════════════════════════════
### PHASE 12: Feature Flags Infrastructure (12 commits)
### ═══════════════════════════════════════════

**Commits:** `319d79a` → `0288385`

This phase was born from a **roadmap expansion** — the 9-phase plan grew to 20 phases.

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `319d79a` | docs: add phases 12-19 for UI polish and viz modes | **Roadmap expanded** from 10 to 20 phases |
| `d001570` | chore(12-01): install shadcn UI components | Sheet, Tabs, Switch, Badge, AlertDialog |
| `696f25e` | feat(12-01): create feature flags store and definitions | |
| `a136001` | **wip: 12-feature-flags paused at task 1/2 (Plan 02)** | **⚠️ WIP/Diversion** |
| `33907a3` | feat(12-02): create floating toolbar with drag support | |
| `48476c3` | feat(12-02): implement settings panel with batch editing | |
| `3d77585` | feat(12-03): create URL sync hook and conflict dialog | |
| `fbce375` | fix(12-03): improve settings panel footer layout | |

#### ⚠️ WIP Pause: Feature Flags (a136001)
- **Plan 02 was paused** at task 1/2
- The floating toolbar + settings panel was split from the feature flags core work
- URL sync feature with conflict resolution was added as Plan 03 (suggesting Plan 02 was incomplete)

#### Key Decisions
- **shadcn/ui** for settings panel components (New York style, neutral base)
- **Zustand** for feature flag state (existing pattern)
- **localStorage** for flag persistence
- **URL params** for shareable configurations
- **Conflict resolution dialog** for URL param vs localStorage conflicts

---

### ═══════════════════════════════════════════
### PHASE 13: UI Polish (15 commits)
### ═══════════════════════════════════════════

**Commits:** `e3d1664` → `db11f9c`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `b2ab78a` | feat(13-01): install sonner and integrate toaster | **`layout.tsx` modified** — `<Toaster />` added |
| `8c2327a` | feat(13-01): create LoadingOverlay and Skeleton | |
| **`1be4897`** | **chore(13-01): switch to pnpm lockfile** | **⚠️ Package manager switch:** npm → pnpm (deleted 11K-line package-lock.json) |
| `deb9896` | feat(13-01): create ErrorDialog | |
| `7b7ac61` | feat(13-03): create OnboardingTour (driver.js) | `layout.tsx` — added `<OnboardingTour />` |
| `353e8ce` | docs(13-03): integrate onboarding tour into app layout | |

#### `layout.tsx` after Phase 13 (747805b):
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster />
          <OnboardingTour />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### ⚠️ Experimental Decision: npm → pnpm (1be4897)
- **Deleted** entire `package-lock.json` (11,353 lines)
- **Replaced** with `pnpm-lock.yaml` (38 lines initially)
- Motivated by: `package-lock.json` had grown monstrous from shadcn installs (8K+ lines from 7 components)
- This is significant — the project shifted its package management mid-stream

#### Key Decisions
- **sonner** for toast notifications (lightweight, good DX)
- **driver.js** for onboarding tour (simple, no framework dependency)
- **ThemeProvider** wrapping entire app (enables dark/light mode)
- UI identifier attributes (`data-tour="..."`) for tour step targeting

---

### ═══════════════════════════════════════════
### PHASE 15: Time Slices Visualization (18 commits — largest single phase)
### ═══════════════════════════════════════════

**Commits:** `2d9a979` → `371fe3e`

This phase was the most complex, spanning two milestone periods and including a mid-phase UX refactor.

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `80adf97` | feat(15-01): create slice store and test | |
| `76b2f01` | feat(15-01): create 3D slice components | Horizontal planes in 3D scene |
| `37a85bf` | feat(15-02): create SliceManagerUI | |
| `648a3e6` | chore(15-03): commit missing theme infrastructure | Theme was missing from prior phase |
| `f3b71cb` | feat(15-03): update shader logic for slice highlighting | **GLSL slice intersection** highlighting |
| `27e5115` | **wip: [15-time-slices] paused at start of plan 15-04** | **⚠️ WIP/Pause** |
| `566b5e5` | feat(15-04): install date-fns, react-day-picker | Date handling for slice UX |
| `94f1a35` | feat(15-04): refactor slice store to support range slices | **Architecture pivot** — point slices → range slices |
| `424b797` | docs(15-04): complete slice ux refactor plan | |
| `45cbc47` | feat(15-05): update ghosting shader for range slices | |

#### ⚠️ Mid-Phase Architecture Pivot: Point Slices → Range Slices
- **Original design:** Single time-point planes (e.g., "show me data at T=42")
- **Pivot:** Date-range slices (e.g., "show me data between Jan-Mar 2023")
- **Changes:** Store refactoring, shader updates, UI overhaul with date pickers
- **Dependencies added:** `date-fns`, `react-day-picker`, Calendar + Popover shadcn components
- **Why:** Date ranges are more useful for analysis than single time points

#### Key Decisions
- **Shader-based slice highlighting** (fragment shader intersection test)
- **Date pickers** for slice boundary selection (not sliders)
- **Zustand** for slice store (existing pattern)

---

### ═══════════════════════════════════════════
### PHASES 16–19: Visualization Modes (42 commits)
### ═══════════════════════════════════════════

These phases were added as part of the 12-19 roadmap expansion. All follow the same pattern: store → rendering → UI integration.

#### Phase 16: Heatmap Layer (10 commits)
- **GPGPU two-pass aggregation** rendering (not Canvas2D or Deck.gl)
- Three.js overlay on both map and cube views
- Custom aggregation + rendering shaders

#### Phase 17: Cluster Highlighting (12 commits)
- DBSCAN-style clustering engine
- 3D bounding boxes + HUD labels
- Click-to-focus and map sync
- **Map cluster synchronization** (dc63e56) — clusters displayed on map too

#### Phase 18: Trajectories Visualization (10 commits)
- Block-based trajectory rendering (connected paths)
- 3D line geometry + tooltip interaction
- Map integration for trajectories

#### Phase 19: Aggregated Bins / LOD (10 commits)
- Spatial-temporal binning into 3D bars
- LOD transitions (points → bars based on camera distance)
- `fix(19): fix coordinate projection, frustum culling, and data distribution` — significant bugfix commit

#### Key Architectural Patterns (Phases 16-19)
- All feature-flagged (Phase 12 infrastructure)
- Store → Component → Shader pipeline
- Three.js native (no external viz libraries)
- Map overlay integration for relevant modes

---

### ═══════════════════════════════════════════
### PHASE 20: Server-Side Aggregation (5 commits)
### ═══════════════════════════════════════════

**Commits:** `dd754d1` → `7e622ae`

| Commit | Description |
|--------|-------------|
| `9efbf70` | feat(20-01): create bins API route | **`/api/crime/bins` route created** |
| `f4e3e8a` | fix(20-01): cast count to integer in aggregation query |
| `244f137` | feat(20-02): update AggregationManager to fetch bins from API |

#### Routes Created
- `src/app/api/crime/bins/route.ts` — DuckDB SQL GROUP BY for 3D bin aggregation

#### Key Decisions
- **DuckDB SQL binning** replaces client-side CPU binning
- **Count cast to integer** required (DuckDB returned float)
- **Frontend AggregationManager** refactored to fetch from API instead of computing locally

---

### ═══════════════════════════════════════════
### PHASE 21: Timeline Redesign (17 commits)
### ═══════════════════════════════════════════

**Commits:** `442d8ad` → `635a803`

| Commit | Description | Key Detail |
|--------|-------------|------------|
| `823468b` | build(21-01): install visx dependencies | `@visx/brush`, `@visx/event`, `@visx/lib`, `@visx/responsive`, `@visx/scale`, `@visx/shape` |
| `0db5986` | feat(21-01): create timeline container with mobile blocking | Mobile not supported |
| `a0a6f36` | feat(21-01): init timeline orchestrator with parentsize | |
| `a2c991c` | feat(21-02): implement binning logic | |
| `9ef72a8` | feat(21-02): create histogram and axis layers | |
| `b4f0348` | feat(21-03): implement timeline brush and marker layer | |
| `ac1a960` | feat(21-03): assemble timeline with interactions | |
| `2068eca` | feat(21-03): integrate timeline into controls | |

#### Key Decisions
- **visx** (not raw D3) for timeline components — a React D3 library for cleaner component integration
- **Mobile blocking** — explicit mobile-unsupported overlay (research tool, not general-purpose)
- **parentSize** pattern (resize observer) from visx for responsive container
- **Binning-based histogram** (data aggregated into time bins before rendering)

---

### ═══════════════════════════════════════════
### PHASE 22: Contextual Slice Analysis (9 commits)
### ═══════════════════════════════════════════

**Commits:** `bacf6ad` → `fde6ff2`

| Commit | Description |
|--------|-------------|
| `d3bf890` | feat(22-01): update slice store with active state |
| `d888584` | feat(22-02): create slice stats component |
| `c73f0b4` | feat(22-02): create contextual slice panel |
| `dd908c9` | feat(22-03): create point inspector |
| `a6096c8` | feat(22-03): integrate contextual panel into layout | **`page.tsx` modified** — added `<ContextualSlicePanel />` |

#### `page.tsx` after Phase 22 (f6aa7a7):
```tsx
export default function Home() {
  return (
    <main className="... relative">
      <DashboardLayout ... />
      <StudyControls />
      <ContextualSlicePanel />
    </main>
  );
}
```

---

### ═══════════════════════════════════════════
### PHASE 23: Map Interaction & Debugging (5 commits)
### ═══════════════════════════════════════════

**Commits:** `6c9b048` → `51c359f`

| Commit | Description |
|--------|-------------|
| `b49db39` | feat(23-01): create map debug overlay |
| `618f8f0` | feat(23-01): update map interaction logic |
| `7ab4437` | fix(23-01): expose onClick prop in MapBase |

---

### ═══════════════════════════════════════════
### PHASE 24: Interaction Synthesis & 3D Debugging (11 commits)
### ═══════════════════════════════════════════

**Commits:** `51c359f` → `c6515bf`

| Commit | Description |
|--------|-------------|
| `defab7d` | feat(24-01): implement focus+context in 3D with timeline sync |
| `d76889a` | feat(24-02): add brush-based context dimming to shader |
| `660f565` | fix(24-02): debug raycasting and improve click reliability |
| `2d6d6af` | feat(24-03): create selection sync conductor hook |
| `f3e3224` | feat(24-04): connect Timeline brush to coordinationStore |
| `524beac` | feat(24-05): integrate RaycastLine into DataPoints for visual feedback |

#### Key Decision
- **Selection sync conductor** — a dedicated hook to orchestrate cross-view selection (not inline in components)
- **RaycastLine** — visual feedback for what the user clicked/hovered in 3D

---

### ═══════════════════════════════════════════
### ⚡ EXPERIMENTAL CORE: Phase 25 Adaptive Time Intervals (26 commits)
### ═══════════════════════════════════════════

**Commits:** `c687838` → `72cc2fb`

This was the most research-heavy phase, with extensive planning iteration before any implementation.

#### Architectural Strategy Evolution

| Commit | Description |
|--------|-------------|
| `7794c26` | docs(phase-25): plan adaptive time scaling with KDE |
| `f691a72` | docs(25): create phase plans for adaptive intervals |
| **`3c95660`** | **docs(25): update plans to use Linear Blend (Option C) for adaptive time** |
| `a69db56` | docs(roadmap): update phase 25 details with Linear Blend strategy |
| `c3360f0` | docs(25): enable animated warp transition |
| `f35efa2` | docs(25): create phase plan (adaptive-intervals-burstiness) |
| `0c63a37` | docs(25): research phase domain |
| `b7be2a6` | docs(25): create phase plans for adaptive time |

#### The Linear Blend Decision (Option C)
The Phase 25 planning documents reveal that three approaches were evaluated:
- **Option A:** Pure KDE warp (full density-driven deformation)
- **Option B:** Interval-based binning
- **Option C (Chosen):** **Linear Blend** — smooth interpolation between linear and adaptive via a `warpFactor` uniform (0-1)

**Implementation:** KDE → CDF → texture lookup in vertex shader, with `warpFactor` controlling blend between original Y position and warped Y position.

| Commit | Description |
|--------|-------------|
| `836f322` | feat(25-01): create adaptive worker for density and warp map calculation |
| `ef5749d` | feat(25-01): create adaptive store to manage worker state |
| `600f8ab` | feat(25-02): implement texture-based shader warp |
| `23411ba` | feat(25-02): implement adaptive texture feeding and raycast sync |
| `fe16cc7` | feat(25-03): create adaptive controls component |
| `eff8caa` | feat(25-03): create density track component |
| `2f27a2b` | docs(phase-25): complete phase execution (with gaps) |

#### Gap Closure (25-04)
| Commit | Description |
|--------|-------------|
| `9ef7279` | fix(25-04): ensure AdaptiveControls visibility |
| `f791e50` | fix(25-04): move adaptive controls to settings bar |
| `1a984b0` | fix(25-04): move adaptive controls to settings panel |
| `4601b9e` | fix(phase-25): align adaptive warp and timeline selection |

#### Post-Phase Burst Features (a8350b8 → 7a8fd46)
A burst of UI work after Phase 25 added:
- Burst highlighting + timeline resolution
- TopBar component (simplified views, map type toggle)
- Filter status indicators
- View simplification (map type mode)

#### `page.tsx` final form (1f1ee8e):
```tsx
export default function Home() {
  return (
    <main className="... flex flex-col">
      <TopBar />
      <div className="flex-1">
        <DashboardLayout
          leftPanel={<MapVisualization />}
          topRightPanel={<CubeVisualization />}
          bottomRightPanel={<TimelinePanel />}
        />
      </div>
      <StudyControls />
      <ContextualSlicePanel />
    </main>
  );
}
```

---

### ═══════════════════════════════════════════
### v1.0 MILESTONE & v1.1 START (Completes the range)
### ═══════════════════════════════════════════

| Commit | Description |
|--------|-------------|
| `9d4755d` | chore: complete v1.0 milestone |
| `a4aafec` | docs: define v1.1 Manual Timeslicing milestone |

#### v1.0 Stats (from milestone commit)
- **25 phases**, **82 plans** completed
- **22/26 requirements** shipped
- **85/100** integration score
- 1.2M record dataset support
- GPU-accelerated adaptive time warping at 60fps

#### Phases 26-27 (early v1.1)
| Commit | Description |
|--------|-------------|
| `7a0a72c` | chore(deps): add d3-scale-chromatic for density color scales |
| `c99bccb` | feat(26-01): add D3 color scales + retina support to DensityTrack |
| `904d56a` | feat(26-02): integrate useDebouncedDensity into TimelineContainer |
| `88f3274` | feat(27-01): create TypeScript types for time slices |
| `7093c45` | feat(27-01): create Zustand slice store with full CRUD operations |
| `9211bd0` | feat(27-02): create useSliceCreation hook for timeline slice creation |
| `b32cfda` | feat(27-02): add visual feedback during slice creation |
| `747805b` | docs(27-01): complete slice store & types plan |

---

## Summary: Route Evolution

```
Initial (b4c0d28):       / (page.tsx) + layout.tsx
After Phase 1 (07ded6f): / + MainScene + Overlay
After Phase 2 (00d362f): / + TimeControls
After Phase 4 (c41d0cb): / → DashboardLayout (3-pane)
After Phase 6 (a1e6513): API: /api/crime/stream
After Phase 7 (4b906dc): API: /api/crime/facets
After Phase 9 (c56c9b5): / + StudyControls, API: /api/study/log
After Phase 9 (1404a09): API: /api/crime/meta
After Phase 13 (b2ab78a): layout.tsx → Toaster + ThemeProvider + OnboardingTour
After Phase 20 (9efbf70): API: /api/crime/bins
After Phase 22 (f6aa7a7): / + ContextualSlicePanel
End of range (1f1ee8e):  / + TopBar (final form at 747805b)
```

## Summary: Experimental Decisions & Dead Ends

| Decision | Commit | Impact |
|----------|--------|--------|
| **MapLibre over Mapbox** | `5abc3e7` | Open-source, no API key, but fewer features |
| **D3 over charting libs** | `e7ffe73` | Lightweight but manual; led to visx later (Phase 21) |
| **`/test-layout` temporary route** | `110d1d9` → `a1e2894` | **Deleted** — short-lived test route |
| **Arrow IPC streaming** | `a1e6513` | High performance but complex; JSON fallback due to DuckDB extension issues |
| **Next.js 16 serverExternalPackages** | `8a7a6dd` | Breaking config change discovered mid-phase |
| **DuckDB patching** | `54eaa34` | Patched binary package.json for Turbopack compat |
| **npm → pnpm lockfile** | `1be4897` | Mid-project package manager switch (11K-line file deleted) |
| **Feature Flags WIP pause** | `a136001` | Plan 02 incomplete; never fully enforced |
| **Phase 10 deferred to v2** | `dbb3b16` | Study content/tutorial cut from thesis scope |
| **Phase 4 inserted retroactively** | `14784f0` | Roadmap restructured post-Phase 3 |
| **Point → Range slices pivot** | `94f1a35` | Mid-Phase 15 architecture change |
| **Linear Blend (Option C)** | `3c95660` | KDE + warpFactor interpolation chosen as adaptive time strategy |
| **Roadmap 9→20 phases** | `319d79a` | Massive scope expansion mid-project |
| **Aggregated bins coordinate fix** | `70d2da8` | Multiple bugs fixed in single commit (projection, culling, distribution) |

---

## Unresolved Concerns (from STATE.md at v1.0 milestone)

- **2 feature flags** defined but not enforced
- **`/api/crime/facets` endpoint** unused
- **LSP false positives** (lucide-react, r3f)
- **React 19 vs Visx peer dependency** conflicts
- **Phase 10 (Study Content)** deferred — guided tutorial not implemented
- **Plan 02 of Phase 12** (Feature Flags) never completed

---

*Generated from git log d0fbfb0..747805b (449 commits)*
*Analysis date: 2026-06-24*
