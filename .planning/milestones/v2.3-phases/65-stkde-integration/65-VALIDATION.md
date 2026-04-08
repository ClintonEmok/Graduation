---
phase: 65
slug: stkde-integration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + TypeScript compiler checks |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm vitest src/store/useStkdeStore.test.ts src/workers/stkdeHotspot.worker.test.ts --run` |
| **Full suite command** | `pnpm -s tsc --noEmit && pnpm vitest --run` |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -s tsc --noEmit` plus the targeted task-level test command.
- **After every plan wave:** Run `pnpm -s tsc --noEmit && pnpm vitest --run`.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | STKD-01, STKD-02 | unit | `pnpm vitest src/store/useStkdeStore.test.ts --run` | ✅ | ⬜ pending |
| 65-01-02 | 01 | 1 | STKD-01, STKD-03 | integration | `pnpm vitest src/app/dashboard-v2/useDashboardStkde.test.ts --run` | ❌ W0 | ⬜ pending |
| 65-02-01 | 02 | 2 | STKD-02, STKD-05 | compile | `pnpm -s tsc --noEmit` | ✅ | ⬜ pending |
| 65-02-02 | 02 | 2 | STKD-01, STKD-03 | integration | `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts --run` | ❌ W0 | ⬜ pending |
| 65-03-01 | 03 | 3 | STKD-04, STKD-05 | compile | `pnpm -s tsc --noEmit` | ✅ | ⬜ pending |
| 65-03-02 | 03 | 3 | STKD-01..STKD-05 | integration | `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts src/components/viz/CubeVisualization.stkde.test.ts --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/useStkdeStore.test.ts` — store contract tests for scope/stale/provenance transitions.
- [ ] `src/app/dashboard-v2/useDashboardStkde.test.ts` — run/cancel/stale orchestration tests.
- [ ] `src/app/dashboard-v2/page.stkde.test.ts` — route-level STKDE wiring assertions.
- [ ] `src/components/viz/CubeVisualization.stkde.test.ts` — cube STKDE context visibility assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| STKDE overlay can be toggled while slice workflow remains usable | STKD-01, STKD-05 | Multi-panel interaction and layering behavior are visual | Run `pnpm dev`, open `/dashboard-v2`, toggle STKDE in layer controls, verify timeline/map/cube stay operational |
| Hotspot click vs hover semantics (hover preview only, click commits global focus) | STKD-02, STKD-05 | Pointer interaction semantics are hard to assert reliably with unit tests alone | Hover hotspot row/map marker, confirm preview-only; click hotspot, verify committed focus and status updates |
| STKDE context appears in cube while map/timeline remain synchronized | STKD-04 | Cross-view clarity is visual and contextual | Select hotspot, verify cube STKDE context card and filter state reflect hotspot window/location |

---

## Validation Sign-Off

- [x] All tasks have `<verify>` automation or explicit manual-only rationale
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
