import { useMemo } from 'react';
import { buildDemoBurstWindowsFromSelection } from './demo-burst-generation';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';

export function useDemoBurstWindows(selectionRange?: [number, number] | null) {
  const densityMap = useDashboardDemoCoordinationStore((state) => state.densityMap);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const burstThreshold = useDashboardDemoCoordinationStore((state) => state.burstThreshold);

  return useMemo(
    () =>
      buildDemoBurstWindowsFromSelection({
        densityMap,
        burstThreshold,
        mapDomain,
        selectionRange,
      }),
    [burstThreshold, densityMap, mapDomain, selectionRange]
  );
}
