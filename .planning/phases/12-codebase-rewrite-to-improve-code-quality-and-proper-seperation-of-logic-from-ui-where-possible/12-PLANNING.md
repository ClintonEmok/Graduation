---
phase: 12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []

# Planning Context

**Phase:** 12
**Phase Name:** Codebase rewrite to improve code quality and proper separation of logic from UI where possible
**Mode:** standard

## Context Sources

### ARCHITECTURE AUDIT (REPORT.md - already exists in phase directory)
The phase directory contains `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/REPORT.md` which is a comprehensive architecture audit.

### Key Findings from REPORT.md:

**GOD FILES (Priority Order):**
1. `src/components/timeline/DemoDualTimeline.tsx` (1583 lines) - P0
2. `src/components/timeline/DualTimeline.tsx` (1322 lines) - P0  
3. `src/store/useSuggestionStore.ts` (768 lines) - P0
4. `src/components/dashboard-demo/DemoSlicePanel.tsx` (909 lines) - P1
5. `src/app/demo/non-uniform-time-slicing/showcase.tsx` (880 lines) - P1
6. `src/hooks/useSuggestionGenerator.ts` (579 lines) - P1

**TYPE DUPLICATION ISSUES:**
- CrimeRecord duplicated in `src/lib/queries/types.ts` (keep in `src/types/crime.ts`)
- ColumnarData duplicated in `src/lib/data/types.ts` (keep in `src/types/index.ts`)
- AdaptiveBinningMode duplicated in `src/lib/queries/types.ts` and `src/store/useAdaptiveStore.ts`

**MISSING UTILITIES (to create):**
- `src/lib/date-formatting.ts` - Date/time formatting by resolution
- `src/lib/stats.ts` - Mean, stddev, burstiness formulas  
- `src/lib/downsample.ts` - Point reduction/limiting
- `src/lib/bounds.ts` - Geographic bounds calculation
- `src/lib/formatting.ts` - Duration, interval formatting
- `src/lib/math.ts` - Clamping, rounding helpers
- `src/lib/state-machine.ts` - Auto-run lifecycle states

**LOGIC EXTRACTION CANDIDATES:**
- DualTimeline.tsx lines 551-601: Tick calculation → `src/lib/time-domain.ts`
- DualTimeline.tsx lines 602-630: Date formatting → `src/lib/date-formatting.ts`
- DualTimeline.tsx lines 684-790: Slice geometry → `src/lib/slice-geometry.ts`
- useSuggestionGenerator.ts lines 146-160: useDebounce → `src/hooks/useDebounce.ts`

**RECOMMENDED EXECUTION ORDER (from REPORT.md):**
1. Consolidate all types into `src/types/` — move all type definitions scattered across `src/lib/` and `src/store/` into `src/types/`, deduplicate
2. Create missing utilities — date-formatting, stats, downsample, bounds, formatting, math, state-machine
3. Extract logic from hooks
4. Refactor P0 god stores — useSuggestionStore
5. Refactor P0 god components — DualTimeline, DemoDualTimeline
6. Refactor P1 files
7. Address P2 issues

---

## Phase Goal

Refactor god files, extract business logic from components, fix type duplication, create missing utilities, and improve overall code quality following Finoit software architecture best practices.

---

## Downstream Consumer

Output consumed by /gsd-execute-phase. Plans need:
- Frontmatter (wave, depends_on, files_modified, autonomous)
- Tasks in XML format with read_first and acceptance_criteria fields (MANDATORY on every task)
- Verification criteria
- must_haves for goal-backward verification

---

## Deep Work Rules

Every task MUST include these fields:

1. **`<read_first>`** — Files the executor MUST read before touching anything:
   - The file being modified (so executor sees current state)
   - Any "source of truth" file with patterns/signatures/types to replicate
   - Any file whose conventions must be respected

2. **`<acceptance_criteria>`** — Verifiable conditions proving task done correctly:
   - Every criterion checkable with grep, file read, test command, or CLI output
   - NEVER subjective language ("looks correct", "properly configured")
   - ALWAYS exact strings, patterns, values, or command outputs present

3. **`<action>`** — Must include CONCRETE values:
   - NEVER "align X with Y" without specifying exact target state
   - ALWAYS actual values: config keys, function signatures, import paths, etc.

---

## Planning Guidance

Based on the REPORT.md architecture audit, create 4-5 plans covering:

**Plan 12-01:** Type System Overhaul
- Deduplicate CrimeRecord, ColumnarData, AdaptiveBinningMode
- Move all type definitions to src/types/
- Create src/types/index.ts as single re-export point
- Files: src/types/crime.ts, src/types/index.ts, src/lib/queries/types.ts, src/lib/data/types.ts, src/store/useAdaptiveStore.ts

**Plan 12-02:** Missing Utilities Creation  
- Create src/lib/date-formatting.ts
- Create src/lib/stats.ts
- Create src/lib/downsample.ts
- Create src/lib/bounds.ts
- Create src/lib/formatting.ts
- Create src/lib/math.ts
- Create src/lib/state-machine.ts

**Plan 12-03:** useSuggestionStore Split (P0 god store)
- Split into useSuggestionStore.ts (core CRUD)
- Create usePresetStore.ts (preset management)
- Create useSuggestionHistoryStore.ts (undo/redo)
- Create useSuggestionComparisonStore.ts (comparison state)

**Plan 12-04:** DualTimeline.tsx Refactor (P0 god component)
- Extract useDualTimelineScales.ts hook
- Extract slice-geometry.ts lib
- Extract date-formatting.ts (from utility plan)
- Extract TimelineOverview and TimelineDetail sub-components

**Plan 12-05:** DemoDualTimeline.tsx Refactor (P0 god component)
- Apply same extraction pattern as DualTimeline
- Share extracted utilities between the two timeline components

Each plan should:
- Target 2-3 tasks
- Complete within ~50% context
- Have concrete verification criteria
- Include must_haves derived from goal-backward

---

## Must-Haves

### Truths (Observable Behaviors)
- Types are consolidated in src/types/ with no duplication
- Utility functions exist and are used consistently
- God files are split into focused, single-responsibility modules
- Business logic is extracted from components into lib/

### Artifacts
- src/types/index.ts - Re-exports all public types
- src/types/crime.ts - Canonical CrimeRecord definition
- src/lib/date-formatting.ts - Date formatting utilities
- src/lib/stats.ts - Statistical helpers
- src/lib/downsample.ts - Point reduction
- src/lib/bounds.ts - Geographic bounds
- src/lib/formatting.ts - Formatting utilities
- src/lib/math.ts - Math helpers
- src/lib/state-machine.ts - State machine utility
- src/hooks/useDebounce.ts - Debounce hook

### Key Links
- All imports reference src/types/ (single source of truth)
- Extracted utilities are imported by the components that need them
- Split stores maintain proper Zustand slice patterns
