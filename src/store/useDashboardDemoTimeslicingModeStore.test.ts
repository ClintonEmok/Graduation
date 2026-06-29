import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDashboardDemoTimeslicingModeStore } from './useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoCoordinationStore } from './useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from './useSliceDomainStore';
import { useTimelineDataStore } from './useTimelineDataStore';
import { useAdaptiveStore } from './useAdaptiveStore';

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

const makeCrimeRangeResponse = (
  records: Array<{ timestamp: number; type: string; district: string }>,
  sampled = false,
) =>
  ({
    ok: true,
    json: async () => ({ data: records, meta: { sampled } }),
  }) as Response;

describe('useDashboardDemoTimeslicingModeStore', () => {
  test('generates selection-first draft bins from fetched crime records', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const parsed = new URL(url, 'http://localhost');
      const startEpoch = parsed.searchParams.get('startEpoch');
      const endEpoch = parsed.searchParams.get('endEpoch');

      if (url.startsWith('/api/crimes/range?')) {
        if (startEpoch === '0' && endEpoch === '3600') {
          return makeCrimeRangeResponse([
            { timestamp: 300, type: 'THEFT', district: '1' },
            { timestamp: 2_100, type: 'THEFT', district: '1' },
          ]);
        }

        if (startEpoch === '3600' && endEpoch === '7200') {
          return makeCrimeRangeResponse([
            { timestamp: 4_200, type: 'BATTERY', district: '1' },
            { timestamp: 7_500, type: 'ASSAULT', district: '1' },
          ]);
        }

        if (startEpoch === '7200' && endEpoch === '10800') {
          return makeCrimeRangeResponse([
            { timestamp: 8_400, type: 'ROBBERY', district: '1' },
          ]);
        }

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
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('uses the selected granularity bins instead of live burst windows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const parsed = new URL(url, 'http://localhost');
      const startEpoch = parsed.searchParams.get('startEpoch');
      const endEpoch = parsed.searchParams.get('endEpoch');

      if (url.startsWith('/api/crimes/range?')) {
        if (startEpoch === '0' && endEpoch === '3600') {
          return makeCrimeRangeResponse([{ timestamp: 600, type: 'THEFT', district: '1' }]);
        }

        if (startEpoch === '3600' && endEpoch === '7200') {
          return makeCrimeRangeResponse([{ timestamp: 4_200, type: 'BATTERY', district: '1' }]);
        }

        if (startEpoch === '7200' && endEpoch === '10800') {
          return makeCrimeRangeResponse([{ timestamp: 8_400, type: 'ASSAULT', district: '1' }]);
        }

        if (startEpoch === '10800' && endEpoch === '14400') {
          return makeCrimeRangeResponse([{ timestamp: 12_600, type: 'ROBBERY', district: '1' }]);
        }

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
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('supports quarterly granularity for longer selection windows', async () => {
    const quarter1Start = Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000);
    const quarter1End = Math.floor(new Date('2025-04-01T00:00:00Z').getTime() / 1000);
    const quarter2Start = quarter1End;
    const quarter2End = Math.floor(new Date('2025-07-01T00:00:00Z').getTime() / 1000);
    const quarter3Start = quarter2End;
    const quarter3End = Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000);
    const quarter4Start = quarter3End;
    const quarter4End = Math.floor(new Date('2025-11-10T00:00:00Z').getTime() / 1000);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const parsed = new URL(url, 'http://localhost');
      const startEpoch = parsed.searchParams.get('startEpoch');
      const endEpoch = parsed.searchParams.get('endEpoch');

      if (url.startsWith('/api/crimes/range?')) {
        if (startEpoch === String(quarter1Start) && endEpoch === String(quarter1End)) {
          return makeCrimeRangeResponse([{ timestamp: new Date('2025-01-20T00:00:00Z').getTime() / 1000, type: 'THEFT', district: '1' }]);
        }

        if (startEpoch === String(quarter2Start) && endEpoch === String(quarter2End)) {
          return makeCrimeRangeResponse([{ timestamp: new Date('2025-04-20T00:00:00Z').getTime() / 1000, type: 'BATTERY', district: '1' }]);
        }

        if (startEpoch === String(quarter3Start) && endEpoch === String(quarter3End)) {
          return makeCrimeRangeResponse([{ timestamp: new Date('2025-07-20T00:00:00Z').getTime() / 1000, type: 'ASSAULT', district: '1' }]);
        }

        if (startEpoch === String(quarter4Start) && endEpoch === String(quarter4End)) {
          return makeCrimeRangeResponse([{ timestamp: new Date('2025-10-20T00:00:00Z').getTime() / 1000, type: 'ROBBERY', district: '1' }]);
        }

        return makeCrimeRangeResponse([]);
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/crimes/range?'));
  });

  test('replaces the active slice set when applying pending burst drafts', () => {
    useAdaptiveStore.setState({ activeSignalSource: 'burstiness' });
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
    expect(useDashboardDemoCoordinationStore.getState().warpSource).toBe('density');

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
