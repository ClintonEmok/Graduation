/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
};

const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { localStorage: localStorageMock });

import { useDashboardDemoFilterStore } from './useDashboardDemoFilterStore';

const MIN_EPOCH_SEC = 978307200; // 2001-01-01
const MAX_EPOCH_SEC = 1011878400; // 2002-01-01

beforeEach(() => {
  localStorageMock.clear();
  useTimelineDataStore.setState({
    minTimestampSec: 1_700_000_000,
    maxTimestampSec: 1_700_086_400,
  });
  useDashboardDemoFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
    selectedSpatialBounds: null,
    presets: [],
    lastLoadedPresetId: null,
  });
});

describe('useDashboardDemoFilterStore.selectedTimeRange contract', () => {
  it('accepts epoch-second values without warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useDashboardDemoFilterStore.getState().setTimeRange([MIN_EPOCH_SEC, MAX_EPOCH_SEC]);
    expect(useDashboardDemoFilterStore.getState().selectedTimeRange).toEqual([
      MIN_EPOCH_SEC,
      MAX_EPOCH_SEC,
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns when values look like normalized 0-100 percentages', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useDashboardDemoFilterStore.getState().setTimeRange([25, 75]);
    expect(useDashboardDemoFilterStore.getState().selectedTimeRange).toEqual([
      1_700_021_600,
      1_700_064_800,
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/normalized 0.?100/);
    warnSpy.mockRestore();
  });

  it('treats stored values as epoch seconds (multiplied by 1000 → valid ms date)', () => {
    useDashboardDemoFilterStore.getState().setTimeRange([MIN_EPOCH_SEC, MAX_EPOCH_SEC]);
    const [startSec, endSec] = useDashboardDemoFilterStore.getState().selectedTimeRange!;
    const startDate = new Date(startSec * 1000);
    const endDate = new Date(endSec * 1000);
    expect(startDate.getUTCFullYear()).toBe(2001);
    expect(endDate.getUTCFullYear()).toBe(2002);
  });

  it('round-trips presets using the epoch-seconds contract', () => {
    useDashboardDemoFilterStore.getState().setTimeRange([25, 75]);
    const preset = useDashboardDemoFilterStore.getState().savePreset('Epoch Range');
    expect(preset?.timeRange).toEqual([1_700_021_600, 1_700_064_800]);

    useDashboardDemoFilterStore.getState().setTimeRange(null);
    expect(useDashboardDemoFilterStore.getState().selectedTimeRange).toBeNull();

    useDashboardDemoFilterStore.getState().loadPreset(preset!.id);
    expect(useDashboardDemoFilterStore.getState().selectedTimeRange).toEqual([
      1_700_021_600,
      1_700_064_800,
    ]);
  });
});
