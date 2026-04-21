import { create } from 'zustand';
import type { Suggestion, HistoryEntry } from '@/types/suggestion';

interface HistoryStore {
  acceptedHistory: HistoryEntry[];
  lastAction: {
    id: string;
    type: 'accept' | 'reject';
    previousStatus: 'pending' | 'accepted' | 'rejected' | 'modified';
  } | null;
  undoTimeout: ReturnType<typeof setTimeout> | null;
  showUndoToast: boolean;

  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  reapplyFromHistory: (historyId: string) => HistoryEntry | null;
  setUndoToast: (show: boolean) => void;
  setUndoTimeout: (timeout: ReturnType<typeof setTimeout> | null) => void;
  setLastAction: (action: { id: string; type: 'accept' | 'reject'; previousStatus: 'pending' | 'accepted' | 'rejected' | 'modified' } | null) => void;
  getLastAction: () => { id: string; type: 'accept' | 'reject'; previousStatus: 'pending' | 'accepted' | 'rejected' | 'modified' } | null;
  getUndoTimeout: () => ReturnType<typeof setTimeout> | null;
  getShowUndoToast: () => boolean;
  clearUndoState: () => void;
}

export const useSuggestionHistoryStore = create<HistoryStore>((set, get) => ({
  acceptedHistory: [],
  lastAction: null,
  undoTimeout: null,
  showUndoToast: false,

  addToHistory: (entry) =>
    set((state) => ({
      acceptedHistory: [entry, ...state.acceptedHistory].slice(0, 50),
    })),

  clearHistory: () => set({ acceptedHistory: [] }),

  reapplyFromHistory: (historyId) => {
    const entry = get().acceptedHistory.find((h) => h.id === historyId);
    return entry || null;
  },

  setUndoToast: (show) => set({ showUndoToast: show }),

  setUndoTimeout: (timeout) => set({ undoTimeout: timeout }),

  setLastAction: (action) => set({ lastAction: action }),

  getLastAction: () => get().lastAction,

  getUndoTimeout: () => get().undoTimeout,

  getShowUndoToast: () => get().showUndoToast,

  clearUndoState: () => set({ lastAction: null, undoTimeout: null, showUndoToast: false }),
}));
