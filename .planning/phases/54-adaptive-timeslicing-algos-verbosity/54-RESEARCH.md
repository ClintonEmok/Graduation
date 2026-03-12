# Phase 54: Adaptive timeslicing in algos route with verbose diagnostics - Research

**Researched:** 2026-03-12
**Domain:** Next.js route-scoped adaptive timeslicing mode selection + diagnostics
**Confidence:** HIGH

## Summary

`/timeslicing-algos` already has route-local mode controls and compute wiring, but only for `uniform-time` and `uniform-events`. The route uses `mode` query param, writes it back into URL, and calls `useAdaptiveStore.getState().computeMaps(..., { binningMode: activeMode })` in `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx:26` and `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx:102`.

The centralized resolver (`resolveRouteBinningMode`) is already the correct integration seam for preserving override precedence and route defaults (`/timeslicing` -> `uniform-time`, `/timeslicing-algos` -> `uniform-events`) in `src/lib/adaptive/route-binning-mode.ts:7`. Backend/API and cache plumbing are already mode-aware for `uniform-time` vs `uniform-events`, including mode-sensitive cache keys (`global:${binCount}:${kernelWidth}:${mode}`) in `src/lib/queries.ts:329`.

For Phase 54 planning, the safest path is to add an explicit algos-route intent layer that can represent `adaptive` without widening the core `AdaptiveBinningMode` contract. Then resolve to an effective existing binning mode via the central resolver, and expose diagnostics (UI + optional guarded log) that show selected intent, effective mode, request params, and derived cache-key context.

**Primary recommendation:** Implement `adaptive` as route intent (`mode=adaptive`) that resolves through `resolveRouteBinningMode(...)` to an existing effective binning mode, and add a `/timeslicing-algos`-only diagnostics panel with deterministic tests for fallback transparency.

## Current-State Map

| Area | File | Current contract/behavior |
|------|------|---------------------------|
| Algos route shell | `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` | Reads `mode` query param, defaults invalid/null to `uniform-events`, computes maps with selected mode, renders mode buttons + timeline. |
| Algos algorithm registry | `src/app/timeslicing-algos/lib/algorithm-options.ts` | Option registry has active `uniform-time`/`uniform-events`; future placeholders `stkde`/`kde` are non-active. |
| Central route resolver | `src/lib/adaptive/route-binning-mode.ts` | Explicit override wins when valid (`uniform-time`/`uniform-events`), else route default. |
| Resolver tests | `src/lib/adaptive/route-binning-mode.test.ts` | Covers route defaults, explicit override precedence, safe fallback for unknown/null paths. |
| Global adaptive fetch wiring | `src/components/viz/MainScene.tsx` | Fetches `/api/adaptive/global?binningMode=${activeBinningMode}` using resolver output; falls back to local compute on fetch error. |
| Adaptive API route | `src/app/api/adaptive/global/route.ts` | Accepts `binningMode`, coerces to `uniform-time` unless exactly `uniform-events`, returns maps + `binningMode`. |
| Global cache + key | `src/lib/queries.ts` + `src/lib/queries/aggregations.ts` | Mode-sensitive cache key and persisted `binning_mode` column; map contract includes `countMap` and `binningMode`. |
| Existing route intent tests | `src/app/timeslicing-algos/page.timeline-algos.test.ts` | Static-source checks for route shell mount, two mode strings, and exclusion of suggestion workflow UI. |

## Standard Stack

