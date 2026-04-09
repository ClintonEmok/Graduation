---
phase: 40
plan: 09
subsystem: timeline
tags:
  - warp-overlay
  - suggestion-slices
  - dual-timeline
  - gap-closure
dependency_graph:
  requires:
    - 40-01
    - 40-02
    - 40-03
  provides:
    - warp slices from auto proposal visible on timeline
  affects:
    - timeslicing page user experience
tech_stack:
  added: []
  patterns:
    - warp slice source filtering
key_files:
  created: []
  modified:
    - src/components/timeline/DualTimeline.tsx
decisions: []
---

# Phase 40 Plan 09: Fix Warp Overlay to Show Suggestion-Sourced Warp Slices

**One-liner:** Render suggestion-sourced warp slices on timeline alongside manual warps

## Summary

Fixed warp overlay filtering in DualTimeline to show all enabled warp slices regardless of source. Previously only `source: 'manual'` warps rendered, but auto-proposal accepted warps have `source: 'suggestion'`.

## What Was Done

Changed the warp overlay filter from:
```typescript
.filter((slice) => slice.enabled && slice.source === 'manual')
```

To:
```typescript
.filter((slice) => slice.enabled)
```

This ensures both manual and suggestion-sourced warp slices display on the timeline after accepting a full-auto package.

## Verification

- Accept a full-auto package in timeslicing route
- Refresh page
- Warp overlay should now be visible on timeline

## Success Criteria

- ✅ Both manual and auto-proposal warps display
- ✅ User sees warp effect after accepting package

## Commit

`97b3107` - fix(40-09): render suggestion-sourced warp slices on timeline
