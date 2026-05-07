import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 5 slice cluster overlay contract', () => {
  test('locks slice cluster overlays to visible slices', () => {
    const timeSlicesSource = readFileSync(new URL('./TimeSlices.tsx', import.meta.url), 'utf8');
    const overlaySource = readFileSync(new URL('./SliceClusterOverlay.tsx', import.meta.url), 'utf8');
    const slicePlaneSource = readFileSync(new URL('./SlicePlane.tsx', import.meta.url), 'utf8');

    expect(timeSlicesSource).toMatch(/SliceClusterOverlay/);
    expect(timeSlicesSource).toMatch(/sliceClustersById/);
    expect(timeSlicesSource).toMatch(/isVisible !== false/);
    expect(overlaySource).toMatch(/sliceClustersById/);
    expect(overlaySource).toMatch(/visibleClusters/);
    expect(overlaySource).toMatch(/Line/);
    expect(overlaySource).toMatch(/planeGeometry/);
    expect(slicePlaneSource).toMatch(/SLICE_CLUSTER_OVERLAY_ELEVATION/);
    expect(slicePlaneSource).toMatch(/evolutionState === 'active'/);
  });
});
