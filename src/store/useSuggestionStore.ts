import { create } from 'zustand';
import { getCurrentContext, type ContextMode } from '@/hooks/useContextExtractor';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useContextProfileStore } from '@/store/useContextProfileStore';
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

const PRESETS_STORAGE_KEY = 'timeslicing-generation-presets-v1';

type UndoAction = {
  id: string;
  type: 'accept' | 'reject';
  previousStatus: SuggestionStatus;
};

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
  
  // Presets state
  presets: GenerationPreset[];
  activePresetId: string | null;

  // Undo state
  lastAction: UndoAction | null;
  undoTimeout: ReturnType<typeof setTimeout> | null;
  showUndoToast: boolean;

  // Comparison state (max 2 suggestions)
  comparisonIds: [string | null, string | null];
  
  // History state
  acceptedHistory: HistoryEntry[];

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
  
  // Preset actions
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  setActivePreset: (id: string | null) => void;
  loadPreset: (preset: GenerationPreset) => void;
  
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
  loadPresetsFromStorage: () => void;

  // Full-auto package actions
  setFullAutoProposalResults: (result: RankedAutoProposalSets | null) => void;
  selectFullAutoProposalSet: (id: string | null) => void;
  clearFullAutoProposalSets: () => void;
  
  // Comparison actions
  setComparisonId: (index: 0 | 1, id: string | null) => void;
  clearComparison: () => void;
  
  // History actions
  addToHistory: (suggestion: Suggestion) => void;
  clearHistory: () => void;
  reapplyFromHistory: (historyId: string) => void;
}

