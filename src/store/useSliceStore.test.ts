import { expect, test, beforeEach } from 'vitest';
import { useSliceStore } from './useSliceStore';

test('Slice Store actions', () => {
  const store = useSliceStore.getState();
  store.clearSlices();
  
  expect(useSliceStore.getState().slices).toEqual([]);
  
  // Test point slice
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
  
  // Test range slice
  store.addSlice({ type: 'range', range: [20, 40] });
  expect(useSliceStore.getState().slices.length).toBe(2);
  expect(useSliceStore.getState().slices[1].type).toBe('range');
  expect(useSliceStore.getState().slices[1].range).toEqual([20, 40]);

  store.removeSlice(id);
  expect(useSliceStore.getState().slices.length).toBe(1);
});
