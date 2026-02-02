# Phase 8: Coordinated Views - Research

**Researched:** 2026-02-02
**Domain:** Coordinated views synchronization + D3 dual-scale timeline
**Confidence:** MEDIUM

## Summary

This phase should implement coordinated, bidirectional synchronization across Map, Cube, and Timeline, with a dual-scale (overview + detail) timeline built using D3 brush and zoom. The standard pattern is “focus + context”: an overview histogram/time scale with a brush that controls the detail view, and optional zoom on the detail view that updates the brush. Coordination should be driven by a single source of truth in global state (Zustand), with explicit source tagging to prevent feedback loops.

The D3 brush/zoom APIs explicitly support programmatic control, brush selection, and zoom transforms; use these instead of custom pointer logic. D3 time scales (preferably UTC) provide ticks and invertable domains needed to map between time values and pixel ranges.

**Primary recommendation:** Use D3 `brushX` + `zoom` with UTC time scales and a centralized Zustand coordination store, and propagate selections/filters/time across views via store updates with source tagging.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-brush | 3.x | Brush selection for timeline overview | Official D3 brushing behavior with programmatic control and brush events | 
| d3-zoom | 3.x | Zoom/pan in detail timeline | Official D3 zoom behavior with transform + rescale helpers | 
| d3-scale | 4.x | Time/UTC scales for timeline | Official D3 time scales with ticks/invert | 
| d3-array | 3.x | Binning/histograms for overview | Official D3 array utilities for bins | 
| zustand | 5.x | Global coordination state | Project-standard state store for UI + filter sync | 
| @visx/axis | 3.x | Timeline axes | Existing axis primitives in project | 

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lodash.debounce | 4.x | Throttle high-frequency updates | If brushing or hover produces too many store writes | 
| d3-selection | 3.x (implicit) | Attaching behaviors to SVG | Needed when applying brush/zoom to SVG elements | 

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| d3-brush + d3-zoom | Custom pointer/gesture logic | Higher maintenance, missing edge cases for touch + wheel | 
| d3 time scales | Manual date math | Harder to generate ticks/invert reliably | 

**Installation:**
```bash
npm install d3-brush d3-zoom d3-selection
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/timeline/    # Overview + detail timeline components
├── store/                  # Zustand stores for coordination
├── hooks/                  # D3 hook wrappers (brush/zoom)
└── lib/                    # Time utilities, selectors, formatting
```

### Pattern 1: Focus + Context (Overview + Detail) Timeline
**What:** Small overview chart with `brushX` controlling the detail view; optional `zoom` on detail updates brush. 
**When to use:** Dual-scale time exploration with synchronized detail range.
**Example:**
```typescript
// Source: https://d3js.org/d3-brush
const brush = d3.brushX()
  .extent([[0, 0], [width, contextHeight]])
  .on("brush end", brushed);

contextGroup.append("g")
  .attr("class", "brush")
  .call(brush);

function brushed(event: d3.D3BrushEvent<unknown>) {
  if (!event.selection) return;
  const [x0, x1] = event.selection as [number, number];
  const domain = [contextScale.invert(x0), contextScale.invert(x1)];
  // Update detail domain and store
}
```

### Pattern 2: Bidirectional Brush + Zoom Sync
**What:** Zooming in detail updates the brush selection; brushing updates the zoom transform.
**When to use:** User can zoom the detail view directly and still see the selected range in the overview.
**Example:**
```typescript
// Source: https://d3js.org/d3-zoom
const zoom = d3.zoom()
  .scaleExtent([1, 64])
  .translateExtent([[0, 0], [width, detailHeight]])
  .on("zoom", zoomed);

function zoomed(event: d3.D3ZoomEvent<Element, unknown>) {
  const t = event.transform;
  const xDetail = t.rescaleX(contextScale);
  // Update detail scale + axes, then move brush to match
  // contextGroup.select(".brush").call(brush.move, xDetail.range().map(t.invertX, t));
}
```

