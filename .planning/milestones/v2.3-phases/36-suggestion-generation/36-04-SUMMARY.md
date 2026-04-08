---
phase: 36-suggestion-generation
plan: 04
subsystem: suggestions
tags: [confidence-scoring, warp-generation, interval-detection, suggestion-ui]
requires:
  - Phase 35: Semi-Automated Timeslicing Workflows
  - Phase 36-01: Confidence scoring module
  - Phase 36-02: Warp generation module
  - Phase 36-03: Interval detection module
provides:
  - Real algorithm-generated suggestions in UI
  - Configurable interval count (3-12)
  - Snapping toggle (Exact/Hour/Day)
  - Method selector (Peak/Change Point/Rule-based)
  - Context display showing active filters
  - Low-confidence visual warnings
  - Automatic re-analysis on filter changes (400ms debounce)
affects:
  - Phase 37: Algorithm Integration
tech-stack:
  added: []
  patterns:
    - Debounced automatic generation
    - Filter-aware suggestion generation
    - Store-backed empty state management
key-files:
  created:
    - src/hooks/useSuggestionGenerator.ts
  modified:
    - src/store/useSuggestionStore.ts
    - src/app/timeslicing/components/SuggestionToolbar.tsx
    - src/app/timeslicing/components/SuggestionPanel.tsx
    - src/app/timeslicing/components/ConfidenceBadge.tsx
    - src/app/timeslicing/components/SuggestionCard.tsx
key-decisions: []
---

# Phase 36 Plan 04: Integration with UI Summary

Real algorithm-generated suggestions integrated into the UI with all user controls per CONTEXT.md. Mock generation replaced with actual crime density analysis.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useSuggestionGenerator hook | 04349d7 | src/hooks/useSuggestionGenerator.ts, src/store/useSuggestionStore.ts |
| 2 | Add UI controls to SuggestionToolbar | a201a8e | src/app/timeslicing/components/SuggestionToolbar.tsx |
| 3 | Add context display to SuggestionPanel | cd82574 | src/app/timeslicing/components/SuggestionPanel.tsx |
| 4 | Add low-confidence visual warning | ccaee57 | src/app/timeslicing/components/ConfidenceBadge.tsx, src/app/timeslicing/components/SuggestionCard.tsx |
| 5 | Update timeslicing page (via SuggestionToolbar) | - | Already using new hook |

## Key Accomplishments

- **Real algorithm integration**: UseSuggestionGenerator now wires up confidence-scoring, warp-generation, and interval-detection modules
- **Geographic filter support**: Passes districts filter to useCrimeData for context-aware suggestions
- **Automatic re-analysis**: 400ms debounce triggers re-generation when filters (crime types, districts, time range) change
- **Empty state handling**: isEmptyState flag in store triggers helpful UI message
- **UI controls**: Interval slider (3-12), snapping toggle (Exact/Hour/Day), method selector (Peak/Change Point/Rule-based)
- **Context display**: Toggle shows "Based on:" with active filters in SuggestionPanel
- **Low-confidence warnings**: Amber border on cards and warning icon in badge for confidence < 50

## Verification

- [x] TypeScript compilation succeeds
- [x] New hook imports and uses all three algorithm modules
- [x] Geographic filter (districts) passed to useCrimeData
- [x] SuggestionToolbar renders with all new controls
- [x] Context toggle works and shows filters
- [x] Empty state message appears in UI
- [x] ConfidenceBadge shows warning icon when confidence < 50
- [x] SuggestionCard shows amber border for low confidence

## Deviations from Plan

None - plan executed exactly as written.

---

**Next:** Ready for Phase 36-04 completion → Phase 37: Algorithm Integration