The established libraries/tools for this phase domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `16.1.6` | Route/page + API route implementation | Existing app uses App Router conventions for route-local behavior and server endpoints. |
| React + hooks | `19.2.3` | Route shell state/effects/search-param wiring | Existing route mode controls and timeline wiring are hook-based. |
| Zustand | `5.0.10` | Adaptive/timeline shared state contracts | `useAdaptiveStore` is the authoritative compute contract boundary. |
| Vitest | `4.0.18` | Regression testing | Existing phase guardrails and API tests are all Vitest. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | `5.90.21` | Request key and fetch caching (`useCrimeData`) | For diagnostics exposing query context and request shape. |
| Web Worker API | browser native | Adaptive map computation (`adaptiveTime.worker.ts`) | For mode-specific compute payload verification. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Route intent + resolver (`adaptive` -> effective mode) | Widen `AdaptiveBinningMode` to include `adaptive` everywhere | Increases cross-layer type churn (store, worker, API, DB), and creates more fallback surfaces for this phase. |
| Route-local diagnostics panel | Global logger/event system changes | Violates scope constraint (must stay `/timeslicing-algos` scoped). |

**Installation:**
```bash
npm test -- --run src/lib/adaptive/route-binning-mode.test.ts src/app/timeslicing-algos/page.timeline-algos.test.ts
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
|- app/timeslicing-algos/lib/   # route-local mode intent + diagnostics surface
|- lib/adaptive/                # resolver + mode normalization helpers
|- app/api/adaptive/global/     # mode-aware API/fallback behavior
|- lib/queries*                 # cache-key and persistence contract
```

### Pattern 1: Intent -> Effective Mode Resolution
**What:** Model route UI selection as an intent (`uniform-time` | `uniform-events` | `adaptive`) and resolve to effective `AdaptiveBinningMode` through `resolveRouteBinningMode`.
**When to use:** Any `/timeslicing-algos` mode read/write path (URL parse, compute call, diagnostics, API request).
**Example:**
```typescript
// Source: src/lib/adaptive/route-binning-mode.ts
if (isAdaptiveBinningMode(explicitMode)) {
  return explicitMode;
}
if (pathname?.startsWith('/timeslicing-algos')) {
  return 'uniform-events';
}
```

### Pattern 2: Route-Scoped Diagnostics Gate
**What:** Diagnostics render/log only when pathname matches `/timeslicing-algos` and a local verbosity flag is enabled.
**When to use:** Showing effective mode, fallback reason, request params, cache-key context.
**Example:**
```typescript
// Source pattern: src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx
const isAlgosRoute = pathname?.startsWith('/timeslicing-algos');
const diagnosticsEnabled = isAlgosRoute && searchParams.get('verbose') === '1';
```

### Pattern 3: Single Cache-Key Derivation Contract
**What:** Use one helper to derive cache key context from `{ binCount, kernelWidth, effectiveMode }`.
**When to use:** Diagnostics panel text + backend key generation.
**Example:**
```typescript
// Source: src/lib/queries.ts
const cacheKey = `global:${safeBinCount}:${safeKernelWidth}:${safeBinningMode}`;
```

### Anti-Patterns to Avoid
- **Silent coercion without visibility:** API currently coerces unknown mode to `uniform-time`; if `adaptive` intent is introduced, diagnostics must show selected intent and resolved effective mode.
- **Contract widening for this phase:** adding `'adaptive'` to store/worker/API `AdaptiveBinningMode` unions causes avoidable ripple changes.
- **Route leakage:** diagnostics logic in shared/global components without pathname guard pollutes non-algos routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route mode precedence | Per-component if/else trees | `resolveRouteBinningMode(pathname, explicitMode)` | Existing tested source of truth; preserves backward compatibility. |
| Mode validation | Ad hoc string checks in many files | Shared mode parser/guard near resolver | Prevents drift between shell, resolver, API fallback. |
| Cache-key string assembly in multiple layers | Duplicate template literals | Shared helper based on existing `global:${bin}:${kernel}:${mode}` contract | Prevents diagnostics/backend mismatch. |

**Key insight:** Most phase risk is contract drift, not algorithm complexity. Reuse current resolver/store/query contracts and add a thin route intent layer.

## Common Pitfalls

