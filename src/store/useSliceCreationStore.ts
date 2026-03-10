import { useSliceDomainStore } from './useSliceDomainStore';

export type {
  CreationMode,
  SliceCreationState,
  TimeSlice,
} from './useSliceDomainStore';
export type { GhostPosition, PreviewFeedback } from './slice-domain/types';

const noNewRootGuard = <T>(store: T): T => store;

export const useSliceCreationStore = noNewRootGuard(useSliceDomainStore);
