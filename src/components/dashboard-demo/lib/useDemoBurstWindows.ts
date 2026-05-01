import { useMemo } from 'react';
import { buildDemoBurstWindowsFromSelection } from './demo-burst-generation';
import { useDashboardDemoAdaptiveStore } from '@/store/useDashboardDemoAdaptiveStore';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';

export function useDemoBurstWindows(selectionRange?: [number, number] | null) {
  const densityMap = useDashboardDemoWarpStore((state) => state.densityMap);
  const mapDomain = useDashboardDemoWarpStore((state) => state.mapDomain);
  const burstThreshold = useDashboardDemoAdaptiveStore((state) => state.burstThreshold);

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
