# Phase 25 Context

## Decisions

### Axis Labeling Strategy
**Decision:** Option A - Equidistant Ticks, Non-Linear Time.
**Rationale:**
- **Clutter Prevention:** Keeping ticks physically equidistant (e.g., every 50px) guarantees no label overlap regardless of how compressed time becomes in sparse regions.
- **Readability:** Users can infer the "warp" by observing the changing time delta between ticks (e.g., a 50px gap representing 5 minutes in dense regions vs. 2 hours in sparse regions).
- **Consistency:** Matches the visual grid of the Space-Time Cube, keeping the 2D and 3D views aligned.

### Blending Strategy
**Decision:** Linear Interpolation of Coordinate Systems.
**Mechanism:** `pos = (1 - warp) * linearPos + warp * adaptivePos`
- This allows a smooth, continuous transition from "Reality" (Linear) to "Insight" (Adaptive) without jarring jumps.

### Transition Behavior
**Decision:** Option A - Animated Transition.
**Details:** Slider animates between Linear (0) and Adaptive (1) over ~300ms when triggered (e.g., clicking labels), while retaining manual drag control.
**Rationale:**
- **Object Constancy:** Animation helps users track how individual points move from their absolute time to their relative density position.
- **Cognitive Load:** Instant jumps (Option B) require mental re-mapping. Animation visualizes the transformation function itself.
