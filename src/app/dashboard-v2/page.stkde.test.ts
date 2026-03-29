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

type MockTimeslicingState = {
  generationStatus: string;
  pendingGeneratedBins: unknown[];
  generationError: string | null;
  mode: string;
};

type MockCoordinationState = {
  panelNoMatch: Record<string, { at: number; reason: string; panel?: string }>;
};

type MockStkdeResponse = {
  hotspots: Array<{
    id: string;
    peakStartEpochSec: number;
    peakEndEpochSec: number;
    radiusMeters: number;
    centroidLat: number;
    centroidLng: number;
  }>;
};

const hoisted = vi.hoisted(() => ({
  togglePanelSpy: vi.fn<(panel: keyof Panels) => void>(),
  setGenerationInputsSpy: vi.fn(),
  setWorkflowPhaseSpy: vi.fn(),
  setSyncStatusSpy: vi.fn(),
  commitSelectionSpy: vi.fn(),
  setTimeRangeSpy: vi.fn(),
  setSpatialBoundsSpy: vi.fn(),
  computeMapsSpy: vi.fn(),
  timelineSetStateSpy: vi.fn(),
  timeslicingState: {
    generationStatus: 'idle',
    pendingGeneratedBins: [],
    generationError: null,
    mode: 'manual',
  } as MockTimeslicingState,
  coordinationState: {
    panelNoMatch: {},
  } as MockCoordinationState,
  sliceState: {
    slices: [] as unknown[],
  },
  stkdeState: {
    selectedHotspotId: null as string | null,
    response: null as MockStkdeResponse | null,
  },
  state: {
    panels: {
      timeline: true,
      map: true,
      refinement: true,
      layers: true,
      cube: true,
      stkde: true,
    } as Panels,
  },
}));

