import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 5 cluster interaction contract', () => {
  test('locks hover, select, and spatial-bound filtering', () => {
    const storeSource = readFileSync(new URL('../../store/useClusterStore.ts', import.meta.url), 'utf8');
    const labelsSource = readFileSync(new URL('./ClusterLabels.tsx', import.meta.url), 'utf8');
    const highlightsSource = readFileSync(new URL('./ClusterHighlights.tsx', import.meta.url), 'utf8');
    const mainSceneSource = readFileSync(new URL('./MainScene.tsx', import.meta.url), 'utf8');
    const cubeSource = readFileSync(new URL('./CubeVisualization.tsx', import.meta.url), 'utf8');

    expect(storeSource).toMatch(/hoveredClusterId/);
    expect(storeSource).toMatch(/setHoveredClusterId/);
    expect(storeSource).toMatch(/clearClusterSelection/);

    expect(labelsSource).toMatch(/setSpatialBounds/);
    expect(labelsSource).toMatch(/clearSpatialBounds/);
    expect(labelsSource).toMatch(/onPointerEnter/);
    expect(labelsSource).toMatch(/onClick/);
    expect(labelsSource).toMatch(/timeRange/);
    expect(labelsSource).toMatch(/dominantType/);

    expect(highlightsSource).toMatch(/hoveredClusterId/);
    expect(highlightsSource).toMatch(/selectedClusterId/);

    expect(mainSceneSource).toMatch(/ClusterManager/);
    expect(mainSceneSource).toMatch(/ClusterHighlights/);
    expect(mainSceneSource).toMatch(/ClusterLabels/);
    expect(mainSceneSource).not.toMatch(/SimpleCrimePoints/);

    expect(cubeSource).toMatch(/Cluster context/);
    expect(cubeSource).toMatch(/Time span/);
    expect(cubeSource).toMatch(/State: \{activeClusterState\}/);
  });
});
