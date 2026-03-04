# Phase 42: Full-Auto Package Acceptance Alignment (Gap Closure) - Research

**Researched:** 2026-03-04
**Domain:** Full-auto timeslicing package contract alignment (generation -> acceptance)
**Confidence:** HIGH

## Summary

The current v1.3 gap is a producer/consumer contract mismatch inside the existing full-auto flow. The producer (`generateRankedAutoProposalSets`) currently emits ranked sets with `warp` populated but typically no `intervals`, while the package acceptance consumer (`handleAcceptFullAutoPackage`) only applies intervals when `proposalSet.intervals?.boundaries` exists. That makes acceptance behavior effectively warp-only for normal generated sets, which violates the milestone expectation "accept package applies warp + intervals together."

The most reliable fix is to restore a package-complete generation contract: every normal generated full-auto set should include both `warp` and `intervals` (valid boundaries). Acceptance logic can remain mostly as-is, with a stronger guard to treat missing intervals as degraded/legacy input instead of normal behavior. This keeps ranking, recommendation rationale, and manual rerun semantics unchanged because those are already isolated in existing scoring/selection paths.

A consumer-side-only fallback is possible (derive intervals during acceptance when missing), but it weakens determinism and can produce acceptance-time outputs that were not review-time outputs. For this phase, that tradeoff is not ideal.

**Primary recommendation:** Make generated full-auto proposal sets package-complete (`warp + intervals`) in `full-auto-orchestrator`, and treat missing intervals as non-standard/legacy in acceptance path.

## Contract Mismatch (Producer vs Consumer)

Current mismatch in code paths:

1. **Producer emits warp-only sets (normal path):**
   - `src/lib/full-auto-orchestrator.ts:52` generates warp candidates only.
   - `src/lib/full-auto-orchestrator.ts:74` explicitly ranks "warp-only packages".
   - Returned `AutoProposalSet` objects omit `intervals` in map at `src/lib/full-auto-orchestrator.ts:76`.
   - Test currently enforces warp-only behavior: `src/lib/full-auto-orchestrator.test.ts:49`-`src/lib/full-auto-orchestrator.test.ts:50`.

2. **Consumer conditionally applies intervals only if present:**
   - `src/app/timeslicing/page.tsx:456` package accept handler applies warp slices first.
   - Interval application is conditional at `src/app/timeslicing/page.tsx:496`-`src/app/timeslicing/page.tsx:502`.
   - Result: for normal generated sets, interval branch is skipped (critical audit gap).

3. **Supporting evidence in generation bridge:**
   - `src/hooks/useSuggestionGenerator.ts:284` has explicit note: "Full-auto packages are warp-only, no interval boundaries".

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.9.3 | Type-safe package contract evolution | Existing full-auto contracts/types are TS-first (`AutoProposalSet`) |
| React + Next.js | 19.2.3 / 16.1.6 | UI acceptance flow and event wiring | Acceptance behavior is implemented in route component lifecycle/hooks |
| Zustand | ^5.0.10 | Full-auto package state handoff (generator -> UI) | Current package state source-of-truth is `useSuggestionStore` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.0.18 | Unit tests for orchestrator contract | Required for contract lock and regression checks |
| Internal `interval-detection` module | in-repo | Boundary generation (`detectBoundaries`) | Use when producing package interval artifacts |
| Internal `warp-generation` module | in-repo | Warp candidate generation | Keep as existing producer of warp candidates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Producer-side package completion | Consumer-side fallback generation at accept time | Faster patch, but review-time vs accept-time outputs can diverge |
| Keep optional intervals for normal generated sets | Require intervals for generated sets (keep optional for debug/legacy only) | Slight migration effort, but prevents repeat of this exact gap |

**Installation:**
```bash
npm install
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/                      # generation/scoring/orchestration domain logic
├── hooks/                    # generation trigger + context extraction bridge
├── store/                    # full-auto package state and selection
└── app/timeslicing/          # acceptance consumer and UI orchestration
```

