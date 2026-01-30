# Domain Pitfalls: Interactive 3D Visualization with Large Spatiotemporal Datasets

**Domain:** Space-Time Cube visualization, React Three Fiber, millions of crime records
**Researched:** January 30, 2026
**Confidence:** HIGH (verified via official docs, academic literature, community forums)

---

## Critical Pitfalls

Mistakes that cause rewrites, major performance failures, or unusable products.

---

### Pitfall 1: Rendering Individual Meshes Instead of Instancing

**What goes wrong:** Creating separate `<mesh>` components for each data point. With millions of crime records, this creates millions of draw calls, causing browser freezing and single-digit framerates.

**Why it happens:** React's component model encourages treating each data point as a component. Developers unfamiliar with WebGL don't realize that each mesh = one draw call, and GPUs choke on >1000 draw calls.

**Consequences:** 
- Browser freezes after loading ~10,000 points
- Application unusable for anything beyond toy datasets
- Complete architectural rewrite required

**Warning signs:**
- Performance degrades linearly as data increases
- GPU utilization stays low while CPU spikes
- Three.js renderer info shows draw calls matching point count

**Prevention:** 
Use `InstancedMesh` from the start for all repeated geometries. R3F provides `<instancedMesh>` and libraries like `@react-three/drei` offer `<Instances>`. Plan for instancing in your architecture from Phase 1.

```typescript
// BAD: One mesh per point
{points.map(p => <mesh position={p.pos} />)}

// GOOD: Instanced rendering
<instancedMesh args={[geometry, material, count]}>
  {/* Update instance matrices in useFrame */}
</instancedMesh>
```

**Phase to address:** Phase 1 (Foundation) - Must be baked into initial architecture

**Sources:** 
- React Three Fiber docs on performance pitfalls
- Three.js forum discussions on 20,000+ object scenes
- Codrops tutorial on efficient Three.js scenes (2025)

---

### Pitfall 2: WebGL Memory Leaks from Undisposed Resources

**What goes wrong:** Geometries, materials, textures, and render targets created but never disposed. WebGL resources aren't garbage collected by JavaScript—they persist in GPU memory until explicitly freed.

**Why it happens:** 
- Three.js abstracts WebGL, hiding that resources need manual cleanup
- React's declarative model assumes garbage collection handles everything
- Dynamic filtering/selection creates new geometries without disposing old ones

**Consequences:**
- GPU memory grows with each interaction
- After 5-10 filter changes, application becomes sluggish
- Eventually crashes or forces browser restart
- Particularly devastating on user study machines over extended sessions

**Warning signs:**
- Browser memory increases with each data update
- "WebGL context lost" errors after extended use
- Performance degrades over time within single session
- `renderer.info.memory` shows growing geometry/texture counts

**Prevention:**
1. Implement disposal protocol for all Three.js resources
2. Use `useEffect` cleanup functions to dispose on unmount
3. Track resources with `renderer.info.memory` in development
4. For user studies: implement session memory monitoring

```typescript
useEffect(() => {
  const geometry = new BoxGeometry();
  const material = new MeshBasicMaterial();
  
  return () => {
    geometry.dispose();
    material.dispose();
    // Also dispose textures if any
  };
}, []);
```

**Phase to address:** Phase 1 (Foundation) - Establish disposal patterns early; Phase 4 (Optimization) - Add monitoring

**Sources:**
- Three.js docs "How to dispose of objects"
- Medium article "Why Your Three.js App is Secretly Eating GPU Memory" (2025)
- GitHub issues mrdoob/three.js#28355

---

### Pitfall 3: React State Triggering Full Re-renders on Every Interaction

**What goes wrong:** Storing visualization state (camera position, selection, hover) in React state causes entire component trees to re-render on every mouse move or frame.

**Why it happens:**
- Developers use familiar React patterns (`useState`, `useReducer`)
- State changes trigger React reconciliation
- React Three Fiber components are just React components
- Even `memo` can't prevent re-renders from upstream state

**Consequences:**
- 60fps drops to 5-10fps on hover/selection
- Laggy, unresponsive interactions
- User study participants struggle to complete tasks

**Warning signs:**
- React DevTools shows frequent component re-renders
- Performance degrades on mouse movement
- `useFrame` callbacks are recreated constantly

**Prevention:**
1. Use refs for rapidly-changing values (camera, hover state)
2. Use Zustand with selectors for shared state (NOT context)
3. Never setState inside `useFrame`
4. Use Three.js mutation patterns, not React state patterns

