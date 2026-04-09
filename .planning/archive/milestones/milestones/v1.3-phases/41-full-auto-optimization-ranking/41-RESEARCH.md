# Phase 41: Full-Auto Optimization & Ranking - Research

**Researched:** 2026-03-04
**Domain:** Multi-criteria decision analysis (MCDA), weighted scoring algorithms, time interval overlap detection, UI patterns for ranked alternatives
**Confidence:** HIGH

## Summary

This phase builds on Phase 40's full-auto generation to add scoring, ranking, and recommendation logic for warp+interval package candidates. The key locked decisions specify: weighted sum for 4 dimensions (Relevance 40%, Continuity 30%, Overlap minimization 20%, Coverage 10%) with an explicit overlap penalty as a separate multiplier layer. Raw computed values (not normalized to 0-100) should be stored alongside dimension scores for UI breakdown display.

**Primary recommendation:** Implement the hybrid weighted-sum-plus-penalty algorithm in the existing `full-auto-orchestrator.ts`, updating SCORE_WEIGHTS constants to match locked decisions. Use the established sorting+O(n log n) sweep algorithm for overlap detection. Extend existing AutoProposalSetCard with "Why recommended" text.

## Standard Stack

The project already uses established patterns. No new libraries required.

### Core (Already Established)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Industry standard |
| TypeScript | 5.x | Type safety | Catches scoring logic errors |
| Zustand | 4.x | State management | Used for suggestion store |
| shadcn/ui | latest | UI components | Matches existing SuggestionPanel |

### Supporting (Already Available)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| lucide-react | Icons | Sparkles for recommended badge |
| sonner | Toasts | Feedback on package selection |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure

The existing structure at `src/app/timeslicing/components/` is appropriate:
```
src/
├── lib/
│   └── full-auto-orchestrator.ts    # Scoring & ranking logic
├── types/
│   └── autoProposalSet.ts           # AutoProposalSet, AutoProposalScoreBreakdown types
├── store/
│   └── useSuggestionStore.ts       # State management for proposal sets
└── components/
    ├── SuggestionPanel.tsx          # Main panel (already exists)
    └── AutoProposalSetCard.tsx     # Card for individual packages
```

### Pattern 1: Weighted Sum + Penalty Scoring

**What:** Calculate total score as: `(relevance * 0.4 + continuity * 0.3 + overlap_minimization * 0.2 + coverage * 0.1) * overlap_penalty`

**When to use:** When you need to rank alternatives by multiple criteria with different importance levels AND apply a hard penalty for violations (overlap)

**Locked implementation:**
```typescript
// Source: Based on CONTEXT.md locked decisions
const SCORE_WEIGHTS = {
  relevance: 0.40,           // 40%
  continuity: 0.30,          // 30%
  overlapMin: 0.20,         // 20%
  coverage: 0.10,            // 10%
} as const;

const OVERLAP_PENALTY_MULTIPLIER = 0.5;  // Hard penalty layer (50% reduction for overlap)

function calculateTotalScore(
  relevance: number,
  continuity: number, 
  overlapMin: number,
  coverage: number,
  hasOverlap: boolean
): number {
  // Weighted sum for 4 dimensions
  const weightedSum = 
    relevance * SCORE_WEIGHTS.relevance +
    continuity * SCORE_WEIGHTS.continuity +
    overlapMin * SCORE_WEIGHTS.overlapMin +
    coverage * SCORE_WEIGHTS.coverage;
  
  // Explicit overlap penalty as separate multiplier layer
  const penaltyMultiplier = hasOverlap ? OVERLAP_PENALTY_MULTIPLIER : 1.0;
  
  return weightedSum * penaltyMultiplier;
}
```

### Pattern 2: Efficient Interval Overlap Detection

**What:** Use sorting + sweep algorithm to detect overlapping intervals in O(n log n) time

**When to use:** When checking if any intervals in a set overlap each other

