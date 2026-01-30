# Feature Landscape: Space-Time Cube Visualization

**Domain:** Interactive spatiotemporal visualization for research prototype  
**Purpose:** Graduation thesis demonstrating adaptive time scaling  
**Researched:** January 30, 2026  
**Confidence:** HIGH (based on ArcGIS Pro documentation, academic papers, and established visualization literature)

---

## Table Stakes

Features users expect from any Space-Time Cube or spatiotemporal visualization tool. Missing = prototype feels incomplete or unusable for its research purpose.

### Core 3D Interaction

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **3D Rotation (orbit)** | Space-Time Cube is inherently 3D; users must view from multiple angles to understand the data | Low | WebGL/Three.js or deck.gl | deck.gl `OrbitController` or Three.js `OrbitControls` provide this out-of-box |
| **Zoom (in/out)** | Users need to examine both overview and detail of data distribution | Low | Camera system | Standard camera controls; include min/max bounds |
| **Pan (2D translation)** | Users need to reposition view to focus on areas of interest | Low | Camera system | Often combined with zoom as navigation pair |
| **Reset View** | Users get lost; need reliable way to return to known state | Low | Store initial camera state | Often overlooked; critical for user studies |

### Temporal Controls

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Time slider** | Fundamental for temporal exploration; users expect slider-based time control | Low | State management | Range input or custom slider component |
| **Current time indicator** | Users need to know what time they're viewing | Low | Time slider | Text display + visual indicator on slider |
| **Play/Pause animation** | Standard for temporal visualization; users expect animated playback | Low | Animation loop, timer | `requestAnimationFrame` or `setInterval` based |
| **Step forward/back** | Fine-grained temporal navigation; complements slider | Low | Time state | Button controls with keyboard shortcuts |

### Data Visualization

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Point/event rendering** | Core visualization of crime incidents in 3D space | Medium | Rendering pipeline | Instanced rendering for performance with many points |
| **Color encoding** | Distinguish data attributes (crime type, severity, etc.) | Low | Color scale, legend | Use perceptually uniform color scales |
| **Legend** | Users need to decode color mappings | Low | Color encoding | Can be simple static legend for prototype |
| **Spatial reference (base map or grid)** | Users need geographic context for spatial understanding | Medium | Base map tiles or grid rendering | Grid simpler for prototype; map adds complexity |

### User Study Infrastructure (Research Prototype Specific)

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Interaction logging** | Core requirement for user study analysis | Medium | Event system, storage | Log: clicks, view changes, slider movements, timestamps |
| **Task completion time measurement** | Standard user study metric | Low | Logging infrastructure | Start/stop timers per task |
| **Task presentation system** | Structured study requires defined tasks | Medium | State machine, UI | Show task instructions, validate completion |
| **Condition switching (A/B)** | Compare uniform vs adaptive time scaling | Medium | State management | Toggle between time mapping algorithms |
| **Participant ID management** | Track individual participants | Low | Session management | UUID or sequential assignment |

---

## Differentiators

Features that set product apart from existing tools. These represent research contribution or competitive advantage.

### Primary Research Contribution

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Adaptive time scaling** | **Core thesis contribution.** Non-linear time mapping where event-dense periods expand and sparse periods compress | High | Time mapping algorithm, clear visual communication | This IS the research; must be clearly implemented and comparable to uniform scaling |
| **Uniform vs Adaptive comparison mode** | Enables direct A/B comparison that is the study's purpose | Medium | Two rendering modes, consistent interface | Users should toggle between modes seamlessly |
| **Time scale visualization** | Show HOW time is being mapped (uniform vs non-uniform) | Medium | Time axis rendering | Axis with variable tick density showing the mapping |

### Enhanced Temporal Understanding

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Focus+context temporal visualization** | Maintain temporal context while focusing on period of interest | High | Non-linear time mapping | Academic literature shows this aids exploration (see Byska 2019) |
| **Event-density indicator** | Show where events cluster temporally; helps users understand adaptive scaling rationale | Medium | Temporal aggregation | Histogram or line chart of events over time |
| **Linked temporal views** | 2D timeline chart linked to 3D cube for coordinated exploration | Medium-High | View coordination, brushing | Linked brushing enables powerful exploration patterns |

