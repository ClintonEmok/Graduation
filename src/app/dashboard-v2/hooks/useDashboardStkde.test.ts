import { describe, expect, test } from 'vitest';
import { selectAppliedGeneratedSlices } from './useDashboardStkde';
import type { TimeSlice } from '@/store/slice-domain/types';

describe('useDashboardStkde', () => {
  test('selectAppliedGeneratedSlices returns only visible generated-applied slices', () => {
    const visibleApplied: TimeSlice = {
      id: 'slice-1',
      type: 'range',
      time: 0,
      range: [1000, 2000],
      name: 'visible-applied',
      source: 'generated-applied',
      isVisible: true,
      isLocked: false,
      color: '#10b981',
    };
    const hiddenApplied: TimeSlice = {
      ...visibleApplied,
      id: 'slice-2',
      isVisible: false,
    };
    const manualSlice: TimeSlice = {
      ...visibleApplied,
      id: 'slice-3',
      source: 'manual',
      isVisible: true,
    };

    const selected = selectAppliedGeneratedSlices([hiddenApplied, manualSlice, visibleApplied]);

    expect(selected).toEqual([visibleApplied]);
  });

  test('selectAppliedGeneratedSlices keeps slice object identity (no cloning)', () => {
    const slice: TimeSlice = {
      id: 'slice-1',
      type: 'point',
      time: 1700000000000,
      name: 'point',
      source: 'generated-applied',
      isVisible: true,
      isLocked: false,
      color: '#10b981',
    };

    const selected = selectAppliedGeneratedSlices([slice]);

    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(slice);
  });
});
