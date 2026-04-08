import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterContext } from '@/hooks/useContextExtractor';

export interface ContextProfile {
  id: string;
  name: string;
  context: FilterContext;
  createdAt: number;
  isSmart: boolean;
}

interface ContextProfileStore {
  smartProfiles: ContextProfile[];
  customProfiles: ContextProfile[];
  activeProfileId: string | null;
  addCustomProfile: (name: string, context: FilterContext) => ContextProfile | null;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  getActiveProfile: () => ContextProfile | null;
}

const PROFILE_STORAGE_KEY = 'timeslicing-context-profiles-v1';

const SMART_PROFILES: ContextProfile[] = [
  {
    id: 'smart-burglary-focus',
    name: 'Burglary Focus',
    context: {
      crimeTypes: ['Burglary'],
      districts: [],
      timeRange: { start: 978307200, end: 1767571200 },
      isFullDataset: true,
    },
    createdAt: 0,
    isSmart: true,
  },
  {
    id: 'smart-violent-crime',
    name: 'Violent Crime',
    context: {
      crimeTypes: ['Assault', 'Robbery', 'Homicide'],
      districts: [],
      timeRange: { start: 978307200, end: 1767571200 },
      isFullDataset: true,
    },
    createdAt: 0,
    isSmart: true,
  },
  {
    id: 'smart-all-crimes',
    name: 'All Crimes',
    context: {
      crimeTypes: [],
      districts: [],
      timeRange: { start: 978307200, end: 1767571200 },
      isFullDataset: true,
    },
    createdAt: 0,
    isSmart: true,
  },
];

function normalizeProfileName(name: string): string {
  return name.trim();
}

export const useContextProfileStore = create<ContextProfileStore>()(
  persist(
    (set, get) => ({
      smartProfiles: SMART_PROFILES,
      customProfiles: [],
      activeProfileId: null,

      addCustomProfile: (name, context) => {
        const normalizedName = normalizeProfileName(name);
        if (!normalizedName) {
          return null;
        }

        const hasDuplicate = get().customProfiles.some(
          (profile) => profile.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
        );
        if (hasDuplicate) {
          return null;
        }

        const profile: ContextProfile = {
          id: crypto.randomUUID(),
          name: normalizedName,
          context,
          createdAt: Date.now(),
          isSmart: false,
        };

        set((state) => ({
          customProfiles: [...state.customProfiles, profile],
          activeProfileId: profile.id,
        }));

        return profile;
      },

      deleteProfile: (id) => {
        set((state) => ({
          customProfiles: state.customProfiles.filter((profile) => profile.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      getActiveProfile: () => {
        const state = get();
        const allProfiles = [...state.smartProfiles, ...state.customProfiles];
        return allProfiles.find((profile) => profile.id === state.activeProfileId) ?? null;
      },
    }),
    {
      name: PROFILE_STORAGE_KEY,
      partialize: (state) => ({
        customProfiles: state.customProfiles,
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);
