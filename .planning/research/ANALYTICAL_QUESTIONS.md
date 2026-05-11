# Analytical Questions: Adaptive Space-Time Cube

**Researched:** 2026-05-08
**Domain:** Spatiotemporal crime pattern visual analytics
**Confidence:** HIGH (verified against source code + planning docs)

## Summary

The Adaptive Space-Time Cube prototype enables a user to answer structured analytical questions across six dimensions: **overview, temporal selection, slice-based comparison, burst detection, evolution tracing, and hotspot analysis**. Each visualization feature maps to specific analytical questions, forming a clear progression from broad exploration to fine-grained reasoning.

The designed workflow moves from **Orient → Find → Compare → Inspect → Explain → Apply**, with each stage supported by distinct UI surfaces (WorkflowSkeleton, DemoDualTimeline, DemoComparisonPanel, DemoExplainPanel, DemoSlicePanel, DemoEvolutionPanel, DemoStatsPanel, DemoStkdePanel) and 3D cube overlays (SlicePlane, BurstEvolutionOverlay, EvolutionFlowOverlay, ClusterHighlights).

**Key recommendation:** The prototype already supports the full analytical chain from overview to burst decoding. The main gaps are (1) missing contextual enrichment (Phase 8), (2) unisolated workflow (Phase 9), and (3) weaker trajectory tracing (T2). Evaluation should test whether the **comparison + evolution + burst explainability triad** actually helps users form and test hypotheses faster than looking at raw data.

---

## 1. What Questions Can the User Answer?

### 1.1 Overview & Summary Questions

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| What is the overall crime distribution over time? | View the overview density strip at the top of the dual timeline | `DualTimelineSurface` overview track with density histogram |
| When are the high-activity intervals? | Look for peaks in the overview density strip; dense areas appear as taller/hotter bands | Overview density bins, `OverviewScale` |
| What are the total crime counts and averages? | Read metric cards in the stats panel | `DemoStatsPanel`: Total Crimes, Avg/Day |
| What is the most common crime type? | Read the "Top Crime" metric card | `DemoStatsPanel` metric card |
| Which districts have the most activity? | See district matrix in stats panel, or top crime types/districts breakdown | `DemoStatsPanel` district grid, `rankCounts` analysis |
| What is the hourly/daily/monthly rhythm? | Toggle through pulse chart tabs | `DemoStatsPanel` PulseChart (hourly/daily/monthly temporal pulses) |
| How many crime types are in the data? | View dynamic category legend derived from viewport | `CrimeCategoryLegend`, category toggle |

### 1.2 Temporal Window Questions

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| What happened in this specific time range? | Brush a time range on the overview or detail timeline | `DualTimelineSurface` brush interaction |
| How does the activity flow within a selected window? | Click a detail bar to see crime flow chart, peak bucket, and flow summary | `DetailDrilldownCard` with `buildPeriodFlow` |
| What are the top crime types in this window? | See top types breakdown with proportional bars | `DetailDrilldownCard` top crimes section |
| What are the top districts in this window? | See top districts breakdown with proportional bars | `DetailDrilldownCard` district section |
| What is the peak hour for activity in this window? | Read the "Peak Hour" metric in the period analysis | `DetailDrilldownCard` peak hour |
| Is the activity front-loaded or back-loaded in this window? | Read the natural-language flow summary ("Front-loaded with a sharp early cluster...") | `buildFlowShapeSummary` |
| How does the distribution vary by crime type? | See type bar charts with percentages | `DemoStatsPanel` distribution section |