function persistPresets(presets: GenerationPreset[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function readStoredPresets(): GenerationPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as GenerationPreset[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (preset) =>
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        typeof preset.warpCount === 'number' &&
        typeof preset.intervalCount === 'number' &&
        (preset.snapToUnit === 'none' || preset.snapToUnit === 'hour' || preset.snapToUnit === 'day') &&
        (preset.boundaryMethod === 'peak' ||
          preset.boundaryMethod === 'change-point' ||
          preset.boundaryMethod === 'rule-based')
    );
  } catch {
    return [];
  }
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

  // Presets
  presets: [],
  activePresetId: null,

  // Undo state
  lastAction: null,
  undoTimeout: null,
  showUndoToast: false,

  // Comparison state
  comparisonIds: [null, null],
  
  // History state
  acceptedHistory: [],

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
      
      // Clear any existing undo timeout
      if (state.undoTimeout) {
        clearTimeout(state.undoTimeout);
      }

      // Set up undo timeout (5 seconds)
      const undoTimeout = setTimeout(() => {
        set({ showUndoToast: false, lastAction: null, undoTimeout: null });
      }, 5000);

      // When accepting pending suggestions, trigger slice creation via custom event.
      if (suggestion.status === 'pending' && suggestion.type === 'time-scale') {
        // Dispatch custom event for warp slice creation
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-time-scale', { 
            detail: { id, data: suggestion.data } 
          }));
        }
      } else if (suggestion.status === 'pending' && suggestion.type === 'interval-boundary') {
        // Dispatch custom event for time slice creation
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accept-interval-boundary', { 
            detail: { id, data: suggestion.data } 
          }));
        }
      }

      // Add to history
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

      return {
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'accepted' as const } : s
        ),
        selectedIds: (() => {
          const next = new Set(state.selectedIds);
          next.delete(id);
          return next;
        })(),
        acceptedHistory: [historyEntry, ...state.acceptedHistory].slice(0, 50),
        lastAction: { id, type: 'accept', previousStatus },
        undoTimeout,
        showUndoToast: true,
      };
    }),

  rejectSuggestion: (id) =>
    set((state) => {
      const suggestion = state.suggestions.find((s) => s.id === id);
      if (!suggestion || suggestion.status === 'rejected') {
        return state;
      }

      const previousStatus = suggestion.status;
      
      // Clear any existing undo timeout
      if (state.undoTimeout) {
        clearTimeout(state.undoTimeout);
      }

      // Set up undo timeout (5 seconds)
      const undoTimeout = setTimeout(() => {
        set({ showUndoToast: false, lastAction: null, undoTimeout: null });
      }, 5000);

      return {
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, status: 'rejected' as const } : s
        ),
        selectedIds: (() => {
          const next = new Set(state.selectedIds);
          next.delete(id);
          return next;
        })(),
        lastAction: { id, type: 'reject', previousStatus },
        undoTimeout,
        showUndoToast: true,
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
    const state = get();
    if (!state.lastAction) return;
    
    // Clear the undo timeout
    if (state.undoTimeout) {
      clearTimeout(state.undoTimeout);
    }

    // Restore the suggestion to its previous status
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === state.lastAction!.id 
          ? { ...s, status: state.lastAction!.previousStatus } 
          : s
      ),
      lastAction: null,
      undoTimeout: null,
      showUndoToast: false,
    }));
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
  
  // Preset actions
  savePreset: (name) =>
    set((state) => {
      const preset: GenerationPreset = {
        id: crypto.randomUUID(),
        name,
        warpCount: state.warpCount,
        intervalCount: state.intervalCount,
        snapToUnit: state.snapToUnit,
        boundaryMethod: state.boundaryMethod,
      };
      const presets = [...state.presets, preset];
      persistPresets(presets);
      return { presets, activePresetId: preset.id };
    }),
    
  deletePreset: (id) =>
    set((state) => {
      const presets = state.presets.filter((p) => p.id !== id);
      persistPresets(presets);
      return {
        presets,
        activePresetId: state.activePresetId === id ? null : state.activePresetId,
      };
    }),
    
  setActivePreset: (id) => set({ activePresetId: id }),
  
  loadPreset: (preset) =>
    set({
      warpCount: preset.warpCount,
      intervalCount: preset.intervalCount,
      snapToUnit: preset.snapToUnit,
      boundaryMethod: preset.boundaryMethod,
      activePresetId: preset.id,
    }),

  loadPresetsFromStorage: () => {
    const presets = readStoredPresets();
    if (presets.length > 0) {
      set({ presets });
    }
  },

  setPanelOpen: (open) => set({ isPanelOpen: open }),

  setActiveSuggestion: (id) => set({ activeSuggestionId: id }),

  setHoveredSuggestion: (id: string | null) => set({ hoveredSuggestionId: id }),

  clearSuggestions: () => {
    const timeoutId = get().undoTimeout;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    set({
      suggestions: [],
      activeSuggestionId: null,
      isEmptyState: false,
      generationError: null,
      selectedIds: new Set(),
      comparisonIds: [null, null],
      showUndoToast: false,
      lastAction: null,
      undoTimeout: null,
      fullAutoProposalSets: [],
      selectedFullAutoSetId: null,
      recommendedFullAutoSetId: null,
      fullAutoLowConfidenceReason: null,
      fullAutoNoResultReason: null,
      hasFullAutoLowConfidence: false,
    });
  },

  clearPendingSuggestions: () => {
    const timeoutId = get().undoTimeout;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

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
        showUndoToast: false,
        lastAction: null,
        undoTimeout: null,
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
  
  setWarpCount: (count) => set({ warpCount: Math.max(0, Math.min(6, count)), activePresetId: null }),
  
  setIntervalCount: (count) =>
    set({ intervalCount: Math.max(0, Math.min(6, count)), activePresetId: null }),

  setSnapToUnit: (value) => set({ snapToUnit: value, activePresetId: null }),

  setBoundaryMethod: (value) => set({ boundaryMethod: value, activePresetId: null }),
  
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
    
  clearHistory: () => set({ acceptedHistory: [] }),
  
  reapplyFromHistory: (historyId) =>
    set((state) => {
      const entry = state.acceptedHistory.find((h) => h.id === historyId);
      if (!entry) return state;

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

      return {
        acceptedHistory: [replayed, ...state.acceptedHistory].slice(0, 50),
      };
    }),
}));