### Pattern 1: Package-Complete Generation Contract
**What:** `generateRankedAutoProposalSets` returns top ranked sets with both `warp` and `intervals` for normal generation.
**When to use:** Every auto/manual full-auto generation run that feeds package acceptance.
**Example:**
```typescript
// Source: src/lib/full-auto-orchestrator.ts (recommended target shape)
return {
  id: warp.emphasis,
  rank: 0,
  isRecommended: false,
  confidence: Math.round((warp.confidence + score.total) / 2),
  score,
  warp,
  intervals: {
    boundaries,
    method: boundary.method,
    confidence: boundary.confidence,
  },
};
```

### Pattern 2: Acceptance Applies Artifacts, Not Derivation
**What:** Acceptance consumes already-generated package artifacts (`warp`, `intervals`) and applies them atomically.
**When to use:** `accept-full-auto-package` event path.
**Example:**
```typescript
// Source: src/app/timeslicing/page.tsx
proposalSet.warp.intervals.forEach(/* create warp slices */);

if (proposalSet.intervals?.boundaries && proposalSet.intervals.boundaries.length >= 2) {
  handleAcceptIntervalBoundary({ boundaries: proposalSet.intervals.boundaries }, 'suggestion', proposalSet.id);
}
```

### Pattern 3: Ranking/Recommendation Isolation
**What:** Keep score weights, rank ordering, recommended selection, and whyRecommended generation independent of interval payload filling.
**When to use:** While modifying generation contract for this phase.
**Example:**
```typescript
// Source: src/lib/full-auto-orchestrator.ts
const score = scoreWarpOnly(warp);
const whyRecommended = generateWhyRecommended(set.score, SCORE_WEIGHTS);
```

### Anti-Patterns to Avoid
- **Acceptance-time synthetic package mutation:** Do not silently create interval boundaries during accept unless explicitly in fallback path; it hides review/accept mismatch.
- **Coupling ranking to boundary generation side effects:** Ranking criteria from Phase 41 must stay stable.
- **Changing manual rerun trigger semantics:** `Rerun Full-Auto` behavior and auto-run status messaging should remain unchanged.

## Implementation Options and Tradeoffs

### Option A (Recommended): Producer-side package completion
**How:** In `full-auto-orchestrator`, generate one interval boundary suggestion per run (or deterministic per set if intentionally desired), attach interval set to each ranked proposal.

**Pros:**
- Restores contract where generated package already contains artifacts acceptance applies.
- Keeps acceptance path simple and deterministic.
- Aligns with milestone definition and existing UX mental model.

**Cons:**
- Requires updates to orchestrator tests and possibly type-level assumptions.
- Need to decide deterministic boundary strategy (shared boundaries across sets vs per-set boundaries).

### Option B: Consumer-side fallback generation when intervals missing
**How:** Keep producer warp-only; in `handleAcceptFullAutoPackage`, if `intervals` absent, compute boundaries on demand from current context and apply.

**Pros:**
- Minimal change footprint in producer.
- Quick gap closure behaviorally.

**Cons:**
- Acceptance output may differ from what user reviewed in package card.
- Harder to test deterministically; can vary with current page context.
- Keeps upstream contract ambiguous and risks regressions.

### Option C: Semantics redefinition (warp-only acceptance)
**How:** Update roadmap/UAT/audit expectations to warp-only package acceptance.

**Pros:**
- Smallest code change.

**Cons:**
- Conflicts with stated Phase 42 goal and milestone gap-closure requirement.
- Drops previously intended "accept warp + intervals" behavior.

## Recommendation

Use **Option A**.

Rationale:
- It closes the exact producer/consumer mismatch instead of masking it.
- It preserves existing acceptance architecture (apply package artifacts) and Phase 41 ranking outputs.
- It has clean migration boundaries: orchestrator contract + tests, with only light safety hardening in consumer.

