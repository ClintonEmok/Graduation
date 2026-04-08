# Conceptual Sampling Designs

**Purpose:** Document the conceptual foundations of sampling and binning strategies in the system.

**Last updated:** 2026-03-31

---

## Overview

This document explains the conceptual sampling designs that underpin the binning engine and adaptive visualization. Sampling determines how continuous time is discretized into bins, fundamentally affecting pattern detection and visual representation.

---

## Sampling Paradigms

### Paradigm 1: Uniform-Time Sampling

**Concept:** Divide time into equal-sized intervals.

**Analogy:** Like a ruler with equal markings.

**Mathematical Definition:**
```
bin_width = (t_max - t_min) / n_bins
bin_i = [t_min + i × bin_width, t_min + (i+1) × bin_width)
```

**Properties:**
| Property | Value |
|----------|-------|
| Bin width | Constant |
| Events per bin | Variable |
| Time coverage | Complete, equal |
| Good for | Temporal comparison, calendar analysis |

**Example:**
```
Time range: 24 hours
Bins: 24
Bin width: 1 hour each

Result:
  Hour 0: 50 events
  Hour 1: 120 events
  Hour 2: 30 events
  ...
```

**Visualization Impact:**
- Each bin has equal visual space
- Event density drives height/color
- Bursts appear as tall bars

**Implementation:** `src/lib/binning/engine.ts:259-288`

---

### Paradigm 2: Uniform-Events Sampling

**Concept:** Each bin contains equal number of events.

**Analogy:** Like dividing students into equal-sized groups.

**Mathematical Definition:**
```
events_per_bin = total_events / n_bins
bin_boundary[i] = timestamp[floor(i × events_per_bin)]
```

**Properties:**
| Property | Value |
|----------|-------|
| Bin width | Variable |
| Events per bin | Constant |
| Time coverage | Complete, unequal |
| Good for | Burst detection, rate comparison |

**Example:**
```
Events: 1000
Bins: 10
Events per bin: 100

Result:
  Bin 0: 100 events in 30 min (dense) → high rate
  Bin 1: 100 events in 2 hours (sparse) → low rate
  Bin 2: 100 events in 5 min (burst!) → very high rate
  ...
```

**Visualization Impact:**
- Dense regions get narrow bins (high rate)
- Sparse regions get wide bins (low rate)
- Bursts appear as narrow, intense regions

**Implementation:** `src/lib/binning/engine.ts:290-333`

---

### Paradigm 3: Adaptive Sampling

**Concept:** Bin boundaries adapt to data characteristics.

**Analogy:** Like a camera auto-exposure adjusting to light.

**Mathematical Definition:**
```
For each boundary decision:
  If gap > threshold: create boundary
  Else: extend current bin
```

**Properties:**
| Property | Value |
|----------|-------|
| Bin width | Variable |
| Events per bin | Variable |
| Time coverage | Complete, adaptive |
| Good for | Pattern discovery, burst isolation |

**Example:**
```
Events: [t=0, t=1, t=2, t=3, t=4, t=1000, t=1005]
Gap threshold: 10 units

Result:
  Bin 0: [0, 4] - 5 events in 4 units (burst)
  Bin 1: [4, 1000] - 0 events (sparse gap)
  Bin 2: [1000, 1005] - 2 events in 5 units
```

**Visualization Impact:**
- Natural cluster isolation
- Gaps between clusters are separate bins
- Bursts are single bins

**Implementation:** `src/lib/binning/engine.ts:225-257`

---

## Sampling Strategy Catalog

### Fixed-Interval Strategies

#### Hourly

**Concept:** 1-hour fixed bins.

**Use Case:** Hourly crime pattern analysis.

**Configuration:**
```typescript
{ strategy: 'hourly', binWidth: 3600000 } // 1 hour in ms
```

---

#### Daily

**Concept:** 24-hour fixed bins.

**Use Case:** Daily crime pattern analysis.

**Configuration:**
```typescript
{ strategy: 'daily', binWidth: 86400000 } // 24 hours in ms
```

---

#### Weekly

**Concept:** 7-day fixed bins.

**Use Case:** Weekly crime pattern analysis.

**Configuration:**
```typescript
{ strategy: 'weekly', binWidth: 604800000 } // 7 days in ms
```

---

#### Quarter-Hourly

**Concept:** 15-minute fixed bins.

**Use Case:** Fine-grained temporal analysis.

