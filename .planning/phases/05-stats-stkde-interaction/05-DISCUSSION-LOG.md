# Phase 5: Demo Stats + STKDE Interaction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 05-stats-stkde-interaction
**Areas discussed:** label choice, interaction direction, tab structure, spatial phrasing

---

## Label Choice

| Option | Description | Selected |
|--------|-------------|----------|
| District | Use the existing district framing | ✓ |
| Neighborhood | Reframe everything as neighborhoods | |
| Place | Use a generic location label | |

**User's choice:** `district`
**Notes:** This keeps the stats surface aligned with the existing route vocabulary.

---

## Interaction Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Stats drives STKDE | District selection filters STKDE | ✓ |
| STKDE drives stats | Hotspot selection updates stats | |
| Bidirectional | Both panels update each other | |

**User's choice:** Stats selection should filter STKDE; STKDE selection does not need to update stats.
**Notes:** This keeps the demo readable and avoids circular interaction.

---

## Tab Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Separate tabs | Keep stats and STKDE as separate rail tabs | ✓ |
| Combined panel | Merge stats and STKDE into one rail section | |
| Nested cards | Use card-level navigation inside the rail | |

**User's choice:** Separate tabs
**Notes:** This preserves clear boundaries between summary and hotspot investigation.

---

## Spatial Phrasing

| Option | Description | Selected |
|--------|-------------|----------|
| District labels | Keep the strongest user-facing term tied to districts | ✓ |
| Neighborhood labels | Reframe the model around neighborhoods | |
| Technical hotspots | Keep model terminology visible first | |

**User's choice:** District labels, with plain-language place summaries where helpful.
**Notes:** Hotspots should read like a neighborhood or dense city-block interpretation when combined with stats.

---

## Stats Surface Density

| Option | Description | Selected |
|--------|-------------|----------|
| Compact dashboard | Keep summary cards, district controls, and small charts visible together | ✓ |
| Card-led summary | Prioritize summary cards and push charts lower | |
| Chart-led view | Make the breakdown charts the primary focus | |

| Option | Description | Selected |
|--------|-------------|----------|
| Summary cards | Make total crimes, average per day, peak hour, and top crime lead | ✓ |
| District controls | Make district and time controls lead the surface | |
| Spatial context | Make the map lead the surface | |

| Option | Description | Selected |
|--------|-------------|----------|
| One-line helper | Keep a short helper sentence under the title | ✓ |
| Section headers only | Rely almost entirely on labels and section names | |
| Minimal copy | Remove nearly all helper text | |

| Option | Description | Selected |
|--------|-------------|----------|
| Chip grid | Keep the current compact grid of district chips | |
| Ranked list | Use a vertical list with count ordering | ✓ |
| Grouped pills | Use rounded pills with a stronger active state | |

**User's choice:** Compact dashboard, summary cards, minimal copy, ranked list.
**Notes:** The stats view should stay dense but readable, with the summary acting as the entry point.

---

## Hotspot Place Language

| Option | Description | Selected |
|--------|-------------|----------|
| Neighborhood first | Use neighborhood-style names as the primary label | |
| Block cluster first | Use city-block cluster wording as the primary label | |
| District summary | Keep district as the main label and treat place context as supporting detail | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both | Show a friendly place label first and the district underneath | ✓ |
| Only one | Pick a single user-facing label | |
| Depends on result | Vary the label depending on clarity | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep numbers | Use numeric intensity/support values | |
| Plain language | Convert intensity into words | |
| Mixed format | Use words plus a smaller supporting number | |

| Option | Description | Selected |
|--------|-------------|----------|
| Very little | Just place label, intensity, and short support line | ✓ |
| A little more | Keep support and location, but avoid model-like details | |
| Just enough context | Include one short explanatory line per hotspot | |

**User's choice:** District summary, both district and neighborhood context, no intensity, very little technical detail.
**Notes:** The user explicitly said the intensity numbers should not be kept in the demo rail.

---

## Spatial Map Emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Supporting panel | Keep the map visible but clearly secondary | |
| Balanced section | Give the map a strong but not dominant presence | ✓ |
| Major visual | Make the map one of the main focal points | |

| Option | Description | Selected |
|--------|-------------|----------|
| Heatmap first | Start with the density surface and keep points as alternate view | ✓ |
| Points first | Start with raw points | |
| Heatmap only | Keep the map simple and avoid a mode toggle | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, tight focus | Strongly constrain the map to the selected district | ✓ |
| Some context around it | Keep a little surrounding geography visible | |
| Broad context | Show wider city context even when selected | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep it | Let users switch between heatmap and points | ✓ |
| Hide it | Keep the map heatmap-only | |
| Secondary action | Make points available but de-emphasized | |

**User's choice:** Balanced section, heatmap first, tight district focus, visible points mode.
**Notes:** The map should support the stats story without competing with the STKDE tab.

---

## Empty and Recovery States

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt to pick districts | Show a clear empty state that asks for district selection | ✓ |
| Restore all | Automatically fall back to all districts | |
| Show recovery actions | Keep the empty state but offer clear/all actions | |

| Option | Description | Selected |
|--------|-------------|----------|
| Simple empty state | Show a short message with no extra recovery UI | ✓ |
| Preset guidance | Suggest switching presets or scope mode | |
| Action + hint | Show one short hint plus a single recovery action | |

| Option | Description | Selected |
|--------|-------------|----------|
| Very explicit | Keep Clear, All, and reset-style actions easy to find | |
| Lightweight | Use a minimal set of recovery controls | ✓ |
| Contextual only | Show recovery actions only when needed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Instructional | Tell the user exactly what to do next | ✓ |
| Encouraging | Keep it friendly and gentle | |
| Minimal | Use very short wording | |

**User's choice:** Prompt to pick districts, simple empty state, lightweight recovery controls, instructional tone.
**Notes:** The empty states should tell the user what to do next without adding a lot of UI weight.

---

## Deferred Ideas

- None. The discussion stayed inside the stats/STKDE interaction boundary.
