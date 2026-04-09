---
phase: 09
plan: 02
type: auto
autonomous: true
---

# Plan: Fix 3D Cube Visualization

## Objective
Fix the 3D cube visualization to correctly render the loaded columnar data, handle large datasets efficiently, and ensure the adaptive scaling works as expected.

## Context
We just optimized the data loading pipeline to use columnar data (TypedArrays) for performance with 1.2M rows. However, the `MainScene.tsx` is still generating and passing mock data (`data` prop) to `DataPoints.tsx` on mount, which might be conflicting or overriding the real data loaded in the store. Additionally, we need to ensure the shader attributes for the columnar data are correctly hooked up and that the `DataPoints` component properly handles the switch between mock and real data.

## Tasks

- [ ] **Task 1: Update MainScene to Use Store Data**
  - Remove local `generateMockData` call in `MainScene.tsx`.
  - Connect `MainScene` to `useDataStore` to check if data/columns exist.
  - Pass correct data source to `DataPoints`.

- [ ] **Task 2: Refine DataPoints Columnar Handling**
  - Verify `adaptiveYValues` calculation for columns.
  - Ensure `instancedBufferAttribute` logic correctly handles the `columns` prop.
  - Check if `uUseColumns` uniform is being set and used in the shader.

- [ ] **Task 3: Verify Shader Logic**
  - Check `src/components/viz/shaders/ghosting.ts` (implied location from DataPoints imports) to ensure it handles the `attributes-colX`, `attributes-colZ`, `attributes-colLinearY` when `uUseColumns` is 1.
  - Ensure color handling works for columnar data (it seems we are passing `instanceColor` attribute, which is standard Three.js, but we should double-check).

- [ ] **Task 4: Coordinate System & Scales**
  - Ensure the X/Z coordinates from the Parquet/Store (normalized or projected?) match the grid scale in the scene.
  - The setup script normalizes X/Z to 0-1 range (roughly), but the scene might expect different bounds. We might need to scale them up to fit the 100x100 grid.

## Verification
- **Automated**: None (Visual).
- **Manual**:
  1. Load app.
  2. Click "Load Real Data".
  3. Verify points appear in the 3D cube.
  4. Toggle "Adaptive" mode and verify points shift on Y-axis.
  5. Check filters (Type/District) still ghost points correctly.

## Output
- Updated `src/components/viz/MainScene.tsx`
- Updated `src/components/viz/DataPoints.tsx`
- (Potentially) Updated `src/components/viz/shaders/ghosting.ts`
