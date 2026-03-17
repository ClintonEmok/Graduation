# Phase 57: Context-aware timeslicing core (temporal + spatial, data-driven diagnostics) - Research

**Researched:** 2026-03-17  
**Domain:** Timeslicing context diagnostics (temporal + spatial profile interpretation, QA-facing explainability)  
**Confidence:** HIGH

## Summary

This phase should be planned as an **additive diagnostics layer** on top of the existing suggestion pipeline, not as a generation-engine rewrite. Current code already has the key seams: `useContextExtractor` (context signature), `detectSmartProfile` (legacy static profile), `useSuggestionGenerator` (orchestration), `SuggestionContextMetadata` (audit persistence), and route-local diagnostics precedent in `/timeslicing-algos` and `/stkde`.

The standard implementation approach is: compute temporal+spatial summary features from already-fetched crime records, derive one dynamic profile with explicit weak-signal semantics, persist profile label in metadata, and render compact human-readable diagnostics by default with expandable detail. Keep diagnostics live-updating with filter/selection changes, and keep static-vs-dynamic comparison collapsed by default with one reason sentence when they differ.

Primary recommendation: **Implement a pure “context diagnostics engine” module (typed inputs/outputs + deterministic scoring) and wire it into existing suggestion generation + panel metadata without changing core proposal ranking contracts.**

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | UI diagnostics rendering/hooks | Existing app baseline; all current route/panel patterns are React hooks/components. |
| Next.js | 16.1.6 | Route surfaces (`/timeslicing`, `/timeslicing-algos`, `/stkde`) | Existing route-local diagnostics pattern and app-router architecture already in place. |
| Zustand | 5.0.10 | Suggestion/profile state + metadata persistence | Existing stores (`useSuggestionStore`, `useContextProfileStore`, `useStkdeStore`) already own interaction state and history. |
| @tanstack/react-query | 5.90.21 | Context/selection data fetch lifecycle | Existing `useCrimeData` pipeline; query-key semantics fit live context updates. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Workers API | Browser baseline (MDN, widely available) | Off-main-thread projection/filtering and heavy diagnostics transforms | For large selection/context diagnostics where UI jank risk exists. |
| TypeScript | 5.9.3 | Explicit diagnostics contracts and metadata typing | For new diagnostics DTOs and store contract extensions. |
| lucide-react | 0.563.0 | Existing iconography for warnings/expanded states | For confidence toggle, weak-signal warnings, and section status cues. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending existing Zustand stores | New standalone diagnostics store | Cleaner isolation, but creates duplicate ownership and drift risk with existing suggestion metadata/history flows. |
| Route-local diagnostics in `/timeslicing-algos` + shared engine | Full global diagnostics service | More centralized, but violates current route-local pattern and increases scope for this diagnostics-only phase. |
| Human-readable reason sentence generation from deterministic templates | LLM-generated explanation copy | Richer language, but explicitly deferred and introduces non-determinism/audit risk. |

**Installation:**
```bash
# No new packages required for Phase 57 core
# (use existing dependencies already in package.json)
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── lib/context-diagnostics/          # Pure temporal/spatial feature extraction + profile scoring
│   ├── temporal.ts                   # Time-window and density summaries
│   ├── spatial.ts                    # Hotspot rollups (top 1-3)
│   ├── profile.ts                    # Dynamic profile scoring + weak-signal semantics
│   └── compare.ts                    # Static-vs-dynamic reason sentence generation
├── hooks/
│   └── useSuggestionGenerator.ts     # Integrate diagnostics output into existing orchestration
├── store/
│   └── useSuggestionStore.ts         # Extend SuggestionContextMetadata with diagnostics/profile fields
└── app/timeslicing/components/       # Compact summary cards + expandable comparison/details UI
```

### Pattern 1: Deterministic query-keyed live diagnostics
**What:** Ensure all context-changing inputs are in query keys/signatures so diagnostics update correctly and cache safely.  
**When to use:** Any diagnostics derived from selection/filter/time-range dependent fetches.  
**Example:**
```typescript
// Source: https://github.com/tanstack/query/blob/v5_84_1/docs/framework/react/guides/query-keys.md
useQuery({
  queryKey: ['context-diagnostics', { start, end, crimeTypes, districts }],
  queryFn: () => computeDiagnostics({ start, end, crimeTypes, districts }),
})
```

