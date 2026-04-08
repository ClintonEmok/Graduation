import { beforeEach, describe, expect, test } from 'vitest';
import { useTimeslicingModeStore } from './useTimeslicingModeStore';
import { useSliceDomainStore } from './useSliceDomainStore';

beforeEach(() => {
  useTimeslicingModeStore.setState({
    generationInputs: {
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: { start: null, end: null },
      granularity: 'daily',
    },
    generationStatus: 'idle',
    generationError: null,
    pendingGeneratedBins: [],
    lastGeneratedMetadata: null,
    lastAppliedAt: null,
  });
  useSliceDomainStore.getState().clearSlices();
});

describe('useTimeslicingModeStore', () => {
  test('keeps generated bins separate from applied slices until apply', () => {
    const store = useTimeslicingModeStore.getState();

    store.setPendingGeneratedBins(
      [
        {
          id: 'bin-1',
          startTime: 0,
          endTime: 50,
          count: 12,
          crimeTypes: ['THEFT'],
          avgTimestamp: 25,
        },
        {
          id: 'bin-2',
          startTime: 50,
          endTime: 100,
          count: 8,
          crimeTypes: ['THEFT'],
          avgTimestamp: 75,
        },
      ],
      {
        binCount: 2,
        eventCount: 20,
        warning: null,
        inputs: {
          crimeTypes: ['THEFT'],
          neighbourhood: '001',
          timeWindow: { start: 0, end: 100 },
          granularity: 'daily',
        },
      }
    );

    expect(useTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(2);
    expect(useSliceDomainStore.getState().slices).toHaveLength(0);

    const applied = useTimeslicingModeStore.getState().applyGeneratedBins([0, 100]);

    expect(applied).toBe(true);
    expect(useTimeslicingModeStore.getState().generationStatus).toBe('applied');
    expect(useTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(0);
    expect(useSliceDomainStore.getState().slices).toHaveLength(2);
    expect(useSliceDomainStore.getState().slices.every((slice) => slice.source === 'generated-applied')).toBe(true);
  });

  test('supports merge, split, and delete on pending generated bins', () => {
    const store = useTimeslicingModeStore.getState();

    store.setPendingGeneratedBins(
      [
        {
          id: 'bin-1',
          startTime: 0,
          endTime: 50,
          count: 10,
          crimeTypes: ['THEFT'],
          avgTimestamp: 25,
        },
        {
          id: 'bin-2',
          startTime: 50,
          endTime: 100,
          count: 12,
          crimeTypes: ['THEFT'],
          avgTimestamp: 75,
        },
        {
          id: 'bin-3',
          startTime: 100,
          endTime: 150,
          count: 8,
          crimeTypes: ['BATTERY'],
          avgTimestamp: 125,
        },
      ],
      {
        binCount: 3,
        eventCount: 30,
        warning: null,
        inputs: {
          crimeTypes: [],
          neighbourhood: null,
          timeWindow: { start: 0, end: 150 },
          granularity: 'daily',
        },
      }
    );

    useTimeslicingModeStore.getState().mergePendingGeneratedBins(['bin-1', 'bin-2']);
    const afterMerge = useTimeslicingModeStore.getState().pendingGeneratedBins;
    expect(afterMerge).toHaveLength(2);
    expect(afterMerge.some((bin) => bin.id === 'bin-3')).toBe(true);

    const merged = afterMerge.find((bin) => bin.id !== 'bin-3');
    expect(merged).toBeDefined();
    expect(merged?.count).toBe(22);

    useTimeslicingModeStore.getState().splitPendingGeneratedBin(merged!.id, 60);
    const afterSplit = useTimeslicingModeStore.getState().pendingGeneratedBins;
    expect(afterSplit).toHaveLength(3);

    useTimeslicingModeStore.getState().deletePendingGeneratedBin('bin-3');
    const afterDelete = useTimeslicingModeStore.getState().pendingGeneratedBins;
    expect(afterDelete).toHaveLength(2);
    expect(afterDelete.some((bin) => bin.id === 'bin-3')).toBe(false);
  });
});
