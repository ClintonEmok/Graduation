import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 01 time-slices polish', () => {
  test('keeps the slice plane visual contract visible in source', () => {
    const mainSceneSource = readFileSync(new URL('./MainScene.tsx', import.meta.url), 'utf8');
    const timeSlicesSource = readFileSync(new URL('./TimeSlices.tsx', import.meta.url), 'utf8');
    const slicePlaneSource = readFileSync(new URL('./SlicePlane.tsx', import.meta.url), 'utf8');

    expect(mainSceneSource).toMatch(/TimeSlices/);
    expect(timeSlicesSource).toMatch(/SlicePlane/);
    expect(timeSlicesSource).toMatch(/onDoubleClick/);
    expect(timeSlicesSource).toMatch(/meshBasicMaterial[^\n]*opacity={0}[^\n]*depthWrite={false}/);
    expect(slicePlaneSource).toMatch(/Html/);
    expect(slicePlaneSource).toMatch(/onPointerDown/);
    expect(slicePlaneSource).toMatch(/onPointerUp/);
    expect(slicePlaneSource).toMatch(/gridHelper/);
    expect(slicePlaneSource).toMatch(/pointer-events-none select-none/);
  });
});
