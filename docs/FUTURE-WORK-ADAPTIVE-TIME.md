# Future Work: Adaptive Time Scaling & Burst Detection

Open algorithmic enhancements for the adaptive space-time cube timeline. None of these are implemented yet — this is a research/design backlog.

---

## 1. Multi-Resolution Burst Analysis (Wavelet Decomposition)

**Status:** Design only  
**Effort:** High  
**Impact:** High

### Problem
Current burst detection operates at a single fixed resolution. A "prolonged-peak" at weekly granularity is qualitatively different from a "prolonged-peak" at hourly granularity, but the taxonomy treats them identically.

### Proposed Approach
Decompose the crime time series into multiple sub-bands (e.g., hourly, 6-hourly, daily, weekly) using a discrete wavelet transform or equivalent multi-scale smoothing. Detect bursts independently at each scale. Each time point gets a **burst signature vector** `[B_hourly, B_6hourly, B_daily, B_weekly]` instead of a single scalar.

### Key Benefits
- Distinguishes short-term spikes from sustained regime changes
- Warp weights become scale-aware: a weekly peak warps differently than an hourly spike
- Enables "zoom into burst type" interactions (e.g., show only weekly-level bursts)

### Implementation Sketch
- Replace single-pass `computeAdaptiveMaps()` with a multi-pass loop over kernel widths
- Store per-scale burstiness maps alongside the existing combined map
- Extend `BurstBinResult` with a `scaleSignature: number[]` field
- Taxonomy classification runs per-scale, then merges via a priority rule (weekly peak > daily peak > hourly spike)

---

## 2. Change-Point-Guided Warp Boundaries

**Status:** Partially exists (`interval-detection.ts`)  
**Effort:** Medium  
**Impact:** High

### Problem
The warp map is currently a smooth continuous function. This means high-density regions bleed visual space into adjacent low-density regions, and meaningful boundaries (e.g., a sudden onset of crime activity) are not respected.

### Proposed Approach
Use detected change points as **hard warp boundaries** where the warp function is allowed discontinuities. Between consecutive change points, each segment gets its own warp weight proportional to its internal density. The warp map becomes a piecewise-linear CDF with breaks at change points.

### Key Benefits
- Warp respects semantic boundaries in the data
- Prevents "bleeding" of visual space across regime changes
- Produces more interpretable time segments

### Implementation Sketch
- Wire `detectChangePoints()` output into `computeAdaptiveMaps()` as boundary hints
- After computing per-bin warp weights, insert discontinuities at change-point indices
- Each segment's weights are renormalized independently
- Expose a `hardBoundaries: boolean` toggle in `AdaptiveControls`

---

## 3. Contextual Burst Baseline

**Status:** Not started  
**Effort:** Medium  
**Impact:** High

### Problem
Burst detection is currently absolute — a spike relative to the full dataset mean. But crime has strong expected patterns: Saturday nights are always busier than Tuesday mornings. Detecting "burstiness" without accounting for expected variation produces false positives.

### Proposed Approach
Build a **contextual baseline** from historical distributions:
- Compute expected hourly profile (mean + std per hour-of-day)
- Compute expected day-of-week profile
- Compute expected monthly/seasonal profile

A time period is "bursty" only if its activity exceeds what's expected for that context by a configurable number of standard deviations.

### Key Benefits
- Dramatically reduces false-positive burst detections
- Surfaces genuinely anomalous patterns (e.g., a Tuesday morning spike)
- Aligns with how crime analysts actually interpret data

### Implementation Sketch
- Add a `computeContextualBaseline(crimes)` function that produces `expectedRate(hourOfDay, dayOfWeek, month)` lookup
- Modify `classifyBurstWindow()` to accept a baseline and compute z-scores instead of raw thresholds
- Store baseline as a `Float32Array` in `useAdaptiveStore` alongside existing maps
- Baseline can be computed once per dataset load and cached

---

## 4. Kernel Density Estimation (KDE)

**Status:** Not started  
**Effort:** Low-Medium  
**Impact:** Medium

### Problem
Current density is raw bin counts normalized to [0,1]. This creates bin-edge artifacts: a crime that falls on one side of a bin boundary vs. the other changes the density estimate discontinuously.

