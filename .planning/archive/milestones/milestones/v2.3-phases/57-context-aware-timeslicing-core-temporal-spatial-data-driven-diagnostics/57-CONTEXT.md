# Phase 57: Context-aware timeslicing core (temporal + spatial, data-driven diagnostics) - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Define and surface data-driven temporal + spatial context diagnostics for timeslicing, including dynamic profile interpretation and comparison against legacy static profiling behavior.

This phase is diagnostics-focused (analysis visibility and interpretation quality), not full generation-pipeline replacement.

</domain>

<decisions>
## Implementation Decisions

### Context dimensions and diagnostics presentation
- Temporal diagnostics default to compact summary (not full distributions by default).
- Spatial diagnostics default to top 1-3 hotspot summary (density + dominant crime signal), not full internal spatial grids.
- Cross-signal interpretation should be human-readable insight sentences (not tag-first output).
- Context diagnostics should live update with filter/selection changes for now (no hysteresis thresholding in this phase).

### Dynamic profile output behavior
- Show a single best dynamic profile (no ranked top-N profile list in primary output).
- Profile labels should be readable domain names (not technical IDs in primary display).
- If signal is weak, show an explicit "No strong profile" state.
- Persist detected profile name in context metadata for auditability/history.

### Static vs dynamic comparison behavior
- Comparison section is collapsed by default and user-expandable.
- Comparison output is outcome-focused: static profile vs dynamic profile + reason sentence.
- Use one concise reason sentence when outputs differ.
- Comparison scope is current context only (no historical multi-entry comparison in this phase).

### Confidence and fallback semantics
- Confidence is optional and hidden by default (user-toggle to reveal).
- For low-signal scenarios, still present best profile with explicit warning.
- Use plain-language fallback labels (for example: "No strong profile", "Signal is weak").
- If temporal/spatial analysis partially fails, show partial diagnostics with explicit missing-section notices.

### Claude's Discretion
- Exact wording/tone of insight and warning copy, as long as plain-language and concise.
- Exact UI controls for confidence reveal/hide (toggle placement and label text).
- Exact compact summary chip/card styling and ordering.
- Exact hotspot item visual treatment (list/card/table) provided the top 1-3 summary rule is preserved.

</decisions>

<specifics>
## Specific Ideas

- Diagnostics should prioritize interpretability during QA: readable summaries first, details on demand.
- Avoid "black box" behavior: always explain profile differences with one clear sentence.
- Keep noisy technical detail out of default view but available when explicitly expanded.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useContextExtractor.ts`: Existing context extraction/signature foundation (crimeTypes, districts, timeRange, context mode).
- `src/hooks/useSmartProfiles.ts`: Existing static smart profile detector (burglary / violent / all) to compare against and evolve.
- `src/hooks/useSuggestionGenerator.ts`: Current orchestration path that already consumes context extraction and profile detection.
- `src/store/useSuggestionStore.ts`: Existing `SuggestionContextMetadata` persistence surface where profile metadata can continue to be stored.
- `src/app/timeslicing/components/SuggestionCard.tsx` and `.../SuggestionPanel.tsx`: Existing profile/context metadata display patterns to mirror/extend.

### Established Patterns
- Route-local diagnostics pattern is already established in `/timeslicing-algos` (phase 54 decisions).
- Context-aware logic has existing precedent from phase 38 but with static profile matching and no spatial context.
- Backward-compatible behavior is favored: additive diagnostics and explicit fallback states rather than breaking existing flows.
- Data contracts use typed interfaces and explicit metadata fields; preference is to preserve/extend contracts rather than replace wholesale.

### Integration Points
- `/timeslicing-algos` is the primary diagnostics surface for phase 57.
- Context extraction and profile detection plug into suggestion generation and suggestion metadata paths.
- Dynamic diagnostics should integrate where `detectSmartProfile`/`contextMetadata.profileName` are currently consumed.

</code_context>

<deferred>
## Deferred Ideas

- Hysteresis threshold tuning for stability (enter/exit thresholds) — deferred until live behavior is observed.
- Full context-aware generation integration (algorithm output behavior changes) — future phase.
- Historical comparison across accepted suggestion history — future phase.
- LLM-based profile generation/interpretation — future phase.

</deferred>

---

*Phase: 57-context-aware-timeslicing-core-temporal-spatial-data-driven-diagnostics*
*Context gathered: 2026-03-17*
