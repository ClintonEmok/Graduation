import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceSelectionStore } from '@/store/useSliceSelectionStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';

export async function resetSandboxState(): Promise<void> {
  useFilterStore.getState().resetFilters();

  useSliceStore.getState().clearSlices();
  useWarpSliceStore.getState().clearSlices();
  useSliceSelectionStore.getState().clearSelection();
  useSliceCreationStore.getState().cancelCreation();
  useSliceAdjustmentStore.getState().endDrag();

  const coordination = useCoordinationStore.getState();
  coordination.clearSelection();
  coordination.setBrushRange(null);
  coordination.clearSelectedBurstWindows();

  useTimeStore.getState().setTimeScaleMode('linear');
  useAdaptiveStore.getState().resetSandboxDefaults();

  await useDataStore.getState().loadRealData();
}