### Spatial-Temporal Coordination

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Linked brushing** | Select in one view, highlight in all others; standard for coordinated views | Medium | Shared selection state, event propagation | Foundation for multi-view exploration |
| **Spatial filtering** | Limit visualization to geographic area of interest | Medium | Polygon selection or bounds definition | Reduces cognitive load; focuses analysis |
| **Temporal filtering (time range selection)** | Focus on specific time period | Low | Range slider or brush selection | Simpler than spatial filtering |

### User Study Excellence

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Session replay capability** | Review participant sessions for qualitative analysis | High | Comprehensive logging, replay engine | Shown valuable in reVISit research; may be out of scope |
| **Guided tutorial/training mode** | Ensure participants understand interface before study begins | Medium | Tutorial state machine, scripted interactions | Critical for valid study results |
| **Progress indicator** | Show participants their progress through study tasks | Low | Task tracking | Reduces participant anxiety |
| **Response validation** | Verify answers before accepting and moving to next task | Medium | Task-specific validation logic | Depends on task types |

---

## Anti-Features

Features to explicitly NOT build for a research prototype. Common mistakes in this domain.

### Scope Creep Traps

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full GIS functionality** | ArcGIS Pro already does this; recreating it is months of work with no research value | Use simple grid or minimal base map for spatial context |
| **Multiple variable visualization** | Adds complexity without supporting thesis about time scaling | Focus on single crime dataset with fixed attributes |
| **Statistical analysis tools** | Research contribution is about visualization, not analytics | Pre-compute any needed statistics; display only |
| **Data upload/management** | Prototype uses fixed Chicago crime dataset | Hardcode data loading; no user data management |
| **User accounts/authentication** | Prototype is for controlled lab study, not public deployment | Use session-based participant tracking only |

### Complexity Traps

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time data streaming** | Adds infrastructure complexity; not needed for historical crime data | Load static dataset at startup |
| **Custom map tile serving** | Complex infrastructure for minimal gain | Use simple grid, or if needed, existing tile services |
| **Mobile-responsive design** | Study conducted on controlled desktop environment | Design for single target resolution/device |
| **Accessibility compliance (full WCAG)** | Important for production tools, but adds significant scope to research prototype | Document limitation; ensure study participants don't require accessibility features |
| **Internationalization** | Study conducted in single language | Hardcode English strings |

### Over-Engineering Traps

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Highly configurable visualization parameters** | Adds UI complexity and introduces confounds in study | Pre-set optimal visualization parameters |
| **Undo/redo system** | Useful but significant implementation effort | Log interactions; no undo needed for study tasks |
| **Collaborative viewing** | Multi-user features are out of scope for individual study | Single-user prototype only |
| **Export/save functionality** | Participants don't need to save; logs capture everything | Automatic server-side logging only |
| **Performance optimization for millions of points** | Chicago crime subset won't exceed what basic WebGL handles | Optimize only if performance issues arise |

### Research Validity Traps

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Prettier interface than necessary** | Can bias participants; focus on functional equivalence between conditions | Ensure uniform vs adaptive modes are visually equivalent except for time mapping |
| **Tooltips/hints about which mode is "better"** | Introduces experimenter bias | Neutral labeling of conditions (e.g., "Mode A" vs "Mode B") |
| **Optional features participants might or might not use** | Introduces variability confounds | All features available in both conditions or neither |

---

## Feature Dependencies

```
Core Rendering
    |
    +-- Point rendering --> Color encoding --> Legend
    |
    +-- Camera controls (rotate/zoom/pan) --> Reset view
    |
    +-- Spatial grid/base map

Temporal System
    |
    +-- Time state management
        |
        +-- Time slider --> Current time indicator
        |
        +-- Play/pause --> Step controls
        |
        +-- Time mapping algorithm
            |
            +-- Uniform mapping (baseline)
            |
            +-- Adaptive mapping (experimental) --> Time scale visualization
            |
            +-- Mode switching (A/B comparison)

User Study System
    |
    +-- Participant ID management
        |
        +-- Task presentation --> Progress indicator
            |
            +-- Response validation
        |
        +-- Interaction logging
            |
            +-- Task timing --> Task completion measurement
            |
            +-- View state logging
            |
            +-- (Optional) Session replay

Coordinated Views (if implemented)
    |
    +-- Shared selection state --> Linked brushing
    |
    +-- 2D timeline view --> Event density indicator
        |
        +-- Temporal filtering
```

---

## MVP Recommendation

For MVP (minimum viable prototype for thesis demonstration and user study):