**Configuration:**
```typescript
{ strategy: 'quarter-hourly', binWidth: 900000 } // 15 min in ms
```

---

### Pattern-Aware Strategies

#### Daytime-Heavy

**Concept:** Finer bins during daytime (6am-6pm).

**Sampling Design:**
```
Daytime (6am-6pm):  3-hour bins
Nighttime (6pm-6am): 4-hour bins
```

**Rationale:** Crime patterns differ by time of day; daytime typically shows more variation.

**Use Case:** Business hours crime analysis.

---

#### Nighttime-Heavy

**Concept:** Finer bins during nighttime (6pm-6am).

**Sampling Design:**
```
Nighttime (6pm-6am): 4-hour bins
Daytime (6am-6pm):   3-hour bins
```

**Rationale:** Night crime may have different patterns; street crimes cluster at night.

**Use Case:** Nightlife area analysis.

---

#### Weekday-Weekend

**Concept:** Separate weekday vs weekend patterns.

**Sampling Design:**
```
Weekday bins: Analyzed separately
Weekend bins: Analyzed separately
```

**Rationale:** Crime patterns differ between weekdays and weekends.

**Use Case:** Weekly rhythm analysis.

---

### Data-Driven Strategies

#### Uniform-Distribution

**Concept:** Equal events per bin (Paradigm 2).

**Use Case:** Balanced analysis, rate comparison.

**Configuration:**
```typescript
{ 
  strategy: 'uniform-distribution',
  constraints: { maxBins: 40, minEvents: 5 }
}
```

---

#### Burstiness-Based

**Concept:** Split on inter-arrival gaps (Paradigm 3).

**Use Case:** Burst detection, cluster isolation.

**Configuration:**
```typescript
{ 
  strategy: 'burstiness',
  constraints: { minGap: 3600000 } // 1 hour minimum gap
}
```

---

#### Auto-Adaptive

**Concept:** System chooses best strategy based on data characteristics.

**Decision Logic:**
```
If coefficient of variation (CV) > 2:
  Use burstiness-based
Else if n_events > 1000:
  Use uniform-distribution
Else:
  Use uniform-time
```

**Use Case:** Default strategy for general analysis.

---

### Category-Specific Strategies

#### Crime-Type-Specific

**Concept:** Bins maintain crime type proportions.

**Sampling Design:**
```
For each bin:
  Ensure crime type composition reflects overall composition
  Or: Separate bins per crime type
```

**Use Case:** Type-specific temporal analysis.

---

## Sampling and Visualization

### Impact on Space-Time Cube

| Sampling | Cube Appearance | Best For |
|----------|-----------------|----------|
| Uniform-time | Equal vertical spacing | Time-based navigation |
| Uniform-events | Dense regions compressed | Burst identification |
| Adaptive | Natural cluster boundaries | Pattern discovery |

### Warp Interaction

**Uniform-Time Sampling:**
- Warp expands dense bins
- Base is uniform
- Warp reveals hidden density

**Uniform-Events Sampling:**
- Already somewhat expanded (dense = narrow)
- Warp provides additional emphasis
- Double-adaptive effect

**Adaptive Sampling:**
- Bins already match clusters
- Warp less necessary
- Good for pre-analyzed data

---

## Sampling Trade-offs

### Resolution vs Noise

**Fine sampling (many bins):**
- Pro: High temporal resolution
- Con: Noisy, sparse bins

**Coarse sampling (few bins):**
- Pro: Stable estimates
- Con: Miss short patterns

**Guideline:**
```
Recommended bins: sqrt(n_events) to n_events/20
Example: 1.2M events → 1000-60000 bins
Our default: 40 bins (conservative)
```

---

### Uniformity vs Adaptability

**Uniform sampling:**
- Pro: Comparable across time
- Con: May miss clusters

**Adaptive sampling:**
- Pro: Matches data structure
- Con: Harder to compare bins

**Guideline:**
- Use uniform for trend analysis
- Use adaptive for burst detection
- Use auto-adaptive for exploration

---

## Sampling in Binning Engine

