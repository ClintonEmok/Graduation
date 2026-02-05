---
phase: 24-interaction-synthesis-debugging
verified: 2026-02-05T00:00:00Z
status: gaps_found
score: 6/8 truths verified
gaps:
  - truth: "Selecting a range in timeline dims unselected points"
    status: partial
    reason: "Shader has brush dimming logic (ghosting.ts lines 195-199) and DataPoints updates uniforms (lines 278-290), but Timeline components don't call setBrushRange to set the brush range in the coordination store. The brushRange state exists but is never populated."
    artifacts:
      - path: "src/components/timeline/Timeline.tsx"
        issue: "Calls setRange() on timeStore but never calls setBrushRange() on coordinationStore"
      - path: "src/components/timeline/DualTimeline.tsx"
        issue: "Has brush interaction but doesn't sync brush range to coordination store"
    missing:
      - "Timeline components need to call setBrushRange([startNormalized, endNormalized]) when brush selection changes"
      - "Sync between timeStore range and coordinationStore brushRange"
  - truth: "Visual raycast line appears on click"
    status: failed
    reason: "No raycast line visualization component exists. DataPoints has robust click handling with raycasting, but no visual feedback (line) is rendered when clicking."
    artifacts:
      - path: "src/components/viz/DataPoints.tsx"
        issue: "Has raycasting logic (lines 356-358, 394) but no visual raycast line rendering"
    missing:
      - "RaycastLine component or similar visual indicator"
      - "Line rendering from camera to click point in 3D scene"
      - "Temporary visual feedback on click (fade out animation)"
---

# Phase 24: Interaction Synthesis & Debugging - Verification Report

**Phase Goal:** Harmonize interactions across Timeline, Map (2D), and Space-Time Cube (3D). Fix selection state syncing and 3D click targeting.

**Verified:** 2026-02-05

**Status:** gaps_found

**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                           | Status       | Evidence                                                                 |
| --- | ----------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| 1   | Clicking a point in 3D scrolls timeline to that point | ✓ VERIFIED   | DataPoints.tsx:397 sets selection; useSelectionSync.ts:30-55 syncs to timeline via setTime() |
| 2   | Selecting a range in timeline dims unselected points  | ⚠️ PARTIAL   | ghosting.ts:195-199 has dimming logic; uniforms updated but brushRange never set by Timeline |
| 3   | Clicking in map selects point in 3D and timeline | ✓ VERIFIED   | MapVisualization.tsx:167 calls setSelectedIndex(); triggers 3D highlight and timeline sync |
| 4   | 3D clicks are robust and reliable               | ✓ VERIFIED   | DataPoints.tsx:361-445 has drag detection, instance validation, logging, clear handlers |
| 5   | Visual raycast line appears on click            | ✗ FAILED     | No raycast line component found; raycasting exists but no visual feedback |
| 6   | Selecting in Map updates 3D view                | ✓ VERIFIED   | MapVisualization sets selection; DataPoints.tsx:270-276 updates uSelectedIndex uniform |
| 7   | Selecting in 3D updates Map                     | ✓ VERIFIED   | MapVisualization.tsx:87-90 computes selectionPoint; lines 226-228 renders MapSelectionMarker |
| 8   | Timeline scrolls to selection                   | ✓ VERIFIED   | useSelectionSync.ts:53 calls setTime(); DualTimeline.tsx:262-265 shows selection indicator |

