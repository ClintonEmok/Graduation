# Phase 71 Flow Contract: Dashboard-v2 Consolidation

## Intent

Define the canonical `dashboard-v2` user flows for v3.0 using a less-is-more model:

- one primary workflow,
- one primary CTA per step,
- aggressive progressive disclosure,
- no route hopping.

## Locked Product Decisions

- **Primary user goal:** Build slices fast.
- **Default entry:** Generate intent first.
- **Primary CTA label:** `Generate Draft Slices`.
- **Post-generate behavior:** Auto-focus top bursts before apply.
- **STKDE visibility:** Hidden until after apply/refine.
- **Success metric:** Time to first apply under 60 seconds.
- **Phase 71 scope:** Workflow/IA restructuring first (minimal visual redesign).

## Primary Workflow (Canonical)

1. **Generate**
   - User sets crime type, neighbourhood, time window, and granularity.
   - Primary CTA: `Generate Draft Slices`.
2. **Review**
   - System auto-focuses top bursts in generated draft bins.
   - User reviews burst-focused draft list + timeline overlay.
3. **Apply**
   - Primary CTA: `Apply Draft Slices`.
   - Applied slices become synchronized source of truth.
4. **Refine**
   - User can merge/split/delete/resize to improve analytic clarity.
5. **Analyze**
   - STKDE controls and hotspot-led workflows become visible.
   - User can inspect hotspots while keeping applied slices as workflow truth.

## Step-Level IA and CTA Rules

### Step 1: Generate
- Visible: intent inputs + one primary CTA.
- Hidden by default: advanced controls (secondary strategies, expert options).
- Primary CTA: `Generate Draft Slices`.

### Step 2: Review
- Visible: draft bins list, burst labels, cap/provenance warnings.
- Primary CTA: `Apply Draft Slices`.
- Secondary actions: select draft, inspect timeline context.

### Step 3: Apply
- Visible: applied status summary and synchronized state indicator.
- Primary CTA: `Refine Slices` (if changes needed) or proceed to analysis.

### Step 4: Refine
- Visible: merge/split/delete/resize tools.
- Primary CTA: `Save Refinement` (or equivalent single confirm action).

### Step 5: Analyze
- Reveal STKDE panel and hotspot controls.
- Keep one primary analysis CTA visible at a time (run/cancel).

## Scenario Coverage (Priority Order)

### S1: Long-window Burst Scan (P0)
- User opens dashboard.
- Sets broad window + granularity.
- Clicks `Generate Draft Slices`.
- Reviews auto-focused burst bins.
- Applies first useful slice set.
- **Success:** first apply in under 60s with understandable warnings/provenance.

### S2: Narrow-window Drilldown (P0)
- User narrows to short window.
- Generates and quickly inspects sparse bins.
- Applies and optionally refines one or two bins.
- **Success:** no confusion from sparse results; no route change needed.

### S3: Manual Refinement Pass (P0)
- User starts from generated drafts.
- Performs merge/split/delete/resize.
- Applies refined result.
- **Success:** edits are deterministic and reflected across synced views.

### S4: Hotspot-led Investigation (P1)
- User reaches analyze stage after apply/refine.
- Runs STKDE and inspects hotspot list/map overlay.
- Uses hotspot focus without breaking applied-slice truth.
- **Success:** STKDE feels contextual, not a separate workflow.

## Progressive Disclosure Contract

Hidden until needed:
- STKDE controls before apply/refine.
- Advanced generation controls until user expands advanced section.
- Non-core diagnostics unless warning or user request.

Always visible:
- Current workflow step.
- Current primary CTA.
- Source-of-truth state (`draft` vs `applied`).
- Critical warnings (cap hit, sampled/full-range provenance, empty-data).

## State Model (User-facing)

- `idle`: no draft or applied slices.
- `generating`: generation in progress.
- `review_ready`: drafts generated and pending apply.
- `applied`: applied slices active and synchronized.
- `refining`: manual edits in progress.
- `analyzing`: STKDE/hotspot investigation active.

Transition guardrails:
- Only one primary CTA per state.
- No hidden state jumps.
- Re-generation returns to `review_ready` and preserves explainability.

## Metrics and Acceptance

### Primary Metric
- **Time to first apply < 60 seconds** for representative first-time flow.

### Secondary Metrics
- Completion rate for S1-S3 without route hopping.
- Number of confusion points (undo loops, invalid toggles, warning dead-ends).
- Percentage of runs with visible provenance/warning context when needed.

### Acceptance Checks

- [ ] Main flow can be completed end-to-end in `dashboard-v2` only.
- [ ] Every step has one obvious primary CTA.
- [ ] STKDE is hidden before apply/refine and revealed afterward.
- [ ] Auto-focus top bursts runs after generation.
- [ ] S1-S3 can be completed without opening advanced controls.
- [ ] Under-60s first-apply target is met in smoke scenario.

## Out of Scope for Phase 71

- Full visual brand redesign.
- Deep-link sharing model expansion.
- New multi-route workflows.

---

*Phase: 71-dashboard-v2-flow-consolidation*
*Artifact: Flow contract and scenario design*
*Date: 2026-03-30*
