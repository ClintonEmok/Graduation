import { create } from 'zustand';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { useViewportStore } from '@/lib/stores/viewportStore';

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
  isEmptyState: boolean;
  warpCount: number;
  intervalCount: number;

  // Actions
  addSuggestion: (suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  modifySuggestion: (id: string, updates: Partial<Suggestion['data']>) => void;
  setPanelOpen: (open: boolean) => void;
  setActiveSuggestion: (id: string | null) => void;
  clearSuggestions: () => void;
  setEmptyState: (empty: boolean) => void;
  setWarpCount: (count: number) => void;
  setIntervalCount: (count: number) => void;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  suggestions: [],
  isPanelOpen: true,
  activeSuggestionId: null,
  isEmptyState: false,
  warpCount: 3,
  intervalCount: 3,

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
    set((state) => {
      const suggestion = state.suggestions.find((s) => s.id === id);
      if (!suggestion || suggestion.status !== 'pending') {
        return { suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'accepted' as const } : s
        )};
      }

      // When accepting, we'll trigger slice creation via a custom event
      // The actual slice creation is handled by the UI component listening to this
      if (suggestion.type === 'warp-profile') {
        // Dispatch custom event for warp slice creation
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-warp-profile', { 
            detail: { id, data: suggestion.data } 
          }));
        }
      } else if (suggestion.type === 'interval-boundary') {
        // Dispatch custom event for time slice creation
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-interval-boundary', { 
            detail: { id, data: suggestion.data } 
          }));
        }
      }

      return {
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'accepted' as const } : s
        ),
      };
    }),

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

  clearSuggestions: () => set({ suggestions: [], activeSuggestionId: null, isEmptyState: false }),

  setEmptyState: (empty) => set({ isEmptyState: empty }),
  
  setWarpCount: (count) => set({ warpCount: Math.max(0, Math.min(6, count)) }),
  
  setIntervalCount: (count) => set({ intervalCount: Math.max(0, Math.min(6, count)) }),
}));