### Pattern 2: Top-level immutable store updates + shallow-picked selectors
**What:** Keep Zustand updates immutable and avoid broad rerender fan-out by selecting minimal slices.  
**When to use:** Confidence toggle visibility, collapsed comparison UI state, compact summary chips/cards.  
**Example:**
```typescript
// Source: https://github.com/pmndrs/zustand/blob/v5.0.8/docs/guides/immutable-state-and-merging.md
set((state) => ({
  diagnosticsUi: { ...state.diagnosticsUi, showConfidence: true },
}))

// Source: https://github.com/pmndrs/zustand/blob/v5.0.8/docs/guides/prevent-rerenders-with-use-shallow.md
const { showConfidence, comparisonExpanded } = useSuggestionStore(
  useShallow((state) => ({
    showConfidence: state.showConfidence,
    comparisonExpanded: state.comparisonExpanded,
  }))
)
```

### Pattern 3: Route-local diagnostics with pure compute modules
**What:** Keep diagnostics presentation route-local but move calculations to pure modules with tests.  
**When to use:** Temporal/spatial profile scoring and static-vs-dynamic comparison reasons.  
**Example:**
```typescript
// Source: repo pattern in src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts
export const buildContextDiagnostics = (input: DiagnosticsInput): DiagnosticsOutput => {
  // deterministic transform, no React/store side effects
  return output
}
```

### Anti-Patterns to Avoid
- **Deriving diagnostics directly inside large React components:** makes behavior hard to test and easy to regress.
- **Multiple competing profile owners (`useSmartProfiles`, store, panel-local state):** causes mismatched labels/history.
- **Tag-only or ID-only primary output:** violates locked decision for readable insight-first diagnostics.
- **Hiding partial failures:** must show explicit missing-section notices when temporal or spatial analysis fails.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async data caching/invalidation | Custom fetch cache/state machine | TanStack Query existing `useCrimeData` flow | Query key dependency and stale/fetch lifecycle edge cases are already solved. |
| UI state fan-out optimization | Manual memoization everywhere | Zustand selectors + `useShallow` | Cleaner, proven rerender control with existing store architecture. |
| Worker message semantics | Ad-hoc clone/transfer handling | Standard Worker `postMessage` + transferables pattern | Structured clone + ownership transfer details are subtle and easy to get wrong. |
| Spatial hotspot ranking projection | New bespoke clustering for this phase | Existing STKDE hotspot projection/sorting pattern | Deterministic tie-break + top-K pattern already implemented/tested. |

**Key insight:** This phase is mostly **composition and interpretation quality**, not new infra. Reuse existing fetch/store/worker patterns and spend effort on deterministic diagnostics contracts and copy semantics.

## Common Pitfalls

### Pitfall 1: Context signature drift between displayed diagnostics and generated suggestions
**What goes wrong:** UI diagnostics describe one context while generated suggestions/profile metadata came from a slightly different range/filter snapshot.  
**Why it happens:** Context extracted at different times/paths without a single canonical signature.  
**How to avoid:** Compute once per run via `getCurrentContext(mode)` and persist signature + profile label in metadata used by both diagnostics and suggestion cards/history.  
**Warning signs:** “Why recommended” or profile label differs from active filter chips for same run.

### Pitfall 2: Weak-signal ambiguity
**What goes wrong:** System emits a confident-looking profile when evidence is sparse/noisy.  
**Why it happens:** No explicit weak-signal threshold semantics in output contract.  
**How to avoid:** Always return best profile candidate plus `signalStrength`/warning flags and display plain-language state (“Signal is weak”, “No strong profile”).  
**Warning signs:** Frequent profile flip-flopping on tiny filter changes, no warning text shown.

### Pitfall 3: Spatial summary overload
**What goes wrong:** Default UI dumps too many hotspot internals, reducing interpretability.  
**Why it happens:** Reusing QA-dense table output directly in primary diagnostics surface.  
**How to avoid:** Default to top 1–3 hotspots (density + dominant signal), keep richer data in expandable section.  
**Warning signs:** Large table visible by default, no concise summary sentence.

### Pitfall 4: Non-deterministic comparison reasons
**What goes wrong:** Static-vs-dynamic reason text changes for identical inputs, hurting auditability.  
**Why it happens:** Free-form generation without deterministic rule ordering.  
**How to avoid:** Rule-based reason template with deterministic precedence and stable tie-breaks.  
**Warning signs:** Snapshot tests for same fixture produce varying reason text.