### 1.3 Slice-Based Questions (Core STC Value)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| Where does crime concentrate in a specific time window? | View the KDE heatmap rendered on the slice plane in the 3D cube | `SlicePlane` with `stkdeSurface` heatmap texture |
| How do spatial patterns differ between two time periods? | Assign two slices to left/right comparison slots, read the comparison panel | `DemoComparisonPanel` + `compareAdjacentSlices` |
| What is the count delta between two periods? | Read the `countDelta` metric in the comparison panel | `DemoComparisonPanel` Metric card |
| What is the density ratio between two periods? | Read the `densityRatio` badge (e.g., "1.5x density") | `DemoComparisonPanel` badge |
| Did the dominant crime type shift between periods? | Read the dominant type shift ("unchanged" vs "THEFT → BATTERY") | `DemoComparisonPanel` dominantTypeShift |
| How much do districts overlap between two periods? | Read the district overlap ratio and shared district list | `DemoComparisonPanel` districtOverlap |
| Did the spatial hotspot move between periods? | Read the hotspot delta and dominant district comparison | `DemoComparisonPanel` hotspotDelta |
| What is the internal cluster structure of a slice? | View per-slice DBSCAN cluster overlay in the 3D cube | `SliceClusterOverlay`, `analyzeClusters` |
| Where are the clusters in 3D space throughout temporal slices? | View global cluster volumes rendered in the cube | `ClusterManager` global cluster volumes |

### 1.4 Burst Detection Questions (T4, T6, T7, T8)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| Where are the bursty periods in the timeline? | See burst windows overlaid on timeline detail track with colored marks | `DualTimelineSurface` burst windows with `burstClass` taxonomy |
| Is a burst a gradual escalation or a sharp spike? | Read the burst class label: "prolonged-peak" (gradual) vs "isolated-spike" (sharp) | `classifyBurstWindow` taxonomy, displayed in `DemoExplainPanel` |
| Is a window a low-activity valley? | Read "valley" class label for trough periods | Burst taxonomy in `DemoExplainPanel` |
| How confident is the burst classification? | Read the confidence percentage (e.g., "85% confidence") | `burstConfidence` in `DemoExplainPanel` |
| Why was this window classified this way? | Read the natural-language burst rationale | `burstRationale` in `DemoExplainPanel` |
| What is the true duration of the burst? | Read the "True duration" label in the explain panel | `DemoExplainPanel` duration formatting |
| How does the burst duration compare to surrounding windows? | Read the "Relative cue" (e.g., "Longer than surrounding windows") | `DemoExplainPanel` relative duration |
| What is the internal event pacing? | See inter-event gap distribution (mean gap, median gap, gap bins) | `BurstDetails` inter-event gap analysis |
| What crime types dominate the burst? | See top crime types with counts and percentages | `BurstDetails` top types |
| What is the burstiness coefficient? | Read the B coefficient value | `DemoSlicePanel` formatBurstCoefficient |
| Is the entire selection a neutral partition or does it contain burst structure? | See `selectionStateLabel`: "idle", "neutral", or "expanded" | `DemoSlicePanel`, `WorkflowSkeleton` |
| How does the burst lifecycle connect across slices? | View burst evolution overlay with connector segments and score nodes | `BurstEvolutionOverlay` + `buildBurstEvolutionModel` |

### 1.5 Evolution & Sequencing Questions (T2)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| How does the pattern change as we step through slices chronologically? | Step through slices using Previous/Next controls, or auto-play | `DemoEvolutionPanel` with `useDemoEvolutionSequence` |
| What is the pattern flow direction between slices? | View directional flow arrows between slices in the 3D cube | `EvolutionFlowOverlay` with line + cone directional indicators |
| How does burstiness score vary across the slice sequence? | View the burst score rail aligned with slices | `BurstScoreRail` in `DualTimelineSurface` |
| Which slice is currently the focus of the evolution? | See the active slice highlighted (brighter color, active evolution stroke) | `SlicePlane` `evolutionState` |
| What are the previous and next slices in sequence? | See labels in the evolution panel | `DemoEvolutionPanel` previous/next display |

### 1.6 Adaptive Time Scaling Questions (VIEW-05)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| How does adaptive time scaling affect the timeline? | Compare focused track vs raw baseline | `DemoDualTimeline` dual-track design |
| Which time regions are expanded/compressed? | View warp overlay bands on the timeline | `userWarpOverlayBands`, `authoredWarpMap` |
| Where are my slices exerting warp influence? | See slice warp bands with strength indicators | `DemoSlicePanel` warp controls (enable/disable, weight 0-3) |
| What is the current warp source and factor? | Read the warp mode metadata | `buildDashboardDemoSelectionStory` compareStateLabel |

