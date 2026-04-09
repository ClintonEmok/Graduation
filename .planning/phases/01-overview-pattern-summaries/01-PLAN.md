---
phase: 01-overview-pattern-summaries
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/dashboard/page.tsx
  - src/components/layout/DashboardLayout.tsx
  - src/components/dashboard/DashboardHeader.tsx
autonomous: true
requirements: [T1, T5]
must_haves:
  truths:
    - "The dashboard reads as an overview-first entry point."
    - "The 3D cube is present only as supporting context."
    - "Phase 1 copy points to recurring patterns, not burst decoding or support overlays."
  artifacts:
    - path: "src/app/dashboard/page.tsx"
      provides: "Phase-1 route composition"
      contains: "DashboardLayout"
    - path: "src/components/layout/DashboardLayout.tsx"
      provides: "Stable map/cube/timeline panel ordering"
      contains: "tour-map-panel"
    - path: "src/components/dashboard/DashboardHeader.tsx"
      provides: "Phase label and summary framing"
      contains: "overview"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "src/components/layout/DashboardLayout.tsx"
      via: "panel props"
      pattern: "leftPanel=.*MapVisualization"
    - from: "src/components/dashboard/DashboardHeader.tsx"
      to: "src/store/useCoordinationStore.ts"
      via: "workflow and sync state"
      pattern: "workflowPhase|syncStatus"
---

<objective>
Make the dashboard route unmistakably phase-1: overview-first, pattern-oriented, and still grounded in the existing dashboard shell.

Purpose: Users should enter the app through the broad-pattern reading mode before any trace, burst, or support language appears.
Output: A route shell and header that frame the map as primary context, the cube as secondary context, and the timeline as the lower control rail.
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
@src/app/dashboard/page.tsx
@src/components/layout/DashboardLayout.tsx
@src/components/dashboard/DashboardHeader.tsx
@src/store/useCoordinationStore.ts
</context>

<tasks>

<task type="auto">
  <name>Reframe the dashboard shell around overview-first semantics</name>
  <files>src/app/dashboard/page.tsx, src/components/layout/DashboardLayout.tsx</files>
  <read_first>
    @src/app/dashboard/page.tsx
    @src/components/layout/DashboardLayout.tsx
    @.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
    @.planning/ROADMAP.md
  </read_first>
  <action>
    Keep the current MapVisualization -> CubeVisualization -> TimelinePanel composition, but make the page and layout language explicitly phase-1: the map is the primary analytical surface, the cube is secondary context, and the timeline remains the lower control rail. Preserve existing panel IDs and layout structure; change labels and helper copy only where needed to remove any implication that burst decoding or support overlays are part of this phase.
  </action>
  <acceptance_criteria>
    - `src/app/dashboard/page.tsx` still passes `MapVisualization` into `leftPanel`, `CubeVisualization` into `topRightPanel`, and `TimelinePanel` into `bottomRightPanel`.
    - `src/components/layout/DashboardLayout.tsx` still exposes the `tour-map-panel`, `tour-cube-panel`, and `tour-timeline-panel` containers.
    - A grep for `burst` or `support` in the phase-1 dashboard copy returns no new phase-scoped wording beyond existing component names.
  </acceptance_criteria>
  <verify>
    `pnpm typecheck` and `pnpm test -- src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx`
  </verify>
  <done>
    The dashboard shell is visibly framed as overview + pattern summaries, with the map foregrounded and the cube/timeline clearly secondary.
  </done>
</task>

<task type="auto">
  <name>Retune the dashboard header to match the phase-1 vocabulary</name>
  <files>src/components/dashboard/DashboardHeader.tsx</files>
  <read_first>
    @src/components/dashboard/DashboardHeader.tsx
    @src/store/useCoordinationStore.ts
    @.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
    @.planning/REQUIREMENTS.md
  </read_first>
  <action>
    Update the header copy and summary text so it describes the current phase as overview + pattern summaries, preserves workflow/sync badges, and avoids calling out burst decoding, hotspot, guidance, or other deferred support features. Keep the existing store bindings and status cards intact; only change presentation text and any microcopy needed to keep the top rail aligned with Phase 1.
  </action>
  <acceptance_criteria>
    - `DashboardHeader.tsx` contains the strings `overview` and `pattern summaries`.
    - `DashboardHeader.tsx` does not introduce new burst/support messaging.
    - `pnpm test -- src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx` passes after the text update.
  </acceptance_criteria>
  <verify>
    `pnpm test -- src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx`
  </verify>
  <done>
    The top status rail reinforces the phase goal instead of distracting with later-phase analysis vocabulary.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passes.
2. `pnpm test -- src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx` passes.
3. A manual `/dashboard` spot-check shows the map-forward shell and phase-1 language.
</verification>

<success_criteria>
1. The dashboard entry point reads as overview-first and pattern-oriented.
2. The cube is clearly supporting context rather than the primary analytical surface.
3. The phase-1 header copy avoids burst-decoding and support-features vocabulary.
4. The phase outputs are ready for `.planning/phases/01-overview-pattern-summaries/01-01-SUMMARY.md`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-overview-pattern-summaries/01-01-SUMMARY.md`.
</output>