### Anti-Patterns to Avoid
- **Multiple sources of truth:** Updating time/filter state in each view separately causes desync; use a single store.
- **Unbounded feedback loops:** Brush updates zoom which updates brush; tag source to break cycles.
- **Local time drift:** Using `scaleTime` with local time can shift ticks by time zone; use UTC when possible.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brush selection UI | Custom pointer hit-testing | d3-brush | Handles SVG interaction, touch, and programmatic selection | 
| Zoom transforms | Manual matrix math | d3-zoom transform + `rescaleX` | Correctly maps ranges/domains and interactions | 
| Time axis ticks | Custom tick placement | d3-scale time/utc ticks | Provides sensible temporal tick intervals | 

**Key insight:** D3’s interaction behaviors encode many browser edge cases (wheel, touch, modifier keys), which are hard to replicate reliably.

## Common Pitfalls

### Pitfall 1: Brush/Zoom Feedback Loop
**What goes wrong:** Programmatic brush move triggers zoom handler which triggers brush again.
**Why it happens:** Both handlers respond to each other without origin detection.
**How to avoid:** Tag state updates with a source; check `event.sourceEvent` to ignore programmatic events.
**Warning signs:** Jittery brush/zoom or infinite event loops.

### Pitfall 2: Local Time vs UTC Inconsistency
**What goes wrong:** Tick labels shift by local time zone, causing mismatch with data timestamps.
**Why it happens:** `scaleTime` uses local time by default.
**How to avoid:** Prefer `scaleUtc` (D3 recommends UTC for predictability).
**Warning signs:** Off-by-hours ticks or inconsistent labeling across machines.

### Pitfall 3: Using rangeRound with rescaleX
**What goes wrong:** Rescaled domains become inaccurate after zooming.
**Why it happens:** `rescaleX` expects continuous scales with precise invert; range rounding reduces accuracy.
**How to avoid:** Do not use `rangeRound` on scales that will be rescaled by zoom.
**Warning signs:** Slight drift between brush selection and zoomed domain.

## Code Examples

Verified patterns from official sources:

### Brush Events with Programmatic Move
```typescript
// Source: https://d3js.org/d3-brush
const brush = d3.brushX().on("end", ({ selection }) => {
  if (!selection) return;
  // selection is [x0, x1] for brushX
});

// Move brush programmatically
contextGroup.call(brush.move, [x0, x1]);
```

### Zoom Transform Rescale
```typescript
// Source: https://d3js.org/d3-zoom
function zoomed(event: d3.D3ZoomEvent<Element, unknown>) {
  const xDetail = event.transform.rescaleX(xOverview);
  // xDetail.domain() gives the zoomed time window
}
```

### UTC Time Scale
```typescript
// Source: https://d3js.org/d3-scale/time
const x = d3.scaleUtc([new Date("2000-01-01"), new Date("2000-01-02")], [0, width]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single slider range | Focus + context brush + zoom | D3 v4+ (brush/zoom behaviors) | Better precision for time-range exploration | 

**Deprecated/outdated:**
- Manual pointer gesture handling: D3 brush/zoom behaviors now cover touch + wheel nuances.

## Open Questions

1. **Should the timeline use UTC or local time?**
   - What we know: D3 recommends UTC for predictable intervals.
   - What's unclear: Whether dataset timestamps are already normalized to UTC.
   - Recommendation: Default to `scaleUtc`, confirm with dataset semantics.
2. **Where should the coordination state live?**
   - What we know: Project uses Zustand stores for time and filters.
   - What's unclear: Whether to extend existing stores or add a dedicated coordination store (selection + hover + detail range).
   - Recommendation: Add a `useCoordinationStore` if selections span multiple domains (time + spatial + id).

## Sources

### Primary (HIGH confidence)
- https://d3js.org/d3-brush - brush API, brush events, brush.move
- https://d3js.org/d3-zoom - zoom API, event.transform, rescaleX
- https://d3js.org/d3-scale/time - scaleTime/scaleUtc and UTC recommendation

### Secondary (MEDIUM confidence)
- https://github.com/d3/d3-brush - module overview + releases (version anchoring)

### Tertiary (LOW confidence)
- WebSearch summary for focus+context pattern (not verified by accessible example page)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - versions inferred from D3 docs and existing project deps
- Architecture: HIGH - D3 brush/zoom docs explicitly support focus + context
- Pitfalls: MEDIUM - based on D3 docs and common integration issues

**Research date:** 2026-02-02
**Valid until:** 2026-03-04
