# Phase 25: Adaptive Time Intervals & Burstiness - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement adaptive time scaling logic to highlight bursty intervals and compress low-activity periods. This involves mathematical transformation (KDE), visual representation (Warp Slider), and integration with existing visualization stores.
</domain>

<decisions>
## Implementation Decisions

### Burstiness Metric
- **Primary Signal:** Selector for "Event Count", "Inter-arrival", and "KDE".
- **Default Mode:** Event Count (Binning).
- **Bin Size:** Adaptive Resolution (Duration / N) with user-adjustable N.
- **Computation:** Web Worker (offload from main thread due to ~200k points).

### Compression Strategy
- **Method:** Linear Blend slider (0% Linear to 100% Adaptive).
- **Mechanism:** `pos = (1 - warp) * linearPos + warp * adaptivePos`
- **Slider Location:** Timeline Header (global time control).
- **Update Frequency:** Real-time (via shader mixing for smooth feedback).
- **Persistence:** Persist to Local Storage.

### Visual Indicators
- **Warp Feedback:** Red/Blue shift heatmap track (Red = Slow/Away, Blue = Fast/Towards).
- **Indicator Location:** Separate "Density Bar" track above the timeline rail.
- **Axis Labels:** Equidistant labels (Option A) — ticks stay fixed, time values change.
- **Animation:** Enabled (300ms transition on click/drag) to support object constancy.

### Claude's Discretion
- **Algorithm Details:** Specific KDE bandwidth/kernel choice.
- **Worker Communication:** Message passing structure.
- **Shader Implementation:** Exact GLSL mixing logic.

</decisions>

<specifics>
## Specific Ideas

- "Red/Blue shift like physics" for the heatmap coloring.
- Slider should feel tactile and responsive (real-time GPU updates).
- Keep the main view clean; separate density strip avoids clutter.
- **Consistency:** Matches the visual grid of the Space-Time Cube.

</specifics>

<deferred>
## Deferred Ideas

- Quantized "Accordion" style compression (future phase).
- Complex multi-axis distortion grids.

</deferred>

---

*Phase: 25-adaptive-intervals-burstiness*
*Context gathered: 2026-02-06*
