import { expect, test, beforeEach } from 'vitest';
import { useSliceStore } from './useSliceStore';

test('Slice Store actions', () => {
  const store = useSliceStore.getState();
  store.clearSlices();
  
  expect(useSliceStore.getState().slices).toEqual([]);
  
  store.addSlice(50);
  const slicesAfterAdd = useSliceStore.getState().slices;
  expect(slicesAfterAdd.length).toBe(1);
  expect(slicesAfterAdd[0].time).toBe(50);
  expect(slicesAfterAdd[0].isLocked).toBe(false);
  
  const id = slicesAfterAdd[0].id;
  
  store.updateSlice(id, { time: 60 });
  expect(useSliceStore.getState().slices[0].time).toBe(60);
  
  store.toggleLock(id);
  expect(useSliceStore.getState().slices[0].isLocked).toBe(true);
  
  store.removeSlice(id);
  expect(useSliceStore.getState().slices.length).toBe(0);
});
