---
phase: 64
slug: dashboard-redesign
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + TypeScript compiler checks |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm vitest src/store/useCoordinationStore.test.ts --run` |
| **Full suite command** | `pnpm -s tsc --noEmit && pnpm vitest --run` |
| **Estimated runtime** | ~45-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -s tsc --noEmit` (and store test command when touching coordination logic)
- **After every plan wave:** Run `pnpm -s tsc --noEmit && pnpm vitest --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 64-01-01 | 01 | 1 | SYNC-04, SYNC-05 | compile | `pnpm -s tsc --noEmit` | ✅ | ⬜ pending |
| 64-01-02 | 01 | 1 | SYNC-04 | unit | `pnpm vitest src/store/useCoordinationStore.test.ts --run` | ✅ | ⬜ pending |
| 64-02-01 | 02 | 2 | SYNC-04, SYNC-05 | compile | `pnpm -s tsc --noEmit` | ✅ | ⬜ pending |
| 64-02-02 | 02 | 2 | SYNC-01, SYNC-02, SYNC-03 | compile | `pnpm -s tsc --noEmit` | ✅ | ⬜ pending |
| 64-02-03 | 02 | 2 | SYNC-01..SYNC-05 | manual | `pnpm dev` + interaction script | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generate→review→apply status progression is understandable in header and sync strip | SYNC-04 | UX semantics and clarity are visual | Run `pnpm dev`, use `/dashboard-v2`, execute generation and apply flow, confirm explicit state transitions |
| Cross-view interaction coherence between timeline, map/heatmap, and cube | SYNC-01, SYNC-02, SYNC-03 | Multi-view interaction is hard to assert with unit tests only | Select from timeline then map, verify selection coherence and no destructive auto-clear on panel mismatch |
| At-a-glance summary clarity (strategy/granularity/slice counts) | SYNC-05 | Information density/readability is visual | Verify header shows strategy, granularity, active/draft slice counts without opening side panels |

---

## Validation Sign-Off

- [x] All tasks have `<verify>` automation or explicit manual-only rationale
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