### Pitfall 1: Ambiguous "adaptive" meaning
**What goes wrong:** `adaptive` is treated as a third backend binning algorithm instead of route intent.
**Why it happens:** Current hard contracts only support two binning modes.
**How to avoid:** Keep `adaptive` at route-intent level; always compute `effectiveMode` before any compute/fetch call.
**Warning signs:** Types start changing to `'uniform-time' | 'uniform-events' | 'adaptive'` in worker/API/query layers.

### Pitfall 2: Silent fallback regression
**What goes wrong:** Invalid/unknown mode resolves silently and QA cannot tell whether fallback occurred.
**Why it happens:** API and resolver intentionally default to safe modes.
**How to avoid:** Diagnostics must include `selectedIntent`, `effectiveMode`, and `fallbackApplied` boolean/reason.
**Warning signs:** Tests only assert status 200, not mode echo/fallback metadata.

### Pitfall 3: Diagnostics noise outside algos route
**What goes wrong:** Verbose logs appear in other routes or CI logs.
**Why it happens:** Unscoped `console.*` in shared hooks/components.
**How to avoid:** Gate diagnostics by pathname and explicit `verbose` flag.
**Warning signs:** logs appear when visiting `/timeslicing` or `/dashboard`.

### Pitfall 4: Test coverage remains string-only
**What goes wrong:** Source-text regex tests pass while runtime behavior regresses.
**Why it happens:** Existing `page.timeline-algos.test.ts` uses file-content assertions.
**How to avoid:** Add behavior tests for pure helpers/resolvers and API route mode parsing where possible.
**Warning signs:** mode/fallback bugs not caught until manual QA.

## Code Examples

Verified patterns from current source:

### Route mode compute wiring
```typescript
// Source: src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx:102
useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: activeMode });
```

### Global request mode wiring
```typescript
// Source: src/components/viz/MainScene.tsx:28 and :106
const activeBinningMode = resolveRouteBinningMode(pathname, modeOverride);
const response = await fetch(`/api/adaptive/global?binningMode=${activeBinningMode}`);
```

### API mode fallback contract
```typescript
// Source: src/app/api/adaptive/global/route.ts:5
const resolveBinningMode = (rawMode: string | null): 'uniform-time' | 'uniform-events' => {
  return rawMode === 'uniform-events' ? 'uniform-events' : 'uniform-time';
};
```

## Recommended Implementation Approach

1. Add a route-intent type (for `/timeslicing-algos` only): `type AlgosModeIntent = AdaptiveBinningMode | 'adaptive'`.
2. Parse `mode` query into `selectedIntent`; derive `effectiveMode` via `resolveRouteBinningMode(pathname, selectedIntent === 'adaptive' ? null : selectedIntent)`.
3. Keep all existing compute/API contracts on `AdaptiveBinningMode` only; pass `effectiveMode` to `computeMaps` and request payloads.
4. Add route-local diagnostics block (behind `verbose=1` or route-local toggle) showing:
   - selected intent
   - effective mode
   - fallback status/reason
   - fetch params (`binCount`, `kernelWidth`, `binningMode`)
   - derived cache key context (`global:${binCount}:${kernelWidth}:${effectiveMode}`)
5. Add/expand tests for:
   - intent parsing and fallback behavior
   - resolver behavior with `adaptive`/invalid intents
   - diagnostics visibility only on `/timeslicing-algos`
   - no behavior regressions for existing two modes.

## Test Strategy

| Level | Target | Assertions |
|------|--------|------------|
| Unit | `src/lib/adaptive/route-binning-mode.test.ts` | Existing mappings unchanged; `adaptive` intent resolves via route default; invalid mode fallback is explicit. |
| Unit | new helper test under `src/app/timeslicing-algos/lib/` | Intent parsing -> effective mode -> diagnostics state matrix. |
| API unit | new `src/app/api/adaptive/global/route.test.ts` | Mode parsing/fallback contract and response `binningMode` echo; no silent mismatch. |
| Route regression | `src/app/timeslicing-algos/page.timeline-algos.test.ts` (or runtime test) | Third mode control exists; diagnostics visible only when gated. |

