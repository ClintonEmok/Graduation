# Feature Landscape

**Domain:** Adaptive space-time cube / crime visualization
**Researched:** 2026-04-09

## Table Stakes

Features users expect. Missing these makes the product feel incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Synchronized 3D cube + 2D map + timeline | Core mental model for spatiotemporal analysis | High | Must stay linked on brush/selection; already validated in prototype |
| Timeline brushing + point inspection | Baseline exploration workflow | Medium | Selection must work from any panel |
| Time resolution control | Users need to move from coarse to fine temporal analysis | Medium | Resolution change should update detail window consistently |
| Playback / step controls | Common way to scan event sequences | Medium | Needs to respect selected resolution and not stutter on large datasets |
| Basic filters (date, crime type, geography) | Analysts expect to narrow the dataset quickly | Medium | Filter UI must validate inputs and preserve cross-view sync |
| Clear loading / empty / error states | Silent failure destroys trust | Medium | Especially important because mock-data fallback already exists |
| Mock-data / real-data provenance indicator | Users must know what they are looking at | Low | Treat as a visible banner/badge, not a console message |
| Tooltip or detail pane for selected point | Needed to inspect the underlying record | Low | Should show time, location, category, and any derived metrics |
| Legend and scale cues | Users need to interpret colors, bursts, and density | Low | Include burst highlighting meaning and resolution context |
| Large-dataset responsiveness | Analytic tools are unusable if interaction freezes | High | Web Workers, progressive loading, and memoization are non-negotiable |

## Differentiators

Features that provide competitive advantage and make this more than a generic geospatial dashboard.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Adaptive time warping | Reveals bursty periods by expanding dense intervals and compressing sparse ones | High | Core differentiator; should be explainable and reversible |
| Burst highlighting across cube + map | Makes temporal anomalies visible in both spatial and 3D views | Medium | Percentile cutoff and metric choice add analyst control |
| Dual timeline (overview + detail) | Supports fast navigation while preserving precision | High | Strong differentiator if sync is stable and intuitive |
| User-tunable warp controls | Lets analysts choose strength, metric, and threshold | Medium | Useful for research-grade exploration; can overwhelm novices if poorly labeled |
| Multi-resolution temporal analysis | Enables analysis from seconds to years in one interface | High | Strongly tied to adaptive windowing and playback |
| Hotspot / STKDE layer | Adds spatial-statistical context beyond raw points | High | Valuable for crime analysis; should be optional and clearly labeled |
| Proposal/suggestion system for time slicing | Helps users discover meaningful intervals faster | High | Good differentiator if suggestions are transparent and editable |
| Confidence / rationale metadata | Explains why a burst or interval was suggested | Medium | Important for trust in adaptive features |

## Anti-Features

Features to deliberately NOT build in this product phase.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Authentication / accounts | Internal research prototype; adds scope without improving analysis | Keep the app session-local and focused on exploration |
| Real-time multi-user collaboration | Not needed for single-analyst workflows and complicates sync | Prioritize one-user interaction quality |
| Mobile-native support | 3D cube + dense brushing is desktop-first by nature | Optimize for desktop and leave mobile responsive polish for later |
| Full case-management / incident workflow | Turns the product into a police ops system, not a visualization tool | Stay focused on exploratory analytics |
| Generic BI dashboard features | Dilutes the domain value and creates redundant UI | Keep only domain-specific summaries and controls |
| Social sharing / public publishing | Adds trust, privacy, and permissions complexity | If needed later, export static snapshots instead |
| Overbuilt annotation system | Often becomes a separate product surface | Prefer lightweight notes or bookmarks only if required |
| Unbounded configuration surface | Too many knobs will make the adaptive model unreadable | Expose only controls that change interpretation |

## Feature Dependencies

```
Data loading + validation → provenance indicator → trustworthy filters/selection
Synchronized state model → brushing/selection → playback/step controls
Time resolution control → adaptive time warping → burst highlighting
Adaptive warping → dual timeline detail window → multi-resolution analysis
Large-dataset responsiveness → all interactive features remain usable
Hotspot / STKDE layer → confidence/rationale metadata
```

## MVP Recommendation

For MVP, prioritize:
1. Synchronized 3D cube, 2D map, and timeline
2. Time resolution control + playback/step controls
3. Visible loading/error/mock-data states
4. Adaptive time warping with burst highlighting

Defer to post-MVP:
- Hotspot / STKDE layer: valuable, but not required to prove the core interaction model
- Proposal/suggestion system: only after the main adaptive flow is stable
- Social/export features: useful later, but not central to analysis quality

## Sources

- `.planning/PROJECT.md` (validated requirements, active concerns, scope)
- `README.md` (current interaction model)
- `.planning/codebase/ARCHITECTURE.md` (existing adaptive, playback, and hotspot subsystems)
- `.planning/codebase/CONCERNS.md` (mock fallback, performance, validation, and usability risks)
