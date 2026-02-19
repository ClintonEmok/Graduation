import { beforeEach, describe, expect, test } from 'vitest';
import { useSliceStore } from './useSliceStore';

beforeEach(() => {
  useSliceStore.getState().clearSlices();
});

describe('slice store actions', () => {
  test('supports CRUD operations for point and range slices', () => {
    const store = useSliceStore.getState();

    expect(useSliceStore.getState().slices).toEqual([]);

    store.addSlice({ time: 50 });
    const slicesAfterAdd = useSliceStore.getState().slices;
    expect(slicesAfterAdd.length).toBe(1);
    expect(slicesAfterAdd[0].time).toBe(50);
    expect(slicesAfterAdd[0].type).toBe('point');
    expect(slicesAfterAdd[0].isLocked).toBe(false);

    const id = slicesAfterAdd[0].id;

    store.updateSlice(id, { time: 60 });
    expect(useSliceStore.getState().slices[0].time).toBe(60);

    store.toggleLock(id);
    expect(useSliceStore.getState().slices[0].isLocked).toBe(true);

    store.addSlice({ type: 'range', range: [20, 40] });
    expect(useSliceStore.getState().slices.length).toBe(2);
    expect(useSliceStore.getState().slices[1].type).toBe('range');
    expect(useSliceStore.getState().slices[1].range).toEqual([20, 40]);

    store.removeSlice(id);
    expect(useSliceStore.getState().slices.length).toBe(1);
  });
});

describe('burst slice', () => {
  test('creates burst slices with metadata and default naming', () => {
    const created = useSliceStore.getState().addBurstSlice({ start: 10, end: 30 });

    expect(created).not.toBeNull();
    expect(created?.type).toBe('range');
    expect(created?.range).toEqual([10, 30]);
    expect(created?.name).toBe('Burst 1');
    expect(created?.isBurst).toBe(true);
    expect(created?.burstSliceId).toBe('burst-10-30');
    expect(useSliceStore.getState().activeSliceId).toBe(created?.id);
  });

  test('reuses existing matching range slices within default tolerance', () => {
    const first = useSliceStore.getState().addBurstSlice({ start: 20, end: 40 });
    const second = useSliceStore.getState().addBurstSlice({ start: 20.05, end: 40.05 });

    expect(first).not.toBeNull();
    expect(second?.id).toBe(first?.id);
    expect(useSliceStore.getState().slices).toHaveLength(1);
    expect(useSliceStore.getState().activeSliceId).toBe(first?.id);
  });

  test('finds matching slices using explicit tolerance', () => {
    const store = useSliceStore.getState();
    store.addSlice({ type: 'range', range: [30, 50] });

    const exact = store.findMatchingSlice(30, 50);
    const nearWithTolerance = store.findMatchingSlice(30.1, 49.9, 0.2);
    const outsideTolerance = store.findMatchingSlice(31, 49, 0.2);

    expect(exact).toBeDefined();
    expect(nearWithTolerance?.id).toBe(exact?.id);
    expect(outsideTolerance).toBeUndefined();
  });
});
