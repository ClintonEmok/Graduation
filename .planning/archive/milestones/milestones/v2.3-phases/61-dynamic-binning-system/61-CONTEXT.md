# Phase 61: Dynamic Rule-Based Binning System - Context

**Gathered:** 2026-03-25
**Status:** Complete (implementation already shipped)

<domain>
## Phase Boundary

Build dynamic rule-based binning system with merge/split/delete/resize operations and constraint validation. Users can create bins using 12+ rule-based strategies, manipulate individual bins, and save/load configurations.

</domain>

<decisions>
## Implementation Decisions

### Strategy Selection
- **D-01:** 13 strategies available: daytime-heavy, nighttime-heavy, crime-type-specific, burstiness, uniform-distribution, uniform-time, weekday-weekend, quarter-hourly, hourly, daily, weekly, custom, auto-adaptive
- **D-02:** Default strategy is `auto-adaptive` which analyzes data distribution to choose optimal approach

### Bin Operations
- **D-03:** Merge: Adjacent bins can be merged into single bin with combined event count and metadata
- **D-04:** Split: Bins can be split at midpoint or custom timestamp
- **D-05:** Delete: Individual bins can be removed from configuration
- **D-06:** Resize: Bin boundaries can be adjusted by setting new start/end times

### Constraints
- **D-07:** minEvents: Minimum events per bin (default: 5)
- **D-08:** maxEvents: Maximum events per bin (default: 500)
- **D-09:** maxBins: Maximum bin count (default: 40)
- **D-10:** contiguous: Require contiguous time coverage (default: true)

### Configuration Persistence
- **D-11:** Configurations saved in-memory in useBinningStore (not persisted to localStorage/database)
- **D-12:** saveConfiguration(name) stores config with timestamp for session persistence
- **D-13:** loadConfiguration(id) restores strategy, constraints, and domain

### Integration
- **D-14:** BinningStore connected to DashboardHeader via BinningControls component
- **D-15:** Strategy changes trigger automatic bin recomputation when data is available

### the agent's Discretion
- Exact UI layout and styling of BinningControls component
- Whether to persist configurations to localStorage for cross-session retention
- Additional validation rules beyond minEvents/maxEvents/maxBins
- Event count distribution in split operation (currently 50/50 split)
- Error messaging and user feedback for invalid operations

</decisions>

<canonical_refs>
## Canonical References

### Binning System
- `src/lib/binning/types.ts` — TimeBin, BinningState, SavedConfiguration types
- `src/lib/binning/rules.ts` — Strategy definitions, preset configs, constraint validation
- `src/lib/binning/engine.ts` — generateBins() implementation with all strategies

### Store
- `src/store/useBinningStore.ts` — Full state management with CRUD operations

### UI Integration
- `src/components/binning/BinningControls.tsx` — Dashboard UI for binning
- `src/components/dashboard/DashboardHeader.tsx` — Hosts BinningControls

### Planning
- `.planning/phases/61-dynamic-binning-system/61-01-PLAN.md` — Original plan

No external specs — all requirements captured in this context.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- useBinningStore: Complete state management with all operations
- generateBins(): Strategy-agnostic bin generation engine
- validateConstraints(): Reusable constraint validation logic

### Established Patterns
- Zustand store with create<State>((set, get) => ({}) pattern
- Strategy-based switch in engine with dedicated generator functions
- Configuration persistence via in-memory savedConfigurations array

### Integration Points
- DashboardHeader imports useBinningStore and BinningControls
- BinningControls receives strategy, bins, and callbacks as props
- computeBins() accepts CrimeEventData[] and optional domain override

</code_context>

<specifics>
## Specific Ideas

No specific requirements documented — implementation followed standard patterns and the original plan specs.

</specifics>

<deferred>
## Deferred Ideas

None — all Phase 61 scope items delivered.

</deferred>

---

*Phase: 61-dynamic-binning-system*
*Context gathered: 2026-03-25*
*Note: Implementation already complete per STATE.md - context captures decisions made during implementation*