## Code Examples

Verified patterns from official sources and current codebase:

### Query key includes all changing inputs
```typescript
// Source: https://github.com/tanstack/query/blob/v5_84_1/docs/framework/react/guides/query-keys.md
useQuery({
  queryKey: ['todos', { status, page }],
  queryFn: fetchTodoList,
})
```

### Preserve previous data during key changes
```typescript
// Source: https://github.com/tanstack/query/blob/v5_84_1/docs/framework/react/guides/migrating-to-v5.md
useQuery({
  queryKey,
  queryFn,
  placeholderData: (previousData) => previousData,
})
```

### Transfer large buffers to worker safely
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
worker.postMessage(
  { requestId, timestamps: timestampsCopy },
  [timestampsCopy.buffer]
)
```

### Existing in-repo deterministic profile metadata persistence
```typescript
// Source: src/hooks/useSuggestionGenerator.ts
contextMetadata: {
  crimeTypes: context.crimeTypes,
  timeRange: context.timeRange,
  isFullDataset: context.isFullDataset,
  profileName: smartProfile?.name,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static smart profile matching only (`burglary`, `violent`, `all`) | Dynamic, context-derived profile + explicit comparison against static baseline | Planned in Phase 57 | Better explainability for context shifts and weak-signal scenarios. |
| Dense diagnostics-first tables | Compact insight-first summaries with details-on-demand | Established by route-local diagnostics precedent (phases 54–55) | Faster QA interpretation, less cognitive overload. |
| Implicit low-confidence behavior | Explicit low-confidence/weak-signal messaging in metadata + UI | Present in full-auto reasons, to be extended to context diagnostics | Auditable fallback behavior and clearer operator trust boundaries. |

**Deprecated/outdated:**
- **Primary reliance on static profile ID logic alone:** insufficient for temporal+spatial context interpretation.
- **Always-expanded technical diagnostics in default view:** conflicts with locked compact-summary decision.

## Open Questions

1. **Dynamic profile taxonomy granularity for this phase**
   - What we know: output must be a single readable profile label with weak-signal fallback.
   - What's unclear: exact set of domain profile names to ship now vs defer.
   - Recommendation: lock a minimal controlled vocabulary (3–5 labels) in plan tasks before implementation.

2. **Thresholds for “No strong profile” vs “best profile with warning”**
   - What we know: both states are required; confidence hidden by default.
   - What's unclear: exact scoring boundaries and tie-break behavior.
   - Recommendation: define deterministic threshold constants + fixture tests as part of diagnostics engine contract.

3. **Spatial dominant signal definition**
   - What we know: top 1–3 hotspots + dominant crime signal summary required.
   - What's unclear: whether dominant signal is based on support count, weighted intensity, or mixed score.
   - Recommendation: use support-count primary with intensity tie-break (matches existing hotspot ranking style), document in metadata.

## Sources

### Primary (HIGH confidence)
- `/tanstack/query/v5_84_1` (Context7) — query keys, dependency completeness, `placeholderData` migration from `keepPreviousData`.
- `/pmndrs/zustand/v5.0.8` (Context7) — immutable updates, top-level merge behavior, `useShallow` rerender prevention.
- https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage — worker messaging, structured clone, transferables.
- Repository source of truth (local code):
  - `src/hooks/useContextExtractor.ts`
  - `src/hooks/useSmartProfiles.ts`
  - `src/hooks/useSuggestionGenerator.ts`
  - `src/store/useSuggestionStore.ts`
  - `src/app/timeslicing/components/SuggestionPanel.tsx`
  - `src/app/timeslicing/components/SuggestionCard.tsx`
  - `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`
  - `src/app/timeslicing-algos/lib/selection-detail-dataset.ts`
  - `src/lib/stkde/compute.ts`

### Secondary (MEDIUM confidence)
- None needed for critical claims.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — directly verified from project `package.json` and existing code usage.
- Architecture: **HIGH** — reinforced by established in-repo patterns across `/timeslicing-algos` and `/stkde`.
- Pitfalls: **HIGH** — derived from current code seams, existing QA patterns, and deterministic state/fetch docs.

**Research date:** 2026-03-17  
**Valid until:** 2026-04-16 (30 days)