### 1.7 Hotspot Analysis Questions (HOTS-01, HOTS-02)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| Where are the significant spatial hotspots? | View STKDE rail with ranked hotspot list and heatmap surface | `DemoStkdePanel` with configurable presets |
| How reliable is this hotspot? | Read support labels and confidence metadata | `DemoStkdePanel` support labels |
| What is the peak time window for a hotspot? | Click a hotspot to filter to its temporal peak window | `DemoStkdePanel` temporal filter on click |
| How does the hotspot surface change with different parameters? | Switch between Focus/Balanced/Wide presets | `DemoStkdePanel` preset selection |
| Do hotspots apply to the current slice set or the full viewport? | Toggle STKDE scope: "applied-slices" vs "full-viewport" | `DemoStkdePanel` scope toggle |

### 1.8 Category Questions (VIEW-06)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| What crime types are present in the current viewport? | View dynamic category legend on cube and map | `CrimeCategoryLegend` |
| Where are different crime types located? | See shape encoding (sphere/cube/cone) for different crime categories in 3D | Category shape encoding in cube |
| How does the category distribution compare visually? | Toggle category visibility on/off to isolate types | Crime category toggle |

### 1.9 Slice Generation Questions (SUGG-01, SUGG-02)

| Question | How the User Answers It | Feature / Component |
|----------|------------------------|---------------------|
| What slices would be suggested for this time window? | Click "Generate selection-first drafts" from brushed selection | `generateBurstDraftBinsFromWindows` |
| Why are these boundaries recommended? | Read burst metadata on draft bins (burstiness coefficient, burst class) | `pendingGeneratedBins` with burst metadata |
| Should I use hourly, daily, monthly, or quarterly granularity? | Read recommended granularity based on window size | `recommendGranularityForSelection` |
| Are these drafts neutral or bursty? | See state label: "neutral" or "expanded" | `selectionStateLabel` |

---

## 2. Workflow Stages

The prototype implements a structured guided workflow (as of Phase 13):

```
ORIENT → FIND → COMPARE → INSPECT → EXPLAIN → APPLY
```

### Stage 0: Load & Initialize
- `DashboardDemoShell` loads summary data via `loadSummaryData()`
- Timeline store initializes with dataset bounds
- Overview density strip renders; stats panel shows summary metrics
- **UI surfaces:** DashboardDemoShell, DualTimelineSurface (overview track)

### Stage 1: Orient (Workflow Step: "orient")
- User reads the overview density strip to understand global temporal distribution
- Stats panel shows total crimes, avg/day, peak hour, top crime type
- Pulse charts show hourly/daily/monthly rhythms
- District grid shows distribution across jurisdictions
- **Analytical goal:** Understand the dataset scope and find interesting starting points
- **UI surfaces:** DemoStatsPanel, overview track, district grid

### Stage 2: Find (Workflow Step: "find")
- User brushes a time window on the timeline to select an active range
- Detail window renders with point/binned crime distribution
- Burst windows are detected and rendered on the timeline with taxonomic classification
- User clicks a burst window to pin it and see details
- User can generate selection-first draft bins from the brushed range
- **Analytical goal:** Locate bursty intervals and interesting temporal windows
- **UI surfaces:** DualTimelineSurface (brush + detail + burst windows), DemoExplainPanel

### Stage 3: Generate & Review (Between Find and Compare)
- User selects granularity (hourly/daily/monthly/quarterly) based on recommendation
- Optionally filters crime types
- Clicks "Generate selection-first drafts"
- Draft bins appear on timeline with burst metadata
- User can merge, split, or delete draft bins
- **Analytical goal:** Create well-defined time slices from burst structure
- **UI surfaces:** DemoSlicePanel, WorkflowSkeleton, DualTimelineSurface (pending geometries)

### Stage 4: Apply
- User clicks "Apply draft slices" to commit bins as formal slices
- `replaceSlicesFromBins` creates TimeSlice objects with all burst metadata preserved
- Draft state is cleared; slice state is active
- Cube updates to show slice planes with STKDE heatmaps
- **Analytical goal:** Convert exploratory drafts into committed analytical slices
- **UI surfaces:** WorkflowSkeleton apply button, DemoSlicePanel

