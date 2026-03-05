import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useCubeSpatialConstraintsStore } from '@/store/useCubeSpatialConstraintsStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useIntervalProposalStore } from '@/store/useIntervalProposalStore';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceSelectionStore } from '@/store/useSliceSelectionStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpProposalStore } from '@/store/useWarpProposalStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';

export async function resetSandboxState(): Promise<void> {
  useFilterStore.getState().resetFilters();

  useSliceStore.getState().clearSlices();
  useWarpSliceStore.getState().clearSlices();
  useIntervalProposalStore.getState().clear();
  useWarpProposalStore.getState().clear();
  useSliceSelectionStore.getState().clearSelection();
  useSliceCreationStore.getState().cancelCreation();
  useSliceAdjustmentStore.getState().endDrag();

  const coordination = useCoordinationStore.getState();
  coordination.clearSelection();
  coordination.setBrushRange(null);
  coordination.clearSelectedBurstWindows();

  useTimeStore.getState().setTimeScaleMode('linear');
  useAdaptiveStore.getState().resetSandboxDefaults();
  useCubeSpatialConstraintsStore.getState().clearActiveConstraint();

  await useDataStore.getState().loadRealData();
}