Migration impact:
- **Data contract:** Generated `AutoProposalSet` should include `intervals` for standard full-auto runs.
- **Backward compatibility:** Keep `intervals` optional at type level for debug/legacy payloads, but treat missing intervals as non-standard path.
- **Behavioral:** Normal accepted package applies both warp slices and interval slices consistently.
- **Non-goals (must stay intact):** ranking order, `whyRecommended`, low-confidence/no-result messaging, manual rerun trigger/status.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interval boundary detection | Ad-hoc boundary splitting inside page accept handler | `detectBoundaries` from `src/lib/interval-detection.ts` | Existing method/snap/confidence behavior already encoded and reused |
| Global full-auto state wiring | Local component-only package caches | `useSuggestionStore` full-auto fields/actions | Existing state pipeline already drives panel/toolbar selection semantics |
| Ranking explanation logic | Recompute rationale text in UI | `generateWhyRecommended` metadata from orchestrator | Prevents UI/logic drift and preserves Phase 41 output consistency |

**Key insight:** this gap is a contract alignment problem, not a new algorithm problem; fix the contract at the producer boundary, not by ad-hoc consumer logic.

## Common Pitfalls

### Pitfall 1: Fixing behavior without fixing contract
**What goes wrong:** Acceptance appears to work but generator still emits ambiguous package payloads.
**Why it happens:** Quick patch in page handler only.
**How to avoid:** Add explicit orchestrator test asserting generated sets include intervals for normal runs.
**Warning signs:** Tests still assert `intervals` undefined or acceptance path needs hidden fallback to pass.

### Pitfall 2: Breaking ranking/recommendation while touching orchestrator
**What goes wrong:** Rank order or recommended marker changes unexpectedly.
**Why it happens:** Boundary generation inadvertently changes scoring inputs or tie-break logic.
**How to avoid:** Keep scoring based on existing warp-only score dimensions; do not mix interval features into total.
**Warning signs:** `recommendedId` changes for identical fixture data after patch.

### Pitfall 3: Manual rerun regression
**What goes wrong:** Toolbar rerun/status behavior drifts during contract refactor.
**Why it happens:** Over-coupling generation refactor with trigger state logic.
**How to avoid:** Limit trigger/status changes to none; verify same rerun button path and status text transitions.
**Warning signs:** `autoRunStatus`/`lastRunSource` messages no longer match current behavior.

### Pitfall 4: Context-range boundary mismatch
**What goes wrong:** Boundaries generated in one range are applied in another, producing clamped/odd slices.
**Why it happens:** Generation context (`visible`/`all`) differs from acceptance mapping range.
**How to avoid:** Ensure boundaries are generated against same effective time range used by acceptance or explicitly normalize.
**Warning signs:** Many accepted intervals collapse to 0% or 100%.

## Code Examples

Verified patterns from existing code:

### Orchestrator ranking entry point
```typescript
// Source: src/lib/full-auto-orchestrator.ts:33
export function generateRankedAutoProposalSets(options: {
  crimes: CrimeRecord[];
  context: AutoProposalContext;
  params: FullAutoGenerationParams;
}): RankedAutoProposalSets
```

### Acceptance event path
```typescript
// Source: src/app/timeslicing/page.tsx:554
const handleFullAutoPackageEvent = (e: Event) => {
  const customEvent = e as CustomEvent<{ proposalSetId?: string }>;
  handleAcceptFullAutoPackage(customEvent.detail?.proposalSetId);
};
```

### Existing conditional interval apply branch
```typescript
// Source: src/app/timeslicing/page.tsx:496
if (proposalSet.intervals?.boundaries && proposalSet.intervals.boundaries.length >= 2) {
  handleAcceptIntervalBoundary({ boundaries: proposalSet.intervals.boundaries }, 'suggestion', proposalSet.id);
}
```

## Concrete Files Likely to Change