### Stage 5: Compare (Workflow Step: "compare")
- User assigns slices to left/right comparison slots
- Comparison panel shows count delta, density ratio, dominant type shift, district overlap, hotspot delta
- **Analytical goal:** Understand how spatial/temporal/categorical patterns differ between periods
- **UI surfaces:** DemoComparisonPanel, slice Left/Right buttons

### Stage 6: Inspect (Workflow Step: "inspect")
- User inspects individual slices or burst windows in detail
- Cube view shows slice planes with STKDE heatmap overlays
- Cluster overlays show DBSCAN cluster structure within slices
- Slice details dialog shows burst metadata, warp settings, provenance
- **Analytical goal:** Deep-dive into specific slices before committing to analysis
- **UI surfaces:** DemoSlicePanel (details dialog), SlicePlane, SliceClusterOverlay

### Stage 7: Evolve (Embedded in Inspect)
- User steps through slices chronologically using evolution panel
- Auto-play with configurable speed
- Cube shows directional flow arrows between slices
- Burst evolution overlay shows connector segments with burst typing
- **Analytical goal:** Understand how patterns evolve temporally through the slice sequence
- **UI surfaces:** DemoEvolutionPanel, EvolutionFlowOverlay, BurstEvolutionOverlay

### Stage 8: Explain (Workflow Step: "explain")
- Explain panel shows burst rationale, detection reason, true duration, relative duration cues
- Workflow phase indicator suggests next action
- Selection story combines active window, compare state, and linked highlight
- **Analytical goal:** Form and communicate a hypothesis about why patterns exist
- **UI surfaces:** DemoExplainPanel, selection story

### Stage 9: Hotspot Drill-Down (Embedded)
- STKDE rail shows ranked hotspot list
- User clicks a hotspot to filter map/cube to its spatial extent and temporal peak
- User can switch between presets (Focus/Balanced/Wide)
- **Analytical goal:** Validate spatial patterns and drill into specific hotspot locations
- **UI surfaces:** DemoStkdePanel, map/cube filtered viewport

---

## 3. Gaps vs Requirements

### Requirement to Feature Mapping

| Req | Description | Status | Component(s) | Notes |
|-----|-------------|--------|--------------|-------|
| T1 | Overview of global trends, high-activity intervals, spatial clusters | ✅ Covered | DemoStatsPanel, DualTimeline overview, 2D density map | Strong coverage |
| T2 | Trace temporal evolution of incidents/clusters | ⚠️ Partial | DemoEvolutionPanel, EvolutionFlowOverlay, TrajectoryLayer | Evolution works for slices; individual incident trajectory tracing not fully wired |
| T3 | Compare timing/duration/spatial extent across selections | ✅ Covered | DemoComparisonPanel, compareAdjacentSlices() | Full comparison model |
| T4 | Detect intersections, pauses, abrupt changes | ✅ Covered | Burst taxonomy, DualTimelineSurface burst windows | prolonged-peak/isolated-spike/valley detection |
| T5 | Summarize recurring behaviors, periodic patterns | ⚠️ Partial | DemoStatsPanel pulse charts, flow summary | Hourly/daily/monthly pulses exist; no explicit periodicity detection |
| T6 | Discriminate order of rapid concurrent events inside a burst | ✅ Covered | BurstDetails inter-event gap distribution | Mean/median gap, gap bins (<1m, 1-5m, etc.) |
| T7 | Identify burst pacing (gradual vs instantaneous) | ✅ Covered | Burst taxonomy: prolonged-peak vs isolated-spike | With confidence + rationale |
| T8 | Recover true duration of distorted interval | ✅ Covered | DemoExplainPanel "True duration" + "Relative cue" | With natural-language explanation |
| VIEW-01 | 2D density projection with opacity modulation | ✅ Covered | 2D map density layer, MapBase | Verified |
| VIEW-02 | 3D Space-Time Cube with time on vertical axis | ✅ Covered | CubeVisualization, Scene, TimeAxis | Phase 10 complete |
| VIEW-03 | Synchronized navigation/brushing between 2D and 3D | ⚠️ Partial | DemoMapVisualization, CubeVisualization, useSelectionSync | Sync exists; full linked-brushing depth varies |
| VIEW-04 | Timeline slider for temporal window | ✅ Covered | DualTimelineSurface brush + zoom | Full brush/zoom sync |
| VIEW-05 | Non-uniform temporal scaling | ✅ Covered | DemoDualTimeline warp maps, warp controls | Density-based and slice-authored |
| VIEW-06 | Categorical structure with hue, low-confidence with transparency | ✅ Covered | CrimeCategoryLegend, category shape encoding | Phase 6 complete |
| TRUST-01 | Loading/ready/degraded states | ✅ Covered | Toast, loading indicators, error states | Phase 12 complete |
| TRUST-02 | Real/mock/partial data indication | ✅ Covered | X-Data-Warning header, data provenance cues | Verified |
| TRUST-03 | Distinct loading/empty/error/degraded states | ✅ Covered | Per-component loading/error state handling | Verified |
| TRUST-04 | Date/crime-type/geography filters with validation | ✅ Covered | Filter store, input validation | Verified |
| HOTS-01 | STKDE hotspot layer | ✅ Covered | DemoStkdePanel, STKDE rail, heatmap | Configurable presets |
| HOTS-02 | Hotspot confidence/rationale metadata | ✅ Covered | Support labels, scope mode, parameters | Medium coverage |
| SUGG-01 | Suggest time slices before applying | ✅ Covered | Selection-first draft generation, granularity recommendation | Phase 9 complete |
| SUGG-02 | Explain why slice was suggested | ✅ Covered | Burst metadata, burstiness coefficient on drafts | Preserved through apply |
| PERF-01 | Brush/play with large datasets without freezing | ⚠️ Partial | Off-main-thread workers, adaptive compute | Some heavy paths still on main thread |
| PERF-02 | Heavy computation off main thread | ✅ Covered | Web Workers for STKDE, adaptive time | Architecture supports |
| CTX-01-05 | Contextual data enrichment | ❌ Missing | Not implemented | Phase 8 not started |
| FLOW-01-06 | Workflow isolation / dedicated full-screen steps | ❌ Missing | Not fully implemented | Phase 9 not started; workflow skeleton exists but is embedded |
| SHAR-01 | Export static snapshot/report | ❌ Deferred | v2 scope | Not in current roadmap |

