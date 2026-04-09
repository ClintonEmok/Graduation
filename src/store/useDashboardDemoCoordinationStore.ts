import { create } from 'zustand';

export type DemoSelectionSource = 'cube' | 'timeline' | 'map' | null;
export type DemoWorkflowPhase = 'generate' | 'review' | 'applied' | 'refine';
export type DemoSyncStatusToken = 'syncing' | 'synchronized' | 'partial';
export type DemoPanelName = 'timeline' | 'map' | 'cube';

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
  selectedBurstWindows: { start: number; end: number; metric: 'density' | 'burstiness' }[];
  detailsOpen: boolean;
  workflowPhase: DemoWorkflowPhase;
  syncStatus: DemoSyncStatus;
  panelNoMatch: Partial<Record<DemoPanelName, DemoPanelNoMatchState>>;
  setSelectedIndex: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  commitSelection: (index: number, source: Exclude<DemoSelectionSource, null>) => void;
  clearSelection: (reason?: string) => void;
  reconcileSelection: (input: DemoReconcileSelectionInput) => void;
  setWorkflowPhase: (phase: DemoWorkflowPhase) => void;
  setSyncStatus: (status: DemoSyncStatusToken, reason?: string, panel?: DemoPanelName) => void;
  setBrushRange: (range: [number, number] | null) => void;
  toggleBurstWindow: (window: { start: number; end: number; metric: 'density' | 'burstiness' }) => void;
  clearSelectedBurstWindows: () => void;
  setDetailsOpen: (open: boolean) => void;
}

export const useDashboardDemoCoordinationStore = create<DashboardDemoCoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  lastInteractionAt: null,
  lastInteractionSource: null,
  brushRange: null,
  selectedBurstWindows: [],
  detailsOpen: false,
  workflowPhase: 'generate',
  syncStatus: { status: 'synchronized' },
  panelNoMatch: {},
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
      const exists = state.selectedBurstWindows.some(
        (item) => item.start === window.start && item.end === window.end && item.metric === window.metric
      );
      if (exists) {
        return {
          selectedBurstWindows: state.selectedBurstWindows.filter(
            (item) => !(item.start === window.start && item.end === window.end && item.metric === window.metric)
          ),
        };
      }
      const next = [...state.selectedBurstWindows, window];
      return { selectedBurstWindows: next.slice(-3) };
    }),
  clearSelectedBurstWindows: () => set({ selectedBurstWindows: [] }),
  setDetailsOpen: (open) => set({ detailsOpen: open }),
}));
