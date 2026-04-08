# Phase 53: Add dedicated uniform-events timeslicing route - Research

**Researched:** 2026-03-11
**Domain:** Next.js App Router route duplication with mode-specific adaptive binning defaults
**Confidence:** HIGH

## Summary

This repo already has a proven pattern for "near-duplicate route with route-local behavior": `src/app/timeline-test-3d/page.tsx` reuses shared UI/workflow pieces from other routes while keeping orchestration and defaults local. It imports existing components (including from `src/app/timeslicing/components/*`) and keeps route-specific logic (data mirroring, acceptance handlers, mode wiring) in the route file plus a small `lib/route-orchestration.ts` helper.

For Phase 53, the implementation should follow that model: create a dedicated route that reuses the existing timeslicing UI/workflows, but injects `uniform-events` at route boundaries (compute/fetch defaults) instead of introducing a mutable global toggle. The main technical risk is current pathname-based mode detection in `MainScene` (`pathname?.startsWith('/timeslicing')`), which will silently miss the new route unless explicitly updated.

Testing in this repo favors targeted contract tests for wiring regressions: route intent tests (source assertion), store contract tests (worker payload), and query/cache contract tests (cache key includes binning mode). Use all three layers for this phase.

**Primary recommendation:** Add a dedicated route that composes a shared timeslicing shell and passes route-level `binningMode: 'uniform-events'` defaults explicitly; remove/replace pathname heuristics with an explicit route config contract.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `16.1.6` | File-system routes (`src/app/**/page.tsx`) | Existing routes are implemented this way; no custom router layer |
| React | `19.2.3` | Client route composition and effects | All route orchestration and shared UI are React client components |
| Zustand | `5.0.10` | Cross-route timeline/adaptive/suggestion state | Current timeslicing workflow is store-centric (`useAdaptiveStore`, `useSuggestionStore`, etc.) |
| Vitest | `4.0.18` | Route/store/query regression tests | Existing contract tests use Vitest patterns consistently |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next route handlers (`next/server`) | bundled with Next 16 | API wiring for adaptive global maps | For route-specific API parameter/contract tests |
| Sonner | `2.0.7` | Existing toast UX in timeslicing route | Reuse as-is when cloning timeslicing shell |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated route defaults | In-route toggle/query-param mode switch | Easier initial diff, but higher regression risk from mixed-mode state and cache key ambiguity |
| Explicit mode prop/config | Pathname string heuristic | Fewer plumbing changes short-term, but brittle and easy to break on new routes |

**Installation:**
```bash
# No new packages required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/timeslicing/                           # Existing timeslicing UI + workflows
├── app/<new-uniform-events-route>/            # New dedicated route entry
│   ├── page.tsx                               # Route-local defaults and wiring
│   ├── page.binning-mode.test.ts              # Route intent guard test
│   └── lib/route-orchestration.ts             # Optional, if extracting shared orchestration
├── components/viz/                            # Shared scene; avoid hardcoded pathname mode logic
└── store/, lib/queries/, app/api/adaptive/    # Existing mode contracts to preserve
```

### Pattern 1: Near-duplicate route via shared components + route-local orchestration
**What:** Keep orchestration in route page, import shared components/helpers from existing route.
**When to use:** New route has mostly same UI/workflow but different defaults/constraints.
**Example:**
```typescript
// Source: src/app/timeline-test-3d/page.tsx
import { SuggestionToolbar } from "@/app/timeslicing/components/SuggestionToolbar";
import { planFullAutoAcceptanceArtifacts } from "@/app/timeslicing/full-auto-acceptance";
// ...route-local handlers and wiring remain local to this route
```

### Pattern 2: Inject mode at compute boundary, not via hidden global toggle
**What:** Pass `binningMode` in `computeMaps` call where route behavior diverges.
**When to use:** Route must lock `uniform-events` behavior while sharing stores/workflows.
**Example:**
```typescript
// Source: src/app/timeslicing/page.tsx
useAdaptiveStore
  .getState()
  .computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: 'uniform-events' });
```

### Pattern 3: API + cache contract includes binning mode in cache key
**What:** Ensure route-level mode reaches API/query layer and mode-specific cache key.
**When to use:** Precomputed global adaptive maps are fetched/rehydrated.
**Example:**
```typescript
// Source: src/lib/queries.ts
const cacheKey = `global:${safeBinCount}:${safeKernelWidth}:${safeBinningMode}`;
```

### Anti-Patterns to Avoid
- **Pathname-only mode inference:** Current `pathname?.startsWith('/timeslicing')` in `MainScene` is brittle for new sibling routes; use explicit route config/prop.
- **Copy-paste full page without extraction:** `timeslicing/page.tsx` is large; duplicate drift risk is high unless shared orchestration helpers are extracted.
- **Route toggle mutating shared mode state:** Prefer immutable route defaults; shared stores currently do not model a persistent global `binningMode` field.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route-clone suggestion workflow | New acceptance/event protocol | Existing `SuggestionToolbar`, `SuggestionPanel`, acceptance event names | Existing workflows already dispatch/listen on stable event names |
| Adaptive mode plumbing | New mode enum/store branch | Existing `computeMaps(..., { binningMode })` path | Worker/store/query path already supports both modes |
| Global map mode cache | Separate ad-hoc cache table/key | Existing `getOrCreateGlobalAdaptiveMaps` mode-aware cache key | Prevents cross-mode cache contamination |
| Regression checks | Full E2E-only coverage | Existing lightweight Vitest contract tests | Faster and already used for mode/query contracts |

**Key insight:** The repo already has mode-aware compute + cache contracts; Phase 53 should wire into them, not introduce parallel abstractions.

## Common Pitfalls