### Critical Gaps

1. **Contextual enrichment (CTX-01 through CTX-05)** — Phase 8: No socioeconomic, holiday, event, or traffic layers exist. Users cannot see whether a crime spike correlates with a public event or holiday.

2. **Workflow isolation (FLOW-01 through FLOW-06)** — Phase 9: The workflow skeleton exists as a left drawer but is not yet a dedicated full-screen step flow. Generate/Review/Apply are monolithically embedded.

3. **Trajectory tracing (T2)** — Individual incident trajectory tracing (following specific records through time) exists as `TrajectoryLayer` and `TrajectoryTooltip` but is not fully wired into the dashboard-demo workflow. The evolution sequence handles slice-to-slice progression, not record-level tracing.

4. **Periodic pattern detection (T5)** — While hourly/daily/monthly pulse charts exist, there is no explicit periodicity or seasonality detection. Users must visually infer recurring patterns.

5. **True duration warp context (T8 refinement)** — Duration labels exist in the explain panel, but there is no persistent visual cue in the 3D cube showing the true metric duration alongside the warped visual duration.

---

## 4. Evaluation Dimensions

### 4.1 Analytical Task Taxonomy (What to Test)

Based on the requirements (T1-T8) and the implemented features, an evaluation should test:

#### Overview & Exploration Tasks
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Find the period with the highest crime density in the dataset" | Low | Time to find, correctness |
| "Identify which district has the most THEFT incidents" | Low | Time, accuracy |
| "Find the most common crime type in the dataset" | Low | Time, accuracy |
| "Describe how crime density varies by time of day" | Medium | Qualitative description quality |

#### Temporal Window Tasks
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Select the time range [DateA, DateB] and identify the top 3 crime types" | Medium | Time, completeness |
| "Determine whether activity in this window is front-loaded or back-loaded" | Medium | Accuracy, confidence |
| "Find the peak hour for activity in January 2022" | Medium | Time, accuracy |

