# Phase 14: Decode bursts + temporal anomalies - Discussion Log

> Audit trail only. Decisions are captured in `14-CONTEXT.md`.

**Date:** 2026-04-30
**Phase:** 14-decode-bursts-temporal-anomalies
**Areas discussed:** Burst surface emphasis, Burst detail depth, Burst selection behavior, Neutral fallback

---

## Burst surface emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Compact header chips | Small labels above the timeline keep the surface readable. | |
| Inline overlay bands | Color bands across the timeline make burst spans feel more integrated. | |
| Dedicated burst lane | A separate lane turns bursts into a first-class track. | |
| Explain-rail only | Keep burst decoding out of the timeline entirely. | |

**User's choice:** Initially asked for "pros and cons", then clarified the timeline should be as minimal as possible and that burst text should not show inline.
**Notes:** The final direction is minimal visual burst marks only, with details moved out of the track.

---

## Burst detail depth

| Option | Description | Selected |
|--------|-------------|----------|
| Class + duration | Show the burst class and how long it lasts. | |
| Class only | Keep the label minimal. | |
| Class + confidence | Expose confidence inline. | |
| Class + rationale | Show the reason directly on the timeline. | |

**User's choice:** No inline burst label; clicking a burst should open a detailed panel.
**Notes:** Detail content should stay out of the timeline and move into the sidebar/detail view.

---

## Burst selection behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Pinned sidebar panel | Open a persistent detail panel in the sidebar. | ✓ |
| Popover panel | Show a floating detail popover near the clicked burst. | |
| Modal dialog | Use a full dialog for a focused inspection flow. | |
| No panel | Keep click behavior limited to highlighting only. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave brush alone | Inspect the burst without changing the current selection. | ✓ |
| Snap brush to burst | Jump the active brush window to the clicked burst bounds. | |
| Highlight only | Keep the current brush and add a temporary highlight. | |
| Ask before moving | Show the detail panel first, then ask about jumping. | |

| Option | Description | Selected |
|--------|-------------|----------|
| One active burst | Keep the interaction simple. | ✓ |
| Multiple pinned bursts | Allow several burst windows at once. | |
| Primary + secondary | Keep one main burst and one comparison burst. | |
| No persistent selection | Clicking only opens details temporarily. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Detection reason first | Lead with why the burst was classified that way. | ✓ |
| Duration first | Lead with the true time span and pacing. | |
| Neighborhood context first | Lead with adjacent windows and comparisons. | |
| Related slice links first | Lead with workflow actions. | |

**User's choice:** Pinned sidebar panel, leave brush alone, one active burst, detection reason first.
**Notes:** Clicking a burst opens a detailed sidebar view without disturbing the current brush window.

---

## Neutral fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Hide burst cues | Keep the timeline clean when there is no real burst. | ✓ |
| Muted neutral chip | Always show a small neutral badge. | |
| Subtle neutral band | Mark neutral windows lightly. | |
| Explicit no-burst notice | Show a visible notice on the timeline surface. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Explain rail only | Tell the user why the window is neutral in the sidebar. | ✓ |
| Timeline header | Show the explanation above the overview track. | |
| Hover tooltip | Reveal the neutral explanation only on hover. | |
| Both rail and timeline | Repeat the explanation in both places. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same panel | Neutral windows can still be inspected in the same detail panel. | ✓ |
| No, bursts only | Only burst windows are interactive. | |
| Highlight only | Neutral windows can be highlighted but not inspected. | |
| Ask before opening | Show a confirmation before opening a neutral detail view. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-language first | Use wording like no clear burst or balanced window. | ✓ |
| Taxonomy only | Use neutral as the sole label. | |
| Technical wording | Use the exact classification language. | |
| No wording | Avoid text and rely on visual subtlety only. | |

**User's choice:** Hide burst cues, explain rail only, same panel for neutral inspection, plain-language first.
**Notes:** The user explicitly said they think neutral bursts should not be shown.

---

## the agent's Discretion

- Exact iconography and spacing for the minimal burst marks.
- Exact motion/styling for the pinned detail panel.
- Final copy polish for the detail panel and explain rail.

## Deferred Ideas

- Showing neutral burst cues on the timeline was rejected.
- Any map/cube burst treatment is out of scope for this phase.
