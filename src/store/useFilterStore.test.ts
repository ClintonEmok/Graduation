/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilterStore } from './useFilterStore';

const resetStore = () => {
  useFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
    presets: [],
    lastLoadedPresetId: null,
  });
};

describe('useFilterStore presets', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('saves, loads, persists, and deletes presets', async () => {
    useFilterStore.setState({
      selectedTypes: [1, 2],
      selectedDistricts: [3],
      selectedTimeRange: [100, 200],
    });

    const preset = useFilterStore.getState().savePreset('Test Preset');
    expect(preset).not.toBeNull();

    const stateAfterSave = useFilterStore.getState();
    expect(stateAfterSave.presets).toHaveLength(1);
    expect(stateAfterSave.presets[0].name).toBe('Test Preset');
    expect(stateAfterSave.presets[0].types).toEqual([1, 2]);
    expect(stateAfterSave.presets[0].districts).toEqual([3]);
    expect(stateAfterSave.presets[0].timeRange).toEqual([100, 200]);

    useFilterStore.setState({
      selectedTypes: [9],
      selectedDistricts: [8],
      selectedTimeRange: [300, 400],
    });

    useFilterStore.getState().loadPreset(preset!.id);
    expect(useFilterStore.getState().selectedTypes).toEqual([1, 2]);
    expect(useFilterStore.getState().selectedDistricts).toEqual([3]);
    expect(useFilterStore.getState().selectedTimeRange).toEqual([100, 200]);

    const stored = localStorage.getItem('crimeviz-presets');
    expect(stored).not.toBeNull();

    vi.resetModules();
    const { useFilterStore: reloadedStore } = await import('./useFilterStore');
    expect(reloadedStore.getState().presets).toHaveLength(1);

    const reloadedId = reloadedStore.getState().presets[0].id;
    reloadedStore.getState().deletePreset(reloadedId);
    expect(reloadedStore.getState().presets).toHaveLength(0);

    const persisted = localStorage.getItem('crimeviz-presets');
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted!)).toHaveLength(0);
  });
});