#### Slice Comparison Tasks (Core STC Value)
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Compare two slices and say whether the dominant crime type changed" | Medium | Accuracy, time |
| "Determine which time period had higher crime density" | Low | Accuracy, time |
| "Identify districts that appear only in the later slice" | Medium | Completeness |
| "Does the spatial hotspot shift between these two periods?" | High | Accuracy, qualitative reasoning |

#### Burst Detection Tasks (Differentiator)
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Find a bursty period in the timeline" | Low | Time, hit rate |
| "Is this burst a gradual escalation or a sharp spike?" | Medium | Accuracy |
| "What is the true duration of this burst?" | Low | Accuracy |
| "What is the internal event pacing of this burst?" | High | Completeness of answer |
| "Explain in plain language why this window was flagged as a burst" | Medium | Explanation quality |
| "Compare the internal gap distribution of two bursts: which has tighter clustering?" | High | Accuracy, reasoning |

#### Evolution Tasks
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Step through slices in order and describe how the spatial pattern changes" | Medium | Qualitative richness |
| "Does the burst score increase or decrease through the slice sequence?" | Medium | Accuracy |
| "Which slice shows the strongest burst activity?" | Low | Time, accuracy |

#### Hotspot Tasks
| Task | Cognitive Load | Measures |
|------|---------------|----------|
| "Find the most significant hotspot in the current viewport" | Low | Time, accuracy |
| "Does the hotspot remain stable under different detection presets?" | Medium | Consistency check |
| "What is the peak time window for this hotspot?" | Medium | Accuracy |

### 4.2 Evaluation Dimensions

| Dimension | What to Measure | Method | Metrics |
|-----------|----------------|--------|---------|
| **Effectiveness** | Can users correctly answer analytical questions? | Task-based usability test (within-subject, varied question types) | Accuracy rate, error type analysis |
| **Efficiency** | How quickly can users complete analytical tasks? | Timed task completion | Task completion time, number of actions |
| **Learnability** | How quickly do users become proficient? | Repeated trials over 2-3 sessions | Completion time trend, error rate trend, feature discovery rate |
| **Satisfaction** | Do users trust the analysis? | SUS questionnaire, semi-structured interview | SUS score (target >68), qualitative themes |
| **Insight Quality** | Are the insights users derive deep or shallow? | Think-aloud protocol, insight coding | Number of insights, depth score (observational → causal) |
| **Comparison Confidence** | Do users trust the slice comparison output? | Confidence self-rating after each comparison task | Mean confidence rating, calibration against accuracy |
| **Burst Trust** | Do users find the burst rationale convincing? | Likert-scale + qualitative probe after burst tasks | Trust score, rationale acceptance rate |

### 4.3 Recommended Study Design

**Between-subjects or within-subjects?**
- Within-subject with task randomization (controls for individual differences in spatial reasoning)
- Minimum n=12 for meaningful qualitative + quantitative results

**Suggested task blocks (15-20 min each):**

1. **Onboarding (5 min):** Brief tutorial, free exploration
2. **Block A — Overview + Temporal (10 min):** 4 overview tasks, 3 temporal window tasks
3. **Block B — Slice Comparison (10 min):** 3-4 comparison tasks with increasing difficulty
4. **Block C — Burst Analysis (10 min):** 4 burst detection + characterization tasks
5. **Block D — Free Exploration (10 min):** Open-ended analysis, think-aloud
6. **Survey (5 min):** SUS + custom trust/confidence scales

**Comparison conditions (if doing comparative evaluation):**
- **Condition 1:** Adaptive STC (full prototype)
- **Condition 2:** Baseline — static timeline + separate map (no linked brushing, no burst detection, no adaptive scaling)

### 4.4 Key Hypothesis to Test

1. **H1:** Users can detect bursty intervals faster with the STC's burst taxonomy than with a raw density timeline.
2. **H2:** Users make more accurate temporal comparisons with slice-based comparison (countDelta, densityRatio) than with mental estimation.
3. **H3:** The burst explainability panel increases user trust in automated burst detection (measured via confidence rating).
4. **H4:** The evolution sequence helps users form richer causal narratives about crime pattern changes.
5. **H5:** Adaptive time scaling does not decrease the accuracy of duration estimation when true-duration cues are present.

---

## 5. Open Questions