**Implementation:**
```typescript
// Source: Standard algorithm (merge overlapping intervals pattern)
interface TimeInterval {
  startPercent: number;
  endPercent: number;
}

/**
 * Efficiently detect if any intervals overlap in a set.
 * Uses sorting + sweep algorithm: O(n log n)
 */
function hasOverlappingIntervals(intervals: TimeInterval[]): boolean {
  if (intervals.length <= 1) return false;
  
  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.startPercent - b.startPercent);
  
  // Sweep: check if current interval starts before previous ends
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startPercent < sorted[i - 1].endPercent) {
      return true;  // Overlap detected
    }
  }
  
  return false;
}

/**
 * Calculate overlap score: 100 when no overlap, lower when overlap exists.
 * Higher score = better (less overlap)
 */
function scoreOverlapMinimization(intervals: TimeInterval[]): number {
  if (intervals.length <= 1) return 100;
  
  const hasOverlap = hasOverlappingIntervals(intervals);
  if (!hasOverlap) return 100;
  
  // Calculate overlap severity (how much they overlap)
  const sorted = [...intervals].sort((a, b) => a.startPercent - b.startPercent);
  let totalOverlap = 0;
  
  for (let i = 1; i < sorted.length; i++) {
    const overlap = sorted[i - 1].endPercent - sorted[i].startPercent;
    if (overlap > 0) {
      totalOverlap += overlap;
    }
  }
  
  // Score inversely proportional to overlap amount
  return Math.max(0, Math.min(100, 100 - totalOverlap * 10));
}
```

### Pattern 3: Temporal Continuity Scoring

**What:** Measure how smooth the transition is between adjacent warp intervals

**When to use:** When quantifying how "jumpy" or discontinuous the warp profile is

**Implementation:**
```typescript
// Source: Existing code in full-auto-orchestrator.ts (line 161-175)
function scoreTemporalContinuity(intervals: TimeInterval[]): number {
  const strengths = intervals.map(interval => interval.strength);
  
  if (strengths.length < 2) {
    return 60;  // Default for single interval
  }
  
  // Calculate average step change between adjacent intervals
  let totalStep = 0;
  for (let i = 1; i < strengths.length; i++) {
    totalStep += Math.abs(strengths[i] - strengths[i - 1]);
  }
  const avgStep = totalStep / (strengths.length - 1);
  
  // Smoothness: 100 when no step change, decreases with larger steps
  // Multiplier of 50 based on empirical tuning
  const smoothness = Math.max(0, 100 - avgStep * 50);
  
  return Math.round(smoothness);
}
```

### Pattern 4: "Why Recommended" Text Generation

**What:** Generate human-readable explanation of why a package is recommended

**When to use:** Display in UI to help users understand the recommendation

**Implementation:**
```typescript
function generateWhyRecommended(
  score: AutoProposalScoreBreakdown,
  weights: typeof SCORE_WEIGHTS
): string {
  // Find dimensions where this package excels
  const contributions = [
    { name: 'relevance', value: score.relevance * weights.relevance, weight: weights.relevance },
    { name: 'continuity', value: score.continuity * weights.continuity, weight: weights.continuity },
    { name: 'overlap', value: score.overlap * weights.overlapMin, weight: weights.overlapMin },
    { name: 'coverage', value: score.coverage * weights.coverage, weight: weights.coverage },
  ];
  
  // Sort by weighted contribution
  contributions.sort((a, b) => b.value - a.value);
  
  // Take top 2 contributors
  const topContributors = contributions.slice(0, 2);
  
  // Format: "Best: relevance + continuity"
  return `Best: ${topContributors.map(c => c.name).join(' + ')}`;
}
```

### Anti-Patterns to Avoid

- **Don't normalize scores to 0-100 before storing:** Locked decision is to store raw computed values
- **Don't hide individual dimension scores:** Always store alongside total for UI breakdown
- **Don't allow user override of recommended pick:** Locked as purely algorithmic
- **Don't show uncertainty/confidence intervals:** Point estimates only (deferred)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interval overlap detection | Custom nested loop O(n²) | Sort + sweep O(n log n) | Performance matters for large interval sets |
| Weighted sum calculation | Build from scratch | Use existing pattern in orchestrator | Already proven, maintain consistency |
| Expandable card UI | Build custom collapsible | Extend existing AutoProposalSetCard | Matches SuggestionPanel pattern |

