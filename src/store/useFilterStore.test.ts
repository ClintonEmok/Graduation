/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock localStorage BEFORE importing the store
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
};

const localStorageMock = createLocalStorageMock();

// Stub global BEFORE importing the store
vi.stubGlobal('localStorage', localStorageMock);

// NOW import the store
import { useFilterStore } from './useFilterStore';

beforeEach(() => {
  localStorageMock.clear();
  
  useFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
    presets: [],
    lastLoadedPresetId: null,
  });
});

describe('useFilterStore presets', () => {
  it('saves presets with current filter state', () => {
    useFilterStore.setState({
      selectedTypes: [1, 2],
      selectedDistricts: [3],
      selectedTimeRange: [100, 200],
    });

    const preset = useFilterStore.getState().savePreset('Test Preset');
    expect(preset).not.toBeNull();
    
    const state = useFilterStore.getState();
    expect(state.presets).toHaveLength(1);
    expect(state.presets[0].name).toBe('Test Preset');
    expect(state.presets[0].types).toEqual([1, 2]);
    expect(state.presets[0].districts).toEqual([3]);
    expect(state.presets[0].timeRange).toEqual([100, 200]);
  });

  it('loads presets and restores filter state', () => {
    useFilterStore.setState({
      selectedTypes: [1, 2],
      selectedDistricts: [3],
      selectedTimeRange: [100, 200],
    });

    const preset = useFilterStore.getState().savePreset('Test Preset');
    
    // Change filter state
    useFilterStore.setState({
      selectedTypes: [9],
      selectedDistricts: [8],
      selectedTimeRange: [300, 400],
    });

    // Load preset
    useFilterStore.getState().loadPreset(preset!.id);
    
    expect(useFilterStore.getState().selectedTypes).toEqual([1, 2]);
    expect(useFilterStore.getState().selectedDistricts).toEqual([3]);
    expect(useFilterStore.getState().selectedTimeRange).toEqual([100, 200]);
  });

  it('deletes presets', () => {
    const preset = useFilterStore.getState().savePreset('To Delete');
    expect(useFilterStore.getState().presets).toHaveLength(1);
    
    useFilterStore.getState().deletePreset(preset!.id);
    expect(useFilterStore.getState().presets).toHaveLength(0);
  });

  it('validates preset names', () => {
    const store = useFilterStore.getState();
    
    // Too short
    expect(store.savePreset('AB')).toBeNull();
    
    // Valid
    const valid = store.savePreset('Valid Name');
    expect(valid).not.toBeNull();
    
    // Too long
    expect(store.savePreset('A'.repeat(51))).toBeNull();
  });
});
