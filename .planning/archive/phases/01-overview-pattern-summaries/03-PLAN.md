---
phase: 01-overview-pattern-summaries
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/timeline/TimelinePanel.tsx
  - src/components/timeline/DualTimeline.tsx
  - src/store/useTimeStore.ts
autonomous: true
requirements: [VIEW-04]
must_haves:
  truths:
    - "User can narrow or expand the active temporal window with a timeline slider."
    - "Playback and stepping remain available, but the window control reads as the main phase-1 temporal interaction."
    - "Current time stays inside the selected window after brush and range changes."
  artifacts:
    - path: "src/components/timeline/TimelinePanel.tsx"
      provides: "Phase-1 temporal control rail"
      contains: "Timeline Overview + Detail"
    - path: "src/components/timeline/DualTimeline.tsx"
      provides: "Brush-to-store synchronization"
      contains: "applyRangeToStoresContract"
    - path: "src/store/useTimeStore.ts"
      provides: "Clamped current time and range state"
      contains: "setTime"
  key_links:
    - from: "src/components/timeline/TimelinePanel.tsx"
      to: "src/components/timeline/DualTimeline.tsx"
      via: "embedded timeline control"
      pattern: "<DualTimeline />"
    - from: "src/components/timeline/DualTimeline.tsx"
      to: "src/store/useTimeStore.ts"
      via: "range synchronization"
      pattern: "setTimeRange|setRange|setBrushRange|setViewport|setTime"
    - from: "src/components/timeline/TimelinePanel.tsx"
      to: "src/lib/time-domain.ts"
      via: "resolution stepping"
      pattern: "resolutionToNormalizedStep"
---

<objective>
Make the timeline slider the explicit phase-1 temporal control so users can narrow or expand the overview window without losing context.

Purpose: Overview reading only works if time-window control is obvious, synchronized, and not mixed up with later adaptive-burst semantics.
Output: A timeline rail that clearly drives the active window while preserving playback, stepping, and range sync.
</objective>

<execution_context>
@~/.opencode/get-shit-done/workflows/execute-plan.md
@~/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
@src/components/timeline/TimelinePanel.tsx
@src/components/timeline/DualTimeline.tsx
@src/store/useTimeStore.ts
@src/store/useTimelineDataStore.ts
@src/lib/time-domain.ts
</context>

<tasks>

<task type="auto">
  <name>Make the temporal rail read as an active window control</name>
  <files>src/components/timeline/TimelinePanel.tsx</files>
  <read_first>
    @src/components/timeline/TimelinePanel.tsx
    @src/store/useTimeStore.ts
    @src/lib/time-domain.ts
    @.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
  </read_first>
  <action>
    Keep the existing play, step, speed, and resolution controls, but make the panel copy explicitly describe the active window rather than generic playback only. Preserve the `DualTimeline` embed and resolution slider; change the text and layout cues so the user reads this area as the control for narrowing or expanding the overview window.
  </action>
  <acceptance_criteria>
    - `TimelinePanel.tsx` still renders `DualTimeline`, the play/pause button, and the resolution slider.
    - `TimelinePanel.tsx` still uses `resolutionToNormalizedStep` for stepping.
    - The panel copy includes the active-window language required for Phase 1 and does not mention burst decoding or support overlays.
  </acceptance_criteria>
  <verify>
    `pnpm typecheck` and `pnpm lint src/components/timeline/TimelinePanel.tsx`
  </verify>
  <done>
    The timeline rail clearly reads as the main phase-1 window control, not a generic playback strip.
  </done>
</task>

<task type="auto">
  <name>Keep the shared time range clamped and synchronized</name>
  <files>src/components/timeline/DualTimeline.tsx, src/store/useTimeStore.ts</files>
  <read_first>
    @src/components/timeline/DualTimeline.tsx
    @src/store/useTimeStore.ts
    @src/store/useCoordinationStore.ts
    @src/store/useTimelineDataStore.ts
    @src/lib/time-domain.ts
  </read_first>
  <action>
    Preserve the current range-sync contract, but make sure the shared time state cannot drift outside the selected window. Keep `applyRangeToStoresContract` as the single place that pushes range updates into the stores, and keep `setTime` / `stepTime` clamped to the active `timeRange` so the overview never points outside the selected window.
  </action>
  <acceptance_criteria>
    - `applyRangeToStoresContract` still updates `setTimeRange`, `setRange`, `setBrushRange`, `setViewport`, and `setTime` together.
    - `useTimeStore.ts` still clamps `setTime` and `stepTime` to `timeRange`.
    - `DualTimeline.tsx` still imports the same store hooks and keeps the brush/detail synchronization path intact.
  </acceptance_criteria>
  <verify>
    `pnpm test -- src/components/timeline/DualTimeline.tick-rollout.test.ts` and `pnpm typecheck`
  </verify>
  <done>
    The active temporal window, selected time, and brush state stay synchronized without drifting beyond the visible overview range.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passes.
2. `pnpm test -- src/components/timeline/DualTimeline.tick-rollout.test.ts` passes.
3. The timeline rail controls the overview window while preserving playback and step actions.
</verification>

<success_criteria>
1. The user can narrow or expand the active temporal window with the timeline slider.
2. Playback, step, and resolution controls remain usable but secondary to window selection.
3. Current time never escapes the selected time range.
4. The phase outputs are ready for `.planning/phases/01-overview-pattern-summaries/01-03-SUMMARY.md`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-overview-pattern-summaries/01-03-SUMMARY.md`.
</output>
