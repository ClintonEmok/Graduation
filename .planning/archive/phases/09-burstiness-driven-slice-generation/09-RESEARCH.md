# Phase 9: Burstiness-driven Slice Generation - Research

**Researched:** 2026-04-16  
**Domain:** demo-local burst candidate generation and draft slice creation  
**Confidence:** HIGH

## Summary

The current burst flow is still density-first and indirect. `DemoSlicePanel` and `WorkflowSkeleton` both derive burst windows from the demo time store plus `densityMap`, and `buildDemoBurstWindowsFromSelection()` currently calls `buildBurstWindowsFromSeries(... burstMetric: 'density', burstinessMap: null, countMap: null ...)`. That means the brushed selection is mirrored across stores, but it is not yet the true source of burst candidate generation.

The clean planning direction is: brush selection -> derive candidate windows inside that selection -> score them with burstiness or a comparable event-spacing metric -> emit editable pending draft slices -> show a clear empty state when no candidates exist. Raw timestamp scoring is feasible with the existing data path because the codebase already has `useTimelineDataStore.columns.timestamp`, viewport crime records, and a worker that computes `burstinessMap`/`countMap`; the missing piece is wiring the demo flow to use that selection source directly instead of density thresholding.

**Primary recommendation:** make the brushed range the only input to burst generation, and stop using `densityMap` as the candidate source of truth.

## Standard Stack

The established stack for this phase:

### Core
| Library / Module | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | 16.1.6 | App Router shell and demo routes | Already owns the demo UI and state wiring |
| TypeScript | 5.9.3 | Typed phase plumbing | Required for slice/store contracts |
| React | 19.2.3 | UI rendering | Existing dashboard-demo UI layer |
| Zustand | 5.0.10 | Shared demo state | Current store pattern for selection and draft slices |
| `src/workers/adaptiveTime.worker.ts` | in-repo | Computes density, burstiness, count, warp maps | Already implements event-based burstiness logic |
| `src/lib/binning/burst-taxonomy.ts` | in-repo | Burst scoring/classification metadata | Existing burst score/confidence/rationale source |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---|---:|---|---|
| DuckDB | 1.4.4 | Local crime data pipeline | When the phase needs fresh timestamp ranges from the offline dataset |
| Apache Arrow | 21.1.0 | Columnar crime data transport | When deriving raw timestamps from loaded data |
| `src/store/useTimelineDataStore.ts` | in-repo | Canonical timestamp columns | When candidate windows need raw event timestamps |
| `src/store/useAdaptiveStore.ts` | in-repo | Burstiness + count maps | When the phase uses the worker output instead of raw-event reduction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Density threshold windows | Raw timestamp / burstiness scoring | More direct, but needs selection plumbing |
| Demo time store as input | Coordination brush range or filter time range | Less drift, clearer source of truth |
| Custom burst scoring | Existing `classifyBurstWindow()` | Reuses current taxonomy and metadata |

**Installation:**
```bash
pnpm install
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── components/dashboard-demo/lib/   # burst-window derivation and draft creation
├── components/dashboard-demo/       # demo shell, panel, workflow UI
├── components/timeline/            # brush/selection sync and draft preview
├── store/                          # canonical selection and pending-draft state
├── workers/                        # burstiness/count map derivation
└── lib/binning/                    # burst taxonomy and scoring helpers
```

### Pattern 1: Brush-sourced generation pipeline
**What:** The brushed selection is the canonical input, and all burst candidate windows are derived within that range.
**When to use:** Any demo-local burst generation path.
**Example:**
```ts
// Source: src/components/timeline/DemoDualTimeline.tsx + src/components/dashboard-demo/lib/demo-burst-generation.ts
const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
const selection = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
// Use one canonical brush source, then derive candidate windows inside it.
```

### Pattern 2: Score after segmentation
**What:** First find candidate windows, then score each window with burstiness / burst taxonomy metadata.
**When to use:** Any time the UI needs editable burst drafts.
**Example:**
```ts
// Source: src/lib/binning/burst-taxonomy.ts
const taxonomy = classifyBurstWindow({
  value: window.peak,
  count: window.count,
  durationSec: window.duration,
  neighborhood,
});
```

### Pattern 3: Drafts stay editable before apply
**What:** Generated bins remain pending, editable, and only become slices on apply.
**When to use:** Workflow skeleton and slice review surfaces.
**Example:**
```ts
// Source: src/store/useDashboardDemoTimeslicingModeStore.ts
get().setPendingGeneratedBins(generated.bins, {
  binCount: generated.bins.length,
  eventCount: generated.eventCount,
  warning: generated.warning,
  inputs: generationInputs,
});
```

### Anti-Patterns to Avoid
- **Density as source of truth:** density is a rendering proxy, not the burst candidate contract.
- **Reading only `timeRange`:** the brushed selection can drift if generation ignores the brush/coordination store.
- **Silent null on no results:** the UI must show an empty state, not disappear.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Burst classification | Custom heuristic labels | `classifyBurstWindow()` | Already returns score, confidence, provenance, rationale |
| Draft slice application | Manual slice replacement | `replaceSlicesFromBins()` | Preserves the existing slice-domain contract |
| Burst matching | Ad hoc range comparison | `findMatchingSlice(..., { burstOnly: true })` | Keeps burst identity and selection alignment consistent |
| Temporal smoothing / binning | Component-local ad hoc bins | `adaptiveTime.worker.ts` | Already computes density, burstiness, and counts off the main thread |

**Key insight:** the hard part is not rendering the draft slices; it is making selection, candidate derivation, and scoring share one canonical input.

