# Codebase Concerns

**Analysis Date:** 2026-05-12

## Bug: Burst Score Scale Mismatch — "5000%" Display

### Summary

The codebase has **two incompatible `burstScore` scales** (0–1 and 0–100) that feed into **five UI components** which all apply `* 100`, causing a **50× inflated display** (e.g., a true score of 50 displays as "5000%").

---

## Type Definitions

All type definitions define `burstScore` as `number` with no scale annotation:

| File | Field | Line |
|------|-------|------|
| `src/lib/binning/types.ts` | `TimeBin.burstScore` | 33 |
| `src/store/slice-domain/types.ts` | `TimeSlice.burstScore` | 17 |
| `src/app/stkde-3d/lib/types.ts` | `EvolvingSlice.burstScore` | 13 |
| `src/store/useDashboardDemoCoordinationStore.ts` | `DemoBurstWindowSelection.burstScore` | 20 |

**No type enforces a scale — the scale is implicit from the generation path.**

---

## Value Generation Paths

### Path A: `demo-burst-generation.ts` — `calculateBurstinessFromTimes` (0–100 scale)

**Lines 216–243:**
```typescript
const normalizedScore = Math.round(((coefficient + 1) / 2) * 100);
```

`normalizedScore` is in **0–100 range**. This is assigned as `burstScore` in:
- `buildNeutralPartitionBin` line 318: `burstScore: analysis.normalizedScore`
- `buildBurstPartitionBin` line 354: `burstScore: analysis.normalizedScore`
- `buildValleyPartitionBin` line 392: `burstScore: analysis.normalizedScore`
- `buildBurstDraftBinsFromCrimeRecords` line 797: `burstScore: taxonomy.burstScore`

Also `buildDraftBin` line 597: `burstScore: burstWindow.burstScore` (from `BurstWindow` coming from `buildBurstWindowsFromSeries`).

**Scale: 0–100**

---

### Path B: `burst-detection.ts` — `buildFallbackBurstResponse` (0–1 scale)

**Lines 282–284:**
```typescript
const temporalB = Number(clamp01(0.12 + (durationDays % 1) * 0.1 + fraction * 0.55).toFixed(4));
const spatialB = Number(clamp01(0.18 + ((index + 1) % 5) * 0.05 + (1 - fraction) * 0.45).toFixed(4));
const combinedB = Number((0.5 * temporalB + 0.5 * spatialB).toFixed(4));
```

