# Temporal Scaling: Continuous versus Interval-Based Allocation

## 1. Terminology Distinction

Two related but technically distinct approaches exist for adapting a time axis to event distributions:

**Continuous temporal scaling** — A mapping function `f: [t₀, t₁] → [0, w]` where the derivative `df/dt` varies smoothly (i.e., the instantaneous stretch factor changes continuously along the axis). The scale is a single function, not a concatenation of segments. In practice this would be derived from a kernel density estimate or a parametric warp field.

**Interval-based visual space allocation** — The axis is partitioned into `N` discrete intervals (bins). Each bin receives a visual-space budget proportional to its weight (derived from event activity within that interval). The scale is piecewise-defined: constant stretch within each interval, discontinuous derivatives at interval boundaries.

Both approaches preserve chronological order and map time to a 1D visual space. The distinction lies in how the mapping function is constructed and what continuity properties it has.

---

## 2. This Implementation

The prototype implements **interval-based visual space allocation** with `N = 1024` bins, using a three-stage pipeline:

### Stage 1: Counting (discrete)

The temporal domain `[t₀, t₁]` is divided into `N` equal-width bins. Each event's timestamp is mapped to its containing bin, producing a count array `c₀, …, c_{N-1}`.

### Stage 2: Weighting (per-interval)

Each bin is assigned a weight driven by its **Goh--Barabási burstiness coefficient** rather than by its raw count:

```
wᵢ = 1 + Bᵢ · M
```

where `Bᵢ ∈ [0, 1]` is the per-bin burstiness score (inter-event gap irregularity within the bin, normalised from the raw coefficient `(σ − μ) / (σ + μ)` to `[0, 1]`), and `M` is a multiplier that controls the maximum expansion. The default `M = 5` gives a minimum weight of 1 (empty or non-bursty bin) and a maximum of 6 (strongly bursty bin). Weight is a discrete, piecewise-constant function over the bins.

The scaling is burstiness-driven: a bin with a moderate event count that is concentrated into a short spike receives a larger weight than a bin with a higher count that is uniformly spread out. Density is intentionally not part of the weight; it is used separately for the density strip and the count summary, but it does not feed the visual-space allocation.

### Stage 3: Visual space distribution (cumulative)

Total visual space `W` is distributed proportionally to each bin's weight:

```
Visual height of bin i = (wᵢ / Σⱼ wⱼ) · W
```

A warp map `m₀, …, m_{N-1}` stores cumulative visual positions. To map a specific time `t` to a position, the containing bin is found and linear interpolation is applied between `mᵢ` and `m_{i+1}`.

**Key property**: The resulting mapping is **piecewise linear** — continuous (C⁰) but with piecewise-constant first derivative. The derivative (stretch factor) changes only at bin boundaries and is uniform within each bin.

### Supporting code

| File | Role |
|---|---|
| `src/workers/adaptiveTime.worker.ts` | Count, weight, and warp map computation (lines 62–238) |
| `src/lib/adaptive-scale.ts` | Client-side scale config building (lines 21–89) |
| `src/components/timeline/hooks/useScaleTransforms.ts` | Scale application: `sampleWarpSeconds` (lines 19–35) performs linear interpolation, `applyAdaptiveWarping` (lines 71–119) constructs a custom `d3-scale`-compatible scale |
| `src/store/useAdaptiveStore.ts` | Orchestrates worker lifecycle, manages warp state |

---

## 3. Why Interval-Based Rather Than Continuous

The choice is deliberate, driven by three constraints:

1. **Computational tractability** — Aggregating events into bins before computing weights is `O(n + N)` rather than `O(n log n)` for kernel-based methods. For datasets of 8.5 million crime records, this matters.

2. **Tunable granularity** — `N` (the bin count) controls the trade-off between smoothness and statistical stability. Fewer bins average out noise; more bins approach continuity. `N = 1024` was chosen empirically so that the piecewise nature is imperceptible at typical timeline widths (800–1400 px).

3. **Interpretability** — Each bin corresponds to a contiguous time interval with a well-defined count and weight. This maps cleanly onto the slice- and interval-based UI paradigm (burst windows, draft bins, applied slices), where analysts work with time intervals rather than abstract warp coefficients.

---

## 4. Relationship to the Thesis Narrative

The thesis describes "dynamically allocating visual space along the time axis" and "periods of concentrated activity receiving a larger proportion of the axis." This is **exactly** what the implementation does. The term "temporal scaling" remains accurate for describing the visual outcome.

However, implementing this via discrete interval allocation rather than a continuous mapping function is a meaningful design choice worth documenting. The piecewise-linear approach exists on a spectrum of temporal distortion techniques — it sits somewhere between simple bin-width modulation (histogram-style) and fully continuous kernel-driven warping. For this thesis, the interval-based approach offers the right balance of performance, transparency, and analytical utility.

## 5. Implications for Terminology

| Term | Accuracy | Notes |
|---|---|---|
| Temporal scaling | ✓ Good high-level term | Accurately describes what the user sees: the axis is scaled |
| Burst-aware temporal scaling | ✓ Precise for this work | Captures the driving metric behind the scaling |
| Interval-based allocation | ✓ Technically precise | Describes the mechanism, not the visual effect |
| Continuous temporal scaling | ✗ Misleading for this implementation | Implies smooth derivatives the system does not have |
| Piecewise-linear temporal scaling | ✓ Most precise for the implementation | Matches the mathematical form of the mapping |