- `src/lib/full-auto-orchestrator.ts` (primary contract fix: attach interval sets to generated packages)
- `src/lib/full-auto-orchestrator.test.ts` (update/add tests for package-complete contract + keep ranking invariants)
- `src/hooks/useSuggestionGenerator.ts` (remove/update warp-only comment and any assumptions)
- `src/app/timeslicing/page.tsx` (optional safety hardening for missing intervals path, no behavior drift)
- `src/types/autoProposalSet.ts` (optional type contract note/tightening for generated sets)
- `src/app/timeslicing/components/SuggestionToolbar.tsx` (only if debug package path needs parity with new contract assertions)

## Verification Checks

### Automated (must-have)
- Update orchestrator unit test to assert normal generated sets include `intervals.boundaries.length >= 2`.
- Keep existing assertions for top-3 ranking order, `recommendedId`, and deterministic ordering.
- Add regression test that low-confidence/no-result metadata still emits unchanged.

### Manual checks (must-have)
- Enter `/timeslicing` and wait for auto-run: full-auto cards render top-3 as before.
- Accept selected generated package: verify both warp overlay and interval slices are applied in one action.
- Rerun via toolbar (`Rerun Full-Auto`): verify rerun still refreshes package set and status copy remains correct.
- Confirm recommended badge + "Why recommended" text unchanged for top-ranked package.

### Manual checks (targeted edge)
- No-result context: acceptance button remains blocked and guidance message still shown.
- Low-confidence context: warning messaging still shown and acceptance still available.
- Debug package (dev): acceptance still works whether intervals exist or not (legacy-safe behavior).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 40 intent: package-complete (`warp + intervals`) acceptance | Runtime currently behaves mostly warp-only for generated packages | Drift visible in v1.3 audit (2026-03-04) | Critical E2E flow mismatch |
| Optional `intervals` tolerated as normal generated state | Optional `intervals` should be treated as legacy/debug-only generated exception | Phase 42 gap closure target | Restores deterministic review -> accept parity |

**Deprecated/outdated:**
- "Full-auto packages are warp-only" assumption in generation flow (`src/hooks/useSuggestionGenerator.ts:284`) should be removed for normal generated sets.

## Open Questions

1. **Boundary strategy per package vs shared across ranked sets**
   - What we know: Existing ranking scores are warp-based; boundaries are not currently part of score dimensions.
   - What's unclear: Whether each ranked set should carry identical interval boundaries or per-set boundaries.
   - Recommendation: Use one deterministic boundary set per generation run initially (shared), to minimize ranking behavior drift.

2. **Type strictness for intervals in `AutoProposalSet`**
   - What we know: `intervals` is optional today and used by debug/legacy payloads.
   - What's unclear: Whether to make `intervals` required globally vs enforce only for generated paths.
   - Recommendation: Keep optional type for compatibility, but enforce generated-set completeness through tests and runtime guards.

## Sources

### Primary (HIGH confidence)
- `src/lib/full-auto-orchestrator.ts` - producer behavior, ranking logic, metadata generation
- `src/lib/full-auto-orchestrator.test.ts` - current contract assertions (warp-only expected)
- `src/app/timeslicing/page.tsx` - package acceptance consumer behavior
- `src/hooks/useSuggestionGenerator.ts` - generation-to-store bridge assumptions
- `src/lib/interval-detection.ts` - existing boundary generation utility
- `.planning/v1.3-v1.3-MILESTONE-AUDIT.md` - critical integration/flow gap statement
- `.planning/ROADMAP.md` - Phase 42 scope and constraints

### Secondary (MEDIUM confidence)
- `.planning/phases/40-fully-automated-timeslicing-orchestration/40-CONTEXT.md` - original acceptance semantics intent
- `.planning/phases/41-full-auto-optimization-ranking/41-02-SUMMARY.md` - preserve ranking/recommendation behavior constraints

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all based on in-repo package versions and active code usage.
- Architecture: HIGH - traced concrete producer/consumer paths in current implementation.
- Pitfalls: HIGH - directly derived from observed mismatch and existing trigger/ranking design.

**Research date:** 2026-03-04
**Valid until:** 2026-04-03
