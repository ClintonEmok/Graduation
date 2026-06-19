# Phase 7: Dashboard-Demo Preset Thresholds - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add demo-local, per-preset threshold controls to `/dashboard-demo` for the existing generation-context presets. The phase keeps the stable `/timeslicing` route unchanged, reuses the current preset vocabulary, and avoids introducing a new algorithm family.

</domain>

<decisions>
## Implementation Decisions

### Control model
- **D-01:** Use separate controls per preset, not one global threshold slider.
- **D-02:** Threshold values are stored per preset family so switching presets restores that preset's own values.
- **D-03:** Threshold edits remain demo-local and must not flow into `/timeslicing`.

### Preset vocabulary
- **D-04:** Reuse the existing timeslicing preset concepts already present in the repo (hourly, daily, weekly, weekday-weekend, business-hours, and related context-aware variants).
- **D-05:** Do not create a new algorithm family; this phase only parameterizes the existing preset families.

### UI placement
- **D-06:** The demo slice rail is the primary place to edit preset thresholds because it already hosts the demo-local generation workflow.
- **D-07:** The active preset should expose its own controls directly in the rail instead of hiding them behind a generic global setting.

### Control shape and tone
- **D-08:** Use sliders for threshold entry, with compact summary text instead of always-visible raw numbers.
- **D-09:** Threshold changes should update live as the user edits them.
- **D-10:** Keep the steps coarse so tuning feels quick and exploratory rather than overly technical.
- **D-11:** Label the threshold concept as `Bias` in the demo rail.
- **D-12:** Show friendlier preset names with short helper text, and use an `Active` badge for the currently edited preset.

### Reset behavior
- **D-13:** Provide both per-preset reset and reset-all behavior.
- **D-14:** Reset should restore the recommended starting value for each preset.
- **D-15:** Put reset actions in the rail footer and confirm before resetting.

### Stable-route isolation
- **D-16:** `/timeslicing` remains the stable reference route and should not gain demo-local preset threshold controls.

### the agent's Discretion
- Exact helper copy for each preset family.
- The precise slider range and default starting value for each preset, as long as the phase stays preset-scoped.
- Minor copy and spacing choices needed to keep the rail readable.

</decisions>

<specifics>
## Specific Ideas

- Separate controls per preset was chosen by the user (option 2).
- The demo should feel like a preset playground, not a single knob that blurs weekday/weekend/business-hours differences.
- Reuse the existing preset families and keep the stable route untouched.

</specifics>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — inserted Phase 7 and shifted later phases down by one.
- `.planning/REQUIREMENTS.md` — new Phase 7 requirement block for preset thresholds.
- `.planning/STATE.md` — current focus and phase counts.

### Existing demo-local code
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — demo-local generation state that already owns preset selection and generation workflow state.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — demo rail where the controls should surface.
- `src/app/dashboard-demo/page.shell.test.tsx` — source-inspection regression coverage for demo-local shell behavior.

### Stable reference code
- `src/store/useTimeslicingModeStore.ts` — stable timeslicing store to keep unchanged.
- `src/components/binning/BinningControls.tsx` — existing generation context controls and granularity vocabulary.
- `src/components/timeslicing/TimesliceToolbar.tsx` — existing preset vocabulary and stable route concepts.

### Vocabulary reference
- `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` — context-aware label language such as `weekend-heavy` used as a reference only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — already owns demo-local preset selection and generation workflow state.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — already renders the slice companion rail and is the natural place for preset-scoped controls.
- `src/app/dashboard-demo/page.shell.test.tsx` — already checks that the demo shell stays demo-local and can be extended to cover the new controls.
- `src/components/binning/BinningControls.tsx` — shows the generation controls and preset/granularity language that the demo can mirror.

### Established Patterns
- Demo-local state is preferred when the feature is specific to `/dashboard-demo`.
- Stable routes are protected by source-inspection tests instead of sharing mutable UI state.
- The project favors route-local feature slices over cross-route coupling.

### Integration Points
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — threshold controls should appear beside the rest of the demo slice tools.
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — preset-scoped threshold state and persistence.
- `src/app/dashboard-demo/page.shell.test.tsx` — lock the new demo-local contract and the stable-route isolation.

</code_context>

<deferred>
## Deferred Ideas

- Any future export/share behavior for preset threshold sets belongs to a later phase.
- If additional preset families are added later, they should inherit the same per-preset control pattern.

</deferred>

---

*Phase: 07-dashboard-demo-preset-thresholds*
*Context gathered: 2026-04-10*
