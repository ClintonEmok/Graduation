import { EvaluationShell } from '@/components/evaluation/EvaluationShell';

/**
 * Phase 80 — `/evaluation` route entry.
 *
 * This is a dedicated App Router page that renders the evaluation
 * `DashboardDemoShell` wrapper. The route MUST NOT modify the existing
 * `/dashboard-demo` page; it is a sibling surface that overlays the
 * researcher-controlled study chrome on top of the same demo shell.
 *
 * The page is intentionally a server component: the entire evaluation UI
 * is client-side (Zustand state, driver.js tour, browser storage), so the
 * `EvaluationShell` itself is marked `"use client"` and all interactivity
 * lives there. Keeping this file as a server component preserves the
 * Next.js metadata conventions and avoids an unnecessary client bundle
 * for the route shell.
 */
export default function EvaluationPage() {
  return <EvaluationShell />;
}
