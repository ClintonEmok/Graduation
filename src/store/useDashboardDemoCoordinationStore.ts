import { create } from 'zustand';

export type DemoSelectionSource = 'cube' | 'timeline' | 'map' | null;
export type DemoWorkflowPhase = 'generate' | 'review' | 'applied' | 'refine';
export type DemoSyncStatusToken = 'syncing' | 'synchronized' | 'partial';
export type DemoPanelName = 'timeline' | 'map' | 'cube';
export type DemoBurstMetric = 'density' | 'burstiness';
export type DemoComparisonSlot = 'left' | 'right';

export interface DemoBurstWindowSelection {
  id: string;
  start: number;
  end: number;
  metric: DemoBurstMetric;
  peak: number;
  count: number;
  duration: number;
  burstClass: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence: number;
  burstScore: number;
  burstRationale: string;
  burstRuleVersion: string;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
}

export interface DemoDetailPeriodSelection {
  id: string;
  startSec: number;
  endSec: number;
  count: number;
  label: string;
  renderMode: 'points' | 'bins';
  summary: string;
}

export interface DemoSyncStatus {
  status: DemoSyncStatusToken;
  reason?: string;
  panel?: DemoPanelName;
}

export interface DemoPanelNoMatchState {
  panel: DemoPanelName;
  reason: string;
  at: number;
}

export interface DemoReconcileSelectionInput {
  isValid: boolean;
  reason: string;
  panel: DemoPanelName;
}

interface DashboardDemoCoordinationState {
  selectedIndex: number | null;
  selectedSource: DemoSelectionSource;
  lastInteractionAt: number | null;
  lastInteractionSource: DemoSelectionSource;
  brushRange: [number, number] | null;
  selectedBurstWindows: DemoBurstWindowSelection[];
  selectedDetailPeriod: DemoDetailPeriodSelection | null;
  detailsOpen: boolean;
  workflowPhase: DemoWorkflowPhase;
  syncStatus: DemoSyncStatus;
  panelNoMatch: Partial<Record<DemoPanelName, DemoPanelNoMatchState>>;
  comparisonSliceIds: Record<DemoComparisonSlot, string | null>;
  comparisonSelectionOrder: DemoComparisonSlot[];
  setSelectedIndex: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  commitSelection: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  clearSelection: (reason?: string) => void;
  reconcileSelection: (input: DemoReconcileSelectionInput) => void;
  setWorkflowPhase: (phase: DemoWorkflowPhase) => void;
  setSyncStatus: (status: DemoSyncStatusToken, reason?: string, panel?: DemoPanelName) => void;
  setBrushRange: (range: [number, number] | null) => void;
  toggleBurstWindow: (window: DemoBurstWindowSelection) => void;
  clearSelectedBurstWindows: () => void;
  setSelectedDetailPeriod: (period: DemoDetailPeriodSelection | null) => void;
  clearSelectedDetailPeriod: () => void;
  setDetailsOpen: (open: boolean) => void;
  setComparisonSliceId: (slot: DemoComparisonSlot, sliceId: string | null) => void;
  pushComparisonSlice: (sliceId: string) => void;
  swapComparisonSlices: () => void;
  clearComparisonSlices: () => void;
}