vi.mock('lucide-react', () => {
  const Icon = () => null;
  return {
    CheckCircle2: Icon,
    Clock3: Icon,
    Cuboid: Icon,
    Layers3: Icon,
    Sparkles: Icon,
    X: Icon,
  };
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

vi.mock('@/app/timeslicing/components/SuggestionToolbar', () => ({
  SuggestionToolbar: () => e('div', { 'data-testid': 'suggestion-toolbar' }),
}));

vi.mock('@/components/map/MapLayerManager', () => ({
  MapLayerManager: () => e('div', { 'data-testid': 'layer-manager' }),
}));

vi.mock('@/components/stkde/DashboardStkdePanel', () => ({
  DashboardStkdePanel: () => e('div', { 'data-testid': 'dashboard-stkde-panel' }, 'STKDE PANEL'),
}));

vi.mock('@/hooks/useCrimeData', () => ({
  useCrimeData: () => ({
    data: [
      {
        timestamp: 1710000000,
        x: 10,
        z: 20,
        type: 'THEFT',
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

vi.mock('@/store/useAdaptiveStore', () => {
  const useAdaptiveStore = ((selector: (s: { mapDomain: [number, number] }) => unknown) =>
    selector({ mapDomain: [1700000000, 1720000000] })) as unknown as {
    (selector: (s: { mapDomain: [number, number] }) => unknown): unknown;
    getState: () => { computeMaps: (timestamps: Float32Array, domain: [number, number], options: unknown) => void };
  };
  useAdaptiveStore.getState = () => ({ computeMaps: hoisted.computeMapsSpy });
  return { useAdaptiveStore };
});

vi.mock('@/store/useTimeslicingModeStore', () => ({
  useTimeslicingModeStore: (
    selector: (s: {
      generationStatus: string;
      pendingGeneratedBins: unknown[];
      generationError: string | null;
      mode: string;
      clearPendingGeneratedBins: () => void;
      applyGeneratedBins: (_domain: [number, number]) => void;
      setGenerationInputs: (_inputs: unknown) => void;
    }) => unknown
  ) =>
    selector({
      generationStatus: hoisted.timeslicingState.generationStatus,
      pendingGeneratedBins: hoisted.timeslicingState.pendingGeneratedBins,
      generationError: hoisted.timeslicingState.generationError,
      mode: hoisted.timeslicingState.mode,
      clearPendingGeneratedBins: vi.fn(),
      applyGeneratedBins: vi.fn(),
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
  useLayoutStore: (selector: (s: { panels: Panels; togglePanel: typeof hoisted.togglePanelSpy; mapRatio: number }) => unknown) =>
    selector({
      panels: hoisted.state.panels,
      togglePanel: hoisted.togglePanelSpy,
      mapRatio: 55,
    }),
}));

vi.mock('@/store/useCoordinationStore', () => ({
  useCoordinationStore: (
    selector: (s: {
      setWorkflowPhase: typeof hoisted.setWorkflowPhaseSpy;
      setSyncStatus: typeof hoisted.setSyncStatusSpy;
      commitSelection: typeof hoisted.commitSelectionSpy;
      panelNoMatch: Record<string, { at: number; reason: string; panel?: string }>;
    }) => unknown
  ) =>
    selector({
      setWorkflowPhase: hoisted.setWorkflowPhaseSpy,
      setSyncStatus: hoisted.setSyncStatusSpy,
      commitSelection: hoisted.commitSelectionSpy,
      panelNoMatch: hoisted.coordinationState.panelNoMatch,
    }),
}));

vi.mock('@/store/useStkdeStore', () => ({
  useStkdeStore: (selector: (s: { selectedHotspotId: string | null; response: MockStkdeResponse | null }) => unknown) =>
    selector({ selectedHotspotId: hoisted.stkdeState.selectedHotspotId, response: hoisted.stkdeState.response }),
}));

vi.mock('@/lib/projection', () => ({
  project: () => [0, 0],
}));

describe('dashboard-v2 STKDE runtime behavior', () => {
  beforeEach(() => {
    hoisted.state.panels = {
      timeline: true,
      map: true,
      refinement: true,
      layers: true,
      cube: true,
      stkde: true,
    };
    hoisted.togglePanelSpy.mockReset();
    hoisted.setGenerationInputsSpy.mockReset();
    hoisted.setWorkflowPhaseSpy.mockReset();
    hoisted.setSyncStatusSpy.mockReset();
    hoisted.commitSelectionSpy.mockReset();
    hoisted.setTimeRangeSpy.mockReset();
    hoisted.setSpatialBoundsSpy.mockReset();
    hoisted.computeMapsSpy.mockReset();
    hoisted.timelineSetStateSpy.mockReset();
    hoisted.timeslicingState = {
      generationStatus: 'idle',
      pendingGeneratedBins: [],
      generationError: null,
      mode: 'manual',
    };
    hoisted.coordinationState = {
      panelNoMatch: {},
    };
    hoisted.sliceState = {
      slices: [],
    };
    hoisted.stkdeState = {
      selectedHotspotId: null,
      response: null,
    };
  });

  test('renders STKDE panel when stkde panel visibility is enabled', () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(e(DashboardV2Page));
    });

    const stkdePanel = renderer!.root.findByProps({ 'data-testid': 'dashboard-stkde-panel' });
    expect(stkdePanel.props.children).toBe('STKDE PANEL');
    expect(hoisted.setGenerationInputsSpy).toHaveBeenCalled();
  });

  test('hides STKDE panel when stkde panel visibility is disabled', () => {
    hoisted.state.panels.stkde = false;

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(e(DashboardV2Page));
    });

    const panels = renderer!.root.findAllByProps({ 'data-testid': 'dashboard-stkde-panel' });
    expect(panels).toHaveLength(0);
  });

  test('clicking STKDE toggle dispatches layout toggle action', () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(e(DashboardV2Page));
    });

    const readText = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(readText).join('');
      return '';
    };

    const stkdeToggleButton = renderer!.root
      .findAllByType('button')
      .find((node) => readText(node.props.children).includes('STKDE'));

    expect(stkdeToggleButton).toBeDefined();

    act(() => {
      stkdeToggleButton!.props.onClick();
    });

    expect(hoisted.togglePanelSpy).toHaveBeenCalledWith('stkde');
  });

  test('sets workflow phase to review when pending generated bins exist', () => {
    hoisted.timeslicingState.pendingGeneratedBins = [{ id: 'draft-1' }];

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setWorkflowPhaseSpy).toHaveBeenCalledWith('review');
  });

  test('sets workflow phase to applied when generated-applied slices exist in non-manual mode', () => {
    hoisted.sliceState.slices = [
      {
        source: 'generated-applied',
        isVisible: true,
        type: 'point',
        time: 1710000000000,
      },
    ];
    hoisted.timeslicingState.mode = 'auto';

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setWorkflowPhaseSpy).toHaveBeenCalledWith('applied');
  });

  test('sets workflow phase to refine when generated-applied slices exist in manual mode', () => {
    hoisted.sliceState.slices = [
      {
        source: 'generated-applied',
        isVisible: true,
        type: 'point',
        time: 1710000000000,
      },
    ];
    hoisted.timeslicingState.mode = 'manual';

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setWorkflowPhaseSpy).toHaveBeenCalledWith('refine');
  });

  test('sets sync status to partial when generation error exists', () => {
    hoisted.timeslicingState.generationError = 'Generation failed for current constraints';

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setSyncStatusSpy).toHaveBeenCalledWith('partial', 'Generation failed for current constraints');
  });

  test('sets sync status to partial when panel no-match metadata exists', () => {
    hoisted.coordinationState.panelNoMatch = {
      map: {
        at: Date.now(),
        reason: 'Selected index not in map viewport',
        panel: 'map',
      },
    };

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setSyncStatusSpy).toHaveBeenCalledWith('partial', 'Selected index not in map viewport', 'map');
  });

  test('commits hotspot selection and applies investigative overlay mismatch copy', () => {
    hoisted.sliceState.slices = [
      {
        source: 'generated-applied',
        isVisible: true,
        type: 'range',
        range: [1700000000000, 1700100000000],
      },
    ];

    hoisted.stkdeState.selectedHotspotId = 'hotspot-1';
    hoisted.stkdeState.response = {
      hotspots: [
        {
          id: 'hotspot-1',
          peakStartEpochSec: 1715000000,
          peakEndEpochSec: 1715003600,
          radiusMeters: 120,
          centroidLat: 41.88,
          centroidLng: -87.63,
        },
      ],
    };

    act(() => {
      TestRenderer.create(e(DashboardV2Page));
    });

    expect(hoisted.setTimeRangeSpy).toHaveBeenCalledWith([1715000000, 1715003600]);
    expect(hoisted.setSpatialBoundsSpy).toHaveBeenCalledTimes(1);
    expect(hoisted.commitSelectionSpy).toHaveBeenCalledWith(0, 'map');
    expect(hoisted.setSyncStatusSpy).toHaveBeenCalledWith(
      'partial',
      'Hotspot time window is an investigative overlay; applied slices remain the workflow source of truth.',
      'map'
    );
  });
});
