import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSliceAdjustmentSlice } from './slice-domain/createSliceAdjustmentSlice';
import { createSliceCoreSlice } from './slice-domain/createSliceCoreSlice';
import { createSliceCreationSlice } from './slice-domain/createSliceCreationSlice';
import { createSliceSelectionSlice } from './slice-domain/createSliceSelectionSlice';
import type { SliceDomainState } from './slice-domain/types';

export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    {
      name: 'slice-domain-v1',
      partialize: (state) => ({ slices: state.slices }),
    }
  )
);

export type {
  CreationMode,
  SliceAdjustmentState,
  SliceCoreState,
  SliceCreationState,
  SliceDomainState,
  SliceSelectionState,
  TimeSlice,
  TooltipPayload,
} from './slice-domain/types';
