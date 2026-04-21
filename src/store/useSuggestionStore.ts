import { create } from 'zustand';
import { getCurrentContext, type ContextMode } from '@/hooks/useContextExtractor';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useContextProfileStore } from '@/store/useContextProfileStore';
import { usePresetStore } from '@/store/usePresetStore';
import { useSuggestionHistoryStore } from '@/store/useSuggestionHistoryStore';
import type { AutoProposalSet, RankedAutoProposalSets } from '@/types/autoProposalSet';
import type {
  SuggestionType,
  SuggestionStatus,
  BoundaryMethod,
  SnapToUnit,
  GenerationPreset,
  TimeScaleData,
  IntervalBoundaryData,
  SuggestionContextMetadata,
  Suggestion,
  HistoryEntry,
} from '@/types/suggestion';

interface SuggestionStore {
  suggestions: Suggestion[];
  isPanelOpen: boolean;
  activeSuggestionId: string | null;
  hoveredSuggestionId: string | null;
  isEmptyState: boolean;
  warpCount: number;
  intervalCount: number;
  snapToUnit: SnapToUnit;
  boundaryMethod: BoundaryMethod;
  
  // Confidence filter state
  minConfidence: number;
  generationError: string | null;
  
  // Bulk selection state
  selectedIds: Set<string>;

  // Comparison state (max 2 suggestions)
  comparisonIds: [string | null, string | null];

  // Context scope state
  contextMode: ContextMode;

  // Full-auto package state
  fullAutoProposalSets: AutoProposalSet[];
  selectedFullAutoSetId: string | null;
  recommendedFullAutoSetId: string | null;
  fullAutoLowConfidenceReason: string | null;
  fullAutoNoResultReason: string | null;
  hasFullAutoLowConfidence: boolean;