```typescript
// BAD: React state for hover
const [hovered, setHovered] = useState(null);

// GOOD: Ref for hover, Zustand for shared state
const hoveredRef = useRef(null);
const useStore = create((set) => ({
  selected: null,
  setSelected: (id) => set({ selected: id })
}));

// In component - selector prevents re-renders
const selected = useStore((s) => s.selected);
```

**Phase to address:** Phase 1 (Foundation) - Establish state management patterns immediately

**Sources:**
- R3F docs "Avoid setState in loops"
- "Mastering React Re-renders" article (2024)
- "React State Management in 2025" by Nadia Makarevich

---

### Pitfall 4: Loading Full Dataset to Client

**What goes wrong:** Attempting to load millions of crime records directly to the browser, causing multi-second (or multi-minute) load times, memory exhaustion, and JSON parsing blocking the main thread.

**Why it happens:**
- Works fine with development sample data (1000 records)
- Underestimating file sizes (millions of records = 100s of MB)
- No progressive loading strategy designed upfront

**Consequences:**
- 30+ second initial load times
- Browser tab crashes on mobile/older devices
- JSON parsing blocks UI for 10+ seconds
- User study participants abandon before visualization appears

**Warning signs:**
- Load time scales linearly with data size
- "Aw, Snap!" or "Page Unresponsive" errors
- Network tab shows 100MB+ payload sizes

**Prevention:**
1. Server-side aggregation (reduce millions to thousands)
2. Spatial/temporal binning before transfer
3. Progressive loading with Web Workers for parsing
4. Level-of-detail: coarse data first, detail on demand
5. Tile-based loading for spatial regions

**Phase to address:** Phase 2 (Data Pipeline) - Critical path, cannot be retrofitted easily

**Sources:**
- "How to visualise millions of data points in a web browser" (Marple Data)
- Mosaic visualization framework (18M points via DuckDB)
- Crime mapping literature on aggregation scales

---

### Pitfall 5: Ignoring 3D Occlusion in Space-Time Cube

**What goes wrong:** Data points in the back of the cube are hidden by points in front. Users cannot see patterns they need to analyze. The 3D representation becomes a liability rather than an asset.

**Why it happens:**
- 3D looks impressive in demos with sparse data
- Occlusion only becomes severe with dense datasets
- Academic STC papers often show idealized examples

**Consequences:**
- Users cannot complete analysis tasks (devastating for user study)
- "Just make it 2D" requests from stakeholders
- Entire visualization approach questioned

**Warning signs:**
- Users tilting/rotating excessively to find angles
- "I can't see what's behind" feedback
- Task completion times orders of magnitude longer than expected

**Prevention:**
1. Implement multiple occlusion management techniques:
   - Transparency/alpha blending
   - User-controlled slicing planes
   - Fisheye/distortion lenses
   - Hide/filter layers
2. Provide 2D coordinated views as escape hatches
3. Test with maximum-density data during development
4. Include occlusion-heavy scenarios in user study pilot

**Phase to address:** Phase 2 (3D Rendering) - Core interaction design; Phase 3 (Coordination) - Alternative views

**Sources:**
- Elmqvist thesis "3D Occlusion Management and Causality Visualization"
- Andrienko "Visualization of Trajectory Attributes in Space-Time Cube"
- IEEE paper "Evaluating an Immersive Space-Time Cube"

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 6: Inappropriate Temporal Aggregation Hiding Patterns

**What goes wrong:** Aggregating time into wrong-sized bins causes meaningful patterns to disappear. Daily crimes aggregated to months hide weekday/weekend patterns. Hourly patterns lost in weekly bins.

**Why it happens:**
- Fixed bin sizes chosen arbitrarily
- Not considering the temporal rhythms of crime (daily, weekly, seasonal)
- "One aggregation fits all" thinking

**Consequences:**
- Users draw incorrect conclusions from data
- Research validity compromised
- Adaptive scaling algorithm produces meaningless results

**Warning signs:**
- Users ask "where did the pattern go?" after zooming
- Known temporal patterns not visible
- Aggregated data contradicts raw data insights

**Prevention:**
1. Support multiple aggregation levels simultaneously
2. Allow user control over temporal granularity
3. Preserve min/max/variance in aggregations (not just counts)
4. Validate against known crime temporal patterns (24hr, weekly cycles)
5. Use LTTB or M4 algorithms that preserve visual features

