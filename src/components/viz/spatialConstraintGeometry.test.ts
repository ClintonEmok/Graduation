/* @vitest-environment node */
import { describe, expect, test } from 'vitest';
import { toOverlayBox } from './spatialConstraintGeometry';

describe('toOverlayBox', () => {
  test('maps normal bounds to center, size, and label anchor', () => {
    const overlay = toOverlayBox({
      id: 'constraint-1',
      label: 'Downtown',
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: -20,
          maxX: 10,
          minY: -10,
          maxY: 30,
          minZ: 5,
          maxZ: 15,
        },
      },
    });

    expect(overlay.center).toEqual([-5, 10, 10]);
    expect(overlay.size).toEqual([30, 40, 10]);
    expect(overlay.labelAnchor).toEqual([-5, 31.5, 10]);
    expect(overlay.hadSwappedBounds).toBe(false);
    expect(overlay.hadDegenerateBounds).toBe(false);
  });

  test('normalizes swapped min and max bounds', () => {
    const overlay = toOverlayBox({
      id: 'constraint-2',
      label: 'Swapped inputs',
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 8,
          maxX: -2,
          minY: 12,
          maxY: -4,
          minZ: 20,
          maxZ: 10,
        },
      },
    });

    expect(overlay.center).toEqual([3, 4, 15]);
    expect(overlay.size).toEqual([10, 16, 10]);
    expect(overlay.hadSwappedBounds).toBe(true);
    expect(overlay.hadDegenerateBounds).toBe(false);
  });

  test('guards degenerate bounds with minimum axis size', () => {
    const overlay = toOverlayBox({
      id: 'constraint-3',
      label: 'Degenerate',
      enabled: false,
      createdAt: 1,
      updatedAt: 1,
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 5,
          maxX: 5,
          minY: -2,
          maxY: -2,
          minZ: 9,
          maxZ: 9,
        },
      },
    });

    expect(overlay.center).toEqual([5, -2, 9]);
    expect(overlay.size).toEqual([0.5, 0.5, 0.5]);
    expect(overlay.hadDegenerateBounds).toBe(true);
  });
});
