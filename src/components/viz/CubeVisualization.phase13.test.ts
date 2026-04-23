import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 13 / CubeVisualization contract', () => {
  test('keeps relational shell and selection detail language', () => {
    const cubeSource = readFileSync(new URL('./CubeVisualization.tsx', import.meta.url), 'utf8');
    const overlaySource = readFileSync(new URL('./SelectedWarpSliceOverlay.tsx', import.meta.url), 'utf8');
    const statsSource = readFileSync(new URL('./SliceStats.tsx', import.meta.url), 'utf8');

    expect(cubeSource).toMatch(/Relational mode/);
    expect(cubeSource).toMatch(/Comparison cue/);
    expect(cubeSource).toMatch(/Linked selection/);
    expect(cubeSource).toMatch(/Proposal story/);
    expect(cubeSource).toMatch(/Relational context/);
    expect(cubeSource).toMatch(/selectionStory/);
    expect(cubeSource).not.toMatch(/raw browser|debug console/);

    expect(overlaySource).toMatch(/linked selection/);
    expect(overlaySource).toMatch(/compare cue|relational cue/);
    expect(overlaySource).toMatch(/selectedSlice/);

    expect(statsSource).toMatch(/Slice relationship summary/);
    expect(statsSource).toMatch(/Primary composition/);
    expect(statsSource).toMatch(/District anchors/);
    expect(statsSource).toMatch(/No relational events found in this slice/);
  });
});
