# Phase 26: Timeline Density Visualization - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Create clear density visualization on the timeline using existing KDE density data from Phase 25. This is a visual-only phase — no interactions yet (that comes in Phase 27). Must work on a standalone test route with self-contained components.

**Deliverables:**
- Area chart showing event frequency/density
- Heat strip for compact density representation
- Works for both overview and detail timeline views
- Updates when filters change

</domain>

<decisions>
## Implementation Decisions

### Visual representation style
- **Dual representations:** Area chart for detail view, heat strip for overview
- **Area chart:** Gradient fill with subtle outline for better definition
- **Heat strip:** Compact horizontal strip for space-efficient density display

### Timeline view integration
- **Position:** Above the timeline as a separate track
- **Sync:** Full synchronization with both overview and detail timeline views

### Update behavior
- **Filter changes:** Debounced updates (300-500ms) to smooth out rapid filter adjustments

### Claude's Discretion
The following decisions are left to downstream agents to research and determine:
- **Charting library:** Research Visx alternatives (Recharts, Victory, etc.) for area chart capabilities
- **Density encoding:** Best approach for encoding density (height, color, or combination)
- **Color scheme:** Optimal colors for heat strip (sequential blue-red vs monochromatic)
- **Threshold indicator:** Whether to show reference line for average/median density
- **Zero/null handling:** Visual treatment for regions with no data
- **Vertical space:** Optimal height for area chart (60-80px vs resizable vs proportional)
- **Y-axis/scale indicator:** Whether to show axis labels or keep it visual-only
- **Loading state:** Best approach during density recalculation
- **Scale behavior:** Dynamic scaling to visible range vs fixed global scale

</decisions>

<specifics>
## Specific Ideas

### Test Route Requirement
- Create a new test route `/timeline-test` or similar
- Self-contained components on dedicated page
- Isolate from existing timeline while developing

### Area Chart Vision
- Visual guide for where temporal scaling is most needed
- Show event frequency as foundation for "Context-Aware Adaptive Scaling"

### Research Context
- Literature review: Daniel Archambault's research on non-uniform timeslicing
- Academic grounding for manual → semi-automated → fully automated progression

### Three-Tier Documentation
System should be documented as three tiers:
1. **Fully Manual:** User-defined scaling (this phase)
2. **Semi-Automated:** System-suggested with user overrides (v1.2)
3. **Fully-Automated:** Algorithmically driven, context-aware (v1.3)

### Phase 25 Integration
- Leverage existing KDE density data from adaptive store
- Build on established Zustand patterns
- Phase 25 heatmap used Blue=Low/Compressed, Red=High/Expanded — consider consistency

</specifics>

<deferred>
## Deferred Ideas

**Phase 27 (Manual Slice Creation):**
- Click-to-create time slices
- Drag-to-create with custom duration
- Visual preview during creation

**Phase 28+ (Future):**
- Slice boundary adjustment with draggable handles
- Multi-slice management
- Slice metadata (naming, coloring, annotations)
- 2D/3D visualization of slices (cross-view sync in v1.2+)

**Out of scope for v1.1:**
- AI-assisted slice suggestions (v1.2)
- Automatic optimal slice generation (v1.3)

</deferred>

---

*Phase: 26-timeline-density-visualization*
*Context gathered: 2026-02-17*
