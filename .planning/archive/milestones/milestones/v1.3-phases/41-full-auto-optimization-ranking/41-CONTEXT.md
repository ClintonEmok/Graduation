# Phase 41: Full-Auto Optimization & Ranking - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize and rank full-auto warp+interval package ( candidates by quality dimensionscoverage, relevance, overlap minimization, temporal continuity). Users see ranked alternatives with clear recommendations, can review and accept.

This builds on Phase 40's full-auto generation, adding the scoring and ranking layer.

</domain>

<decisions>
## Implementation Decisions

### Ranking Criteria
- **Fixed default weights:** Relevance 40%, Continuity 30%, Overlap minimization 20%, Coverage 10%
- **Context adaptation:** Claude discretion (single global weights for now, implementation can decide global vs context-specific internally)
- **Overlap penalty:** Hard penalty (redundant packages heavily discouraged)

### Scoring Algorithm
- **Hybrid approach:** Weighted sum for the 4 dimensions + explicit overlap penalty as separate multiplier layer
- **Raw values:** Not normalized to 0-100, store raw computed values
- **Dimension scores:** Always store individual scores (relevance, continuity, etc.) alongside total for UI breakdown display
- **Point estimates only:** No uncertainty bounds

### Recommendation Logic
- **Selection method:** Highest total score (simplest, proven)
- **Badge behavior:** Always show recommended badge (consistent with Phase 40)
- **User override:** Not allowed — purely algorithmic recommendation
- **Re-evaluation:** Recalculate on every generation run

### User Presentation
- **Layout:** Vertical list (matches existing SuggestionPanel pattern)
- **Score display:** Simple total score, expandable for breakdown
- **Format:** Percentages (e.g., "87% relevance") — familiar, easy to compare
- **Rationale:** Include "why recommended" indicator (e.g., "Best: relevance + continuity")

### Claude's Discretion
- Layout: vertical list, matching existing pattern
- Context adaptation approach: single global weights or context-specific internally
- "Why recommended" exact phrasing

</decisions>

<specifics>
## Specific Ideas

- Research indicates hybrid (weighted sum + penalty layer) is state-of-art for multi-criteria ranking
- Weighted product model (geometric mean) was considered but hybrid chosen for flexibility
- Keep UX consistent with Phase 40's existing suggestion panel patterns

</specifics>

<deferred>
## Deferred Ideas

- User-flexible weight adjustment (sliders/custom weights) — future phase
- Goal-based weight presets (e.g., "rare occurrence focus") — future phase
- Uncertainty/confidence intervals for scores — future phase
- User override of recommended pick — future phase
- Context-specific weight profiles — future phase

</deferred>

---

*Phase: 41-full-auto-optimization-ranking*
*Context gathered: 2026-03-04*