### Proposed Approach
Replace binning with a Gaussian KDE with adaptive bandwidth (Silverman's rule or Sheather-Jones). This produces a smooth, continuous density function that eliminates edge effects.

### Key Benefits
- Smoother warp map with no bin-edge artifacts
- Bandwidth adapts to local data density automatically
- Drop-in replacement for the binning stage in the worker

### Implementation Sketch
- In `src/workers/adaptiveTime.worker.ts`, replace the bin-counting loop with a KDE evaluation
- Use Silverman's rule: `h = 1.06 * sigma * n^(-1/5)` for initial bandwidth
- Evaluate density at each of the 1024 output points by summing Gaussian kernels
- Bandwidth can be locally adaptive: `h_local = h * (median_distance / local_density)^0.5`

---

## 5. Information-Theoretic Warp Weights

**Status:** Not started  
**Effort:** Low  
**Impact:** Medium

### Problem
Current warp weight is `1 + blendedSignal * 5`, a linear scaling. This doesn't account for how much each bin diverges from a uniform distribution — bins with low but nonzero density still get significant visual space.

### Proposed Approach
Compute warp weights using **KL divergence from uniform** per bin. The divergence measures how much the observed distribution in each bin differs from what you'd expect under uniformity. This naturally handles long tails and gives disproportionate visual weight to genuinely unusual bins.

### Key Benefits
- More principled than linear scaling
- Naturally compresses bins that are close to expected
- Amplifies genuinely anomalous bins

### Implementation Sketch
- For each bin, compute `p = bin_count / total` and `q = 1 / bin_count`
- Weight = `KL(p || q) = p * log(p / q)` (clamped to avoid log(0))
- Normalize weights to sum to 1, then scale to the warp weight range [0.25, 4.0]
- Replace the `1 + blendedSignal * 5` formula in the worker

---

## 6. Animated Warp Transitions

**Status:** Not started  
**Effort:** Low  
**Impact:** Medium (UX)

### Problem
Dragging the warp factor slider causes the timeline to jump between states. There's no visual continuity between linear and warped views.

### Proposed Approach
Animate the D3 scale domain changes using `d3.interpolate` or CSS transitions. When `warpFactor` changes, interpolate between the current and target domain values over ~200ms.

### Key Benefits
- Makes warping feel fluid and intentional
- Helps users understand what's changing (the "breathing" effect)
- Low implementation cost

### Implementation Sketch
- In `useScaleTransforms.ts`, store the previous scale domain in a ref
- On warpFactor change, use `requestAnimationFrame` to lerp from old to new domain
- Apply easing (e.g., `d3.easeCubicInOut`) for natural motion
- Debounce to avoid jank during rapid slider movement

---

## 7. Burst Confidence Annotations

**Status:** Not started  
**Effort:** Low  
**Impact:** Low-Medium

### Problem
Burst classifications are presented as binary (is/isn't a burst) with metadata buried in tooltips. Users can't visually assess how confident the classification is.

### Proposed Approach
Map `burstConfidence` (0-100) to a visual channel on the burst regions in the timeline:
- **Opacity**: high confidence = solid, low confidence = ghostly
- **Stroke width**: high confidence = thick border, low confidence = thin/dashed
- **Color saturation**: high confidence = vivid, low confidence = muted

### Key Benefits
- Users can immediately gauge reliability of each burst detection
- Prevents over-trust in low-confidence classifications
- Minimal code change

### Implementation Sketch
- In `DualTimeline.tsx`, read `burstConfidence` from each burst slice
- Map to opacity: `opacity = 0.3 + (burstConfidence / 100) * 0.7`
- Apply via inline style or Tailwind class on the burst overlay `<rect>` elements

---

## 8. Seasonal Residual Warping

**Status:** Not started  
**Effort:** Medium-High  
**Impact:** Medium

### Problem
Predictable seasonal patterns (e.g., more crime in summer, weekly cycles) inflate the density signal and cause the warp to expand predictable periods rather than anomalous ones.

### Proposed Approach
Decompose the time series using STL (Seasonal-Trend decomposition using Loess) into:
- **Trend**: long-term direction
- **Seasonal**: repeating periodic pattern
- **Residual**: what's left after removing trend + seasonal

Warp based on the **residual** component only. This strips out predictable patterns and warps only on genuinely anomalous deviations.

### Key Benefits
- Warp targets anomalies, not expected variation
- Produces cleaner, more interpretable warped timelines
- Aligns with statistical best practices for time series analysis

### Implementation Sketch
- Implement or adapt a lightweight STL decomposition in `src/lib/`
- Run decomposition on the binned count series (not raw timestamps)
- Extract residual series and feed it into the warp weight computation
- Expose a `warpMode: 'density' | 'residual'` toggle in controls

---

## Priority Matrix

| # | Enhancement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 2 | Change-point warp boundaries | High | Medium | **P0** — biggest qualitative improvement |
| 3 | Contextual burst baseline | High | Medium | **P0** — reduces false positives |
| 4 | KDE density estimation | Medium | Low-Med | **P1** — drop-in quality improvement |
| 1 | Multi-resolution analysis | High | High | **P1** — deeper analysis, more work |
| 5 | Information-theoretic weights | Medium | Low | **P1** — easy win |
| 6 | Animated warp transitions | Medium | Low | **P2** — polish |
| 7 | Burst confidence annotations | Low-Med | Low | **P2** — polish |
| 8 | Seasonal residual warping | Medium | Med-High | **P2** — deeper stats, more complexity |

## Dependencies

```
#2 (change-point boundaries) depends on interval-detection.ts — already exists
#3 (contextual baseline) is independent
#4 (KDE) is independent
#1 (multi-resolution) benefits from #4 (KDE as base)
#5 (info-theoretic weights) is independent
#6, #7, #8 are all independent
```

## Related Code

| Current File | Relevant Enhancement |
|---|---|
| `src/workers/adaptiveTime.worker.ts` | #1, #4, #5, #8 |
| `src/lib/interval-detection.ts` | #2 |
| `src/lib/binning/burst-taxonomy.ts` | #1, #3 |
| `src/lib/burst-detection.ts` | #1, #3 |
| `src/store/useAdaptiveStore.ts` | #1, #3, #4 |
| `src/components/timeline/hooks/useScaleTransforms.ts` | #2, #6 |
| `src/components/timeline/DualTimeline.tsx` | #7 |
| `src/components/timeline/AdaptiveControls.tsx` | #2, #3, #4, #8 |
