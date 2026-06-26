import { useMemo } from 'react';
import { buildDemoBurstWindowsFromSelection } from './demo-burst-generation';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';

// Burst detection cutoff is a fixed demo constant. A density bin is
// classified as bursty when its normalized value is >= 70% of the max.
// Not exposed to the UI; the previous store field was dead state.
const DEMO_BURST_CUTOFF = 0.7;

export function useDemoBurstWindows(selectionRange?: [number, number] | null) {
  const densityMap = useDashboardDemoCoordinationStore((state) => state.densityMap);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);

  return useMemo(
    () =>
      buildDemoBurstWindowsFromSelection({
        densityMap,
        burstThreshold: DEMO_BURST_CUTOFF,
        mapDomain,
        selectionRange,
      }),
    [densityMap, mapDomain, selectionRange]
  );
}