export const useDashboardDemoCoordinationStore = create<DashboardDemoCoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  lastInteractionAt: null,
  lastInteractionSource: null,
  brushRange: null,
  selectedBurstWindows: [],
  selectedDetailPeriod: null,
  detailsOpen: false,
  workflowPhase: 'generate',
  syncStatus: { status: 'synchronized' },
  panelNoMatch: {},
  comparisonSliceIds: { left: null, right: null },
  comparisonSelectionOrder: [],
  setSelectedIndex: (index, source) =>
    set({
      selectedIndex: index,
      selectedSource: source,
      lastInteractionAt: Date.now(),
      lastInteractionSource: source,
      syncStatus: { status: 'synchronized' },
      panelNoMatch: {},
    }),
  commitSelection: (index, source) =>
    set({
      selectedIndex: index,
      selectedSource: source,
      lastInteractionAt: Date.now(),
      lastInteractionSource: source,
      syncStatus: { status: 'syncing' },
      panelNoMatch: {},
    }),
  clearSelection: (reason) =>
    set({
      selectedIndex: null,
      selectedSource: null,
      syncStatus: reason ? { status: 'partial', reason } : { status: 'synchronized' },
      panelNoMatch: {},
    }),
  reconcileSelection: ({ isValid, reason, panel }) =>
    set((state) => {
      if (isValid) {
        const nextNoMatch = { ...state.panelNoMatch };
        delete nextNoMatch[panel];
        const remaining = Object.values(nextNoMatch);

        if (remaining.length > 0) {
          return {
            panelNoMatch: nextNoMatch,
            syncStatus: {
              status: 'partial',
              reason: remaining[remaining.length - 1]?.reason,
              panel: remaining[remaining.length - 1]?.panel,
            },
          };
        }

        return {
          panelNoMatch: nextNoMatch,
          syncStatus: { status: 'synchronized' },
        };
      }

      const nextNoMatch = {
        ...state.panelNoMatch,
        [panel]: {
          panel,
          reason,
          at: Date.now(),
        },
      };

      return {
        panelNoMatch: nextNoMatch,
        syncStatus: {
          status: 'partial',
          reason,
          panel,
        },
      };
    }),
  setWorkflowPhase: (workflowPhase) => set({ workflowPhase }),
  setSyncStatus: (status, reason, panel) =>
    set({
      syncStatus: {
        status,
        ...(reason ? { reason } : {}),
        ...(panel ? { panel } : {}),
      },
    }),
  setBrushRange: (range) => set({ brushRange: range }),
  toggleBurstWindow: (window) =>
    set((state) => {
      const active = state.selectedBurstWindows[0];
      const isSameWindow =
        active?.id === window.id &&
        active.start === window.start &&
        active.end === window.end &&
        active.metric === window.metric;

      return {
        selectedBurstWindows: isSameWindow ? [active] : [window],
      };
    }),
  clearSelectedBurstWindows: () => set({ selectedBurstWindows: [] }),
  setSelectedDetailPeriod: (selectedDetailPeriod) => set({ selectedDetailPeriod }),
  clearSelectedDetailPeriod: () => set({ selectedDetailPeriod: null }),
  setDetailsOpen: (open) => set({ detailsOpen: open }),
  setComparisonSliceId: (slot, sliceId) =>
    set((state) => {
      const nextIds = { ...state.comparisonSliceIds, [slot]: sliceId };
      const nextOrder = state.comparisonSelectionOrder.filter((item) => item !== slot);
      if (sliceId !== null) {
        nextOrder.push(slot);
      }

      return {
        comparisonSliceIds: nextIds,
        comparisonSelectionOrder: nextOrder,
      };
    }),
  pushComparisonSlice: (sliceId) =>
    set((state) => {
      const { left, right } = state.comparisonSliceIds;

      if (left === null) {
        return {
          comparisonSliceIds: { left: sliceId, right },
          comparisonSelectionOrder: ['left', ...(right === null ? [] : ['right'])],
        };
      }

      if (right === null) {
        return {
          comparisonSliceIds: { left, right: sliceId },
          comparisonSelectionOrder: ['left', 'right'],
        };
      }

      const oldestSlot = state.comparisonSelectionOrder[0] ?? 'left';
      const newestOrder = oldestSlot === 'left' ? ['right', 'left'] : ['left', 'right'];

      return {
        comparisonSliceIds: {
          left: oldestSlot === 'left' ? sliceId : left,
          right: oldestSlot === 'right' ? sliceId : right,
        },
        comparisonSelectionOrder: newestOrder,
      };
    }),
  swapComparisonSlices: () =>
    set((state) => {
      const nextIds = {
        left: state.comparisonSliceIds.right,
        right: state.comparisonSliceIds.left,
      };

      return {
        comparisonSliceIds: nextIds,
        comparisonSelectionOrder: state.comparisonSelectionOrder.length === 2
          ? [...state.comparisonSelectionOrder].reverse() as DemoComparisonSlot[]
          : state.comparisonSelectionOrder,
      };
    }),
  clearComparisonSlices: () =>
    set({
      comparisonSliceIds: { left: null, right: null },
      comparisonSelectionOrder: [],
    }),
}));