  // Actions
  addSuggestion: (suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  undoSuggestion: () => void;
  modifySuggestion: (id: string, updates: Partial<Suggestion['data']>) => void;
  
  // Bulk actions
  selectOne: (id: string) => void;
  deselectOne: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  acceptSelected: () => void;
  rejectSelected: () => void;

  setPanelOpen: (open: boolean) => void;
  setActiveSuggestion: (id: string | null) => void;
  setHoveredSuggestion: (id: string | null) => void;
  clearSuggestions: () => void;
  clearPendingSuggestions: () => void;
  setEmptyState: (empty: boolean) => void;
  setWarpCount: (count: number) => void;
  setIntervalCount: (count: number) => void;
  setSnapToUnit: (value: SnapToUnit) => void;
  setBoundaryMethod: (value: BoundaryMethod) => void;
  setMinConfidence: (minConfidence: number) => void;
  setGenerationError: (message: string | null) => void;
  setContextMode: (mode: ContextMode) => void;

  // Full-auto package actions
  setFullAutoProposalResults: (result: RankedAutoProposalSets | null) => void;
  selectFullAutoProposalSet: (id: string | null) => void;
  clearFullAutoProposalSets: () => void;
  
  // Comparison actions
  setComparisonId: (index: 0 | 1, id: string | null) => void;
  clearComparison: () => void;

  // History actions (delegated to useSuggestionHistoryStore for storage)
  reapplyFromHistory: (historyId: string) => void;
}

export const useSuggestionStore = create<SuggestionStore>((set, get) => ({
  suggestions: [],
  isPanelOpen: true,
  activeSuggestionId: null,
  hoveredSuggestionId: null,
  isEmptyState: false,
  warpCount: 3,
  intervalCount: 3,
  snapToUnit: 'none',
  boundaryMethod: 'peak',

  // Confidence filter
  minConfidence: 0,
  generationError: null,

  // Bulk selection
  selectedIds: new Set<string>(),

  // Comparison state
  comparisonIds: [null, null],

  // Context scope state
  contextMode: 'visible',

  // Full-auto package state
  fullAutoProposalSets: [],
  selectedFullAutoSetId: null,
  recommendedFullAutoSetId: null,
  fullAutoLowConfidenceReason: null,
  fullAutoNoResultReason: null,
  hasFullAutoLowConfidence: false,

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
      if (!suggestion || suggestion.status === 'accepted') {
        return state;
      }

      const previousStatus = suggestion.status;

      // Clear any existing undo timeout from history store
      const historyState = useSuggestionHistoryStore.getState();
      const existingTimeout = historyState.getUndoTimeout();
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set up undo timeout (5 seconds) in history store
      const undoTimeout = setTimeout(() => {
        useSuggestionHistoryStore.getState().clearUndoState();
      }, 5000);
      historyState.setUndoTimeout(undoTimeout);
      historyState.setLastAction({ id, type: 'accept', previousStatus });
      historyState.setUndoToast(true);

      // When accepting pending suggestions, trigger slice creation via custom event.
      if (suggestion.status === 'pending' && suggestion.type === 'time-scale') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-time-scale', {
            detail: { id, data: suggestion.data }
          }));
        }
      } else if (suggestion.status === 'pending' && suggestion.type === 'interval-boundary') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-interval-boundary', {
            detail: { id, data: suggestion.data }
          }));
        }
      }

      // Add to history in history store
      const viewportState = useViewportStore.getState();
      const filterState = useFilterStore.getState();
      const activeProfile = useContextProfileStore.getState().getActiveProfile();
      const context = getCurrentContext({
        mode: state.contextMode,
        crimeTypes:
          viewportState.filters.crimeTypes.length > 0
            ? viewportState.filters.crimeTypes
            : filterState.selectedTypes.map((typeId) => `type:${typeId}`),
        districts:
          viewportState.filters.districts.length > 0
            ? viewportState.filters.districts
            : filterState.selectedDistricts.map((districtId) => `district:${districtId}`),
        viewportStart: viewportState.startDate,
        viewportEnd: viewportState.endDate,
        selectedTimeRange: filterState.selectedTimeRange,
      });

      const historyEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        suggestion,
        acceptedAt: Date.now(),
        contextMetadata: {
          crimeTypes: context.crimeTypes,
          timeRange: context.timeRange,
          isFullDataset: context.isFullDataset,
          profileName:
            suggestion.contextMetadata?.profileName ?? activeProfile?.name,
          contextDiagnostics: suggestion.contextMetadata?.contextDiagnostics,
        },
      };

      // Add to history store
      useSuggestionHistoryStore.getState().addToHistory(historyEntry);

      return {
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'accepted' as const } : s
        ),
        selectedIds: (() => {
          const next = new Set(state.selectedIds);
          next.delete(id);
          return next;
        })(),
      };
    }),

  rejectSuggestion: (id) =>
    set((state) => {
      const suggestion = state.suggestions.find((s) => s.id === id);
      if (!suggestion || suggestion.status === 'rejected') {
        return state;
      }

      const previousStatus = suggestion.status;

      // Clear any existing undo timeout from history store
      const historyState = useSuggestionHistoryStore.getState();
      const existingTimeout = historyState.getUndoTimeout();
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set up undo timeout (5 seconds) in history store
      const undoTimeout = setTimeout(() => {
        useSuggestionHistoryStore.getState().clearUndoState();
      }, 5000);
      historyState.setUndoTimeout(undoTimeout);
      historyState.setLastAction({ id, type: 'reject', previousStatus });
      historyState.setUndoToast(true);

      return {
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'rejected' as const } : s
        ),
        selectedIds: (() => {
          const next = new Set(state.selectedIds);
          next.delete(id);
          return next;
        })(),
      };
    }),

  modifySuggestion: (id, updates) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id
          ? { ...s, data: { ...s.data, ...updates }, status: 'modified' as const }
          : s
      ),
      selectedIds: (() => {
        const next = new Set(state.selectedIds);
        next.delete(id);
        return next;
      })(),
    })),

  undoSuggestion: () => {
    const historyState = useSuggestionHistoryStore.getState();
    const lastAction = historyState.getLastAction();
    if (!lastAction) return;

    // Clear the undo timeout
    const undoTimeout = historyState.getUndoTimeout();
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Restore the suggestion to its previous status
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === lastAction.id
          ? { ...s, status: lastAction.previousStatus }
          : s
      ),
    }));

    // Clear undo state in history store
    historyState.clearUndoState();
  },

  // Bulk actions
  selectOne: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.add(id);
      return { selectedIds: newSet };
    }),
    
  deselectOne: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.delete(id);
      return { selectedIds: newSet };
    }),
    
  toggleSelect: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    }),
    
  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.suggestions.filter(s => s.status === 'pending').map(s => s.id)),
    })),
    
  deselectAll: () => set({ selectedIds: new Set() }),
  
  acceptSelected: () =>
    set((state) => {
      const pendingIds = Array.from(state.selectedIds);
      // Dispatch events for each selected suggestion
      pendingIds.forEach(id => {
        const suggestion = state.suggestions.find(s => s.id === id);
        if (suggestion && suggestion.status === 'pending') {
          if (typeof window !== 'undefined') {
            if (suggestion.type === 'time-scale') {
              window.dispatchEvent(new CustomEvent('accept-time-scale', { 
                detail: { id, data: suggestion.data } 
              }));
            } else if (suggestion.type === 'interval-boundary') {
              window.dispatchEvent(new CustomEvent('accept-interval-boundary', { 
                detail: { id, data: suggestion.data } 
              }));
            }
          }
        }
      });
      
      return {
        suggestions: state.suggestions.map(s =>
          state.selectedIds.has(s.id) && s.status === 'pending'
            ? { ...s, status: 'accepted' as const }
            : s
        ),
        selectedIds: new Set(),
      };
    }),
    
  rejectSelected: () =>
    set((state) => ({
      suggestions: state.suggestions.map(s =>
        state.selectedIds.has(s.id) && s.status === 'pending'
          ? { ...s, status: 'rejected' as const }
          : s
      ),
      selectedIds: new Set(),
    })),

  setPanelOpen: (open) => set({ isPanelOpen: open }),

  setActiveSuggestion: (id) => set({ activeSuggestionId: id }),

  setHoveredSuggestion: (id: string | null) => set({ hoveredSuggestionId: id }),

  clearSuggestions: () => {
    // Clear undo timeout from history store
    const historyState = useSuggestionHistoryStore.getState();
    const timeoutId = historyState.getUndoTimeout();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    historyState.clearUndoState();
    historyState.clearHistory();

    set({
      suggestions: [],
      activeSuggestionId: null,
      isEmptyState: false,
      generationError: null,
      selectedIds: new Set(),
      comparisonIds: [null, null],
      fullAutoProposalSets: [],
      selectedFullAutoSetId: null,
      recommendedFullAutoSetId: null,
      fullAutoLowConfidenceReason: null,
      fullAutoNoResultReason: null,
      hasFullAutoLowConfidence: false,
    });
  },

  clearPendingSuggestions: () => {
    // Clear undo timeout from history store
    const historyState = useSuggestionHistoryStore.getState();
    const timeoutId = historyState.getUndoTimeout();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    historyState.clearUndoState();

    set((state) => {
      const acceptedSuggestions = state.suggestions.filter((suggestion) => suggestion.status === 'accepted');
      const activeSuggestionStillVisible =
        state.activeSuggestionId !== null && acceptedSuggestions.some((suggestion) => suggestion.id === state.activeSuggestionId);

      return {
        suggestions: acceptedSuggestions,
        activeSuggestionId: activeSuggestionStillVisible ? state.activeSuggestionId : null,
        isEmptyState: false,
        generationError: null,
        selectedIds: new Set(),
        comparisonIds: [null, null] as [null, null],
        fullAutoProposalSets: [],
        selectedFullAutoSetId: null,
        recommendedFullAutoSetId: null,
        fullAutoLowConfidenceReason: null,
        fullAutoNoResultReason: null,
        hasFullAutoLowConfidence: false,
      };
    });
  },

  setEmptyState: (empty) => set({ isEmptyState: empty }),

  setWarpCount: (count) => {
    usePresetStore.getState().setActivePreset(null);
    return set({ warpCount: Math.max(0, Math.min(6, count)) });
  },

  setIntervalCount: (count) => {
    usePresetStore.getState().setActivePreset(null);
    return set({ intervalCount: Math.max(0, Math.min(6, count)) });
  },

  setSnapToUnit: (value) => {
    usePresetStore.getState().setActivePreset(null);
    return set({ snapToUnit: value });
  },

  setBoundaryMethod: (value) => {
    usePresetStore.getState().setActivePreset(null);
    return set({ boundaryMethod: value });
  },
  
  setMinConfidence: (minConfidence) => set({ minConfidence: Math.max(0, Math.min(100, minConfidence)) }),

  setGenerationError: (message) => set({ generationError: message }),

  setContextMode: (mode) => set({ contextMode: mode }),

  setFullAutoProposalResults: (result) =>
    set(() => {
      if (!result) {
        return {
          fullAutoProposalSets: [],
          selectedFullAutoSetId: null,
          recommendedFullAutoSetId: null,
          fullAutoLowConfidenceReason: null,
          fullAutoNoResultReason: null,
          hasFullAutoLowConfidence: false,
        };
      }

      const lowConfidenceReasonFromSets =
        result.sets.find((set) => Boolean(set.reasonMetadata?.lowConfidenceReason))?.reasonMetadata
          ?.lowConfidenceReason ?? null;
      const hasLowConfidence =
        Boolean(result.reasonMetadata?.lowConfidenceReason) || lowConfidenceReasonFromSets !== null;

      return {
        fullAutoProposalSets: result.sets,
        selectedFullAutoSetId: result.recommendedId,
        recommendedFullAutoSetId: result.recommendedId,
        fullAutoLowConfidenceReason:
          result.reasonMetadata?.lowConfidenceReason ?? lowConfidenceReasonFromSets,
        fullAutoNoResultReason: result.reasonMetadata?.noResultReason ?? null,
        hasFullAutoLowConfidence: hasLowConfidence,
      };
    }),

  selectFullAutoProposalSet: (id) =>
    set((state) => {
      if (id === null) {
        return { selectedFullAutoSetId: null };
      }

      const exists = state.fullAutoProposalSets.some((set) => set.id === id);
      return {
        selectedFullAutoSetId: exists ? id : state.selectedFullAutoSetId,
      };
    }),

  clearFullAutoProposalSets: () =>
    set({
      fullAutoProposalSets: [],
      selectedFullAutoSetId: null,
      recommendedFullAutoSetId: null,
      fullAutoLowConfidenceReason: null,
      fullAutoNoResultReason: null,
      hasFullAutoLowConfidence: false,
    }),

  // Comparison actions
  setComparisonId: (index, id) =>
    set((state) => {
      const newComparison = [...state.comparisonIds] as [string | null, string | null];
      // If adding an ID, check if it's already in the other slot
      if (id !== null) {
        const otherIndex = index === 0 ? 1 : 0;
        if (newComparison[otherIndex] === id) {
          // Already in other slot, swap them
          newComparison[otherIndex] = newComparison[index];
        }
      }
      newComparison[index] = id;
      return { comparisonIds: newComparison };
    }),
    
  clearComparison: () => set({ comparisonIds: [null, null] }),
  
  // History actions
  addToHistory: (suggestion) =>
    set((state) => ({
      acceptedHistory: [
        {
          id: crypto.randomUUID(),
          suggestion,
          acceptedAt: Date.now(),
          contextMetadata: suggestion.contextMetadata,
        },
        ...state.acceptedHistory,
      ].slice(0, 50), // Keep max 50 entries
    })),
    
  reapplyFromHistory: (historyId) => {
    const entry = useSuggestionHistoryStore.getState().reapplyFromHistory(historyId);
    if (!entry) return;

    if (typeof window !== 'undefined') {
      if (entry.suggestion.type === 'time-scale') {
        window.dispatchEvent(
          new CustomEvent('accept-time-scale', {
            detail: { id: entry.suggestion.id, data: entry.suggestion.data },
          })
        );
      } else if (entry.suggestion.type === 'interval-boundary') {
        window.dispatchEvent(
          new CustomEvent('accept-interval-boundary', {
            detail: { id: entry.suggestion.id, data: entry.suggestion.data },
          })
        );
      }
    }

    const replayed: HistoryEntry = {
      id: crypto.randomUUID(),
      suggestion: { ...entry.suggestion, createdAt: Date.now(), status: 'accepted' },
      acceptedAt: Date.now(),
      contextMetadata: entry.contextMetadata,
    };

    useSuggestionHistoryStore.getState().addToHistory(replayed);
  },
}));
