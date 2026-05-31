# Feature Research — Visualization Level-Up

**Domain:** Spatiotemporal crime visualization — Space-Time Cube + 2D Map + Dual Timeline
**Researched:** 2026-05-26
**Confidence:** HIGH (codebase analysis + established visualization HCI principles)
**Context:** Level-up milestone on existing adaptive space-time cube prototype (v3.1 complete)

## Executive Summary

This research addresses 10 visualization quality objectives for the existing Adaptive Space-Time Cube Prototype. The app already has working burst detection, slice generation, coordination across views (map, cube, timeline), and a five-tab workflow (Scan, Detect, Slices, Inspect, Configure). The level-up focus is on making these capabilities **analytically effective** — not just functional.

The core tension across all 10 objectives is **information density vs. cognitive clarity**. Crime datasets are large (8.5M+ records), the 3D cube is inherently complex, and the analyst's job requires rapid pattern recognition without visual overwhelm. Every feature decision should be evaluated against this tension.

**Key finding:** Most of the level-up items are not net-new features but systematic application of established visualization heuristics (Tufte's data-ink ratio, Ware's visual saliency principles, Andrienko & Andrienko's spatiotemporal visualization framework). The implementation complexity is generally MEDIUM because the data pipeline and rendering infrastructure already exist — the work is in encoding parameters, constraints, and rendering modes.

---

## 1. Burst Visibility

*Objective: Make bursts immediately visible through opacity/alpha scaling, kernel size scaling, density amplification, and color intensity changes.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Burst-score-to-opacity mapping** in 3D cube | Users must see which time regions are bursty at a glance; opacity is the most intuitive saliency channel | LOW | Already have burstScore per slice in StkdeSliceStack; need to wire it to per-slice opacity |
| **Burst-score-to-color-intensity mapping** on map heatmap | Heatmap colors should reflect burst severity, not just raw count | LOW | Already have densityMap/burstinessMap in adaptive store, burstMetric toggle; need to apply burst cutoff to colormap domain |
| **Visual legend showing burst intensity scale** | Without a legend, burst encoding is uninterpretable | LOW | Simple legend additions to existing info overlays |
| **Toggle between "raw density" and "burst-emphasized" view** | Analysts need to compare burst view vs. standard density view to avoid confirmation bias | MEDIUM | ColorMode toggle exists in MapVisualization but doesn't persist to cube |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-channel burst encoding** (opacity + size + color simultaneously) | Burst regions pop across multiple visual channels, making them detectable even with partial occlusion | MEDIUM | Uses preattentive processing — multiple channels fire faster than single-channel search (Ware, 2012) |
| **Kernel size tied to burst confidence** | High-confidence bursts get tight, intense kernels; lower-confidence bursts get softer, wider kernels | MEDIUM | Requires modifying KDE computation per slice to accept a bandwidth parameter driven by burstScore |
| **Animated burst pulse** on active slice | Brief subtle pulse animation when switching to a high-burst slice draws attention without permanent distraction | MEDIUM | One-shot animation triggered on slice change, not continuous — avoids motion sickness |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Continuous pulsing/glowing bursts** | "Makes them impossible to miss" | Causes visual fatigue, makes static comparison impossible, violates analytical clarity principle | Use static encoding (opacity/size) with optional one-shot reveal animation |
| **Separate burst-only view** | "Clear separation of concerns" | Breaks the unified workflow; analysts must mentally integrate multiple views | Use burst-emphasized toggle within the same view |
| **Audio alerts for burst detection** | "Multi-modal notification" | Annoying in shared workspace, doesn't scale to many bursts, no analytical value | Visual saliency encoding is sufficient |

### Dependencies
- Requires `burstScore` on slice objects (exists) → needs stable normalization across slices
- Mutually enhances Objective 8 (Dense Data Readability) — burst emphasis and adaptive transparency share rendering pipeline
- Kernel size scaling requires modifying KDE computation → touches `src/lib/kde.ts`

---

## 2. Temporal Evolution

*Objective: Show temporal evolution continuously through aging/fading trails, temporal accumulation, blob size changes over time, and smooth interpolation between slices.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Discrete slice-to-slice transition** (jump cut) | Must be able to see what changed between consecutive slices | LOW | Already exists via activeIndex switching in Stkde3DScene and playback in Inspect panel |
| **Slice count / crime count comparison** between adjacent slices | Quantitative change detection requires numbers, not just visual | LOW | `sliceCrimeCounts` exists in coordination store; needs to be displayed during transitions |
| **Playback controls** (play/pause, speed, scrub) | Standard expectation for temporal sequence exploration | LOW | Already have `inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectSliceOpacity` in coordination store |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smooth interpolation between KDE surfaces** | Continuous morphing reveals intermediate spatial states that discrete jumps hide; critical for understanding gradual dispersal vs. sudden shifts | HIGH | Requires mesh morphing (vertex interpolation) between consecutive slice KDE grids. Significant GPU work. Must be opt-in. |
| **Aging/fading trails** on map | Fixed-radius "echo" of past slice centroids that fades over playback; shows directional movement of hotpots | MEDIUM | Trail points with opacity ∝ recency. Could use MapTrajectoryLayer pattern with fading opacity |
| **Temporal accumulation overlay** | Semi-transparent accumulation of all prior slice KDEs creates a "history density" that reveals persistent vs. transient hotspots | MEDIUM | Accumulation buffer in 3D scene that composites previous KDE surfaces at decreasing opacity |
| **Blob size animation** synchronized with burst score | KDE contours (blobs) that grow/shrink in real-time as burstiness changes; makes intensity changes visible without color change | MEDIUM | Works with contour extraction from KDE grid; animate contour geometry size based on burstScore delta |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Always-on smooth animation** | "Looks polished and professional" | Obscures discrete boundaries between slices; makes precise comparison impossible; performance cost on large datasets | Smooth interpolation as opt-in toggle, jump-cut as default |
| **Particle system for evolution** | "Beautiful flowing particles show movement" | Visually noisy, hard to interpret analytically, high GPU cost, particle trajectories can mislead about actual crime movement | KDE surface morphing or trail overlays |
| **Full video-like timeline scrub through every day** | "Like watching a movie of crime over time" | At 8.5M records, daily rendering would be computationally prohibitive and visually meaningless at fine granularity | Use adaptive slices as the natural playback units |

### Dependencies
- Smooth interpolation requires: KDE grid consistency + Three.js shader or BufferGeometry morph → HIGH complexity
- Aging trails depend on map event layer → low risk (pattern exists in MapTrajectoryLayer)
- Temporal accumulation depends on rendering pipeline for additive blending in Three.js → exists (transparent overlays)
- **Evolution features depend on Objective 1** (Burst Visibility) — burst scores drive what's worth tracking in evolution

---

## 3. Spatial Orientation

*Objective: Preserve spatial orientation through constrained camera, eagle-eye perspective, geographic map substrate, and stable axes/orientation cues.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Map substrate in 3D view** | Geographic context is essential for spatial reasoning; without it, the cube is abstract | LOW | Already exists in Stkde3DScene (MapTileSource with CanvasTexture to THREE). Need to port to main Scene. |
| **Axis labels** (N/S/E/W or Lat/Lon) | Users must know what they're looking at orientation-wise | LOW | Simple SpriteText or HTML labels in Three.js scene. Missing entirely in current Scene. |
| **Constrained camera** (max polar angle, min/max distance) | Prevents user from getting disoriented by extreme angles | LOW | Already partially exists: `maxPolarAngle={Math.PI / 2}` and `minDistance={1}`, `maxDistance={500}` in CameraControls |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Eagle-eye preset button** | One-click overhead view resets orientation when user is lost; critical for re-establishing spatial context after deep inspection | LOW | Programmatic `controls.setLookAt()` to preset position + target. Exists partially in Stkde3DScene (CAMERA_POSITION, CAMERA_TARGET) |
| **Animated camera transitions** between presets | Smooth dolly between eagle-eye, 45° iso, and side views helps user maintain spatial awareness during reorientation | MEDIUM | CameraControls supports `setLookAt` with smoothTime; need preset positions for 3-4 standard angles |
| **Stable cardinal direction indicators** in 3D scene | Floating N/S/E/W markers that stay fixed in world space; crucial for geographic reasoning | LOW | Three.js sprite markers at scene corners, or small compass rose overlay using HTML/CSS |
| **Geo-referenced ground plane grid** | Grid lines at regular intervals (e.g., 1km) projected onto the map substrate help with distance estimation | MEDIUM | Grid helper with projected coordinates, not just arbitrary units. Need to align with map tile origin. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Free-flying camera as default** | "Gives users full control" | Primary cause of 3D disorientation; users lose track of orientation and can't interpret the visualization | Default to constrained orbit with preset views |
| **AR/VR mode** | "Immersive crime analysis" | Overkill for desktop prototype, adds massive complexity, no evidence of analytical benefit in criminology | Stick with constrained desktop 3D |
| **Minimap in corner** | "Like video games" | Duplicates information already visible; adds UI clutter without analytical value | Eagle-eye preset toggle instead |

### Dependencies
- Map substrate in main Scene depends on porting MapTileSource pattern from Stkde3DScene → risks: MapLibre headless rendering for texture capture
- Camera presets depend on CameraControls ref being accessible → already wired in MainScene
- Geographic grid depends on map projection coordinate system → need to verify project/unproject fidelity

---

## 4. Cognitive Overload Reduction

*Objective: Reduce 3D cognitive overload — no free-flying camera by default, simplify depth usage, height only for temporal encoding, limit occlusion.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Height encodes time (exclusively)** | If height maps to anything other than time, the space-time cube metaphor breaks | LOW | Already the design, but needs explicit enforcement — no accidental z-axis reuse |
| **Default camera angle** (45° isometric) | Standard STC view that shows time (vertical) and space (horizontal) simultaneously without extreme foreshortening | LOW | Exists partially; need to set as initial camera position in both MainScene and STC-3D |
| **No free orbit by default** | Orbit controls should be available but default mode should constrain to rotation around a fixed point | LOW | CameraControls already constrains; verify that default interaction mode is orbit, not fly |
| **Occluded elements become transparent** | When a slice plane or KDE surface blocks view of another, the occluding surface should reduce opacity automatically | MEDIUM | Raycasting or depth-based transparency in shader. Significant rendering complexity. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Depth-based slice dimming** | Slice planes farther from camera get progressively dimmer, creating depth perception without active effort | MEDIUM | Distance-based opacity modulation in the Three.js material. Needs camera position tracking in scene. |
| **Auto-hide occluding slice planes** | When inspecting a specific slice, slices in front of it fade to very low opacity | MEDIUM | Requires depth ordering of slice geometry relative to camera; implement via renderOrder + opacity animation |
| **"Focus mode" for active slice** | Active slice pops to full opacity while all other slices dim to 15-20%; immediately reduces visual noise | LOW | Partially exists via `viewMode='focus'` in Stkde3DScene; needs to be tied to coordination store interaction |
| **Onboarding overlay explaining height=time** | 30-second interactive guide that establishes the space-time cube mental model before first use | LOW | Driver.js is already in the stack; need to add STC-specific onboarding steps |
| **Toggle between 2D and 3D view** | Analysts can switch to 2D map when cube becomes overwhelming; keeps them in the same workflow | LOW | Toggle exists (map/3d buttons in shell) but 2D map doesn't show slices currently |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **VR headset support** | "Most immersive way to explore" | Medically known to cause disorientation in data visualization contexts; no analytical advantage over desktop | Stick with constrained desktop 3D with 2D fallback |
| **Automatic rotation** | "Looks dynamic and engaging" | Makes precise reading impossible; causes motion discomfort; anti-analytical | User-controlled rotation only |
| **Multiple 3D viewports** | "See the cube from all angles" | Massive cognitive load increase; splits attention; no clear analytical benefit | Single 3D view with quick preset toggles |
| **Persistent stereoscopic 3D** | "True depth perception" | Requires specialized hardware; causes eye strain; marginal benefit for point cloud visualization | Monoscopic rendering with depth cues (shadow, fog, occlusion) |

### Dependencies
- Focus mode ties into Objective 1 (burst visibility — burst opacity) and Objective 8 (dense data readability — adaptive transparency)
- Onboarding depends on existing Driver.js integration
- 2D/3D toggle depends on coordination store maintaining state across views → already established pattern

---

## 5. Multi-Scale Temporal Inspection

*Objective: Support multi-scale temporal inspection through adjustable temporal slicing, dynamic aggregation windows, and zooming between coarse and fine temporal views.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Overview + detail timeline** | Coarse overview shows whole temporal range; detail panel shows zoomed window | LOW | Already exists in DualTimeline (overview/detail panels with brush zoom) |
| **Time range brush** on overview | Drag to select temporal window of interest | LOW | Already exists via d3-brush interaction in DualTimeline |
| **Adjustable bin count** for detailed view | Users should control granularity of temporal aggregation | LOW | `detailBinCount` prop exists; exposed through timeslicing mode store |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zoom-linked 3D cube update** | As user zooms into a narrower time range on the timeline, the 3D cube updates to show only that range's slices | MEDIUM | Requires coordination store communication to 3D scene; filtering logic already exists in slice visibility |
| **Dynamic aggregation window** (days/weeks/months auto-suggested) | Based on zoom level, suggest appropriate aggregation granularity (daily → weekly → monthly) | MEDIUM | Heuristic based on visible time range: >1yr → monthly, >3mo → weekly, <3mo → daily. Needs UI for granularity override. |
| **Temporal resolution indicator** | Shows current visible time span and aggregation level in a clear label | LOW | String computed from zoom level; display in info overlay |
| **"Zoom to burst" action** | Double-click a burst window on the timeline to zoom detail view to exactly that burst's time range | LOW | Event handler on burst window visualization; triggers brush range update |
| **Smooth zoom animation** | Animated zoom transitions rather than jump-cuts maintain temporal context | MEDIUM | SVG animation of scale transitions in D3. Already partially handled by scale interpolation. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Unlimited zoom-in to individual days** | "Maximum detail" | At 8.5M records, daily granularity creates unusably sparse views for large areas; encourages over-interpretation of noise | Set minimum zoom granularity based on data density |
| **Always-on millisecond precision** | "Scientifically accurate" | Crime data doesn't have millisecond precision; false precision misleads | Match temporal precision to data source resolution |
| **Independent zoom per view** | "Let me zoom timeline and cube separately" | Breaks coordination — user loses ability to reason about which time window the cube shows | Linked zoom: timeline zoom controls which slices appear in cube |

### Dependencies
- Zoom-linked 3D cube update requires: coordination store to publish zoom level → 3D scene to subscribe → slice visibility filter → moderate complexity
- Dynamic aggregation depends on: time range + density heuristics → existing DualTimeline infrastructure
- **Objective 5 is the bridge between Objective 2 (temporal evolution) and Objective 6 (workflow support)** — temporal zoom is how users navigate the scan→detect loop

---

## 6. Scan → Detect → Inspect Workflow Support

*Objective: Support the analytic workflow — overview density layer for scanning, burst detection overlays/highlights for detecting, and detailed inspection mode with STC for inspecting.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Default overview density view** (Scan mode) | Entry point: user sees overall crime density before any detection | LOW | Already is the flow — `scan` tab is first in rail. Map shows density heatmap by default. |
| **Burst highlights overlay** (Detect mode) | Detected bursts should be visually prominent when user switches to Detect | LOW | BurstWindows exist in timeline; need to add burst window overlays on map |
| **Active slice context in Inspect mode** | When inspecting, show which slice is active and why | LOW | Already exists: activeSliceIndex, sliceCrimeCounts, slice labels |
| **Clear workflow progress indicator** | User should know which phase they're in (Scan→Detect→Slices→Inspect) | LOW | Rail tabs exist but no progress indicator showing which step they're at in the workflow |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Scan-mode density layer with auto-legend** | Density heatmap with automatically computed bins and clear legend showing crime concentration levels | LOW | Density heatmap exists; dedicated Scan mode with optimized rendering (lower opacity point layer + heatmap) is new |
| **Detect-mode burst window polygons on map** | Visualize burst windows as semi-transparent time-bounded regions on the map; bridges temporal detection with spatial location | MEDIUM | Requires converting burst window time ranges to spatial overlay elements; novel visualization not common in existing tools |
| **Inspect-mode comparison presets** (side-by-side, overlay, swipe) | Structured comparison of two slices eliminates the need for user to mentally diff | HIGH | Comparison infrastructure exists (comparisonSliceIds, left/right slots); comparison modes (side-by-side/overlay/swipe) need new rendering logic |
| **Workflow state machine with guided transitions** | Auto-suggest next action based on current state: "You have detected 3 bursts — would you like to review them?" | MEDIUM | Need workflow state machine (exists partially in coordination store phases); guided suggestions are new UI |
| **"Hotspot → slice → inspect" jump** | Click a STKDE hotspot on the map, automatically generate a slice for that hotspot's time range, and jump to Inspect | MEDIUM | Requires bridging STKDE hotspot selection → slice generation → auto-navigate → medium complexity |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Fully automated detection → inspection pipeline** | "One-click analysis" | Removes analyst judgment; bad for evidence-based policing where decisions must be explainable | Guided manual workflow with clear accept/reject points |
| **Stepper/wizard UI** | "Clear linear progression" | Academic users (thesis context) need to explore non-linearly; stepper restricts natural analysis loops | Rail tabs with state hints (which tab is active, which is next) |
| **Mandatory workflow ordering** | "Enforce best practices" | Real analysts iterate; forcing linear workflow breaks when they need to re-scan after inspecting | Suggest, don't enforce |

### Dependencies
- **Scan mode depends on:** density map pipeline (exists) + dedicated rendering mode toggle
- **Detect overlays depend on:** burst window geometry + map overlay infrastructure (MapStkdeHeatmapLayer pattern)
- **Inspect comparison presets depend on:** comparisonSliceIds (exists) + rendering modes (new) → HIGH
- **Workflow state machine depends on:** current phase tracking (exists) + suggested actions (new) → MEDIUM
- **This objective is the workflow container for Objectives 1-5** — they all feed into different workflow stages

---

## 7. Visual Consistency Across Views

*Objective: Maintain visual consistency — shared timeline controls, shared color encoding, shared burst definitions, and synchronized interactions.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Same color palette across map, cube, and timeline** | Color is the primary encoding channel; inconsistency destroys interpretability | LOW | Colors partially diverge between views (map uses density-based, slice planes use palette, timeline uses fixed slice colors) |
| **Same burst definition across all views** | Burst can't mean different things in different panels | LOW | Burst definitions are already shared via stores; verify no divergence |
| **Synchronized active slice highlight** | When user clicks a slice in timeline, it highlights in cube and map simultaneously | LOW | Already implemented: `activeSliceIndex` in coordination store propagates to all views |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Single color scale with shared domain** | Both map heatmap and cube slice planes use the same color scale mapped to the same data range | MEDIUM | Currently map uses density percentile; cube uses per-slice KDE max. Need unified scale with global min/max. |
| **Cross-view hover sync** | Hovering a point in the map highlights the same point in the cube and timeline | HIGH | Requires index-based selection sync across Three.js (raycaster) and D3 (mouseover). Coordination store already has setSelectedIndex infrastructure. |
| **Consistent opacity encoding for burst strength** | If burst strength = 0.8, it maps to the same opacity level in timeline burst markers, cube slice planes, and map overlays | MEDIUM | Requires a shared burst-visualization config that all views read from; currently each view has independent rendering params |
| **Shared legend component** | One legend that works for all views, positioned consistently | LOW | Simple component; currently legends are scattered (SimpleCrimeLegend in cube, MapTypeLegend in map, no legend in timeline) |
| **Synchronized animation states** | If user starts playback in Inspect, the timeline cursor and map highlights move in sync | MEDIUM | Needs coordination store to broadcast playback state + current playback position to all views |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Identical rendering in all views** | "Perfect consistency" | Each view has different analytical purpose (map for spatial overview, cube for temporal structure); identical rendering would force suboptimal encodings per view | Consistent color semantics but view-appropriate rendering techniques |
| **Single global opacity slider** | "One control for everything" | Map heatmap, cube slices, and event points need independent opacity for different analytical contexts | Per-layer opacity with synchronized defaults |
| **Forced synchronization (no independent exploration)** | "Everything always in sync" | Prevents comparison tasks where user wants different views showing different slices | Sync by default, allow temporary desync with visual indicator |

### Dependencies
- Unified color scale requires: global data range computation + shared color scale config in a store → moderate refactor
- Cross-view hover sync requires: raycaster in Three.js scene + D3 mouse tracking in timeline + coordination store propagation → HIGH
- Synchronized animation requires: coordination store to hold playback state + each view to subscribe → MEDIUM
- **Objective 7 is the integration layer for Objectives 1-6** — without visual consistency, burst visibility (1), temporal evolution (2), and orientation (3) all become confusing

---

## 8. Dense Data Readability

*Objective: Make important activity stand out inside dense data through adaptive transparency, burst-emphasized rendering, dynamic filtering, and saliency amplification.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Density-based point opacity** | In dense areas, individual points become more transparent (or less visible) to reveal underlying structure | LOW | Partially exists through densityMap; need to apply to individual point rendering |
| **Zoom-dependent point clustering** | When zoomed out, points should cluster or aggregate; when zoomed in, they should resolve individually | MEDIUM | MapLibre supports clustering; 3D scene doesn't. Need LOD (level of detail) for points. |
| **Burst-emphasized color mapping** | Points in burst regions should use saturated colors; non-burst points desaturate or gray out | LOW | Exists via burstMetric/burstCutoff in map rendering; need to extend to cube |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Adaptive transparency per point** based on local density | Every point's opacity is inversely proportional to its local neighborhood density; reveals hotspots of activity AND sparse anomalous points simultaneously | MEDIUM | Requires per-point density estimation (KDE value at point location). Novel rendering pipeline. |
| **Burst-emphasized rendering mode** | Non-burst regions get heavily desaturated and semi-transparent; burst regions become fully opaque and saturated. Dramatically reduces visual noise. | LOW | Filter already exists (burstCutoff); apply as rendering override |
| **Saliency map overlay** | Computed saliency (burst score × local density anomaly) shown as a transparent overlay layer directly on the map | MEDIUM | New computation: combine burst score with spatial density anomaly. Most similar to STKDE pipeline. |
| **Dynamic filtering sliders** | Real-time sliders for density threshold, burst threshold, and transparency that update rendering without recomputation | LOW | Burst threshold slider exists; density threshold and transparency sliders need to be added to Configure panel |
| **Level-of-detail switching** | Automatically switch between point rendering → KDE surface → abstract marker based on zoom level and data density | HIGH | LOD system for visualization; heavy computation but significant UX improvement for large datasets |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Always show all points** | "Maximum data fidelity" | At 8.5M records, showing all points causes overplotting that obscures ALL patterns | Adaptive point rendering (transparency/clustering/LOD) |
| **Flat opacity (all points same)** | "Consistent appearance" | Dense regions become unintelligible ink-blots; sparse regions look empty | Density-dependent adaptive opacity |
| **Aggressive automatic filtering** | "Smart defaults" | Can hide important edge cases; analyst loses trust in what they're seeing | Conservative defaults + clear controls to adjust filtering |
| **Bloom/glow effects** | "Make hotspots pop" | Visually fatiguing, creates artifacts, makes precise comparison impossible | Use controlled color/size/opacity channels |

### Dependencies
- Adaptive transparency per point requires: per-point KDE value computation (expensive) or GPU-based density estimation → HIGH
- Level-of-detail switching requires: multiple rendering modes + zoom-level triggers → HIGH
- Saliency map requires: combination of existing burst detection + spatial anomaly detection → MEDIUM
- **Objective 8 is the rendering counterpart to Objective 1 (burst visibility)** — burst visibility encodes what to focus on; dense data readability is HOW to make that encoding work at scale

---

## 9. Analytical Clarity Over Visual Novelty

*Objective: Prioritize analytical clarity — keep interpolation/fluid animation optional, avoid excessive visual clutter, prefer explainability over aesthetics.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Jump-cut (discrete) slice transitions as default** | Default transition should be immediate so user can precisely compare before/after states | LOW | Already the default in slice navigation; should remain default |
| **Visual explanations alongside visualizations** | Every visual encoding should have a text explanation of what it shows | LOW | Info overlays exist in cube (debug info); need analytical explanations not just debug data |
| **Minimal default chrome** | No unnecessary decorative elements; every pixel should convey data | LOW | Already in place (minimal chrome is a key decision from PROJECT.md) |
| **Optional animations** | Animations should always be opt-in, not default | LOW | Playback controls exist as toggle; verify other animations are opt-in |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Explainable encoding panel** | When user hovers a slice or burst, show a small card: "This slice covers 3 days (Jun 12-15) with 142 crimes. Burst score 0.74 — high temporal concentration." | LOW | Data exists in stores; needs UI component to display it |
| **"Why this is a burst" tooltip** | For each burst window, show the temporal B score, spatial concentration, and combined rank with plain language explanation | LOW | BurstTaxonomy already computed (burstRationale, tieBreakReason). Surface in UI. |
| **Annotation capability** | User can add text annotations to slices or spatial regions to record observations | MEDIUM | Annotation model + UI for placement + persistence in store. Significant UX design effort. |
| **Visual diff mode** | When comparing two slices, show a difference heatmap (slice A - slice B) rather than requiring mental subtraction | HIGH | Requires per-cell KDE subtraction + color mapping of difference. Similar to change detection literature. |
| **Render mode selector** (points / density / burst / diff) | User explicitly chooses what visual encoding serves their current analytical question | LOW | Toggle buttons; each mode corresponds to a different rendering pipeline configuration |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Cinematic transitions between all state changes** | "Looks professional" | Prevents rapid comparison; frustrates power users; adds milliseconds to every interaction | Instant transitions by default; optional animated transitions in presentation mode |
| **Gradient backgrounds / visual flourishes** | "More visually appealing" | Reduces data-ink ratio; adds cognitive noise | Flat, neutral backgrounds (current design) |
| **Animated 3D logo / splash screen** | "Brand identity" | Delays access to data; no analytical value | Simple text header |
| **Auto-playing demo mode** | "Show off features" | Confusing when user is trying to do real analysis; hard to disable | Manual trigger for demo/tour |
| **Gamification elements** | "Increase engagement" | Undermines analytical seriousness; inappropriate for crime analysis | Focus on analytical clarity |

### Dependencies
- **Objective 9 is the philosophical framework for all other objectives** — every feature decision in objectives 1-8 should be evaluated against analytical clarity
- Explainable encoding requires: data from stores → display component → LOW, but high cross-cutting impact
- Annotation capability requires: new store + UI components → MEDIUM
- Visual diff requires: per-cell KDE comparison → depends on KDE pipeline from Objective 1

---

## 10. Usability Evaluation Readiness

*Objective: Enable evaluation of usability and insight generation — consistent interactions, clear task support, repeatable workflows, and interpretable controls.*

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Consistent interaction patterns** | Same gesture/click behavior across views; no surprises | LOW | Audit existing interactions for consistency. Coordination store pattern helps but needs systematic check. |
| **Clear task paths** | For common tasks (find hotspots, compare time periods, inspect cluster), there should be a clear 2-3 step path through the UI | LOW | Workflow exists (Scan→Detect→Slices→Inspect); needs to be documented and verified |
| **Undo/redo for slice operations** | Users need to revert mistakes without restarting analysis | MEDIUM | Slice domain store needs undo stack; significant state management complexity |
| **Session state persistence** | Work shouldn't disappear on page refresh | MEDIUM | Currently state is in-memory Zustand; no persistence |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Task completion time tracking** | Instrument the app to measure how long common tasks take (e.g., "find the top burst region and compare two slices") | LOW | Add performance markers and event logging to the existing logger service. Critical for thesis evaluation. |
| **User interaction log** | Record all user actions (view switches, slice selections, filter changes) for post-session analysis | LOW | LoggerService exists (`src/lib/logger.ts`) with `navigator.sendBeacon`. Need to extend to capture ALL interactions. |
| **Guided task scenarios** | Pre-configured data + task prompts for usability testing sessions | MEDIUM | URL-encoded state loading + task overlay UI. Enables controlled experiments. |
| **Think-aloud recording support** | Simple "record session" toggle that captures screen + audio via browser APIs | MEDIUM | MediaRecorder API + screen capture. Privacy-sensitive; need clear consent UI. |
| **Insight annotation export** | User's annotated findings exportable as a PDF or CSV summary for thesis documentation | MEDIUM | Markdown report generation from stored annotations + session data |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full analytics dashboard** | "Measure everything" | Creates privacy concerns; distracts from thesis evaluation goals; maintenance burden | Focused event logging for specific research questions |
| **A/B testing infrastructure** | "Optimize the UI" | Overkill for thesis prototype; adds deployment complexity | Simpler: task-based usability testing with think-aloud protocol |
| **User accounts / authentication** | "Persist state per user" | Out of scope (PROJECT.md); adds security and compliance overhead | URL-based state sharing for session persistence |
| **Heatmap of user clicks** | "See what users interact with" | Privacy-invasive; doesn't measure insight quality | Task completion metrics + qualitative observation |

### Dependencies
- **Objective 10 is the meta-objective that measures whether Objectives 1-9 are working**
- Interaction logging depends on: LoggerService (exists) → instrumentation points in each component → LOW
- Task completion tracking depends on: clear task definitions → logging infrastructure → LOW
- Session state persistence depends on: serialization of Zustand stores → MEDIUM
- Undo/redo depends on: immutable state update patterns + history stack → MEDIUM

---

## Cross-Cutting Feature Dependencies

```
 Objective 6: Workflow Support (Container)
   ├── provides context for ──> Objective 1: Burst Visibility (Detect phase)
   ├── provides context for ──> Objective 2: Temporal Evolution (Inspect phase)
   ├── provides context for ──> Objective 3: Spatial Orientation (Scan/Inspect)
   │
   Objective 9: Analytical Clarity (Philosophy — evaluated against)
   ├── governs ──> Objective 1: Burst Visibility (no flashy, only clear)
   ├── governs ──> Objective 2: Temporal Evolution (no cinematic, only analytical)
   ├── governs ──> Objective 4: Cognitive Overload (directly aligned)
   ├── governs ──> Objective 8: Dense Data Readability (clarity over completeness)
   │
   Objective 7: Visual Consistency (Integration)
   ├── required by ──> Objective 1: Burst Visibility (consistent burst encoding)
   ├── required by ──> Objective 2: Temporal Evolution (consistent temporal encoding)
   ├── required by ──> Objective 3: Spatial Orientation (consistent spatial encoding)
   ├── required by ──> Objective 6: Workflow Support (consistent view sync)
   │
   Objective 5: Multi-Scale Temporal Inspection (Navigation)
   ├── enables ──> Objective 2: Temporal Evolution (evolution across scales)
   ├── enables ──> Objective 6: Workflow Support (scan vs. inspect zoom levels)
   │
   Objective 8: Dense Data Readability (Implementation)
   ├── implements ──> Objective 1: Burst Visibility (burst emphasis is a readability technique)
   ├── implements ──> Objective 4: Cognitive Overload (reducing visible data reduces overload)
   │
   Objective 10: Usability Evaluation (Measurement)
   ├── measures ──> All objectives (are they working?)
```

### Critical Dependency Paths

| Dependency | Why | Impact |
|-----------|-----|--------|
| **Burst visibility (Obj 1) → Visual consistency (Obj 7)** | Burst encoding must be consistent across views or it creates confusion, not clarity | Blocking: implement 1 AND 7 together |
| **Temporal evolution (Obj 2) → Multi-scale temporal (Obj 5)** | Smooth interpolation needs temporal context (zoom) to be meaningful | Enhancing: 5 enables 2 |
| **Cognitive overload (Obj 4) → All objectives** | If the 3D view is cognitively overwhelming, ALL other visual features are wasted | Critical: address 4 before or alongside other 3D features |
| **Dense data (Obj 8) → Burst visibility (Obj 1)** | Burst emphasis is the primary mechanism for making dense data readable | Enhancing: implement together |
| **Analytical clarity (Obj 9) → Everything** | If a feature reduces analytical clarity, it fails. This is the gating principle. | Governance: apply as design principle during implementation |

### Conflict Map

| Conflict | Why | Resolution |
|----------|-----|------------|
| **Burst emphasis vs. Full data fidelity** | Emphasizing bursts necessarily de-emphasizes non-burst regions | Toggle between modes; default to burst-emphasized for workflow, raw density for verification |
| **Smooth interpolation vs. Analytical clarity** | Interpolated frames can mislead about actual data distribution | Opt-in interpolation with clear "estimated" label |
| **Cognitive overload reduction vs. Rich 3D interaction** | Constraining the camera reduces what user can explore | Default constrained + explicit unlock for power users |

---

## Implementation Complexity Summary

| Objective | Overall Complexity | Key Risky Items | Confidence |
|-----------|-------------------|-----------------|------------|
| 1. Burst Visibility | **LOW** | Kernel size scaling needs KDE bandwidth param | HIGH |
| 2. Temporal Evolution | **MEDIUM** | Smooth interpolation (HIGH) vs. trails/accumulation (MEDIUM) | MEDIUM |
| 3. Spatial Orientation | **LOW-MEDIUM** | Map substrate port from STC-3D to main Scene | HIGH |
| 4. Cognitive Overload | **LOW-MEDIUM** | Auto-occlusion transparency needs shader work | MEDIUM |
| 5. Multi-Scale Temporal | **MEDIUM** | Zoom-linked 3D cube update | HIGH |
| 6. Workflow Support | **MEDIUM** | Comparison presets (HIGH); burst map polygons (MEDIUM) | HIGH |
| 7. Visual Consistency | **MEDIUM** | Cross-view hover (HIGH); unified color scale (MEDIUM) | MEDIUM |
| 8. Dense Data Readability | **MEDIUM-HIGH** | Per-point adaptive transparency (HIGH); LOD (HIGH) | MEDIUM |
| 9. Analytical Clarity | **LOW** | Mostly UI and design principles | HIGH |
| 10. Usability Evaluation | **LOW-MEDIUM** | Session persistence (MEDIUM); annotation export (MEDIUM) | HIGH |

---

## Recommended Implementation Order

Based on dependencies and risk, the suggested phase ordering is:

### Phase A: Foundation (Objectives 9, 4, 3)
*Analytical clarity as governing principle, cognitive overload reduction, spatial orientation*
- Set the design philosophy first
- Fix camera constraints, add axis labels, map substrate
- Implement focus mode and depth-based dimming
- **Why first:** Without these, all 3D features are cognitively inaccessible

### Phase B: Core Visual Encoding (Objectives 7, 1, 8)
*Visual consistency, burst visibility, dense data readability*
- Unify color scales, burst definitions, legends
- Wire burst-score-to-opacity maps
- Implement adaptive transparency and burst-emphasized rendering
- **Why second:** These are the primary analytical encodings — everything else enhances them

### Phase C: Temporal & Workflow (Objectives 5, 2, 6)
*Multi-scale temporal, temporal evolution, workflow support*
- Zoom-linked 3D update, dynamic aggregation
- Aging trails, temporal accumulation
- Workflow state machine, comparison presets
- **Why third:** Depends on stable visual encoding foundation

### Phase D: Evaluation (Objective 10)
*Usability evaluation readiness*
- Instrument logging, task timing
- Session persistence, undo/redo
- **Why last:** Only makes sense once the visualization is stable

---

## Sources

- **Codebase analysis:** Direct inspection of 90+ component files, store definitions, API routes, and worker implementations (HIGH confidence)
- **Existing research:** `.planning/research/` contains domain-specific findings on hotspot policing and crime analytics
- **Vision document:** `.planning/vision/CYCLIC_WORKFLOW_VISION.md` establishes the cyclic workflow design
- **Andrienko & Andrienko (2006):** Exploratory Analysis of Spatial and Temporal Data — spatiotemporal visualization framework (training data, MEDIUM confidence)
- **Ware (2012):** Information Visualization: Perception for Design — visual saliency principles (training data, HIGH confidence for established principles)
- **Tufte (2001):** The Visual Display of Quantitative Information — data-ink ratio, chartjunk (training data, HIGH confidence)

---

*Feature research for: Adaptive Space-Time Cube Prototype — Visualization Level-Up*
*Researched: 2026-05-26*