1. **How does the prototype perform with 8.5M records?** — The architecture supports DuckDB + Arrow streaming and off-main-thread workers, but actual end-to-end latency with full data needs measurement. Some heavy computation paths (window-level density recompute) may still block on main thread.

2. **Is the workflow skeleton discoverable?** — It's a left-anchored collapsible drawer. Users who don't notice it may miss the guided workflow entirely. Evaluation should test discoverability.

3. **Do users understand adaptive time scaling?** — The warp map visualization (bands, dual timeline) needs to be tested for comprehensibility. The biggest thesis risk is that warped time misleads users about true durations.

4. **Can users distinguish between "slice-authored" and "density-based" warp sources?** — The warp source toggle may be too technical for non-expert users.

5. **Is the comparison panel too abstract?** — The comparison outputs densityRatio, countDelta, dominantTypeShift, districtOverlap, and hotspotDelta. Users may struggle to interpret these mathematically.

---

## 6. Sources

### Primary (HIGH confidence — verified against source code)
- `src/components/timeline/DemoDualTimeline.tsx` — Dual timeline with warp maps, burst windows, slice geometries
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — Slice management, draft generation, merge/split/delete
- `src/components/dashboard-demo/DemoComparisonPanel.tsx` — Left/right slice comparison rendering
- `src/components/dashboard-demo/DemoExplainPanel.tsx` — Burst rationale, duration, next action
- `src/components/dashboard-demo/DemoEvolutionPanel.tsx` — Step/playback sequence controls
- `src/components/dashboard-demo/DemoStatsPanel.tsx` — Stats summary, pulse charts, period analysis
- `src/components/dashboard-demo/DemoStkdePanel.tsx` — Hotspot rail, presets, filter
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` — Guided workflow stepper
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — Main demo shell layout
- `src/components/viz/SlicePlane.tsx` — Per-slice KDE heatmap rendering in 3D cube
- `src/components/viz/TimeSlices.tsx` — Slice orchestration with evolution state
- `src/components/viz/EvolutionFlowOverlay.tsx` — Directional flow arrows between slices
- `src/components/viz/BurstEvolutionOverlay.tsx` — Burst lifecycle connector segments
- `src/components/viz/BurstDetails.tsx` — Inter-event gap analysis, burst composition
- `src/components/viz/MainScene.tsx` — Scene composition with clusters, slices, overlays
- `src/lib/stkde/adjacent-slice-comparison.ts` — Pure comparison math
- `src/lib/stkde/burst-evolution.ts` — Burst evolution model builder
- `src/lib/binning/burst-taxonomy.ts` — Burst window classification
- `src/store/useDashboardDemoCoordinationStore.ts` — Coordination store types
- `src/store/slice-domain/types.ts` — TimeSlice type definition
- `src/types/crime.ts` — Canonical CrimeRecord type
- `src/types/autoProposalSet.ts` — Auto-proposal types

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — Requirement definitions with traceability
- `.planning/PROJECT.md` — Core value, constraints, decisions
- `.planning/STATE.md` — Current state, completed phases
- `.planning/research/THESIS-REQUIREMENTS-COVERAGE.md` — Thesis cross-check
- `.planning/research/FEATURES.md` — Feature landscape analysis
- `.planning/research/SUMMARY.md` — Domain research summary
- `.planning/phases/03-adjacent-slice-comparison-burst-evolution/03-01-PLAN.md` — Comparison phase plan
- `.planning/phases/04-evolution-view/04-CONTEXT.md` — Evolution phase context
- `.planning/phases/14-decode-bursts-temporal-anomalies/14-CONTEXT.md` — Burst decode phase context

---

## Metadata

**Confidence breakdown:**
- Feature-to-question mapping: HIGH — verified against actual component code
- Workflow stages: HIGH — derived from WorkflowSkeleton step definitions and component dependency walkthrough
- Gaps vs requirements: HIGH — cross-checked with STATE.md, REQUIREMENTS.md, and current code
- Evaluation dimensions: MEDIUM — based on HCI evaluation best practices and task taxonomy from literature
- Performance claims: MEDIUM — architectural assessment only, not benchmarked

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (or until next phase transition changes the workflow)
