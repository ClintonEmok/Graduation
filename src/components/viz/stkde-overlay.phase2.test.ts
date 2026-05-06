import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 02 STKDE overlay contract', () => {
  it('shares the heatmap palette and wires slice results into the cube', () => {
    const mapLayerSource = readFileSync(new URL('../map/MapStkdeHeatmapLayer.tsx', import.meta.url), 'utf8');
    const timeSlicesSource = readFileSync(new URL('./TimeSlices.tsx', import.meta.url), 'utf8');
    const slicePlaneSource = readFileSync(new URL('./SlicePlane.tsx', import.meta.url), 'utf8');
    const heatmapScaleSource = readFileSync(new URL('../../lib/stkde/heatmap-scale.ts', import.meta.url), 'utf8');

    expect(heatmapScaleSource).toMatch(/STKDE_HEATMAP_COLOR_STOPS/);
    expect(mapLayerSource).toMatch(/buildStkdeHeatmapColorExpression/);
    expect(mapLayerSource).not.toMatch(/rgba\(30, 64, 175, 0\)/);
    expect(timeSlicesSource).toMatch(/stkdeResponse\?\.sliceResults/);
    expect(slicePlaneSource).toMatch(/sampleStkdeHeatmapColor/);
    expect(slicePlaneSource).toMatch(/CanvasTexture/);
    expect(slicePlaneSource).toMatch(/heatmapTexture/);
  });
});
