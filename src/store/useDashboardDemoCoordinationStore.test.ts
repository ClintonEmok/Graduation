import { beforeEach, describe, expect, test } from 'vitest';
import { useDashboardDemoCoordinationStore, type DemoBurstWindowSelection } from './useDashboardDemoCoordinationStore';

const createBurstWindow = (overrides: Partial<DemoBurstWindowSelection> = {}): DemoBurstWindowSelection => ({
  id: overrides.id ?? 'burst-a',
  start: overrides.start ?? 0,
  end: overrides.end ?? 100,
  metric: overrides.metric ?? 'density',
  peak: overrides.peak ?? 0.8,
  count: overrides.count ?? 12,
  duration: overrides.duration ?? 100,
  burstClass: overrides.burstClass ?? 'prolonged-peak',
  burstConfidence: overrides.burstConfidence ?? 0.9,
  burstScore: overrides.burstScore ?? 82,
  burstRationale: overrides.burstRationale ?? 'A sustained high activity window stands out from its neighborhood.',
  burstRuleVersion: overrides.burstRuleVersion ?? '1.0.0',
  burstProvenance: overrides.burstProvenance ?? 'demo',
  tieBreakReason: overrides.tieBreakReason ?? 'demo tie-break',
  thresholdSource: overrides.thresholdSource ?? 'global-thresholds',
  neighborhoodSummary: overrides.neighborhoodSummary ?? 'no-neighbors',
});

beforeEach(() => {
  useDashboardDemoCoordinationStore.setState({
    selectedIndex: null,
    selectedSource: null,
    lastInteractionAt: null,
    lastInteractionSource: null,
    activeSliceIndex: 0,
    brushRange: null,
    selectedBurstWindows: [],
    selectedDetailPeriod: null,
    detailsOpen: false,
    syncStatus: { status: 'synchronized' },
    panelNoMatch: {},
    comparisonSliceIds: { left: null, right: null },
    comparisonSelectionOrder: [],
    activeRailTab: 'scan',
    inspectIsPlaying: false,
    inspectPlaybackSpeed: 1,
    inspectInterpolation: false,
    inspectTrailEnabled: false,
    inspectTrailDecay: 0.32,
    inspectIsScrubbing: false,
    inspectSliceOpacity: 1,
    volumeScaleSeconds: 43_200,
    volumeExaggeration: 1.15,
    volumeNormalizationMode: 'window',
  });
});

describe('useDashboardDemoCoordinationStore', () => {
  test('keeps burst selection singleton', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.toggleBurstWindow(createBurstWindow({ id: 'burst-a', burstClass: 'isolated-spike' }));
    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows).toHaveLength(1);
    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows[0]?.id).toBe('burst-a');

    store.toggleBurstWindow(createBurstWindow({ id: 'burst-b', burstClass: 'valley' }));
    const state = useDashboardDemoCoordinationStore.getState();

    expect(state.selectedBurstWindows).toHaveLength(1);
    expect(state.selectedBurstWindows[0]?.id).toBe('burst-b');
    expect(state.selectedBurstWindows[0]?.burstClass).toBe('valley');
  });

  test('clears burst selection explicitly', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.toggleBurstWindow(createBurstWindow());
    store.clearSelectedBurstWindows();

    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows).toHaveLength(0);
  });

  test('tracks detail period selection', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setSelectedDetailPeriod({
      id: 'detail-bin-1',
      startSec: 100,
      endSec: 200,
      count: 12,
      label: 'Jan 1 → Jan 5',
      renderMode: 'bins',
      summary: '12 crimes in this detail period',
    });

    expect(useDashboardDemoCoordinationStore.getState().selectedDetailPeriod?.id).toBe('detail-bin-1');

    store.clearSelectedDetailPeriod();

    expect(useDashboardDemoCoordinationStore.getState().selectedDetailPeriod).toBeNull();
  });

  test('manages a two-slot comparison pair', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setComparisonSliceId('left', 'slice-a');
    store.setComparisonSliceId('right', 'slice-b');

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-a',
      right: 'slice-b',
    });

    store.swapComparisonSlices();

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-b',
      right: 'slice-a',
    });

    store.pushComparisonSlice('slice-c');

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-b',
      right: 'slice-c',
    });

    store.clearComparisonSlices();

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: null,
      right: null,
    });
  });

  test('stores and resets volume settings', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setVolumeScaleSeconds(21_600);
    store.setVolumeExaggeration(1.6);
    store.setVolumeNormalizationMode('reference');

    expect(useDashboardDemoCoordinationStore.getState().volumeScaleSeconds).toBe(21_600);
    expect(useDashboardDemoCoordinationStore.getState().volumeExaggeration).toBe(1.6);
    expect(useDashboardDemoCoordinationStore.getState().volumeNormalizationMode).toBe('reference');

    store.resetVolumeSettings();

    expect(useDashboardDemoCoordinationStore.getState().volumeScaleSeconds).toBe(43_200);
    expect(useDashboardDemoCoordinationStore.getState().volumeExaggeration).toBe(1.15);
    expect(useDashboardDemoCoordinationStore.getState().volumeNormalizationMode).toBe('window');
  });

  test('stores and resets temporal playback controls', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    expect(store.inspectIsPlaying).toBe(false);
    expect(store.inspectPlaybackSpeed).toBe(1);
    expect(store.inspectInterpolation).toBe(false);
    expect(store.inspectTrailEnabled).toBe(false);
    expect(store.inspectTrailDecay).toBe(0.32);
    expect(store.inspectIsScrubbing).toBe(false);

    store.setInspectIsPlaying(true);
    store.setInspectPlaybackSpeed(2.5);
    store.setInspectInterpolation(true);
    store.setInspectTrailEnabled(true);
    store.setInspectTrailDecay(0.48);
    store.setInspectIsScrubbing(true);

    expect(useDashboardDemoCoordinationStore.getState()).toMatchObject({
      inspectIsPlaying: true,
      inspectPlaybackSpeed: 2.5,
      inspectInterpolation: true,
      inspectTrailEnabled: true,
      inspectTrailDecay: 0.48,
      inspectIsScrubbing: true,
    });

    store.resetTemporalSettings();

    expect(useDashboardDemoCoordinationStore.getState()).toMatchObject({
      inspectIsPlaying: false,
      inspectPlaybackSpeed: 1,
      inspectInterpolation: false,
      inspectTrailEnabled: false,
      inspectTrailDecay: 0.32,
      inspectIsScrubbing: false,
    });

    store.setInspectIsPlaying(true);
    store.setInspectPlaybackSpeed(3);
    store.setInspectInterpolation(true);
    store.setInspectTrailEnabled(true);
    store.setInspectTrailDecay(0.9);
    store.setInspectIsScrubbing(true);
    store.resetAnalysis();

    expect(useDashboardDemoCoordinationStore.getState()).toMatchObject({
      inspectIsPlaying: false,
      inspectPlaybackSpeed: 1,
      inspectInterpolation: false,
      inspectTrailEnabled: false,
      inspectTrailDecay: 0.32,
      inspectIsScrubbing: false,
    });
  });

  test('clamps demo warp factor to the 0 to 3 range', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setWarpFactor(2.4);
    expect(useDashboardDemoCoordinationStore.getState().warpFactor).toBe(2.4);

    store.setWarpFactor(4.2);
    expect(useDashboardDemoCoordinationStore.getState().warpFactor).toBe(3);

    store.setWarpFactor(-1);
    expect(useDashboardDemoCoordinationStore.getState().warpFactor).toBe(0);
  });
});
