# Phase 28: Slice Boundary Adjustment - Research

**Researched:** 2026-02-19
**Domain:** Timeline slice boundary adjustment (React + D3 scaleUtc + Zustand)
**Confidence:** HIGH

## Summary

This research focused on implementing precise, handle-based adjustment of already-committed timeline slices in `/timeline-test`, constrained by locked UX decisions in `28-CONTEXT.md` and requirements ADJUST-01..ADJUST-06. The current foundation is strong: committed slices already render from `useSliceStore`, active selection already exists, and slice creation already uses a transient interaction store + pointer-capture drag flow.

The standard approach for this phase is: keep committed slice data in `useSliceStore`, add a dedicated transient adjustment state machine for drag lifecycle, and update range boundaries in real-time during pointer move (not only on commit). Snapping should be dual-source (adaptive time grid + neighboring slice boundaries), with snap on by default, optional fixed presets, and a modifier to bypass snapping while dragging.

**Primary recommendation:** Add a dedicated `useSliceAdjustmentStore` + `useSliceBoundaryAdjustment` hook, render a separate handle layer above committed overlays, and enforce hard boundary/min-duration constraints in a single shared adjustment math module used by both drag live updates and tests.

## Existing Code Touchpoints

Current implementation points to inspect first, and expected targets for this phase.

### Existing files to inspect
| File | Why it matters | Notes for Phase 28 |
|------|----------------|--------------------|
| `src/app/timeline-test/components/CommittedSliceLayer.tsx` | Current committed slice rendering + active styling | Keep as committed fill layer; do not overload with pointer logic |
| `src/app/timeline-test/page.tsx` | Overlay stack/z-index wiring | Add adjustment handles layer mount and dimming wiring |
| `src/store/useSliceStore.ts` | Source of truth for slices/active id; updateSlice action | Real-time handle drag should write range updates through `updateSlice` |
| `src/app/timeline-test/hooks/useSliceCreation.ts` | Established pointer capture + drag threshold pattern | Reuse pointer lifecycle approach for boundary drag |
| `src/app/timeline-test/lib/slice-utils.ts` | Existing snap + duration constraint helpers | Extend with boundary-specific constraint/snap candidate logic |
| `src/app/timeline-test/components/SliceToolbar.tsx` | Existing snap toggle UI pattern | Add optional fixed snap preset selector and default snap state control |
| `src/app/timeline-test/components/SliceList.tsx` | Active slice selection source | Ensure active slice remains the one being adjusted |
| `src/store/useSliceStore.test.ts` | Current slice store test baseline | Extend tests for boundary update behavior |

### Expected file targets (create/modify)
| Action | Target | Purpose |
|--------|--------|---------|
| Create | `src/store/useSliceAdjustmentStore.ts` | Transient drag state (active handle, live tooltip data, snap mode, limit cue) |
| Create | `src/app/timeline-test/hooks/useSliceBoundaryAdjustment.ts` | Pointer handlers + commit flow for start/end handles |
| Create | `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx` | Visible handles (8px visual / 12px hit), hover+selected behavior, tooltip |
| Create | `src/app/timeline-test/lib/slice-adjustment.ts` | Pure functions: constraint enforcement, neighbor snap, adaptive/fixed snap selection |
| Modify | `src/app/timeline-test/components/CommittedSliceLayer.tsx` | Add dim state hook/class for non-active slices while dragging |
| Modify | `src/app/timeline-test/page.tsx` | Mount handle layer above committed layer, pass scale/domain and interaction state |
| Modify | `src/app/timeline-test/components/SliceToolbar.tsx` | Snap preset controls (adaptive + fixed presets), optional indicator for bypass |
| Create | `src/app/timeline-test/lib/slice-adjustment.test.ts` | Unit tests for snap + constraints + edge cases |

## Standard Stack

