# Feature Landscape

**Domain:** Adaptive space-time cube / crime visualization
**Researched:** 2026-04-09

## Conceptual Tasks

These tasks define the analytical reasoning the system must support.

| Task | User Goal | Complexity | Notes |
|------|-----------|------------|-------|
| T1 - Obtain an Overview | Perceive broad spatiotemporal patterns, including global trends, high-activity intervals, and spatial clusters | Medium | Best served by a density-oriented overview surface |
| T2 - Trace Trajectories | Follow the temporal evolution of selected incidents/records and aggregated clusters | High | Needs a depth-aware linked 3D view |
| T3 - Compare Temporal Behaviors | Compare timing, duration, or spatial extent across multiple selections | High | Requires synchronized selection and multi-item comparison cues |
| T4 - Detect Events or Anomalies | Identify intersections, pauses, or abrupt changes that deviate from the norm | Medium | Needs clear temporal windows and contrast cues |
| T5 - Summarize Patterns and Trends | Generalize from detailed observations to recurring behaviors or periodic patterns | Medium | Strongly tied to overview and summary encodings |
| T6 - Discriminate Intra-Burst Sequence | Distinguish the temporal order of rapid, concurrent events | High | Needs non-uniform temporal scaling to reveal order |
| T7 - Identify Temporal Dynamics | Classify burst pacing as gradual escalation or instantaneous spike | High | Burst morphology must remain interpretable |
| T8 - Recover Metric Duration | Accurately determine the true duration of a distorted interval | High | Requires explicit metric-duration references |

## Visualization and Interaction Design

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| 2D density projection with opacity modulation | Reveals high-activity clusters while keeping the overview readable | Medium | Supports T1 and T5 |
| 3D Space-Time Cube with time on the vertical axis | Supports trajectory tracing and depth-aware inspection | High | Supports T2 and T3 |
| Synchronized navigation, selection, and brushing/linking | Prevents context loss when moving between views | High | 2D panning/zooming should keep 3D context aligned |
| Timeline slider for active windows | Lets users filter the current temporal scope | Medium | Supports T1, T4, and T5 |
| Non-uniform temporal scaling | Expands dense intervals while preserving metric duration cues | High | Core to T6, T7, and T8 |
| Hue + transparency encoding | Separates categorical structure from confidence | Medium | Hue for category; transparency for low-confidence events |
| Explicit metric-duration reference cues | Prevents warped intervals from being misread | Medium | Needed whenever the time axis is distorted |

## Supporting Analysis Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hotspot / STKDE layer | Adds concentration surfaces beyond raw points | High | Optional but in scope; should be clearly labeled |
| Proposal / guidance system | Helps users discover meaningful intervals faster | High | Must explain why slices were suggested |
| Trust / provenance states | Prevents false confidence in the data source | Medium | Make loading, real, mock, partial, and degraded explicit |
| Large-dataset responsiveness | Keeps the analysis usable under heavy load | High | Workers, memoization, and texture reuse are required |

## Anti-Features

Features to deliberately NOT build in this product phase.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Authentication / accounts | Internal research prototype; adds scope without improving analysis | Keep the app session-local and focused on exploration |
| Real-time multi-user collaboration | Not needed for single-analyst workflows and complicates sync | Prioritize one-user interaction quality |
| Mobile-native support | 3D cube + dense brushing is desktop-first by nature | Optimize for desktop and leave mobile polish for later |
| Full case-management / incident workflow | Turns the product into an operations system, not a visualization tool | Stay focused on exploratory analytics |
| Generic BI dashboard features | Dilutes the domain value and creates redundant UI | Keep only domain-specific summaries and controls |
| Social sharing / public publishing | Adds trust, privacy, and permissions complexity | If needed later, export static snapshots instead |
| Overbuilt annotation system | Often becomes a separate product surface | Prefer lightweight notes or bookmarks only if required |
| Unbounded configuration surface | Too many knobs will make the adaptive model unreadable | Expose only controls that change interpretation |

## Feature Dependencies

```
2D density projection + timeline slider -> overview / summary tasks
3D STC + synchronized navigation -> trace / compare tasks
Non-uniform temporal scaling + duration cues -> burst decoding tasks
Hotspot / STKDE + proposal guidance -> supporting interpretation tasks
Provenance + validation -> trustworthy data states
Large-dataset responsiveness -> all interactive features remain usable
```

## Implementation Order

1. Overview and summary surface
2. Trace and compare loop
3. Detect and decode burst structure
4. Support overlays and trust/performance hardening

## Sources

- `.planning/PROJECT.md` (task vocabulary, support requirements, scope)
- `README.md` (current interaction model)
- `.planning/codebase/ARCHITECTURE.md` (existing adaptive, playback, and hotspot subsystems)
- `.planning/codebase/CONCERNS.md` (mock fallback, performance, validation, and usability risks)
