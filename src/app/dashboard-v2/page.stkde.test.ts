import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import DashboardV2Page from './page';

const e = React.createElement;

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Panels = {
  timeline: boolean;
  map: boolean;
  refinement: boolean;
  layers: boolean;
  cube: boolean;
  stkde: boolean;
};

const hoisted = vi.hoisted(() => ({
  setPanelSpy: vi.fn<(panel: keyof Panels, visible: boolean) => void>(),
  setGenerationInputsSpy: vi.fn(),
  setWorkflowPhaseSpy: vi.fn(),
  setSyncStatusSpy: vi.fn(),
  commitSelectionSpy: vi.fn(),
  setTimeRangeSpy: vi.fn(),
  setSpatialBoundsSpy: vi.fn(),
  computeMapsSpy: vi.fn(),
  timelineSetStateSpy: vi.fn(),
  layoutState: {
    panels: {
      timeline: true,
      map: true,
      refinement: false,
      layers: false,
      cube: true,
      stkde: false,
    } as Panels,
    mapRatio: 55,
  },
  timeslicingState: {
    generationStatus: 'idle',
    pendingGeneratedBins: [],
    generationError: null,
    mode: 'auto',
  },
  coordinationState: {
    workflowPhase: 'generate' as 'generate' | 'review' | 'applied' | 'refine',
    panelNoMatch: {},
  },
  sliceState: {
    slices: [] as unknown[],
  },
  stkdeState: {
    selectedHotspotId: null as string | null,
    response: null,
  },
}));

vi.mock('lucide-react', () => {
  const Icon = () => null;
  return { Shield: Icon, Sparkles: Icon };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => e('button', props, children),
}));

vi.mock('@/components/timeline/DualTimeline', () => ({
  DualTimeline: () => e('div', { 'data-testid': 'timeline' }),
}));

vi.mock('@/components/map/MapVisualization', () => ({
  __esModule: true,
  default: () => e('div', { 'data-testid': 'map' }),
}));

vi.mock('@/components/viz/CubeVisualization', () => ({
  __esModule: true,
  default: () => e('div', { 'data-testid': 'cube' }),
}));

vi.mock('@/components/dashboard/DashboardHeader', () => ({
  DashboardHeader: () => e('header', { 'data-testid': 'dashboard-header' }),
}));

vi.mock('@/components/binning/BinningControls', () => ({
  BinningControls: () => e('div', { 'data-testid': 'binning-controls' }),
}));

vi.mock('@/app/timeslicing/components/SuggestionToolbar', () => ({
  SuggestionToolbar: () => e('div', { 'data-testid': 'suggestion-toolbar' }),
}));

vi.mock('@/components/map/MapLayerManager', () => ({
  MapLayerManager: () => e('div', { 'data-testid': 'layer-manager' }),
}));

vi.mock('@/components/stkde/DashboardStkdePanel', () => ({
  DashboardStkdePanel: () => e('div', { 'data-testid': 'dashboard-stkde-panel' }),
}));

vi.mock('@/hooks/useCrimeData', () => ({
  useCrimeData: () => ({
    data: [
      {
        timestamp: 1710000000,
        lat: 41.88,
        lon: -87.63,
        x: 10,
        z: 20,
        type: 'THEFT',
        district: '1',
      },
    ],
  }),
}));

vi.mock('@/lib/stores/viewportStore', () => ({
  useViewportStore: (selector: (s: { startDate: number; endDate: number }) => unknown) =>
    selector({ startDate: 1700000000, endDate: 1720000000 }),
}));

vi.mock('@/store/useTimelineDataStore', () => {
  const useTimelineDataStore = ((selector: (s: { minTimestampSec: number; maxTimestampSec: number }) => unknown) =>
    selector({ minTimestampSec: 1700000000, maxTimestampSec: 1720000000 })) as unknown as {
    (selector: (s: { minTimestampSec: number; maxTimestampSec: number }) => unknown): unknown;
    setState: (payload: unknown) => void;
  };
  useTimelineDataStore.setState = hoisted.timelineSetStateSpy;
  return { useTimelineDataStore };
});

vi.mock('@/store/useAdaptiveStore', () => ({
  useAdaptiveStore: (() => {
    const useAdaptiveStore = ((selector: (s: { mapDomain: [number, number] }) => unknown) =>
      selector({ mapDomain: [1700000000, 1720000000] })) as unknown as {
      (selector: (s: { mapDomain: [number, number] }) => unknown): unknown;
      getState: () => { computeMaps: typeof hoisted.computeMapsSpy };
    };

    useAdaptiveStore.getState = () => ({ computeMaps: hoisted.computeMapsSpy });
    return useAdaptiveStore;
  })(),
}));

vi.mock('@/store/useTimeslicingModeStore', () => ({
  useTimeslicingModeStore: (
    selector: (s: {
      generationStatus: string;
      pendingGeneratedBins: unknown[];
      generationError: string | null;
      mode: string;
      setGenerationInputs: (_inputs: unknown) => void;
    }) => unknown
  ) =>
    selector({
      generationStatus: hoisted.timeslicingState.generationStatus,
      pendingGeneratedBins: hoisted.timeslicingState.pendingGeneratedBins,
      generationError: hoisted.timeslicingState.generationError,
      mode: hoisted.timeslicingState.mode,
      setGenerationInputs: hoisted.setGenerationInputsSpy,
    }),
}));

