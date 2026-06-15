import { useMemo } from 'react';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import {
  buildHotspotEvolution,
  type HotspotEvolutionResult,
} from '@/lib/hotspot-evolution';

export function useHotspotEvolution(): HotspotEvolutionResult {
  const stkdeResponse = useDashboardDemoCoordinationStore((s) => s.stkdeResponse);

  return useMemo(() => {
    if (!stkdeResponse) {
      return { tracks: [], totalDisplacementKm: 0, sliceCount: 0, hasMultiSlice: false };
    }
    return buildHotspotEvolution(stkdeResponse.sliceResults);
  }, [stkdeResponse]);
}