### Phase 1: Core Visualization
1. **3D cube with rotation/zoom/pan** - Table stakes
2. **Point rendering with color encoding** - Table stakes
3. **Time slider with play/pause** - Table stakes
4. **Spatial grid for context** - Table stakes (simpler than base map)

### Phase 2: Research Features
5. **Uniform time mapping** (baseline) - Required for comparison
6. **Adaptive time scaling** - **Core thesis contribution**
7. **Mode switching (A/B)** - Required for study
8. **Time scale visualization** - Shows the mapping difference clearly

### Phase 3: User Study Infrastructure
9. **Interaction logging** - Required for study analysis
10. **Task presentation system** - Required for structured study
11. **Task timing** - Required metric
12. **Participant ID management** - Required for data organization

### Phase 4: Polish for Study
13. **Guided tutorial** - Ensures valid results
14. **Reset view** - Prevents user frustration
15. **Progress indicator** - Reduces participant anxiety

### Defer to Post-MVP (if time permits)

- Linked 2D timeline view (nice differentiator but not essential)
- Spatial filtering (useful but adds complexity)
- Session replay (valuable for analysis but high effort)
- Event density indicator (helpful but secondary)

---

## Competitive Landscape Reference

### ArcGIS Pro Space-Time Cube (ESRI)
- Full-featured GIS integration
- Multiple display themes (hot spots, outliers, values)
- Time and range sliders with playback
- 2D and 3D visualization options
- **What to learn:** Their time slider controls are well-designed
- **How to differentiate:** Adaptive time scaling (they use uniform)

### Academic Space-Time Cube Implementations
- Focus on trajectory visualization
- Interactive slicing and cross-sections
- Time lens for temporal focus+context
- **What to learn:** Cross-section/slicing is useful for dense data
- **How to differentiate:** Web-based, focus on time mapping research

### GeoViz and Multi-View Platforms
- Multiple coordinated views (Knowledge Tree, Net, Map)
- Linked brushing and selection
- **What to learn:** Linked brushing significantly enhances exploration
- **How to differentiate:** Simpler, focused on single visualization technique

---

## Sources

### Primary (HIGH confidence)
- ArcGIS Pro Space-Time Cube Documentation (ESRI, 2025) - https://pro.arcgis.com/en/pro-app/latest/tool-reference/space-time-pattern-mining/visualizing-cube-data.htm
- ArcGIS TimeSlider API Reference (2025) - https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-time-slider
- deck.gl OrbitController Documentation - https://deck.gl/docs/api-reference/core/orbit-controller

### Academic (HIGH confidence)
- Bach et al. "A Descriptive Framework for Temporal Data Visualizations Based on Generalized Space-Time Cubes" (HAL/ENAC, 2016)
- Andrienko et al. "Visualization of Trajectory Attributes in Space-Time Cube" - Time lens technique
- Byska et al. "Analysis of Long MD Simulations Using Interactive Focus+Context" (2019) - Event-driven temporal focus+context

### User Study Tools (MEDIUM-HIGH confidence)
- reVISit: Interactive analysis of visualization study participant data - https://vdl.sci.utah.edu/publications/2021_chi_revisit
- Big Brother: Drop-in website interaction logging - https://ielab.io/publications/scells-2021-bigbro
- CrowdStudy toolkit - Metrics for crowdsourced evaluation

### Linked Views (MEDIUM confidence)
- Bokeh linked behavior documentation - https://docs.bokeh.org/en/latest/docs/user_guide/interaction/linking.html
- d3-brush - https://d3js.org/d3-brush

---

## Summary for Roadmap

**Build order recommendation:**

1. **Foundation first:** 3D rendering with camera controls (table stakes)
2. **Time system second:** Slider, animation, time state (table stakes)
3. **Research feature third:** Adaptive time scaling algorithm + comparison mode (differentiator/thesis core)
4. **Study infrastructure fourth:** Logging, tasks, timing (table stakes for research)
5. **Polish last:** Tutorial, progress, reset (quality of life)

**Key insight:** The adaptive time scaling algorithm IS the research contribution. Ensure adequate time for:
- Algorithm design and implementation
- Clear visualization of how time is mapped differently
- Robust A/B switching between modes
- Sufficient logging to capture the comparison data

**Risk:** Over-investing in coordinated views or advanced interaction before the core research contribution (adaptive time scaling) is solid.