vi.mock('@/store/useSliceDomainStore', () => ({
  useSliceDomainStore: (selector: (s: { slices: unknown[] }) => unknown) => selector({ slices: hoisted.sliceState.slices }),
}));

vi.mock('@/store/useFilterStore', () => ({
  useFilterStore: (
    selector: (s: {
      selectedTimeRange: [number, number] | null;
      setTimeRange: (_range: [number, number]) => void;
      setSpatialBounds: (_bounds: unknown) => void;
    }) => unknown
  ) =>
    selector({
      selectedTimeRange: null,
      setTimeRange: hoisted.setTimeRangeSpy,
      setSpatialBounds: hoisted.setSpatialBoundsSpy,
    }),
}));

vi.mock('@/store/useLayoutStore', () => ({
  useLayoutStore: (selector: (s: { panels: Panels; setPanel: typeof hoisted.setPanelSpy; mapRatio: number }) => unknown) =>
    selector({
      panels: hoisted.layoutState.panels,
      setPanel: hoisted.setPanelSpy,
      mapRatio: hoisted.layoutState.mapRatio,
    }),
}));

vi.mock('@/store/useCoordinationStore', () => ({
  useCoordinationStore: (
    selector: (s: {
      workflowPhase: 'generate' | 'review' | 'applied' | 'refine';
      setWorkflowPhase: typeof hoisted.setWorkflowPhaseSpy;
      setSyncStatus: typeof hoisted.setSyncStatusSpy;
      commitSelection: typeof hoisted.commitSelectionSpy;
      panelNoMatch: Record<string, { at: number; reason: string; panel?: string }>;
    }) => unknown
  ) =>
    selector({
      workflowPhase: hoisted.coordinationState.workflowPhase,
      setWorkflowPhase: hoisted.setWorkflowPhaseSpy,
      setSyncStatus: hoisted.setSyncStatusSpy,
      commitSelection: hoisted.commitSelectionSpy,
      panelNoMatch: hoisted.coordinationState.panelNoMatch,
    }),
}));

vi.mock('@/store/useStkdeStore', () => ({
  useStkdeStore: (selector: (s: { selectedHotspotId: string | null; response: unknown }) => unknown) =>
    selector({ selectedHotspotId: hoisted.stkdeState.selectedHotspotId, response: hoisted.stkdeState.response }),
}));

vi.mock('@/lib/projection', () => ({
  project: () => [0, 0],
}));

describe('dashboard-v2 flow consolidation runtime', () => {
  beforeEach(() => {
    hoisted.setPanelSpy.mockReset();
    hoisted.setGenerationInputsSpy.mockReset();
    hoisted.setWorkflowPhaseSpy.mockReset();
    hoisted.setSyncStatusSpy.mockReset();
    hoisted.commitSelectionSpy.mockReset();
    hoisted.setTimeRangeSpy.mockReset();
    hoisted.setSpatialBoundsSpy.mockReset();
    hoisted.computeMapsSpy.mockReset();
    hoisted.timelineSetStateSpy.mockReset();
    hoisted.layoutState.panels = {
      timeline: true,
      map: true,
      refinement: false,
      layers: false,
      cube: true,
      stkde: false,
    };
    hoisted.coordinationState.workflowPhase = 'generate';
    hoisted.coordinationState.panelNoMatch = {};
    hoisted.sliceState.slices = [];
    hoisted.stkdeState.selectedHotspotId = null;
    hoisted.stkdeState.response = null;
    hoisted.timeslicingState.pendingGeneratedBins = [];
    hoisted.timeslicingState.generationError = null;
    hoisted.timeslicingState.mode = 'auto';
    hoisted.timeslicingState.generationStatus = 'idle';
  });

  test('renders the guided workflow shell without showing STKDE before apply/refine', () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(e(DashboardV2Page));
    });

    expect(renderer!.root.findByProps({ 'data-testid': 'binning-controls' })).toBeDefined();
    expect(renderer!.root.findByProps({ 'data-testid': 'suggestion-toolbar' })).toBeDefined();
    expect(renderer!.root.findAllByProps({ 'data-testid': 'dashboard-stkde-panel' })).toHaveLength(0);
  });

  test('unlocks analysis by requesting the STKDE panel when applied slices are active', () => {
    hoisted.coordinationState.workflowPhase = 'applied';
    hoisted.layoutState.panels.stkde = false;

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setPanelSpy).toHaveBeenCalledWith('stkde', true);
  });

  test('renders STKDE once the analysis panel is unlocked', () => {
    hoisted.coordinationState.workflowPhase = 'applied';
    hoisted.layoutState.panels.stkde = true;

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(e(DashboardV2Page));
    });

    expect(renderer!.root.findByProps({ 'data-testid': 'dashboard-stkde-panel' })).toBeDefined();
  });
});