Suggested verification command set:
```bash
npm test -- --run \
  src/lib/adaptive/route-binning-mode.test.ts \
  src/app/timeslicing-algos/page.timeline-algos.test.ts \
  src/app/api/adaptive/global/route.test.ts
```

## Concrete File Targets for Planning

| Priority | File | Why it should be in plan |
|---------|------|---------------------------|
| Must edit | `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` | Add adaptive intent option, effective mode resolution usage, diagnostics panel/guard. |
| Must edit | `src/app/timeslicing-algos/lib/algorithm-options.ts` | Add active `adaptive` route option label/description while preserving existing options. |
| Must edit | `src/lib/adaptive/route-binning-mode.ts` | Ensure resolver API cleanly supports intent-to-effective translation (directly or via helper wrapper). |
| Must edit | `src/lib/adaptive/route-binning-mode.test.ts` | Lock backward compatibility + new adaptive intent/fallback cases. |
| Should edit | `src/app/timeslicing-algos/page.timeline-algos.test.ts` | Extend route-level regression for third mode + diagnostics guard. |
| Should add | `src/app/api/adaptive/global/route.test.ts` | Add explicit contract coverage for mode parsing and fallback transparency. |
| Optional refactor | `src/lib/adaptive-utils.ts` or new `src/lib/adaptive/cache-key.ts` | Shared cache-key derivation helper for diagnostics/backend parity. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Route-local heuristics for mode in viz flow | Central `resolveRouteBinningMode(pathname, explicitMode)` | Phase 53 (2026-03-11) | Single source of truth for route defaults + overrides. |
| Global cache not mode-separated | Mode-sensitive global cache key and `binning_mode` persistence | Phase 52 (2026-03-11) | Safe coexistence of `uniform-time` and `uniform-events` maps. |

**Deprecated/outdated:**
- Any new mode resolution logic that bypasses `resolveRouteBinningMode` should be treated as outdated immediately.

## Open Questions

1. **Exact adaptive intent semantics in algos UI**
   - What we know: phase requires third selectable option and explicit payload/fallback visibility.
   - What's unclear: should `adaptive` always map to route default (`uniform-events`) or a dynamic heuristic.
   - Recommendation: for Phase 54, map to route default via resolver (lowest risk, backward-compatible); defer heuristic selection to a later phase.

2. **Diagnostics transport preference**
   - What we know: scope allows UI panel and/or route-scoped logs.
   - What's unclear: expected QA workflow priority (in-UI panel vs console log first).
   - Recommendation: ship in-UI diagnostics as primary, optional console logging behind same gate.

## Sources

### Primary (HIGH confidence)
- Repository source: `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` - current mode/query/compute flow.
- Repository source: `src/app/timeslicing-algos/lib/algorithm-options.ts` - active/future algorithm option contract.
- Repository source: `src/lib/adaptive/route-binning-mode.ts` and `src/lib/adaptive/route-binning-mode.test.ts` - resolver behavior and regression coverage.
- Repository source: `src/components/viz/MainScene.tsx` - route-resolved global adaptive fetch wiring.
- Repository source: `src/app/api/adaptive/global/route.ts` - API mode parsing/fallback contract.
- Repository source: `src/lib/queries.ts`, `src/lib/queries/aggregations.ts`, `src/lib/queries.test.ts` - cache-key/mode persistence contracts.

### Secondary (MEDIUM confidence)
- `package.json` dependency versions for stack decisions in this phase.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly from repository `package.json` and active code usage.
- Architecture: HIGH - verified from current route/resolver/store/API wiring.
- Pitfalls: HIGH - derived from observed fallback and contract seams with existing tests.

**Research date:** 2026-03-12
**Valid until:** 2026-04-11
