import { useSliceDomainStore } from './useSliceDomainStore';

export type { SliceAdjustmentState, TooltipPayload } from './useSliceDomainStore';

const noNewRootGuard = <T>(store: T): T => store;

export const useSliceAdjustmentStore = noNewRootGuard(useSliceDomainStore);