Established stack for this phase (already in repo; no new framework required).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | `19.2.3` | UI/stateful interaction layer | Existing app baseline |
| Zustand | `5.0.10` | Persistent + transient interaction stores | Already used for slices and creation mode |
| d3-scale (`scaleUtc`) | `4.0.2` | Pixel<->time mapping for boundary math | Already used in timeline-test + supports invert reliably |
| Pointer Events (`setPointerCapture`) | Web standard | Stable drag ownership during handle drag | Prevents event conflicts during drag |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| d3-selection / d3-zoom / d3-brush | `3.x / 3.x / 3.x` | Existing timeline interaction base | Keep untouched unless conflict emerges |
| Lucide icons + existing Tailwind tokens | current | Handle state cues and subtle limit feedback | For visual affordance + accessibility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pointer-event driven custom handle drag | `d3-drag` behavior | `d3-drag` is strong but not needed; current code already uses React pointer handlers and capture |
| Dedicated drag library | `@use-gesture/react` | Overkill for one-dimensional, bounded handle drags |

**Installation:**
```bash
# No new dependencies required for Phase 28.
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/timeline-test/
├── components/
│   ├── CommittedSliceLayer.tsx         # Existing committed fill layer
│   └── SliceBoundaryHandlesLayer.tsx   # New: hover/selected handles + tooltip
├── hooks/
│   └── useSliceBoundaryAdjustment.ts    # New: pointer drag lifecycle + store writes
└── lib/
    ├── slice-utils.ts                   # Existing creation utils
    └── slice-adjustment.ts              # New: pure constraint + snapping math

src/store/
└── useSliceAdjustmentStore.ts           # New: transient adjustment interaction state
```

### Pattern 1: Split Persistent Slice State vs Transient Drag State
**What:** Keep `useSliceStore` as source of truth for committed slice boundaries; keep drag lifecycle in a dedicated transient store.
**When to use:** Always for boundary drag interactions where live pointer data should not be persisted.
**Example:**
```typescript
// Source: existing project pattern in src/store/useSliceCreationStore.ts
interface SliceAdjustmentState {
  draggingSliceId: string | null;
  draggingHandle: 'start' | 'end' | null;
  hoverSliceId: string | null;
  hoverHandle: 'start' | 'end' | null;
  bypassSnap: boolean;
  snapMode: 'adaptive' | 'fixed';
  snapPresetSec: number | null;
  limitCue: 'none' | 'minDuration' | 'domainStart' | 'domainEnd';
  tooltip: { x: number; label: string } | null;
}
```

### Pattern 2: Real-Time Apply + Lightweight Finalize
**What:** During pointer move, calculate adjusted boundary and write via `useSliceStore.updateSlice` continuously; on pointer up, just finalize transient state and analytics/logging.
**When to use:** ADJUST-04 real-time visual response with minimal commit complexity.
**Example:**
```typescript
// Source: existing write path in src/store/useSliceStore.ts:updateSlice
const next = adjustBoundaryWithConstraints(input);
useSliceStore.getState().updateSlice(sliceId, { range: [next.startNorm, next.endNorm] });
```

### Pattern 3: Handle Layer Separate from Fill Layer
**What:** Keep committed fill rendering passive (`pointer-events-none`), and render interactive handles in a dedicated top layer with explicit hit targets.
**When to use:** Prevent accidental drags on fills and keep ADJUST-03 targeting predictable.
**Example:**
```tsx
// Source: layering pattern in src/app/timeline-test/page.tsx (CommittedSliceLayer z-10, creation z-20)
<CommittedSliceLayer ... />
<SliceBoundaryHandlesLayer ... />
```

### Pattern 4: Unified Snap Candidate Resolver
**What:** Resolve snapping from both (a) adaptive/fixed time grid and (b) neighboring slice boundaries, then pick nearest candidate within pixel tolerance.
**When to use:** ADJUST-06 with both grid precision and adjacency ergonomics.
**Example:**
```typescript
// Source: d3 scale invert/ticks behavior https://d3js.org/d3-scale/time
const candidatesSec = [...gridCandidates, ...neighborBoundaryCandidates];
const snappedSec = pickNearestWithinTolerance(rawSec, candidatesSec, toleranceSec);
```

### Anti-Patterns to Avoid
- **Mutating opposite boundary automatically:** Locked decision forbids auto-moving opposite handle when limits hit.
- **Single component owns everything:** Do not place drag state, geometry, rendering, and math all in `CommittedSliceLayer`.
- **Snap-only jump rendering:** Keep movement smooth; snap result should still update continuously per move.
- **Whole-slice drag affordance in this phase:** Explicitly deferred.

