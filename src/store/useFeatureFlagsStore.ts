import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultFlags } from '@/lib/feature-flags';

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  pendingFlags: Record<string, boolean> | null;
  
  // Direct flag access
  isEnabled: (flagId: string) => boolean;
  
  // Batch edit operations (for Settings panel)
  startEditing: () => void;
  setPendingFlag: (id: string, enabled: boolean) => void;
  applyPendingFlags: () => void;
  discardPendingFlags: () => void;
  
  // Utilities
  resetToDefaults: () => void;
  applyURLFlags: (urlFlags: Record<string, boolean>) => void;
  hasPendingChanges: () => boolean;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: getDefaultFlags(),
      pendingFlags: null,
      
      isEnabled: (flagId) => {
        const { flags, pendingFlags } = get();
        // During editing, show pending value if exists
        if (pendingFlags !== null && flagId in pendingFlags) {
          return pendingFlags[flagId];
        }
        return flags[flagId] ?? false;
      },
      
      startEditing: () => {
        set({ pendingFlags: { ...get().flags } });
      },
      
      setPendingFlag: (id, enabled) => {
        const { pendingFlags } = get();
        if (pendingFlags === null) return;
        set({ pendingFlags: { ...pendingFlags, [id]: enabled } });
      },
      
      applyPendingFlags: () => {
        const { pendingFlags } = get();
        if (pendingFlags === null) return;
        set({ flags: pendingFlags, pendingFlags: null });
      },
      
      discardPendingFlags: () => {
        set({ pendingFlags: null });
      },
      
      resetToDefaults: () => {
        set({ flags: getDefaultFlags(), pendingFlags: null });
      },
      
      applyURLFlags: (urlFlags) => {
        set((state) => ({
          flags: { ...state.flags, ...urlFlags },
        }));
      },
      
      hasPendingChanges: () => {
        const { flags, pendingFlags } = get();
        if (pendingFlags === null) return false;
        return Object.keys(pendingFlags).some(
          (key) => pendingFlags[key] !== flags[key]
        );
      },
    }),
    {
      name: 'feature-flags-v1',
      partialize: (state) => ({ flags: state.flags }), // Only persist flags, not pending
    }
  )
);