**Phase to address:** Phase 2 (Data Pipeline) - Aggregation strategy; Phase 3 (Adaptive Scaling)

**Sources:**
- "Task-Driven Evaluation of Aggregation in Time Series Visualization" (CHI 2014)
- "7 Statistical Pitfalls of Data Visualization" (2025)
- Crime mapping literature on temporal analysis

---

### Pitfall 7: Coordinated Views Not Truly Synchronized

**What goes wrong:** Selection in one view doesn't update others, or updates with visible delay. Filter in 3D cube doesn't reflect in 2D timeline. Users lose trust in the visualization.

**Why it happens:**
- Each view manages its own state
- Async updates create race conditions
- Selection model differences between views (point vs region)

**Consequences:**
- User confusion ("did my selection work?")
- Invalid analysis combining unsynchronized views
- User study tasks fail due to coordination bugs

**Warning signs:**
- Momentary inconsistencies between views
- Selection works in one direction but not reverse
- Brush updates feel "laggy" in secondary views

**Prevention:**
1. Single source of truth for selection/filter state
2. Use Zustand or similar store shared across views
3. Derive all views from same state slice
4. Test bidirectional coordination explicitly
5. Add visual feedback for pending updates

```typescript
// Single source of truth
const useVisualizationStore = create((set) => ({
  selectedIds: new Set(),
  timeRange: [start, end],
  spatialBounds: null,
  // All views subscribe to same state
}));
```

**Phase to address:** Phase 3 (Coordinated Views) - Core coordination architecture

**Sources:**
- Scherr "Multiple and Coordinated Views in Information Visualization"
- "An Empirical Guide for Visualization Consistency in MCVs" (2023)

---

### Pitfall 8: Time Axis Distortion Confusing Users

**What goes wrong:** Adaptive time scaling (your core algorithm) distorts user's perception of temporal relationships. Users interpret visual distance as chronological distance, leading to wrong conclusions.

**Why it happens:**
- Non-linear time scales are cognitively challenging
- Insufficient visual indication of scale changes
- Users trained on linear timelines

**Consequences:**
- Users misread temporal patterns
- Research findings based on distorted perception
- User study participants report confusion

**Warning signs:**
- Users asking "when did this happen relative to that?"
- Inconsistent interpretations between participants
- Time estimation tasks have high error rates

**Prevention:**
1. Strong visual indicators of scale transitions
2. Always-visible linear timeline reference (dual encoding)
3. Tooltips showing absolute time on hover
4. Animation showing distortion as it applies
5. User study includes temporal judgment tasks to validate

**Phase to address:** Phase 3 (Adaptive Scaling) - Core to your contribution

---

### Pitfall 9: User Study Logging Missing Critical Events

**What goes wrong:** Interaction logs don't capture the events needed for analysis. After study, realize you didn't log hover events, zoom levels, or task completion timestamps.

**Why it happens:**
- Logging added as afterthought
- No logging specification reviewed before study
- Async events dropped or out-of-order

**Consequences:**
- Cannot answer research questions
- Study must be repeated
- Wasted participant time and resources

**Warning signs:**
- Vague logging requirements until study preparation
- Log parsing scripts written after study
- "We should have captured X" realizations

**Prevention:**
1. Define logging schema BEFORE implementation
2. Include: timestamps, event type, interaction target, view state
3. Test logging pipeline with synthetic sessions
4. Pilot study to verify all needed data captured
5. Build log analysis scripts in parallel with logging

**Minimum log events:**
- Session start/end with participant ID
- Task start/end with task ID
- All selections (what, when, which view)
- All filter changes (parameters, when)
- Camera movements (position, zoom, every N ms)
- Time spent in each view
- Error events

**Phase to address:** Phase 4 (User Study Infrastructure)

**Sources:**
- Microsoft Research "Bones of the System: Case Study of Logging and Telemetry"
- EuroVis paper on analyzing visualization interaction logs

---

### Pitfall 10: Browser/Device Compatibility Issues

**What goes wrong:** Visualization works on developer's high-end machine but fails on user study lab computers. WebGL features used aren't universally supported.

**Why it happens:**
- Testing only on latest Chrome with dedicated GPU
- WebGPU features assumed available
- Memory limits differ across devices

**Consequences:**
- User study machines can't run visualization
- Scramble to fix issues during study
- Inconsistent experience between participants

