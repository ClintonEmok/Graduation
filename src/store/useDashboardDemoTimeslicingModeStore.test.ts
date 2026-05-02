import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDashboardDemoTimeslicingModeStore } from './useDashboardDemoTimeslicingModeStore';
import { useSliceDomainStore } from './useSliceDomainStore';
import { useTimelineDataStore } from './useTimelineDataStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  vi.unstubAllGlobals();
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

const makeCrimeRangeResponse = (records: Array<{ timestamp: number; type: string; district: string }>) =>
  ({
    ok: true,
    json: async () => ({ data: records }),
  }) as Response;

describe('useDashboardDemoTimeslicingModeStore', () => {
  test('generates selection-first draft bins from fetched crime records', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/crimes/range?')) {
        return makeCrimeRangeResponse([
          { timestamp: 300, type: 'THEFT', district: '1' },
          { timestamp: 2_100, type: 'THEFT', district: '1' },
          { timestamp: 4_200, type: 'BATTERY', district: '1' },
          { timestamp: 7_500, type: 'ASSAULT', district: '1' },
          { timestamp: 8_400, type: 'ROBBERY', district: '1' },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 3 * HOUR_MS,
      },
      granularity: 'hourly',
    });

    const generated = await useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows();

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.inputs.granularity).toBe('hourly');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.eventCount).toBe(5);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(3);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.every((bin) => bin.count > 0)).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.startTime).toBe(0);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.endTime).toBe(HOUR_MS);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[1]?.startTime).toBe(HOUR_MS);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[2]?.endTime).toBe(3 * HOUR_MS);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.crimeTypes).toContain('all-crime-types');
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.burstClass).toBeDefined();
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.every((bin) => typeof bin.burstScore === 'number')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('uses the selected granularity bins instead of live burst windows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/crimes/range?')) {
        return makeCrimeRangeResponse([
          { timestamp: 600, type: 'THEFT', district: '1' },
          { timestamp: 4_200, type: 'BATTERY', district: '1' },
          { timestamp: 8_400, type: 'ASSAULT', district: '1' },
          { timestamp: 12_600, type: 'ROBBERY', district: '1' },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 4 * HOUR_MS,
      },
      granularity: 'hourly',
    });

    const generated = await useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows();

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(4);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.map((bin) => bin.startTime)).toEqual([
      0,
      HOUR_MS,
      2 * HOUR_MS,
      3 * HOUR_MS,
    ]);
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.warning).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('still generates neutral bins when no crimes are returned for the selected window', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/crimes/range?')) {
        return makeCrimeRangeResponse([]);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: DAY_MS + 30 * 60 * 1000,
      },
      granularity: 'daily',
    });

    const generated = await useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows();

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().generationError).toBeNull();
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(2);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins.every((bin) => bin.isNeutralPartition)).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.eventCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('keeps monthly granularity when generating selection-first draft bins', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/crimes/range?')) {
        return makeCrimeRangeResponse([
          { timestamp: 10, type: 'THEFT', district: '1' },
          { timestamp: 20, type: 'BATTERY', district: '1' },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 40 * 60 * 1000,
      },
      granularity: 'monthly',
    });

    const generated = await useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows();

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.inputs.granularity).toBe('monthly');
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.id).toContain('monthly');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('supports quarterly granularity for longer selection windows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/crimes/range?')) {
        return makeCrimeRangeResponse([
          { timestamp: new Date('2025-01-20T00:00:00Z').getTime() / 1000, type: 'THEFT', district: '1' },
          { timestamp: new Date('2025-04-20T00:00:00Z').getTime() / 1000, type: 'BATTERY', district: '1' },
          { timestamp: new Date('2025-07-20T00:00:00Z').getTime() / 1000, type: 'ASSAULT', district: '1' },
          { timestamp: new Date('2025-10-20T00:00:00Z').getTime() / 1000, type: 'ROBBERY', district: '1' },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    useDashboardDemoTimeslicingModeStore.getState().setGenerationInputs({
      crimeTypes: [],
      neighbourhood: null,
      timeWindow: {
        start: new Date('2025-01-15T00:00:00Z').getTime(),
        end: new Date('2025-11-10T00:00:00Z').getTime(),
      },
      granularity: 'quarterly',
    });

    const generated = await useDashboardDemoTimeslicingModeStore.getState().generateBurstDraftBinsFromWindows();

    expect(generated).toBe(true);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('ready');
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata?.inputs.granularity).toBe('quarterly');
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(4);
    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins[0]?.id).toContain('quarterly');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
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

  test('clears generated draft state and selection-first metadata', () => {
    useDashboardDemoTimeslicingModeStore.setState({
      generationError: 'stale error',
      pendingGeneratedBins: [
        {
          id: 'draft-clear',
          startTime: 0,
          endTime: HOUR_MS,
          count: 4,
          crimeTypes: ['THEFT'],
          avgTimestamp: 1800,
        },
      ],
      lastGeneratedMetadata: {
        generatedAt: Date.now(),
        binCount: 1,
        eventCount: 4,
        warning: 'stale warning',
        inputs: {
          crimeTypes: ['THEFT'],
          neighbourhood: null,
          timeWindow: { start: 0, end: HOUR_MS },
          granularity: 'daily',
        },
      },
      generationStatus: 'error',
    });

    useDashboardDemoTimeslicingModeStore.getState().clearPendingGeneratedBins();

    expect(useDashboardDemoTimeslicingModeStore.getState().pendingGeneratedBins).toHaveLength(0);
    expect(useDashboardDemoTimeslicingModeStore.getState().generationStatus).toBe('idle');
    expect(useDashboardDemoTimeslicingModeStore.getState().generationError).toBeNull();
    expect(useDashboardDemoTimeslicingModeStore.getState().lastGeneratedMetadata).toBeNull();
  });
});
