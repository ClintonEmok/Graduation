import { useSliceDomainStore } from './useSliceDomainStore';

const noNewRootGuard = <T>(store: T): T => store;

export const useSliceSelectionStore = noNewRootGuard(useSliceDomainStore);