**Key insight:** The existing `full-auto-orchestrator.ts` already has scoring logic - it just needs weights updated and overlap scoring added. Don't rebuild from scratch.

## Common Pitfalls

### Pitfall 1: Weight Values Don't Sum to 1.0

**What goes wrong:** Total scores become unpredictable if weights don't normalize to 100%

**Why it happens:** Copy-paste errors or updating some weights but not others

**How to avoid:** Use `as const` TypeScript assertion and validate at runtime:
```typescript
const WEIGHTS = {
  relevance: 0.40,
  continuity: 0.30,
  overlapMin: 0.20,
  coverage: 0.10,
} as const;

// Validate sum = 1.0
const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(WEIGHT_SUM - 1.0) > 0.001) {
  throw new Error(`Weights must sum to 1.0, got ${WEIGHT_SUM}`);
}
```

**Warning signs:** Total scores unexpectedly high/low

### Pitfall 2: Overlap Detection Returns Wrong Result for Adjacent Intervals

**What goes wrong:** Intervals that touch but don't overlap are incorrectly flagged as overlapping

**Why it happens:** Using `<` instead of `<=` in sweep algorithm

**How to avoid:** Use strict less-than (`<`) for start < previous_end check:
```typescript
// Correct: adjacent intervals (end=20, start=20) don't overlap
if (sorted[i].startPercent < sorted[i - 1].endPercent) {
  return true;
}
```

**Warning signs:** Non-overlapping packages get penalty

### Pitfall 3: Penalty Applied Multiple Times

**What goes wrong:** If a package has overlap, it gets penalized in both the overlap_minimization score AND the penalty multiplier

**Why it happens:** Confusing overlap scoring (how much overlap) with penalty (enforcing hard constraint)

**How to avoid:** Use penalty as pure multiplier AFTER weighted sum, not as part of dimension scoring:
```typescript
// Correct: overlap_min scores the dimension, penalty multiplies total
const weightedSum = relevance*0.4 + continuity*0.3 + overlapMin*0.2 + coverage*0.1;
const total = hasOverlap ? weightedSum * 0.5 : weightedSum;
```

**Warning signs:** Packages with any overlap get very low scores regardless of other dimensions

### Pitfall 4: UI Shows "Recommended" Badge on Non-Highest Score

**What goes wrong:** Sorting instability causes wrong package to be marked recommended

**Why it happens:** Not re-calculating ranks after sorting

**How to avoid:** Always re-assign rank after sorting:
```typescript
const ranked = packages
  .sort((a, b) => b.score.total - a.score.total)
  .slice(0, TOP_SET_LIMIT)
  .map((pkg, index) => ({
    ...pkg,
    rank: index + 1,
    isRecommended: index === 0,  // First after sort = recommended
  }));
```

## Code Examples

### Complete Scoring Function (Updated for Locked Decisions)

```typescript
// Source: Updated from existing full-auto-orchestrator.ts

interface TimeInterval {
  startPercent: number;
  endPercent: number;
  strength: number;
}

interface WarpProfile {
  name: string;
  emphasis: 'aggressive' | 'balanced' | 'conservative';
  intervals: TimeInterval[];
}

// Locked weights from CONTEXT.md
const SCORE_WEIGHTS = {
  relevance: 0.40,
  continuity: 0.30,
  overlapMin: 0.20,
  coverage: 0.10,
} as const;

const OVERLAP_PENALTY = 0.5;  // 50% reduction when overlap exists
const OVERLAP_PENALTY_THRESHOLD = 0.3;  // Apply if overlap > 30%

function scorePackage(warp: WarpProfile): {
  score: AutoProposalScoreBreakdown;
  hasSignificantOverlap: boolean;
} {
  // 1. Score each dimension (raw values, not normalized)
  const relevance = scoreRelevance(warp);
  const continuity = scoreContinuity(warp);
  const overlapMin = scoreOverlapMinimization(warp.intervals);
  const coverage = scoreCoverage(warp);
  
  // 2. Check for significant overlap (threshold-based)
  const hasSignificantOverlap = overlapMin < (1 - OVERLAP_PENALTY_THRESHOLD) * 100;
  
  // 3. Calculate weighted sum
  const weightedSum = 
    relevance * SCORE_WEIGHTS.relevance +
    continuity * SCORE_WEIGHTS.continuity +
    overlapMin * SCORE_WEIGHTS.overlapMin +
    coverage * SCORE_WEIGHTS.coverage;
  
  // 4. Apply penalty as separate multiplier layer
  const penaltyMultiplier = hasSignificantOverlap ? OVERLAP_PENALTY : 1.0;
  const total = Math.round(weightedSum * penaltyMultiplier);
  
  return {
    score: {
      relevance,
      continuity,
      overlap: overlapMin,  // Store as 'overlap' in type
      coverage,
      total,
    },
    hasSignificantOverlap,
  };
}
```

