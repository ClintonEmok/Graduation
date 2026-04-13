import { beforeEach, describe, expect, test } from 'vitest';
import { useDashboardDemoTimeslicingModeStore } from './useDashboardDemoTimeslicingModeStore';
import { useSliceDomainStore } from './useSliceDomainStore';

beforeEach(() => {
  useDashboardDemoTimeslicingModeStore.setState({
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

describe('useDashboardDemoTimeslicingModeStore', () => {
  test('replaces the active slice set when applying pending burst drafts', () => {
    useSliceDomainStore.getState().addSlice({
      type: 'point',
      time: 5,
      notes: 'manual baseline slice',
    });

    useDashboardDemoTimeslicingModeStore.getState().setPendingGeneratedBins(
      [
        {
          id: 'draft-1',
          startTime: 0,
          endTime: 40,
          count: 12,
          crimeTypes: ['THEFT'],
          avgTimestamp: 20,
          burstClass: 'isolated-spike',
          burstRuleVersion: 'v1',
          burstScore: 0.82,
          burstConfidence: 0.91,
          burstProvenance: 'demo',
          tieBreakReason: 'highest score',
          thresholdSource: 'demo-threshold',
          neighborhoodSummary: 'north district',
        },
        {
          id: 'draft-2',
          startTime: 40,
          endTime: 100,
          count: 18,
          crimeTypes: ['BATTERY'],
          avgTimestamp: 70,
        },
      ],
      {
        binCount: 2,
        eventCount: 30,
        warning: null,
        generationSource: 'burst-windows',
        preset: 'daily',
        presetBias: 55,
        inputs: {
          crimeTypes: ['THEFT', 'BATTERY'],
          neighbourhood: '001',
          timeWindow: { start: 0, end: 100 },
          granularity: 'daily',
        },
      }
    );

    const applied = useDashboardDemoTimeslicingModeStore.getState().applyGeneratedBins([0, 100]);

    expect(applied).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('applied');
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(0);
    expect(useDashboardDemoTimeslicingModeStore.getState().lastAppliedAt).not.toBeNull();

    const slices = useSliceDomainStore.getState().slices;
    expect(slices).toHaveLength(2);
    expect(slices.every((slice) => slice.source === 'generated-applied')).toBe(true);
    expect(slices.some((slice) => slice.notes === 'manual baseline slice')).toBe(false);
    expect(slices[0]?.isBurst).toBe(true);
  });

  test('does nothing when there are no pending burst drafts', () => {
    const applied = useDashboardDemoTimeslicingModeStore.getState().applyGeneratedBins([0, 100]);

    expect(applied).toBe(false);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('idle');
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(0);
    expect(useDashboardDemoTimeslicingModeStore.getState().lastAppliedAt).toBeNull();
    expect(useSliceDomainStore.getState().slices).toHaveLength(0);
  });
});
