Phase 4 hardens `/dashboard-demo` by wiring the stats and STKDE analysis surfaces into the demo shell. The standalone `/stats` and `/stkde` routes already exist as learning foundations, so this phase focuses on shared interaction/state behavior rather than rebuilding those routes inside the demo.

The phase stays intentionally demo-local:
- stats should feel like a compact analysis summary inside the demo shell,
- STKDE should remain a primary analysis rail,
- both surfaces should respond to the same demo selection/time context,
- and the stable `/stats` and `/stkde` routes should remain untouched as reference implementations.

## Canonical refs

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/03-demo-timeline-rewrite/03-CONTEXT.md`
- `.planning/phases/02-dashboard-demo-ui-ux/02-CONTEXT.md`
- `src/app/stats/page.tsx`
- `src/app/stkde/page.tsx`
- `src/components/stkde/DashboardStkdePanel.tsx`
- `src/components/dashboard-demo/DashboardDemoShell.tsx`
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx`
- `src/components/dashboard-demo/DemoTimelinePanel.tsx`
- `src/components/dashboard-demo/DemoSlicePanel.tsx`
- `src/store/useSliceStore.ts`
- `src/store/useStkdeStore.ts`
- `src/store/useDashboardDemoWarpStore.ts`

## Phase boundary

- Phase 4 is about interaction and state wiring, not a full stats-route clone.
- Demo-local state should be explicit and isolated from the stable routes.
- The workflow isolation phase comes after the demo analysis surfaces feel integrated.

## Working assumptions

- The demo will likely surface stats as a compact tab or summary panel in the existing demo rail.
- STKDE remains a prominent analysis surface, but its state should be driven by demo selection context.
- The phase should favor learning from the separate routes over importing their route shells directly.
