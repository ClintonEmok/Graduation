# Phase 7 Discussion Log

## 2026-04-10

- User selected option 2: separate controls per preset.
- Keep the controls demo-local in `/dashboard-demo`; do not touch `/timeslicing`.
- Reuse existing preset families and vocabulary instead of creating a new algorithm family.
- The phase should feel like preset-specific tuning for context-aware generation, not one global threshold slider.
- Threshold controls should use sliders with compact summary text, update live as the user edits them, and stay coarse rather than overly precise.
- The threshold concept should be labeled `Bias` in the demo rail.
- Use friendlier preset names, short helper text, and an `Active` badge for the current preset.
- Provide both per-preset reset and reset-all behavior, restore recommended starting values, place reset actions in the rail footer, and confirm before resetting.
