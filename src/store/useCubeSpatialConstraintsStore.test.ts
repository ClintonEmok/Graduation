/* @vitest-environment node */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSandboxState } from '@/app/cube-sandbox/lib/resetSandboxState';
import { useDataStore } from './useDataStore';
import { useCubeSpatialConstraintsStore } from './useCubeSpatialConstraintsStore';

const baseGeometry = {
  shape: 'axis-aligned-cube' as const,
  bounds: {
    minX: 0,
    maxX: 8,
    minY: 1,
    maxY: 9,
    minZ: 2,
    maxZ: 10,
  },
};

describe('useCubeSpatialConstraintsStore', () => {
  beforeEach(() => {
    useCubeSpatialConstraintsStore.setState({
      constraints: [],
      activeConstraintId: null,
    });
  });

  test('creates multiple constraints with independent definitions', () => {
    const first = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Core cube',
      geometry: baseGeometry,
      colorToken: 'amber',
    });

    const second = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Peripheral cube',
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 11,
          maxX: 20,
          minY: 0,
          maxY: 5,
          minZ: 7,
          maxZ: 13,
        },
      },
      enabled: false,
      colorToken: 'sky',
    });

    const state = useCubeSpatialConstraintsStore.getState();
    expect(state.constraints).toHaveLength(2);
    expect(state.constraints[0].id).toBe(first.id);
    expect(state.constraints[1].id).toBe(second.id);
    expect(state.constraints[0].label).toBe('Core cube');
    expect(state.constraints[1].enabled).toBe(false);
    expect(state.activeConstraintId).toBe(first.id);
  });

  test('toggles enabled state without deleting the constraint', () => {
    const created = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Toggle target',
      geometry: baseGeometry,
    });

    useCubeSpatialConstraintsStore.getState().toggleConstraintEnabled(created.id, false);

    let state = useCubeSpatialConstraintsStore.getState();
    expect(state.constraints).toHaveLength(1);
    expect(state.constraints[0].id).toBe(created.id);
    expect(state.constraints[0].enabled).toBe(false);

    useCubeSpatialConstraintsStore.getState().toggleConstraintEnabled(created.id);
    state = useCubeSpatialConstraintsStore.getState();
    expect(state.constraints[0].enabled).toBe(true);
  });

  test('switches active constraint and ignores unknown ids', () => {
    const first = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'First',
      geometry: baseGeometry,
    });
    const second = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Second',
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 20,
          maxX: 30,
          minY: 2,
          maxY: 7,
          minZ: 10,
          maxZ: 18,
        },
      },
    });

    useCubeSpatialConstraintsStore.getState().setActiveConstraint(second.id);
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe(second.id);

    useCubeSpatialConstraintsStore.getState().setActiveConstraint('missing-id');
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe(second.id);

    useCubeSpatialConstraintsStore.getState().setActiveConstraint(first.id);
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe(first.id);
  });

  test('removes one constraint while preserving others', () => {
    const first = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Keep me',
      geometry: baseGeometry,
    });
    const second = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Remove me',
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 4,
          maxX: 6,
          minY: 4,
          maxY: 8,
          minZ: 12,
          maxZ: 19,
        },
      },
    });

    useCubeSpatialConstraintsStore.getState().setActiveConstraint(second.id);
    useCubeSpatialConstraintsStore.getState().removeConstraint(second.id);

    const state = useCubeSpatialConstraintsStore.getState();
    expect(state.constraints).toHaveLength(1);
    expect(state.constraints[0].id).toBe(first.id);
    expect(state.activeConstraintId).toBeNull();
  });

  test('preserves definitions through sandbox reset entrypoint', async () => {
    const loadRealData = vi.fn(async () => {});
    useDataStore.setState({ loadRealData });

    const first = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Reset stable A',
      geometry: baseGeometry,
    });
    const second = useCubeSpatialConstraintsStore.getState().createConstraint({
      label: 'Reset stable B',
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: 22,
          maxX: 30,
          minY: 8,
          maxY: 16,
          minZ: 6,
          maxZ: 14,
        },
      },
      enabled: false,
    });

    useCubeSpatialConstraintsStore.getState().setActiveConstraint(second.id);

    await resetSandboxState();

    const state = useCubeSpatialConstraintsStore.getState();
    expect(state.constraints).toHaveLength(2);
    expect(state.constraints.map((constraint) => constraint.id)).toEqual([first.id, second.id]);
    expect(state.constraints[1].enabled).toBe(false);
    expect(state.activeConstraintId).toBeNull();

    state.setActiveConstraint(first.id);
    expect(useCubeSpatialConstraintsStore.getState().activeConstraintId).toBe(first.id);
    expect(loadRealData).toHaveBeenCalledTimes(1);
  });
});