`combinedB` (the `combinedB` in `BurstBinResult`) is in **0–1 range** (clamped and .toFixed(4)'d). It is the value returned by `resolveBurstMetricValue(bin, 'combined')` which is the score exposed as `burstScore` in `BurstBinResult` — but notably `BurstBinResult` doesn't have a `burstScore` field; it has `temporalB`, `spatialB`, `combinedB`. The `allocateSlices` function uses `resolveBurstMetricValue(bin, metric)` to get scores.

**Scale: 0–1**

---

### Path C: `useDashboardDemoTimeslicingModeStore.ts` — `computeManualDraftBin` (0–100 scale)

**Line 468:**
```typescript
burstScore = Math.round(((burstinessCoefficient + 1) / 2) * 100);
```

**Scale: 0–100**

---

### Path D: `mock-data.ts` — `computeBurstScore` and `computeRealBurstScore` (0–1 scale)

**Lines 175–196 (`computeBurstScore`):**
```typescript
return clamp((concentration - 0.05) / 0.6, 0, 1);
```

**Lines 198–203 (`computeRealBurstScore`):**
```typescript
return clamp((maxIntensity / events.length) * 24, 0, 1);
```

Used at line 229–238 and 277 to set `burstScore` for mock STKDE 3D slices.

**Scale: 0–1**

---

## Rendering Paths — All Assume 0–1

Every rendering path applies `* 100` to `burstScore`. When the value is already 0–100 (Paths A and C), the result is 50× inflation.

### `Demo3dSpatialView.tsx` line 235 — DOUBLE-SCALING

```typescript
const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;
```

Assumes 0–1, but `slice.burstScore` comes from `TimeSlice` (from `useSliceDomainStore`) which stores values from Path A (0–100) or Path C (0–100). **If `burstScore = 50`, displays "5000%".**

---

### `DemoInspectPanel.tsx` line 100 — DOUBLE-SCALING

```typescript
<span>{(slice.burstScore * 100).toFixed(0)}%</span>
```

Same problem. Displays "5000%" for a 0–100 score of 50.

---

### `SliceScrubber.tsx` — DOUBLE-SCALING (5 occurrences)

| Line | Code | Use |
|------|------|-----|
| 68 | `title={`${slice.label}: burst ${(slice.burstScore * 100).toFixed(0)}%`}` | Button tooltip |
| 97 | `{(activeSlice.burstScore * 100).toFixed(0)}%` | Badge label |
| 118 | `{(activeSlice.burstScore * 100).toFixed(0)}%` | Intensity display |
| 131 | `width: \`${activeSlice.burstScore * 100}%\`` | Progress bar width |
| 162 | `{(slice.burstScore * 100).toFixed(0)}%` | List item badge |

This component receives `EvolvingSlice[]` (from `src/app/stkde-3d/lib/types.ts`) whose `burstScore` comes from mock data (Path D, 0–1 scale) **in the STKDE 3D page only**. The `stkde-3d` page passes mock-generated `burstScore` values which are correct 0–1. So this component works correctly for STKDE 3D, but would double-scale if fed from Path A/C values.

---

### `StkdeSliceStack.tsx` line 103 — DOUBLE-SCALING

```typescript
const burstLabel = `${(slice.burstScore * 100).toFixed(0)}%`;
```

Same pattern. Uses `EvolvingSlice` type, receives from mock data (Path D, 0–1). Correct in STKDE 3D context.

---

## `DemoPendingDraftList.tsx` — NO `* 100` (Correct by accident)

**Line 127:**
```typescript
const burstScore = formatBurstCoefficient(bin.burstinessCoefficient ?? bin.burstScore) ?? '—';
```

**Line 11–16:**
```typescript
const formatBurstCoefficient = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(2);
};
```

This does NOT multiply by 100. It displays `bin.burstinessCoefficient` (the -1 to 1 coefficient) with `toFixed(2)`, e.g., "0.75". If `burstScore` (0–100) is shown instead, it would display "50.00" — also wrong, but not 5000%.

---

## Summary Table

| File | Path | Scale Produced | Rendering | Result for score=50 |
|------|------|---------------|-----------|---------------------|
| `demo-burst-generation.ts` (calculateBurstinessFromTimes) | A | **0–100** | — | — |
| `burst-detection.ts` (buildFallbackBurstResponse) | B | **0–1** | — | — |
| `useDashboardDemoTimeslicingModeStore.ts` (computeManualDraftBin) | C | **0–100** | — | — |
| `mock-data.ts` (computeBurstScore/computeRealBurstScore) | D | **0–1** | — | — |
| `Demo3dSpatialView.tsx` | — | — | `(burstScore * 100).toFixed(0)` | **5000%** |
| `DemoInspectPanel.tsx` | — | — | `(burstScore * 100).toFixed(0)` | **5000%** |
| `SliceScrubber.tsx` | — | — | `(burstScore * 100).toFixed(0)` | **5000%** (with Path D input, correct) |
| `StkdeSliceStack.tsx` | — | — | `(burstScore * 100).toFixed(0)` | **5000%** (with Path D input, correct) |
| `DemoPendingDraftList.tsx` | — | — | `toFixed(2)` only (no * 100) | "50.00" (wrong label, not %) |

---

## Fix Approach

1. **Standardize on 0–1 scale** throughout the codebase — change all `normalizedScore` assignments in `calculateBurstinessFromTimes` and `computeManualDraftBin` to use `((coefficient + 1) / 2)` **without `* 100`**. This makes the scale consistent with `burst-detection.ts` Paths B and D.

2. **Remove `* 100` from all rendering components** — change `(slice.burstScore * 100).toFixed(0)` to `(slice.burstScore * 100).toFixed(0)` stays if scale is 0–1, or remove the `* 100` if scale is 0–1 after step 1.

3. **Update `DemoPendingDraftList.tsx`** — change `formatBurstCoefficient` to multiply by 100 before formatting if the intent is to show percentage, or keep as-is if showing coefficient.

4. **Audit `buildBurstWindowsFromSeries`** in `src/components/viz/BurstList` — trace what `burstScore` it produces for `BurstWindow` objects used by `buildBurstDraftBinsFromWindows` at line 597.

---

## Files Involved

| File | Role |
|------|------|
| `src/lib/binning/types.ts` | Type definition (line 33) |
| `src/store/slice-domain/types.ts` | Type definition (line 17) |
| `src/app/stkde-3d/lib/types.ts` | Type definition (line 13) |
| `src/store/useDashboardDemoCoordinationStore.ts` | Type definition (line 20) |
| `src/components/dashboard-demo/lib/demo-burst-generation.ts` | **Generates 0–100** (lines 232, 318, 354, 392, 797) |
| `src/lib/burst-detection.ts` | **Generates 0–1** (lines 282–284) |
| `src/store/useDashboardDemoTimeslicingModeStore.ts` | **Generates 0–100** (line 468) |
| `src/app/stkde-3d/lib/mock-data.ts` | **Generates 0–1** (lines 195, 202) |
| `src/components/dashboard-demo/Demo3dSpatialView.tsx` | **Renders with double-scale** (line 235) |
| `src/components/dashboard-demo/DemoInspectPanel.tsx` | **Renders with double-scale** (line 100) |
| `src/app/stkde-3d/components/SliceScrubber.tsx` | **Renders with double-scale** (lines 68, 97, 118, 131, 162) |
| `src/app/stkde-3d/components/StkdeSliceStack.tsx` | **Renders with double-scale** (line 103) |
| `src/components/dashboard-demo/DemoPendingDraftList.tsx` | Renders without `* 100` (line 127) |

---

*Concerns audit: 2026-05-12*