---
phase: 29-remake-burstlist-as-first-class-slices
verified: 2026-02-19T22:23:06Z
status: human_needed
score: 23/25 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 16/16
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Timeline zoom/pan still works after burst-layer reorder"
    expected: "Drag on non-burst timeline area still zooms/brushes; wheel/gesture pan behavior remains functional"
    why_human: "Requires live pointer interaction and runtime behavior validation"
  - test: "Other timeline interactions unaffected by burst-click fix"
    expected: "Slice scrubbing, point selection, slice boundary handles, and burst click all work in one session without interaction conflicts"
    why_human: "Cross-interaction UX conflicts cannot be fully proven by static code inspection"
---

# Phase 29: Remake burstlist as first-class slices Verification Report

**Phase Goal:** Transform burst windows into first-class timeline slices with full UX parity.
**Verified:** 2026-02-19T22:23:06Z
**Status:** human_needed
**Re-verification:** Yes - scope expanded to include all Phase 29 plans (`29-01` through gap-closure `29-06`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Burst-derived slices have `isBurst` flag in `TimeSlice` type | ✓ VERIFIED | `src/store/useSliceStore.ts:11` |
| 2 | Range matching with tolerance prevents duplicate burst slices | ✓ VERIFIED | `src/store/useSliceStore.ts:101` |
| 3 | Burst slice creation reuses existing matching slices | ✓ VERIFIED | `src/store/useSliceStore.ts:118` |
| 4 | Slice store exports range matching utility for consumers | ✓ VERIFIED | `src/store/useSliceStore.ts:22` |
| 5 | Burst-derived slices display a `Burst` chip in slice list | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:184` |
| 6 | Burst slices use manual-slice card UI with subtle burst indicator | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:132`, `src/app/timeline-test/components/SliceToolbar.tsx:19` |
| 7 | Slice list is sorted by timeline start time | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:49` |
| 8 | Burst chip styling is small/muted | ✓ VERIFIED | `src/app/timeline-test/components/SliceToolbar.tsx:19` |
| 9 | Clicking a burst list item creates/selects corresponding slice | ✓ VERIFIED | `src/components/viz/BurstList.tsx:97` |
| 10 | Clicking timeline burst overlay creates/selects slice | ✓ VERIFIED | `src/components/timeline/DualTimeline.tsx:400` |
| 11 | Burst click focuses timeline to slice range | ✓ VERIFIED | `src/components/viz/BurstList.tsx:105`, `src/components/timeline/DualTimeline.tsx:406` |
| 12 | Burst-slice mapping is bidirectional | ✓ VERIFIED | `src/components/viz/BurstList.tsx:77`, `src/components/timeline/DualTimeline.tsx:381` |
| 13 | Burst-derived slices are fully editable (boundary/rename/lock/visibility) | ✓ VERIFIED | `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx:118`, `src/app/timeline-test/components/SliceList.tsx:91`, `src/components/viz/SliceManagerUI.tsx:320` |
| 14 | Deleting burst slice works like manual slice | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:202`, `src/store/useSliceStore.ts:145` |
| 15 | Clicking burst after deletion recreates a new slice | ✓ VERIFIED | `src/store/useSliceStore.ts:118`, `src/store/useSliceStore.ts:147` |
| 16 | Burst overlay highlight syncs with active slice | ✓ VERIFIED | `src/components/timeline/DualTimeline.tsx:381`, `src/components/timeline/DualTimeline.tsx:712` |
| 17 | User can rename any slice in timeline-test `SliceList` via inline edit | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:145` |
| 18 | User can rename any slice in `SliceManagerUI` via inline input | ✓ VERIFIED | `src/components/viz/SliceManagerUI.tsx:239` |
| 19 | Renamed slices persist and show updated name across UIs | ✓ VERIFIED | shared store update path at `src/store/useSliceStore.ts:150`, read in `src/app/timeline-test/components/SliceList.tsx:25` and `src/components/viz/SliceManagerUI.tsx:31` |
| 20 | Renamed burst slices hide chip when name no longer starts with `Burst` | ✓ VERIFIED | `src/app/timeline-test/components/SliceList.tsx:111` |
| 21 | Rename interaction follows accessibility patterns | ✓ VERIFIED | keyboard/focus handling in `src/app/timeline-test/components/SliceList.tsx:153` and `src/app/timeline-test/components/SliceList.tsx:164` |
| 22 | Burst window rects receive pointer events and are click-targets | ✓ VERIFIED | `src/components/timeline/DualTimeline.tsx:723`, `src/components/timeline/DualTimeline.tsx:724` |
| 23 | Timeline burst click uses matching range to create slice | ✓ VERIFIED | `src/components/timeline/DualTimeline.tsx:400` |
| 24 | Zoom/pan overlay still functions after render-order change | ? UNCERTAIN | Overlay handlers exist (`src/components/timeline/DualTimeline.tsx:702`), but runtime pointer behavior needs manual validation |
| 25 | Other timeline interactions continue to work together | ? UNCERTAIN | Structural wiring present, but multi-interaction conflict testing requires live UX validation |

**Score:** 23/25 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/store/useSliceStore.ts` | Burst metadata + add/reuse matching + rename persistence | ✓ VERIFIED | 179 lines; substantive and wired to all UI paths |
| `src/lib/slice-utils.ts` | Tolerance helpers + shared timeline focus helper | ✓ VERIFIED | 84 lines; exports `rangesMatch`, `calculateRangeTolerance`, `focusTimelineRange` |
| `src/store/useSliceStore.test.ts` | Burst creation/reuse/sorting test coverage | ✓ VERIFIED | 110 lines with burst-specific assertions |
| `src/app/timeline-test/components/SliceList.tsx` | Unified list + burst chip + inline rename/delete | ✓ VERIFIED | 219 lines; active state, rename keyboard handling, chip logic |
| `src/app/timeline-test/components/SliceToolbar.tsx` | Shared subtle burst chip style tokens | ✓ VERIFIED | 177 lines; exported burst chip classes |
| `src/components/viz/BurstList.tsx` | Burst list click -> create/select/focus wiring | ✓ VERIFIED | 162 lines; `addBurstSlice`, `findMatchingSlice`, `focusTimelineRange` usage |
| `src/components/timeline/DualTimeline.tsx` | Overlay click wiring + burst highlight + render order fix | ✓ VERIFIED | 764 lines; zoom rect then burst rect order with click handler |
| `src/app/timeline-test/components/CommittedSliceLayer.tsx` | Unified committed slice rendering (manual + burst) | ✓ VERIFIED | 160 lines; no burst exclusion guards |
| `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx` | Boundary handles for visible unlocked range slices | ✓ VERIFIED | 164 lines; no burst-specific blocking |
| `src/components/viz/SliceManagerUI.tsx` | Rename + lock/visibility + range controls in manager UI | ✓ VERIFIED | 350 lines; name input wired to `updateSlice` |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `useSliceStore.addBurstSlice` | `findMatchingSlice` | burst-only range reuse | ✓ WIRED | `src/store/useSliceStore.ts:118` |
| `BurstList.handleSelectWindow` | `useSliceStore.addBurstSlice` | burst list click -> create/select | ✓ WIRED | `src/components/viz/BurstList.tsx:97` |
| `DualTimeline.handleBurstClick` | `useSliceStore.addBurstSlice` | burst overlay click -> create/select | ✓ WIRED | `src/components/timeline/DualTimeline.tsx:400` |
| `BurstList` + `DualTimeline` | timeline focus behavior | shared `focusTimelineRange` helper | ✓ WIRED | `src/components/viz/BurstList.tsx:105`, `src/components/timeline/DualTimeline.tsx:406` |
| `SliceList` inline rename | `useSliceStore.updateSlice` | blur/Enter save path | ✓ WIRED | `src/app/timeline-test/components/SliceList.tsx:91` |
| `SliceManagerUI` name input | `useSliceStore.updateSlice` | onChange rename path | ✓ WIRED | `src/components/viz/SliceManagerUI.tsx:244` |
| `CommittedSliceLayer` | `useSliceStore.slices` | unified rendering source | ✓ WIRED | `src/app/timeline-test/components/CommittedSliceLayer.tsx:25` |
| burst SVG rect elements | `handleBurstClick` | `onClick` binding on burst rects | ✓ WIRED | `src/components/timeline/DualTimeline.tsx:724` |
| SVG document order | pointer-event capture | zoom rect rendered before burst rects | ✓ WIRED | `src/components/timeline/DualTimeline.tsx:695`, `src/components/timeline/DualTimeline.tsx:707` |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| --- | --- | --- |
| Phase 29 mapping in `.planning/REQUIREMENTS.md` | ? NEEDS HUMAN | Requirements file is not phase-mapped for this phase; verification was performed against plan `must_haves` + roadmap goal |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| _None blocking in phase-29 source artifacts_ | - | No TODO/FIXME/placeholder/not-implemented stubs in targeted files | - | `return null` occurrences are conditional render guards, not stub implementations |

### Human Verification Required

### 1. Zoom and Pan Behavior After Burst Layer Reorder

**Test:** On timeline view, drag/zoom on background areas near and around burst windows; use wheel/gesture pan if supported.
**Expected:** Zoom/brush and pan behavior remains responsive and unchanged while burst windows stay clickable.
**Why human:** Pointer arbitration between overlapping SVG targets is runtime/interaction-dependent.

### 2. Cross-Interaction Regression Sweep

**Test:** In one session, perform burst click create/select, manual slice creation, boundary drag, scrub/select point, rename, lock/unlock, and delete/recreate.
**Expected:** No interaction steals, no stuck selection state, and no broken handle behavior.
**Why human:** Multi-step UX interaction conflicts cannot be proven by static analysis alone.

### Gaps Summary

No structural code gaps found for Phase 29 must-haves (including `29-06`). Remaining verification is runtime UX validation only.

---

_Verified: 2026-02-19T22:23:06Z_
_Verifier: Claude (gsd-verifier)_