**Score:** 6/8 truths verified (2 gaps: 1 partial, 1 failed)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/useCoordinationStore.ts` | Central selection state | ✓ VERIFIED | 22 lines, full implementation with selectedIndex, selectedSource, brushRange, setBrushRange |
| `src/components/viz/shaders/ghosting.ts` | Updated shader logic | ✓ VERIFIED | 251 lines, comprehensive shader with uBrushStart/uBrushEnd uniforms and inBrushRange logic (lines 195-199) |
| `src/hooks/useSelectionSync.ts` | Sync logic | ✓ VERIFIED | 104 lines, two effects: (1) sync selection to timeline, (2) sync selection to slices |
| `src/components/viz/DataPoints.tsx` | 3D point interaction | ✓ VERIFIED | 503 lines, robust click handling, shader uniform updates, selection integration |
| `src/components/viz/MainScene.tsx` | Scene orchestration | ✓ VERIFIED | 102 lines, uses useSelectionSync hook (line 28) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| DataPoints | useCoordinationStore | setSelectedIndex | ✓ WIRED | DataPoints.tsx:57 imports, line 397 calls with 'cube' source |
| DataPoints | ghosting.ts | onBeforeCompile | ✓ WIRED | DataPoints.tsx:448 calls applyGhostingShader in onBeforeCompile |
| MainScene | useSelectionSync | hook usage | ✓ WIRED | MainScene.tsx:28 calls useSelectionSync() |
| MapVisualization | useCoordinationStore | setSelectedIndex | ✓ WIRED | MapVisualization.tsx:35 imports, line 167 calls with 'map' source |
| DualTimeline | useCoordinationStore | setSelectedIndex | ✓ WIRED | DualTimeline.tsx:35 imports, line 281 calls with 'timeline' source |
| Timeline | useCoordinationStore | setBrushRange | ✗ NOT WIRED | Timeline.tsx never calls setBrushRange; only calls setRange on timeStore |

---

## Requirements Coverage

This phase implements cross-view coordination requirements:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Selection state centralization | ✓ SATISFIED | useCoordinationStore.ts provides single source of truth |
| 3D → Timeline sync | ✓ SATISFIED | useSelectionSync.ts Effect 1 syncs selection to timeline scroll |
| Map → 3D sync | ✓ SATISFIED | MapVisualization sets selection, DataPoints reacts via uniform |
| 3D → Map sync | ✓ SATISFIED | MapSelectionMarker renders on selectionPoint change |
| Timeline → 3D sync | ✓ SATISFIED | DualTimeline click sets selection, DataPoints highlights |
| Brush range dimming | ⚠️ PARTIAL | Shader logic exists but brushRange never populated from Timeline |
| Visual raycast feedback | ✗ BLOCKED | No raycast line component implemented |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/timeline/Timeline.tsx | 62-80 | Uses setRange but not setBrushRange | ⚠️ Warning | Brush dimming feature incomplete |
| src/components/timeline/DualTimeline.tsx | 144-287 | Has brush logic but no coordination sync | ⚠️ Warning | Brush dimming feature incomplete |
| src/components/viz/DataPoints.tsx | 384 | console.log for drag detection | ℹ️ Info | Debug logging (acceptable) |
| src/components/viz/DataPoints.tsx | 394 | console.log for raycast hit | ℹ️ Info | Debug logging (acceptable) |
| src/components/viz/DataPoints.tsx | 440 | console.log for missed click | ℹ️ Info | Debug logging (acceptable) |

---

## Human Verification Required

The following items need manual testing to confirm full functionality:

### 1. 3D Click Responsiveness
**Test:** Click on various points in the 3D cube at different zoom levels and camera angles
**Expected:** Selection registers reliably; drag vs click is correctly distinguished
**Why human:** Programmatic verification can't test feel/responsiveness or visual feedback timing

### 2. Timeline Scroll Behavior
**Test:** Click a point in 3D, verify timeline smoothly scrolls to that time
**Expected:** Timeline animates to center on selected point's time; no jarring jumps
**Why human:** Can't verify animation smoothness or correct time positioning programmatically

### 3. Cross-View Selection Consistency
**Test:** Click in Map, verify 3D highlights and timeline scrolls. Then click in 3D, verify Map marker updates.
**Expected:** All three views stay synchronized regardless of which view initiated selection
**Why human:** Need to verify visual state consistency across all views simultaneously

### 4. Brush Dimming (once fixed)
**Test:** Select a time range in timeline, verify points outside range are visually dimmed in 3D
**Expected:** Unselected points show reduced opacity/desaturation per ghosting.ts logic
**Why human:** Shader visual effects need visual confirmation

### 5. Raycast Line (once implemented)
**Test:** Click in 3D space, verify a line appears from camera to click point
**Expected:** Temporary line visualizes the raycast path, fades out after short delay
**Why human:** Visual feedback confirmation

---

## Gaps Summary

### Gap 1: Brush Range Dimming Not Connected
**Severity:** Medium
**Description:** The ghosting shader has logic to dim points outside the brush range (ghosting.ts lines 195-199), and DataPoints updates the uniforms (lines 278-290). However, the Timeline components only update `timeStore.setRange()` and never call `coordinationStore.setBrushRange()`. This means the `brushRange` state in the coordination store is always `null`, and the dimming logic is never triggered.

**Root Cause:** Missing integration between Timeline brush interaction and coordination store.

**Fix Required:**
1. In Timeline.tsx and/or DualTimeline.tsx, when brush selection changes, also call `setBrushRange([startNormalized, endNormalized])`
2. Ensure brush range is synced between timeStore and coordinationStore

### Gap 2: Visual Raycast Line Missing
**Severity:** Low-Medium
**Description:** 3D click handling is robust (drag detection, logging, proper event handling) but there's no visual feedback showing the raycast path when clicking. This was listed as a must-have truth but is not implemented.

**Root Cause:** Raycast line component was planned but not implemented.

**Fix Required:**
1. Create RaycastLine component or add line rendering to DataPoints
2. On click, render a line from camera position to intersection point
3. Fade out line after short delay (e.g., 300-500ms)

---

## Re-verification Checklist (for when gaps are fixed)

- [ ] Timeline.tsx calls setBrushRange when brush selection changes
- [ ] DualTimeline.tsx calls setBrushRange when brush selection changes
- [ ] Brush dimming visibly works in 3D view when timeline range is selected
- [ ] RaycastLine component created and renders on 3D click
- [ ] Raycast line fades out after appropriate delay
- [ ] All 8 observable truths pass manual testing

---

_Verified: 2026-02-05_
_Verifier: Claude (gsd-verifier)_
