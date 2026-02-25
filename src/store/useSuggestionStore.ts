import { create } from 'zustand';

export type SuggestionType = 'warp-profile' | 'interval-boundary';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified';

export interface WarpProfileData {
  name: string;
  intervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number;
  }>;
}

export interface IntervalBoundaryData {
  boundaries: number[]; // epoch seconds
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  confidence: number; // 0-100
  data: WarpProfileData | IntervalBoundaryData;
  createdAt: number;
  status: SuggestionStatus;
}

interface SuggestionStore {
  suggestions: Suggestion[];
  isPanelOpen: boolean;
  activeSuggestionId: string | null;

  // Actions
  addSuggestion: (suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  modifySuggestion: (id: string, updates: Partial<Suggestion['data']>) => void;
  setPanelOpen: (open: boolean) => void;
  setActiveSuggestion: (id: string | null) => void;
  clearSuggestions: () => void;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  suggestions: [],
  isPanelOpen: true,
  activeSuggestionId: null,

  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [
        ...state.suggestions,
        {
          ...suggestion,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          status: 'pending',
        },
      ],
    })),

  acceptSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, status: 'accepted' as const } : s
      ),
    })),

  rejectSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' as const } : s
      ),
    })),

  modifySuggestion: (id, updates) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id
          ? { ...s, data: { ...s.data, ...updates }, status: 'modified' as const }
          : s
      ),
    })),

  setPanelOpen: (open) => set({ isPanelOpen: open }),

  setActiveSuggestion: (id) => set({ activeSuggestionId: id }),

  clearSuggestions: () => set({ suggestions: [], activeSuggestionId: null }),
}));
