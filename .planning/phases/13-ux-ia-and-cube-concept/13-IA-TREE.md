# Phase 13 IA Tree

## IA Goal

Organize the demo around the questions users need to answer, not around the implementation objects.

## Primary Navigation

1. **Overview**
2. **Timeline**
3. **Map**
4. **Cube**
5. **Slices**
6. **Explain**

## Screen Tree

### 1. Overview
- dataset summary
- active filters
- data range
- burst summary
- loading / degraded / mock state

### 2. Timeline
- overview strip
- adaptive scale toggle
- uniform vs adaptive compare mode
- brush and zoom
- burst markers
- detail window

### 3. Map
- selected-window map
- hotspot clusters
- district filtering
- linked highlight state

### 4. Cube
- density mode
- relational mode
- comparison mode
- slice overlays
- linked selection highlights
- burst / hotspot relationships

### 5. Slices
- generated candidates
- manual edits
- slice bounds
- overlap warnings
- accept / reject / apply

### 6. Explain
- burst rationale
- confidence and score breakdown
- interpretation notes
- why-this-is-highlighted summary

## Suggested Layout Hierarchy

### Desktop

```
Top Bar
├─ dataset scope
├─ mode toggle
└─ current selection summary

Main Grid
├─ Left / Center: Timeline
├─ Right: Map + Cube stack
└─ Bottom Rail: Slices + Explain
```

### Priority Order

1. Timeline is the primary control surface.
2. Map is the spatial context layer.
3. Cube is the relational interpretation layer.
4. Slices is the authoring/review layer.
5. Explain is the rationale layer.

## User Question Routing

| Question Type | Best Entry Point | Secondary Views |
|---|---|---|
| What is happening? | Overview | Timeline, Explain |
| When is it happening? | Timeline | Cube, Explain |
| Where is it happening? | Map | Cube, Timeline |
| How do bursts behave? | Timeline | Cube, Explain |
| How do things relate? | Cube | Timeline, Map |
| What should I edit? | Slices | Cube, Explain |
| Why is this highlighted? | Explain | Timeline, Cube |

## Layout Rules

1. Do not make the cube the primary entry point.
2. Do not separate slices into a hidden workflow that feels disconnected from analysis.
3. Keep the timeline visible whenever the cube is visible.
4. Keep explanation close to the selection context.
5. Make the overview state clear before detailed interactions begin.

## Performance Rules

1. One dataset should drive all linked views.
2. Use summary data for overview and question discovery.
3. Use viewport data for detail inspection.
4. Keep cube overlays aggregated and optional.
5. Avoid duplicate fetches for the same selection across views.