**Warning signs:**
- No testing on target study machines
- Using bleeding-edge Three.js/WebGL features
- No fallback rendering paths

**Prevention:**
1. Test on actual study lab machines EARLY
2. Document minimum GPU/memory requirements
3. Use WebGL 2 baseline, not WebGPU unless required
4. Implement graceful degradation (fewer points, lower quality)
5. Add performance budget monitoring

**Phase to address:** Phase 1 (Foundation) - Set baseline; Phase 5 (User Study) - Compatibility testing

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major rework.

---

### Pitfall 11: Drei HTML Components Kill Performance

**What goes wrong:** Using `<Html>` component from drei for labels/tooltips on many points. Each HTML element is independently positioned, causing massive overhead.

**Prevention:** Use canvas-based text (troika-three-text) or sprite-based labels for any quantity >10.

**Phase:** Phase 2 (3D Rendering)

---

### Pitfall 12: Camera Controls Fighting User Expectations

**What goes wrong:** OrbitControls defaults don't match user expectations for geographic data. Rotation feels wrong, zoom is too fast, pan is inverted.

**Prevention:** Customize OrbitControls extensively; consider MapControls for geo data; test with users early.

**Phase:** Phase 2 (3D Rendering)

---

### Pitfall 13: Color Scales Not Perceptually Uniform

**What goes wrong:** Using rainbow colormap (jet) or other non-perceptually-uniform scales. Users perceive false patterns, colorblind users excluded.

**Prevention:** Use ColorBrewer or viridis-style colormaps. Test with colorblind simulators.

**Phase:** Phase 2 (3D Rendering)

---

### Pitfall 14: No Loading/Progress Indicators

**What goes wrong:** Large dataset loads with no feedback. Users think application is broken, refresh and restart.

**Prevention:** Progress bars for data loading, skeleton states for views, never leave users wondering.

**Phase:** Phase 2 (Data Pipeline)

---

### Pitfall 15: Forgetting Mobile/Touch Users

**What goes wrong:** Visualization only works with mouse. Touch gestures conflict with browser defaults.

**Prevention:** Test touch early if any mobile use expected. Decide explicitly if mobile supported.

**Phase:** Phase 1 (Foundation)

---

## Phase-Specific Warning Matrix

| Phase | Likely Pitfalls | Mitigation Priority |
|-------|-----------------|---------------------|
| 1. Foundation | #1 (Instancing), #2 (Memory), #3 (State), #10 (Compatibility) | HIGH - architectural |
| 2. Data Pipeline | #4 (Full Load), #6 (Aggregation), #14 (Loading) | HIGH - performance |
| 2. 3D Rendering | #5 (Occlusion), #11 (HTML), #12 (Camera), #13 (Color) | MEDIUM - interaction |
| 3. Coordinated Views | #7 (Sync), #8 (Time Distortion) | HIGH - core feature |
| 4. Optimization | #2 (Memory monitoring), #9 (Logging) | MEDIUM - quality |
| 5. User Study | #9 (Logging), #10 (Compatibility) | HIGH - study validity |

---

## Research Gaps for Phase-Specific Investigation

1. **Adaptive Time Scaling UX:** Limited prior art on how to communicate non-linear time to users. Your contribution area—requires iterative design.

2. **Instancing with Dynamic Attributes:** How to efficiently update colors/visibility per instance during filtering. Libraries evolving; check current drei/three state when implementing.

3. **Chicago Crime Data Specifics:** Actual data distribution, sparsity patterns, and edge cases unknown until data exploration phase.

---

## Sources Summary

| Source Type | Examples | Confidence |
|-------------|----------|------------|
| Official Docs | R3F docs, Three.js disposal guide | HIGH |
| Academic Literature | Andrienko, Bach, Elmqvist papers | HIGH |
| Community Forums | Three.js Discourse, GitHub Issues | MEDIUM |
| Recent Articles | Utsubo 100 Tips (2026), Medium articles | MEDIUM |
| Research Papers | CHI/EuroVis empirical studies | HIGH |

---

## Quick Reference: Prevention Checklist

Before each phase:

- [ ] Reviewed relevant pitfalls from this document
- [ ] Tested on target devices (not just development machine)
- [ ] Performance measured with realistic data volume
- [ ] Memory monitoring in place
- [ ] Disposal patterns implemented
- [ ] State management follows established patterns
- [ ] Logging captures required events
