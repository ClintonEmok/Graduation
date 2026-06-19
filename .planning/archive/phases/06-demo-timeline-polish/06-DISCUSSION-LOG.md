## Timeline Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Focus over raw | Top adapted track with raw baseline underneath | ✓ |
| Single clean track | One timeline with minimal secondary markings | |
| Stacked lanes | Multiple lanes for overview, slices, and controls | |

**User's choice:** The demo dual timeline should show the focused/adapted version on top and the raw ground-truth version underneath.
**Notes:** The user explicitly wants the raw baseline visible for comparison and asked that the reason for the alignment decision be recorded in discussion.

---

## Alignment and Connectors

| Option | Description | Selected |
|--------|-------------|----------|
| Perfect alignment | Keep both tracks lined up and show the warp through connectors | ✓ |
| Partial shift | Let the focused track drift to make the warp more explicit | |
| Freeform mapping | Allow the two tracks to diverge more aggressively | |

| Option | Description | Selected |
|--------|-------------|----------|
| Curved links | Soft curved connectors between expanded regions | ✓ |
| Thin vertical lines | Straight guides from focused slices to raw regions | |
| Bracket bands | Wider bracket-like spans around warped regions | |

**User's choice:** Keep the tracks aligned and use connectors to explain the warp; curved links are preferred for the connector style.
**Notes:** The raw baseline stays easier to compare when it is not shifted around, and the warp can still be communicated through the connectors and slice bands.

---

## Slice Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Colored bands | Soft tinted slice regions on the focused track | ✓ |
| Filled blocks | Heavy blocks for each slice | |
| Outlined spans | Subtle outline-only slice regions | |

**User's choice:** Show slice regions as colored bands.
**Notes:** This keeps the timeline readable while still making slice boundaries obvious.

---

## Visual Priority and Density

| Option | Description | Selected |
|--------|-------------|----------|
| Slice editing/review first | Make slice work the strongest visual priority | ✓ |
| Playback first | Let play/scrub controls dominate the surface | |
| Balanced controls | Keep editing, review, and playback equally prominent | |

| Option | Description | Selected |
|--------|-------------|----------|
| Moderately rich | Enough detail for analysis without crowding | ✓ |
| Very calm | Very low density with lots of breathing room | |
| Information-heavy | Show more controls and labels at once | |

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle baseline | Raw timeline present but clearly secondary | ✓ |
| Equal weight | Raw and focused tracks feel equally important | |
| Muted reference | Raw track nearly disappears | |

**User's choice:** Give slice editing/review the strongest priority, keep the timeline moderately rich, and make the raw track a subtle baseline.
**Notes:** This keeps the focused track readable while preserving the raw comparison context.

---

## Specific Notes

- "on top I would have the focus version so the version that got adapted and then underneath like the ground truth the unadapted like the raw one"
- "there would then be lines going down showing what part of the timeline got enlarged and by how much it got enlarged"
- "I wanted it to just look good"
- "you decide and mention in the discussion log why"

---

## Warp Follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Bands-first warp | Use subtle slice bands and a short legend; keep the warp map, but de-emphasize connector art | ✓ |
| Connector-heavy warp | Keep visible connector lines as the main explanation | |
| Hidden warp | Remove the warp cue from the demo surface entirely | |

**User's choice:** Keep the slice-authored warp map, but simplify the visible treatment so the demo timeline stays calm and readable.
**Notes:** The first polish pass already proved the demo-local warp plumbing; the follow-up should reduce visual noise instead of adding more warp chrome.