## Common Pitfalls

### Pitfall 1: Selection drift
**What goes wrong:** `timeRange`, `selectedTimeRange`, and `brushRange` can diverge.
**Why it happens:** the current demo mirrors selection into multiple stores.
**How to avoid:** pick one canonical brush source for generation and treat the others as mirrors.
**Warning signs:** generation works only after unrelated timeline actions.

### Pitfall 2: Density-threshold aliasing
**What goes wrong:** burst windows are really just bright density runs.
**Why it happens:** `buildDemoBurstWindowsFromSelection()` currently uses `burstMetric: 'density'` and `burstinessMap: null`.
**How to avoid:** derive candidates from raw timestamps or burstiness/count maps first, then score.
**Warning signs:** changing the threshold changes windows more than changing the selection does.

### Pitfall 3: Silent empty state
**What goes wrong:** `BurstList` can return `null` when no windows exist.
**Why it happens:** the current component hides itself instead of explaining the lack of candidates.
**How to avoid:** render an explicit empty-state card with next-step guidance.
**Warning signs:** the panel vanishes or only shows a generic error toast.

### Pitfall 4: Metadata loss during editing
**What goes wrong:** merge/split actions strip burst score metadata from pending drafts.
**Why it happens:** `mergePendingGeneratedBins` / `splitPendingGeneratedBin` rebuild bins without burst fields.
**How to avoid:** preserve or recompute burst metadata whenever an editable draft is mutated.
**Warning signs:** edited drafts lose burst score/confidence labels.

### Pitfall 5: Seconds vs milliseconds mismatch
**What goes wrong:** candidate windows or slice boundaries clip incorrectly.
**Why it happens:** the current helper mixes seconds, epoch milliseconds, and normalized values.
**How to avoid:** convert once at the boundary and keep the internal burst-window model in one unit.
**Warning signs:** zero-width windows, bad labels, or off-by-1000 apply bugs.

## Code Examples

### Current burst flow that needs replacement
```ts
// Source: src/components/dashboard-demo/lib/demo-burst-generation.ts
return buildBurstWindowsFromSeries({
  densityMap,
  burstinessMap: null,
  countMap: null,
  burstMetric: 'density',
  burstCutoff: Math.max(0, Math.min(1, burstThreshold)),
  mapDomain,
  selectionRange,
});
```

### Existing scoring helper to reuse
```ts
// Source: src/lib/binning/burst-taxonomy.ts
const taxonomy = classifyBurstWindow({
  value,
  count,
  durationSec,
  neighborhood,
});
```

### Existing apply path for draft slices
```ts
// Source: src/store/slice-domain/createSliceCoreSlice.ts
useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Density-threshold burst windows | Selection-sourced burst candidate windows | Phase 9 target | Makes generation direct and explainable |
| Hidden/no-op empty state | Explicit empty-state guidance | Phase 9 target | Prevents silent failure in the demo |
| One-way apply of opaque bins | Editable pending burst drafts | Already present, needs stronger metadata retention | Keeps review-before-apply workflow intact |

**Deprecated/outdated:**
- Density-only burst generation: it is still the active demo path, but it should be replaced by selection-first derivation.
- Hidden burst list on empty input: acceptable for proto scaffolding, not for the planned demo flow.

## Open Questions

1. **Which store is canonical for the brush?**
   - What we know: brush state is mirrored into `brushRange`, `selectedTimeRange`, and `timeRange`.
   - What's unclear: which one should be the single source for generation.
   - Recommendation: use the timeline brush/coordination selection as the generator input and mirror outward.

2. **Should scoring come from raw timestamps or worker maps?**
   - What we know: both are available in the codebase.
   - What's unclear: whether Phase 9 wants the smallest diff or the most direct model.
   - Recommendation: prefer raw timestamps; use burstiness/count maps as the fallback bridge.

3. **How should edits affect burst metadata?**
   - What we know: merge/split currently drop burst fields.
   - What's unclear: whether metadata should be preserved or recomputed on edit.
   - Recommendation: preserve or recompute explicitly; do not let it disappear implicitly.

## Sources

### Primary (HIGH confidence)
- `src/components/dashboard-demo/lib/demo-burst-generation.ts` - current burst generation helper
- `src/components/dashboard-demo/DemoSlicePanel.tsx` - current demo generation trigger and empty-state behavior
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` - workflow entry point for burst draft generation
- `src/components/timeline/DemoDualTimeline.tsx` - brush selection, pending draft overlay, selection sync
- `src/components/viz/BurstList.tsx` - current burst window build and taxonomy pattern
- `src/store/useDashboardDemoTimeslicingModeStore.ts` - pending draft storage and apply path
- `src/store/useDashboardDemoCoordinationStore.ts` - brush range and workflow coordination state
- `src/store/useDashboardDemoFilterStore.ts` - mirrored selection state
- `src/store/useTimelineDataStore.ts` - raw timestamps and columnar data
- `src/store/useAdaptiveStore.ts` - burstiness/count/density worker results
- `src/workers/adaptiveTime.worker.ts` - event-based burstiness calculation
- `src/lib/binning/burst-taxonomy.ts` - burst score/confidence/provenance helper
- `src/store/slice-domain/createSliceCoreSlice.ts` - apply/replace slice contract

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly supported by current repo stack and store code
- Architecture: HIGH - current data flow and store contracts are explicit in code
- Pitfalls: HIGH - derived from direct inspection of current implementation gaps

**Research date:** 2026-04-16  
**Valid until:** 2026-05-16
