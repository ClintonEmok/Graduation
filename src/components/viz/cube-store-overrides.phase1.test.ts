import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 01 cube store overrides', () => {
  test('routes demo stores into the cube and scene tree', () => {
    const shellSource = readFileSync(new URL('../dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');
    const cubeSource = readFileSync(new URL('./CubeVisualization.tsx', import.meta.url), 'utf8');
    const sceneSource = readFileSync(new URL('./MainScene.tsx', import.meta.url), 'utf8');
    const pointsSource = readFileSync(new URL('./SimpleCrimePoints.tsx', import.meta.url), 'utf8');
    const overlaySource = readFileSync(new URL('./SelectedWarpSliceOverlay.tsx', import.meta.url), 'utf8');
    const timeSlicesSource = readFileSync(new URL('./TimeSlices.tsx', import.meta.url), 'utf8');

    expect(shellSource).toMatch(/filterStoreOverride={useDashboardDemoFilterStore}/);
    expect(shellSource).toMatch(/coordinationStoreOverride={useDashboardDemoCoordinationStore}/);
    expect(shellSource).toMatch(/adaptiveStoreOverride={useDashboardDemoAdaptiveStore}/);
    expect(shellSource).toMatch(/timeStoreOverride={useDashboardDemoTimeStore}/);
    expect(shellSource).toMatch(/sliceStoreOverride={useSliceDomainStore}/);

    expect(cubeSource).toMatch(/filterStoreOverride\?: unknown/);
    expect(cubeSource).toMatch(/MainScene[\s\S]*filterStoreOverride={filterStore}/);
    expect(cubeSource).toMatch(/MainScene[\s\S]*sliceStoreOverride={sliceStore}/);

    expect(sceneSource).toMatch(/SimpleCrimePoints/);
    expect(sceneSource).toMatch(/TimeSlices/);
    expect(sceneSource).toMatch(/SelectedWarpSliceOverlay/);
    expect(sceneSource).toMatch(/sliceStoreOverride={sliceStoreOverride}/);
    expect(sceneSource).toMatch(/timeStoreOverride={timeStoreOverride}/);

    expect(pointsSource).toMatch(/useStore/);
    expect(pointsSource).toMatch(/sliceStoreOverride\?: unknown/);
    expect(pointsSource).toMatch(/warpSource/);

    expect(overlaySource).toMatch(/useStore/);
    expect(overlaySource).toMatch(/sliceStoreOverride\?: unknown/);
    expect(overlaySource).toMatch(/linked selection/);

    expect(timeSlicesSource).toMatch(/useStore/);
    expect(timeSlicesSource).toMatch(/sliceStoreOverride\?: unknown/);
    expect(timeSlicesSource).toMatch(/TimeSlices/);
  });
});
