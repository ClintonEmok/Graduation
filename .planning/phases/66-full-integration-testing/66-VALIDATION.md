---
phase: 66
slug: full-integration-testing
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-30
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + TypeScript compiler checks |
| **Config file** | `vitest` via `package.json` scripts |
| **Quick run command** | `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts src/store/useCoordinationStore.test.ts src/store/useStkdeStore.test.ts --run` |
| **Full suite command** | `pnpm -s tsc --noEmit && pnpm vitest --run` |
| **Estimated runtime** | ~90-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick targeted command for touched workflow files
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | FLOW-01, FLOW-02 | integration | `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts --run` | ✅ | ✅ green |
| 66-01-02 | 01 | 1 | FLOW-03, FLOW-05 | unit/integration | `pnpm vitest src/store/useCoordinationStore.test.ts src/store/useStkdeStore.test.ts --run` | ✅ | ✅ green |
| 66-01-03 | 01 | 1 | FLOW-01..FLOW-05 | type + suite | `pnpm -s tsc --noEmit && pnpm vitest --run` | ✅ | ✅ green |
| 66-02-01 | 02 | 2 | FLOW-04 | benchmark/regression | `pnpm -s tsc --noEmit && pnpm vitest src/app/timeslicing/page.timeline-qa.test.ts src/app/timeslicing/page.binning-mode.test.ts --run` | ✅ | ⬜ pending |
| 66-02-02 | 02 | 2 | FLOW-06 | integration | `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-time analyst journey clarity through generate → review → apply → refine → investigate | FLOW-01, FLOW-02, FLOW-06 | Requires human judgment on confusion/clarity and flow comprehension | Run the blocker journey script in `66-SIGNOFF.md` twice consecutively in `dashboard-v2`; capture pass/fail notes and confusion points |
| Interactive responsiveness on thesis dataset (map/timeline/cube + STKDE panel interactions) | FLOW-04 | Runtime UX smoothness and perceived latency are not fully represented by unit tests | Execute interaction checklist in `66-SIGNOFF.md`; mark any lag, stutter, or blocked action as failure |
| Empty / low-confidence / error messaging clarity | FLOW-05 | Message interpretation and confidence communication are user-facing semantics | Trigger each edge state and confirm message copy is understandable without devtools context |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s for quick loop
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
