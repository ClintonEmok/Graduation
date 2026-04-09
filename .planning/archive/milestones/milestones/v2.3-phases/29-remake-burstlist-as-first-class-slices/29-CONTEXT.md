# Phase 29: Remake burstlist as first-class slices - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Burst windows become first-class timeline slices: they should be selectable, listed, and behave like normal user slices once created. This phase clarifies interaction and UX parity for burst-derived slices, not new capability expansion beyond slice behavior.

</domain>

<decisions>
## Implementation Decisions

### Burst to slice conversion behavior
- Burst interaction creates/selects slices from both entry points: timeline burst overlays and burst list items.
- If a burst-derived range already exists, reuse it and select it (no duplicate creation).
- Range matching uses a small tolerance to avoid float-jitter duplicates.
- New burst-derived entries are always range slices with default naming `Burst N`.

### Slice list presentation parity
- Use one unified slice list for manual and burst-derived slices.
- Keep card UI parity with manual slices; add only a minimal `Burst` chip until renamed.
- Keep `Burst N` naming until user renames.
- Sort list by timeline start time.

### Selection and focus behavior
- Clicking a burst that already has a mapped slice selects that slice and focuses timeline to its range.
- Clicking a burst with no mapped slice creates it and sets it active immediately.
- Keep a single active-slice model shared across manual and burst-derived slices.
- Keep burst overlay highlight synchronized with the active matching slice range.

### Editability and lifecycle
- Burst-derived slices are fully editable like manual slices (boundary adjustment, rename, lock/visibility).
- Deletion behavior is identical to manual slices (no special confirm flow).
- Persistence is shared with the existing slice store.
- Clicking a burst after deletion recreates it as a new normal slice.

### Claude's Discretion
- Exact visual styling of the optional `Burst` chip (size/color/placement) as long as it stays subtle.
- Exact tolerance constant for range matching.
- Exact list tie-break behavior when timeline-start sorting is equal.

</decisions>

<specifics>
## Specific Ideas

- User intent anchor: "Burst should just be slices but pre-made based on density."
- User expectation: burst-derived slices must be deletable and adjustable exactly like user-created slices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-remake-burstlist-as-first-class-slices*
*Context gathered: 2026-02-19*