### Pitfall 1: New route does not trigger uniform-events in scene/global fetch
**What goes wrong:** Route renders but uses `uniform-time` for global map hydration.
**Why it happens:** `MainScene` currently keys off `pathname?.startsWith('/timeslicing')`.
**How to avoid:** Replace pathname heuristic with explicit mode prop or central route-mode resolver that includes the new route.
**Warning signs:** Global fetch query lacks `binningMode=uniform-events`; UI behavior differs from existing `/timeslicing` route.

### Pitfall 2: Route-level duplicate logic drifts from original timeslicing workflow
**What goes wrong:** Accept handlers/events diverge, causing inconsistent slice/warp behavior.
**Why it happens:** Large copy of `timeslicing/page.tsx` with manual edits.
**How to avoid:** Extract shared orchestration helpers (as done in `timeline-test-3d/lib/route-orchestration.ts`) and keep route file mostly configuration/defaults.
**Warning signs:** One route updates full-auto acceptance behavior while the other silently lags.

### Pitfall 3: Cache contract regressions between modes
**What goes wrong:** Uniform-events route reads uniform-time cache (or vice versa).
**Why it happens:** Missing mode in API call or cache key.
**How to avoid:** Preserve mode in API query param and verify query-layer key is mode-sensitive.
**Warning signs:** Identical cache key used across both routes; unexpected count map semantics.

### Pitfall 4: Store state leakage across route transitions
**What goes wrong:** Prior route slices/warps remain active when entering dedicated route.
**Why it happens:** Shared Zustand stores persist across route navigation; mount reset missing.
**How to avoid:** Keep/reset logic on mount (e.g., `clearSlices()` pattern in `timeslicing/page.tsx`).
**Warning signs:** Fresh route load shows old slice artifacts before user interaction.

## Code Examples

Verified patterns from this repository:

### Route intent guard test (wiring regression)
```typescript
// Source: src/app/timeslicing/page.binning-mode.test.ts
const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
expect(pageSource).toMatch(/computeMaps\([\s\S]*?binningMode:\s*'uniform-events'/);
```

### Store contract test for worker payload
```typescript
// Source: src/store/useAdaptiveStore.test.ts
useAdaptiveStore
  .getState()
  .computeMaps(Float32Array.from([1, 2, 3]), [0, 10], { binningMode: 'uniform-events' });

const firstArg = worker.postMessage.mock.calls[0]?.[0] as { config: { binningMode?: string } };
expect(firstArg.config.binningMode).toBe('uniform-events');
```

### Query/cache contract test for mode-sensitive key
```typescript
// Source: src/lib/queries.test.ts
const result = await getOrCreateGlobalAdaptiveMaps(256, 4, 'uniform-events');
expect(params[0]).toBe('global:256:4:uniform-events');
expect(result.binningMode).toBe('uniform-events');
```

### API mode resolution pattern
```typescript
// Source: src/app/api/adaptive/global/route.ts
const resolveBinningMode = (rawMode: string | null): 'uniform-time' | 'uniform-events' => {
  return rawMode === 'uniform-events' ? 'uniform-events' : 'uniform-time';
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Implicit single-mode assumptions | Explicit `AdaptiveBinningMode` union across store/worker/query layers | Already present in current repo state | Dedicated route can be implemented mostly as wiring/defaults |
| Cache key not mode-aware (historical risk) | Cache key includes `:${binningMode}` | Already present in current repo state | Prevents cross-mode cache pollution |
| Route-level behavior inferred ad hoc | Mixed state today: explicit override in `timeslicing/page.tsx`, pathname heuristic in `MainScene` | Current state (inconsistent) | Main risk area for Phase 53; unify toward explicit config |

**Deprecated/outdated:**
- Pathname-prefix mode detection as the sole route contract (`startsWith('/timeslicing')`) is effectively outdated once a second dedicated uniform-events route exists.

## Open Questions

1. **Final path name for the dedicated route**
   - What we know: Current logic hardcodes `/timeslicing` prefix in `MainScene`.
   - What's unclear: Exact new route path string.
   - Recommendation: Planner should include a task to centralize route->mode mapping to avoid future path-coupling.

2. **Scope of extraction vs minimal clone**
   - What we know: `timeslicing/page.tsx` is large; `timeline-test-3d` shows extraction precedent.
   - What's unclear: Whether this phase should include refactor or strict minimal duplication.
   - Recommendation: Minimum safe extraction: shared mode/default config + shared acceptance/orchestration helpers.

## Sources

### Primary (HIGH confidence)
- `src/app/timeslicing/page.tsx` - Existing uniform-events route override and route orchestration
- `src/components/viz/MainScene.tsx` - Current route-based mode inference risk (`pathname` heuristic)
- `src/app/timeline-test-3d/page.tsx` - Existing near-duplicate route composition pattern
- `src/app/timeline-test-3d/lib/route-orchestration.ts` - Shared helper extraction precedent
- `src/store/useAdaptiveStore.ts` - Mode default and worker payload contract
- `src/store/useAdaptiveStore.test.ts` - Store contract tests for mode wiring
- `src/lib/queries.ts` - Mode-sensitive global cache/API contract
- `src/lib/queries.test.ts` - Cache key + mode regression tests
- `src/app/api/adaptive/global/route.ts` - API mode parsing contract
- `src/app/api/crimes/range/route.test.ts` - Route handler testing style used in repo
- `src/app/timeslicing/page.binning-mode.test.ts` - Route-intent test pattern used in repo

### Secondary (MEDIUM confidence)
- None required; repository evidence was sufficient for this phase.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly verified from `package.json` and active route/store usage
- Architecture: HIGH - Verified from existing near-duplicate routes and helper extraction pattern
- Pitfalls: HIGH - Derived from concrete current code paths and existing contract tests

**Research date:** 2026-03-11
**Valid until:** 2026-04-10