## Recommended Drag Interaction State and Commit Flow

1. `pointerenter/move` on handles updates hover state (`hoverSliceId`, `hoverHandle`).
2. `pointerdown` on start/end handle:
   - set active slice if needed,
   - set pointer capture,
   - initialize drag context (`initialRange`, `fixedBoundarySec`, `draggingHandle`),
   - compute current snap mode and tolerance from zoom.
3. `pointermove` while captured:
   - map pointer x to `rawSec` via `scale.invert`, clamp to domain,
   - optionally bypass snap if modifier held,
   - resolve snapped candidate (grid + neighbors),
   - enforce hard constraints (domain + min duration), set `limitCue` if clamped,
   - convert to normalized range and call `updateSlice` for real-time rendering,
   - update tooltip (boundary time + duration).
4. `pointerup/pointercancel`:
   - release capture,
   - clear transient dragging state,
   - keep final range (already applied), clear temporary dim/limit cue.

## Snap Strategy Details (Adaptive + Neighbor + Bypass)

### Snap defaults and controls
- Default `snapEnabled = true`.
- Support snap mode: `adaptive` (default) and optional fixed presets (`1m`, `5m`, `15m`, `1h`, `1d`).
- Modifier bypass during drag: recommend `Alt/Option` as temporary snap disable (no repository-wide modifier convention found).

### Adaptive interval strategy
- Derive visible span from scale domain in seconds.
- Recommended ladder:
  - span `<= 2h` -> `60s`
  - `<= 12h` -> `300s`
  - `<= 48h` -> `900s`
  - `<= 14d` -> `3600s`
  - `> 14d` -> `86400s`
- Keep tolerance in pixels, then convert to seconds via scale inversion; recommended tolerance `8px` (visual handle width alignment).

### Neighbor boundary handling
- For active handle, consider all visible range slice boundaries from other slices:
  - start handle candidates: other slice starts/ends + domain start,
  - end handle candidates: other slice starts/ends + domain end.
- Exclude active slice opposite boundary from candidate list to prevent fake self-snap loops.
- Winner selection order:
  1) nearest candidate by absolute sec delta,
  2) tie-breaker to neighbor boundary over grid candidate,
  3) if outside tolerance, no snap.

