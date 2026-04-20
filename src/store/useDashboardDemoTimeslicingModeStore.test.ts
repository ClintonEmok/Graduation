import { beforeEach, describe, expect, test } from 'vitest';
import { useDashboardDemoTimeslicingModeStore } from './useDashboardDemoTimeslicingModeStore';
import { useSliceDomainStore } from './useSliceDomainStore';
import { useTimelineDataStore } from './useTimelineDataStore';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

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
  useTimelineDataStore.setState({
    data: [],
    columns: null,
    minX: null,
    maxX: null,
    minZ: null,
    maxZ: null,
    minTimestampSec: null,
    maxTimestampSec: null,
    isLoading: false,
    isMock: false,
    dataCount: null,
  });
  useSliceDomainStore.getState().clearSlices();
});

describe('useDashboardDemoTimeslicingModeStore', () => {
  test('generates selection-first draft bins from the brushed selection', () => {
    useTimelineDataStore.setState({
      data: [
        { id: 'a', timestamp: 5 * 60 * 1000, x: 0, y: 0, z: 0, type: 'THEFT' },
        { id: 'b', timestamp: DAY_MS + 5 * 60 * 1000, x: 0, y: 0, z: 0, type: 'ASSAULT' },
      ],
    });

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: DAY_MS + 30 * 60 * 1000,
      },
      granularity: 'daily',
    });

    const generated = useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows([]);

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.inputs.granularity).toBe('daily');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.eventCount).toBe(2);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(2);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.every((bin) => bin.isNeutralPartition)).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.every((bin) => bin.crimeTypes[0] === 'all-crime-types')).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.crimeTypes).toEqual(['all-crime-types']);
  });

  test('generates selection-first draft bins from real columns data', () => {
    useTimelineDataStore.setState({
      data: [],
      columns: {
        x: new Float32Array([0, 1]),
        z: new Float32Array([0, 1]),
        timestampSec: new Float64Array([5 * 60, DAY_MS / 1000 + 5 * 60]),
        timestamp: new Float32Array([0, 100]),
        type: new Uint8Array([1, 5]),
        district: new Uint8Array([1, 2]),
        block: ['A', 'B'],
        length: 2,
      },
      minTimestampSec: 0,
      maxTimestampSec: DAY_MS / 1000,
    });

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: DAY_MS + 30 * 60 * 1000,
      },
      granularity: 'daily',
    });

    const generated = useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows([]);

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.eventCount).toBe(2);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(2);
  });

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
          warpWeight: 1.8,
          burstClass: 'isolated-spike',
          burstRuleVersion: 'v1',
          burstScore: 0.82,
          burstinessCoefficient: 0.64,
          burstinessFormula: 'B = (σ - μ) / (σ + μ)',
          burstinessCalculation: 'demo calculation',
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
    expect(slices[0]?.burstClass).toBe('isolated-spike');
    expect(slices[0]?.burstScore).toBe(0.82);
    expect(slices[0]?.warpWeight).toBe(1.8);
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
