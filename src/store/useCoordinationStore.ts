import { create } from 'zustand';

export type SelectionSource = 'cube' | 'timeline' | 'map' | null;
export type WorkflowPhase = 'generate' | 'review' | 'applied' | 'refine';
export type SyncStatusToken = 'syncing' | 'synchronized' | 'partial';
export type PanelName = 'timeline' | 'map' | 'cube';

export interface SyncStatus {
  status: SyncStatusToken;
  reason?: string;
  panel?: PanelName;
}

export interface PanelNoMatchState {
  panel: PanelName;
  reason: string;
  at: number;
}

export interface ReconcileSelectionInput {
  isValid: boolean;
  reason: string;
  panel: PanelName;
}

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  lastInteractionAt: number | null;
  lastInteractionSource: SelectionSource;
  brushRange: [number, number] | null; // Normalized time range for brush
  selectedBurstWindows: { start: number; end: number; metric: 'density' | 'burstiness' }[];
  detailsOpen: boolean;
  workflowPhase: WorkflowPhase;
  syncStatus: SyncStatus;
  panelNoMatch: Partial<Record<PanelName, PanelNoMatchState>>;
  setSelectedIndex: (index: number, source: Exclude<SelectionSource, null>) => void;
  commitSelection: (index: number, source: Exclude<SelectionSource, null>) => void;
  clearSelection: (reason?: string) => void;
  reconcileSelection: (input: ReconcileSelectionInput) => void;
  setWorkflowPhase: (phase: WorkflowPhase) => void;
  setSyncStatus: (status: SyncStatusToken, reason?: string, panel?: PanelName) => void;
  setBrushRange: (range: [number, number] | null) => void;
  toggleBurstWindow: (window: { start: number; end: number; metric: 'density' | 'burstiness' }) => void;
  clearSelectedBurstWindows: () => void;
  setDetailsOpen: (open: boolean) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
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
          )
        };
      }
      const next = [...state.selectedBurstWindows, window];
      return { selectedBurstWindows: next.slice(-3) };
    }),
  clearSelectedBurstWindows: () => set({ selectedBurstWindows: [] }),
  setDetailsOpen: (open) => set({ detailsOpen: open })
}));