### Bypass behavior
- While modifier held, skip snap candidate resolution and use raw pointer sec (still constrained).
- Releasing modifier mid-drag re-enables snap on next pointermove.
- Tooltip should indicate snap status (`Snapped`, `Free`, or `Snap bypass`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer ownership during drag | Global mousemove listeners | Pointer capture (`setPointerCapture`) | Reliable event routing, fewer leak paths |
| Time coordinate conversion | Manual percentage math everywhere | `scaleUtc().invert` + normalized conversion helpers | Consistent with existing timeline domain/range logic |
| Stateful drag reducer in component | Ad-hoc local refs across components | Dedicated Zustand transient adjustment store | Debuggable, testable, avoids prop drilling |
| Snap candidate decision | Mixed UI/mutation logic | Pure `slice-adjustment.ts` functions | Deterministic tests for ADJUST-06 edge cases |

**Key insight:** The risk is not rendering handles; it is deterministic one-dimensional math under constraints. Keep math pure and central.

## Constraint Handling and Edge Cases

### Constraint model
- Domain bounds are hard stops: start cannot go below domain start; end cannot exceed domain end.
- Minimum duration is hard stop: recommend `MIN_SLICE_DURATION_SEC = 300` (5 minutes).
- No opposite-boundary auto-move: when dragging start, end remains fixed; when dragging end, start remains fixed.

### Core edge cases
1. **Dragging start past end-minDuration:** clamp to `end - minDuration`; set `limitCue='minDuration'`.
2. **Dragging end before start+minDuration:** clamp to `start + minDuration`; set same cue.
3. **Slice near domain edge where min duration impossible toward drag direction:** clamp at domain edge and min-duration-derived position; keep opposite boundary fixed.
4. **Overlapping many candidates:** nearest snap candidate wins; ensure deterministic tie-break.
5. **Zoom change mid-drag:** either freeze interval/tolerance at pointerdown or cancel drag on scale-domain change; prefer cancel + subtle toast to avoid jumps.
6. **Locked/invisible slices:** if `isLocked` true, hide/disable handles; if `isVisible` false, no handles/candidates.
7. **Point slices:** out of scope for boundary handles; only render handles for `type='range'`.

### Limit cue behavior
- Triggered only while actively constrained (not latched).
- Visual treatment: subtle pulse/stroke tint on active handle and tooltip suffix (`limit reached`).
- Cue must not animate excessively; keep low-noise per context.

## Common Pitfalls

### Pitfall 1: Handle hit area too small
**What goes wrong:** ADJUST-03 fails despite visible handles.
**Why it happens:** Visual width and hit target are treated as same element.
**How to avoid:** Render 8px visual handle with transparent 12px hit rect.
**Warning signs:** Frequent missed drags, accidental background scrubs.

### Pitfall 2: Scrub/zoom conflict during handle drag
**What goes wrong:** Cursor line/selection updates while adjusting boundary.
**Why it happens:** Missing pointer capture and stopPropagation.
**How to avoid:** Capture pointer on handle down and short-circuit underlying timeline pointer handlers.
**Warning signs:** Boundary jumps and crosshair behavior during drag.

### Pitfall 3: Snap oscillation near neighbor boundaries
**What goes wrong:** Handle jitters between grid and neighbor candidates.
**Why it happens:** Multiple candidates without stable tie-break/tolerance.
**How to avoid:** Single resolver with deterministic tie-break and hysteresis threshold.
**Warning signs:** Flickering tooltip value while moving slowly.

### Pitfall 4: Inconsistent normalization conversions
**What goes wrong:** Stored ranges drift from rendered handles after zoom/filter changes.
**Why it happens:** Mixing sec/normalized conversions in multiple call sites.
**How to avoid:** Centralize `sec <-> norm` conversion in one utility used by hook + tests.
**Warning signs:** Handle not aligning with committed fill after interaction.

## Code Examples

### Boundary adjust core math (pure)
```typescript
// Source: pattern derived from src/app/timeline-test/lib/slice-utils.ts + d3 time scale docs
export function adjustBoundary(input: {
  handle: 'start' | 'end';
  rawSec: number;
  fixedSec: number;
  domainStartSec: number;
  domainEndSec: number;
  minDurationSec: number;
  snap?: { enabled: boolean; candidatesSec: number[]; toleranceSec: number };
}) {
  const bounded = clamp(input.rawSec, input.domainStartSec, input.domainEndSec);
  const snapped = resolveSnap(bounded, input.snap);

  if (input.handle === 'start') {
    const start = Math.min(snapped, input.fixedSec - input.minDurationSec);
    return { startSec: Math.max(input.domainStartSec, start), endSec: input.fixedSec };
  }

  const end = Math.max(snapped, input.fixedSec + input.minDurationSec);
  return { startSec: input.fixedSec, endSec: Math.min(input.domainEndSec, end) };
}
```

### Pointer capture for handle drag
```typescript
// Source: MDN setPointerCapture docs + existing useSliceCreation.ts pattern
function onHandlePointerDown(event: React.PointerEvent<SVGRectElement>) {
  event.currentTarget.setPointerCapture(event.pointerId);
  startAdjustmentDrag(/* ... */);
}

function onHandlePointerUp(event: React.PointerEvent<SVGRectElement>) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  finalizeAdjustmentDrag();
}
```

## Verification Matrix (ADJUST-01..ADJUST-06)

| Requirement | Unit Tests | Manual Checks |
|-------------|------------|---------------|
| ADJUST-01 Start handle draggable | `slice-adjustment.test.ts`: start-handle path updates start only | Hover selected slice -> start handle appears -> drag left/right updates left boundary live |
| ADJUST-02 End handle draggable | Same for end-handle path | Drag end handle and confirm right boundary updates live |
| ADJUST-03 Distinct easy targeting | geometry test for 8px visual + 12px hit rect bounds | At multiple zoom levels, handle acquisition succeeds repeatedly without pixel-perfect precision |
| ADJUST-04 Real-time updates | hook/store test: `updateSlice` called on pointermove with monotonic updates | During drag, boundary, fill extent, and tooltip duration update every frame; non-active slices dim slightly |
| ADJUST-05 Minimum duration enforced | constraint tests for both handles + domain edges with `minDuration=300` | Drag below minimum: handle stops hard, cue appears, opposite boundary unchanged |
| ADJUST-06 Snap-to-neighboring-slice option | snap resolver tests: adaptive grid, neighbor candidate preference, modifier bypass | With snap on, handle snaps to nearby slice edges; hold modifier to move freely; fixed preset overrides adaptive when selected |

## Suggested Plan Decomposition (Executable Waves)

### Wave 1: Interaction Math + State Foundation
- Build `slice-adjustment.ts` pure functions (constraints, snap candidates, resolver).
- Add `useSliceAdjustmentStore` transient state + selector utilities.
- Add unit tests for math and state transitions.

### Wave 2: Handle Layer + Drag Wiring
- Implement `SliceBoundaryHandlesLayer` with hover/selected handle rendering and 8/12 sizing.
- Implement `useSliceBoundaryAdjustment` pointer lifecycle with real-time `updateSlice` writes.
- Mount layer in `page.tsx` and integrate dimming/tooltip/limit cues.

### Wave 3: Snap Controls + Hardening
- Add adaptive/fixed snap UI controls in `SliceToolbar`.
- Implement modifier-based temporary bypass and status in tooltip.
- Add edge-case handling (locked slices, zoom-change during drag, hidden slices) and manual verification checklist.

**Dependencies:** Wave 2 depends on Wave 1; Wave 3 depends on Wave 2. No parallelization recommended due shared interaction plumbing.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mouse-only drag listeners | Pointer Events + capture | Broadly standardized since 2020 | Better cross-device consistency and conflict isolation |
| Post-drag commit-only updates | Real-time preview + immediate committed visual update | Modern interaction norm | Lower correction cost and clearer intent |
| Fixed global snap only | Adaptive zoom-aware + local neighbor snap | Current timeline UX practice | Faster precise alignment during dense editing |

**Deprecated/outdated:**
- Whole-slice move affordance in this phase (explicitly deferred by context).
- Auto-shifting opposite boundary at min-duration violation (conflicts with locked decision).

## Open Questions

1. **Modifier key exact choice (Alt vs Shift/Ctrl/Meta)**
   - What we know: modifier-based temporary snap bypass is locked.
   - What's unclear: app-wide convention does not appear in current codebase.
   - Recommendation: use `Alt/Option` for bypass and document in tooltip/help text.

2. **Snap preset exposure scope**
   - What we know: optional fixed preset selector is locked.
   - What's unclear: whether selector lives always-visible in toolbar or in advanced popover.
   - Recommendation: keep compact inline selector in `SliceToolbar` for discoverability in v1.1.

## Sources

### Primary (HIGH confidence)
- Repository code:
  - `src/app/timeline-test/components/CommittedSliceLayer.tsx`
  - `src/app/timeline-test/page.tsx`
  - `src/app/timeline-test/hooks/useSliceCreation.ts`
  - `src/app/timeline-test/lib/slice-utils.ts`
  - `src/store/useSliceStore.ts`
  - `src/store/useSliceCreationStore.ts`
  - `.planning/phases/28-slice-boundary-adjustment/28-CONTEXT.md`
- D3 time scales docs: https://d3js.org/d3-scale/time
- MDN pointer capture docs (last modified 2025-10-01): https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
- Zustand slices pattern (official docs source): https://raw.githubusercontent.com/pmndrs/zustand/main/docs/guides/slices-pattern.md

### Secondary (MEDIUM confidence)
- d3-drag reference (for interaction conflict concepts; not required for implementation): https://d3js.org/d3-drag

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - fully aligned with existing repo dependencies and official docs.
- Architecture: HIGH - based on existing Phase 27 code patterns and concrete file wiring.
- Pitfalls: HIGH - directly derived from current layering/input model and locked context decisions.

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days; interaction code and dependency versions are stable but active).