### Extending AutoProposalSetCard with "Why Recommended"

```typescript
// Source: Based on existing AutoProposalSetCard.tsx structure
interface AutoProposalSetCardProps {
  proposalSet: AutoProposalSet;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (id: string) => void;
  startEpoch?: number;
  endEpoch?: number;
  whyRecommended?: string;  // NEW PROP
}

// In render:
{isRecommended && proposalSet.reasonMetadata?.whyRecommended && (
  <div className="mt-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
    <div className="flex items-center gap-1 font-medium text-emerald-300">
      <Sparkles className="size-3" />
      Why recommended
    </div>
    <p className="mt-0.5 text-emerald-200/90">
      {proposalSet.reasonMetadata.whyRecommended}
    </p>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple weighted average | Weighted sum + penalty multiplier | CONTEXT.md decision | Allows hard constraints (overlap) that override soft scores |
| Coverage 30%, Relevance 25% | Coverage 10%, Relevance 40% | Locked decision | Shifts emphasis to relevance over coverage |
| contextFit dimension | Removed in favor of 4 dimensions | Locked decision | Simpler, more focused scoring |

**Deprecated/outdated:**
- contextFit scoring: Removed per locked decision (4 dimensions only)
- Confidence intervals: Deferred to future phase
- User weight adjustment: Deferred to future phase

## Open Questions

1. **"Why recommended" exact phrasing**
   - What we know: Should include top 2 contributing dimensions
   - What's unclear: Should it mention penalty? Capitalization format?
   - Recommendation: Use "Best: relevance + continuity" format (lowercase dimensions, "+" separator)

2. **Overlap penalty threshold**
   - What we know: Penalty should apply for "significant" overlap
   - What's unclear: What percentage threshold defines "significant"?
   - Recommendation: Use 30% overlap as threshold (OVERLAP_PENALTY_THRESHOLD = 0.3)

3. **Context adaptation approach**
   - What we know: Single global weights is simpler to implement
   - What's unclear: Should we start with global weights or build context-specific internally?
   - Recommendation: Start with single global weights (simpler, can evolve later)

## Sources

### Primary (HIGH confidence)
- Context7: Not applicable (this is custom scoring logic)
- Official docs: N/A - project-specific implementation
- Existing codebase: `src/lib/full-auto-orchestrator.ts` - current scoring implementation
- Existing types: `src/types/autoProposalSet.ts` - AutoProposalScoreBreakdown structure

### Secondary (MEDIUM confidence)
- Wikipedia: Weighted sum model - confirmed standard MCDA approach
- npm: interval-operations package - verified efficient interval operations exist
- WebSearch: Various interval overlap algorithms - cross-verified with standard CS algorithms

### Tertiary (LOW confidence)
- Stack Overflow: Various interval overlap implementations - marked for validation
- Academic papers on MCDA: Confirmed weighted sum is established approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing project dependencies, no new libraries needed
- Architecture: HIGH - existing patterns well-established in codebase
- Pitfalls: HIGH - common mistakes well-documented in algorithm literature

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days - algorithm patterns are stable)
