# Roadmap: Adaptive Space-Time Cube Prototype — v3.1

## Overview

Milestone **v3.1 — Workflow Finalization** turns the demo into an obvious analysis tool.
The focus is workflow clarity: Detect should start scanning and generation, Slices should review and apply,
Inspect should surface the active slice immediately, and the shell should stay quiet enough to support the analysis loop.

**Current focus:** v3.1 milestone

## Milestones

- ✅ **v1.0** Thesis Prototype — Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1** Manual Timeslicing — Phases 26-33 (shipped 2026-02-22)
- ✅ **v1.2** Semi-Automated Timeslicing Workflows — Phases 34-39 (shipped 2026-03-02)
- ✅ **v1.3** Fully Automated Timeslicing Workflows — Phases 40-42 (shipped 2026-03-04)
- ✅ **v2.0** 3D Timeline-Test Parity — Phases 43-45 (shipped 2026-03-06)
- ✅ **v2.1** Refactoring and Decomposition — Phases 46-51 (shipped 2026-03-10)
- ✅ **v2.2** Timeslicing Fidelity — Phases 52-53 (shipped 2026-03-11)
- ✅ **v2.3** Adaptive Timeslicing Algos Hardening — Phase 54 (shipped with tech debt)
- ✅ **v2.4** STKDE Exploration Surface — Phase 55 (shipped 2026-03-16)
- ✅ **v2.5** Stats Dashboard + Neighbourhood Diagnostics — Phases 57-59 (shipped 2026-03-23)
- ✅ **MVP Finale** Phases 01-06 (completed 2026-05-07)
  - 01: Store sync + slice planes
  - 02: 3D STKDE on cube planes
  - 03: Adjacent slice comparison + burst evolution
  - 04: Evolution view with playback
  - 05: DBSCAN clustering
  - 06: Category encoding
- ✅ **v3.0 Burstiness-Driven Adaptive Slicing** — Completed 2026-05-13
- 📋 **v3.1 Workflow Finalization** — Current milestone

## v3.1 Phases

### Phase 72: Workflow Clarity

**Goal:** Make Detect, Slices, and Inspect read as one clear workflow instead of separate draft surfaces.

**Depends on:** v3.0 completion

**Requirements:** FLOW-07, FLOW-08

| ID | Requirement | Notes |
|----|-------------|-------|
| FLOW-07 | Detect is the obvious entry point for burst scanning and slice generation | Keep burst generation in one place |
| FLOW-08 | Slices is the obvious review/apply surface for pending and manual slices | Review, merge, split, and apply stay together |

**Success criteria (what must be TRUE):**
1. Detect clearly starts the workflow
2. Slices clearly owns review and apply actions
3. The workflow is understandable without extra explanation

**Plans:** 2 plans

Plans:
- [ ] 72-01-PLAN.md — Make Detect the obvious entry point for burst scanning and slice generation
- [ ] 72-02-PLAN.md — Make Slices the review/apply surface and route the workflow there

---

### Phase 73: Inspection Speed

**Goal:** Make active-slice inspection immediate and low-friction.

**Depends on:** Phase 5

**Requirements:** FLOW-09

| ID | Requirement | Notes |
|----|-------------|-------|
| FLOW-09 | Inspect shows active slice state and comparison controls immediately | Users can see what they are inspecting without extra clicks |

**Success criteria (what must be TRUE):**
1. Active slice context is obvious while inspecting
2. Comparison controls are reachable without hunting
3. The Inspect panel feels faster than the draft surfaces

---

### Phase 74: Coordination Polish

**Goal:** Keep map, 3D, and timeline synchronized so apply/playback feels coherent.

**Depends on:** Phase 6

**Requirements:** FLOW-10

| ID | Requirement | Notes |
|----|-------------|-------|
| FLOW-10 | Map, cube, and timeline stay synchronized with the active slice while chrome stays minimal | The active slice should read the same across views |

**Success criteria (what must be TRUE):**
1. Applying a slice lands the user in the correct inspect surface
2. Map and 3D stay visually aligned to the active slice
3. Playback and navigation do not desync the views

---

### Phase 75: Presentation Cleanup

**Goal:** Reduce presentation noise so the tool feels intentional and not overdesigned.

**Depends on:** Phase 7

**Requirements:** FLOW-07 to FLOW-10

| ID | Requirement | Notes |
|----|-------------|-------|
| FLOW-07 | Labels and helper copy are slice-first | Remove leftover draft/presentation language |
| FLOW-08 | Defaults favor clarity over spectacle | Reduce chrome and keep the workflow legible |
| FLOW-09 | Inspect shows active slice state and comparison controls immediately | Keep the active context readable |
| FLOW-10 | Map, cube, and timeline stay synchronized with the active slice while chrome stays minimal | Preserve clarity across all three views |

**Success criteria (what must be TRUE):**
1. The dashboard reads as a working tool, not a presentation deck
2. New users can infer the flow from the labels and layout alone
3. Excess visual noise is removed without losing functionality

## Deferred

- **Thesis framing updates**: Any academic copy or thesis-specific language should stay secondary to the tool workflow.
- **Full-range generation**: Using full population data instead of sampled fetches. Current API sampling is sufficient for interactive use.
- **Edit history / undo**: Manual slice editing history. Existing store snapshots provide basic undo.