### Strategy Selection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Binning Strategy Selection                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Input:                                                  │
│  - Strategy: 'auto-adaptive' (default)                       │
│  - Constraints: { maxBins: 40, minEvents: 5 }               │
│                                                               │
│  Decision Tree:                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Is strategy 'auto-adaptive'?                             │ │
│  │   Yes → Calculate CV                                     │ │
│  │     CV > 2? → Use burstiness                             │ │
│  │     n > 1000? → Use uniform-distribution                 │ │
│  │     else → Use uniform-time                              │ │
│  │   No → Use specified strategy                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Generation:                                                  │
│  - Compute bin boundaries                                     │
│  - Count events per bin                                       │
│  - Aggregate metadata (types, districts)                      │
│  - Validate constraints                                       │
│                                                               │
│  Output:                                                      │
│  - bins: TimeBin[]                                            │
│  - metadata: BinningMetadata                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Statistical Considerations

### Bin Count Selection

**Sturges' Rule:**
```
k = 1 + log₂(n)
```
For n=1.2M: k = 1 + 20.5 ≈ 22 bins

**Square Root Rule:**
```
k = √n
```
For n=1.2M: k ≈ 1095 bins

**Freedman-Diaconis Rule:**
```
bin_width = 2 × IQR / n^(1/3)
k = (max - min) / bin_width
```

**Our Default:**
- Conservative: 40 bins
- Configurable: user can adjust
- Constraint-driven: maxBins limits

---

### Edge Effects

**Problem:** Events near bin boundaries are ambiguous.

**Solutions:**
1. **Hard boundaries:** Each event in exactly one bin
2. **Soft boundaries:** Events near edges split across bins
3. **Kernel smoothing:** Smooth contribution across bins

**Implementation:** Hard boundaries + kernel smoothing for density

---

## Sampling Validation

### Constraint Checking

**File:** `src/lib/binning/rules.ts:85-114`

```typescript
validateConstraints(bins, constraints) {
  violations = []
  
  // Check max bins
  if bins.length > constraints.maxBins:
    violations.push("Too many bins")
  
  // Check min events
  for bin in bins:
    if bin.count < constraints.minEvents:
      violations.push("Bin has too few events")
  
  // Check contiguity
  if constraints.contiguous:
    for i in 1..bins.length:
      if bins[i].startTime > bins[i-1].endTime:
        violations.push("Gap between bins")
  
  return { valid: violations.length === 0, violations }
}
```

---

## Sampling Examples

### Example 1: Daily Pattern Analysis

**Goal:** Understand hourly crime patterns.

**Sampling:**
```typescript
{ strategy: 'hourly', constraints: { maxBins: 24 } }
```

**Result:**
- 24 bins, one per hour
- Compare counts across hours
- Identify peak hours

---

### Example 2: Burst Detection

**Goal:** Find crime bursts in a week.

**Sampling:**
```typescript
{ strategy: 'burstiness', constraints: { minGap: 3600000 } }
```

**Result:**
- Bins split on 1+ hour gaps
- Clusters are single bins
- Easy to identify burst periods

---

### Example 3: Balanced Comparison

**Goal:** Compare crime rates across equal-sized samples.

**Sampling:**
```typescript
{ strategy: 'uniform-distribution', constraints: { maxBins: 40 } }
```

**Result:**
- 40 bins, each with ~30,000 events
- Rates are comparable
- Statistical tests applicable

---

## Key Design Decisions

### S1: Why 40 bins default?

**Decision:** Default maxBins = 40.

**Rationale:**
- Balance resolution vs stability
- 40 bins × ~30K events = stable estimates
- Not too many for visualization
- Configurable for specific needs

---

### S2: Why hard boundaries?

**Decision:** Each event belongs to exactly one bin.

**Rationale:**
- Simpler implementation
- Clear bin assignment
- No double-counting
- Kernel smoothing handles density smoothness

---

### S3: Why CV > 2 for burstiness detection?

**Decision:** CV threshold = 2 for auto-adaptive strategy.

**Rationale:**
- CV = 1: Poisson process (random)
- CV > 1: Over-dispersed (clustering)
- CV > 2: Significant clustering (bursty)
- Empirically good threshold for crime data

---

## Future Enhancements

1. **Multi-scale sampling:** Compute at multiple resolutions simultaneously
2. **Optimal bin count:** Use Freedman-Diaconis or similar
3. **Adaptive constraints:** Auto-tune based on data size
4. **Weighted sampling:** Importance-weighted bin assignment

---

## References

- Freedman, D. & Diaconis, P. (1981). *On the histogram as a density estimator*
- Sturges, H.A. (1926). *The choice of a class interval*
- Wand, M.P. (1997). *Data-based choice of histogram bin width*
