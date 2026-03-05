/* @vitest-environment node */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSandboxState } from './resetSandboxState';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useDataStore } from '@/store/useDataStore';

describe('resetSandboxState', () => {
  beforeEach(() => {
    useTimeStore.setState({ timeScaleMode: 'adaptive' });
    useAdaptiveStore.setState({
      warpFactor: 0.65,
      warpSource: 'slice-authored',
      densityScope: 'global',
    });
    useFilterStore.setState({
      selectedTypes: [1],
      selectedDistricts: [2],
      selectedTimeRange: [123, 456],
      selectedSpatialBounds: {
        minX: 0,
        maxX: 10,
        minZ: 0,
        maxZ: 10,
        minLat: 0,
        maxLat: 1,
        minLon: 0,
        maxLon: 1,
      },
    });
    useSliceStore.setState({
      slices: [
        {
          id: 'slice-a',
          type: 'range',
          time: 50,
          range: [20, 40],
          isLocked: false,
          isVisible: true,
        },
      ],
      activeSliceId: 'slice-a',
    });
    useWarpSliceStore.setState({
      slices: [
        {
          id: 'warp-a',
          label: 'Warp A',
          range: [10, 30],
          weight: 2,
          enabled: true,
        },
      ],
    });
    useCubeSpatialConstraintsStore.setState({
      constraints: [
        {
          id: 'constraint-a',
          label: 'Downtown cube',
          geometry: {
            shape: 'axis-aligned-cube',
            bounds: {
              minX: 0,
              maxX: 10,
              minY: 1,
              maxY: 6,
              minZ: 2,
              maxZ: 9,
            },
          },
          enabled: true,
          createdAt: 10,
          updatedAt: 10,
          colorToken: 'amber',
        },
        {
          id: 'constraint-b',
          label: 'Northwest cube',
          geometry: {
            shape: 'axis-aligned-cube',
            bounds: {
              minX: 12,
              maxX: 18,
              minY: 0,
              maxY: 4,
              minZ: 11,
              maxZ: 16,
            },
          },
          enabled: false,
          createdAt: 20,
          updatedAt: 20,
          colorToken: 'emerald',
        },
      ],
      activeConstraintId: 'constraint-a',
    });
  });

  test('restores uniform mode, clears filters, and empties slice state', async () => {
    const loadRealData = vi.fn(async () => {});
    useDataStore.setState({ loadRealData });

    await resetSandboxState();

    expect(useTimeStore.getState().timeScaleMode).toBe('linear');
    expect(useAdaptiveStore.getState().warpFactor).toBe(0);
    expect(useAdaptiveStore.getState().warpSource).toBe('density');

    const filterState = useFilterStore.getState();
    expect(filterState.selectedTypes).toEqual([]);
    expect(filterState.selectedDistricts).toEqual([]);
    expect(filterState.selectedTimeRange).toBeNull();
    expect(filterState.selectedSpatialBounds).toBeNull();

    expect(useSliceStore.getState().slices).toEqual([]);
    expect(useSliceStore.getState().activeSliceId).toBeNull();
    expect(useWarpSliceStore.getState().slices).toEqual([]);

    const constraintState = useCubeSpatialConstraintsStore.getState();
    expect(constraintState.constraints).toHaveLength(2);
    expect(constraintState.constraints.map((constraint) => constraint.id)).toEqual([
      'constraint-a',
      'constraint-b',
    ]);
    expect(constraintState.constraints[0].enabled).toBe(true);
    expect(constraintState.constraints[1].enabled).toBe(false);
    expect(constraintState.activeConstraintId).toBeNull();

    constraintState.setActiveConstraint('constraint-b');
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe('constraint-b');

    expect(loadRealData).toHaveBeenCalledTimes(1);
  });
});
