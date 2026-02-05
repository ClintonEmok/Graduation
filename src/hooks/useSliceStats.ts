import { useMemo } from 'react';
import { useSliceStore } from '@/store/useSliceStore';
import { useDataStore } from '@/store/useDataStore';
import { getCrimeTypeName, getDistrictName } from '@/lib/category-maps';

export interface SliceStats {
  typeCounts: Record<string, number>;
  districtCounts: Record<string, number>;
  totalCount: number;
  isLoading: boolean;
}

export function useSliceStats(sliceId: string | null): SliceStats {
  const slice = useSliceStore((s) => s.slices.find((sl) => sl.id === sliceId));
  const { columns, isLoading: isDataLoading } = useDataStore();

  return useMemo(() => {
    if (!sliceId || !slice || !columns || isDataLoading) {
      return {
        typeCounts: {},
        districtCounts: {},
        totalCount: 0,
        isLoading: isDataLoading,
      };
    }

    const { timestamp, type, district, length } = columns;
    const typeCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};
    let totalCount = 0;

    let startT: number;
    let endT: number;

    if (slice.type === 'point') {
      // Point slice logic: define a small epsilon
      const width = 2; // Arbitrary small width for point context in 0-100 scale
      startT = slice.time - width / 2;
      endT = slice.time + width / 2;
    } else {
      // Range slice
      startT = slice.range ? slice.range[0] : 0;
      endT = slice.range ? slice.range[1] : 100;
    }

    // Iterate efficiently
    for (let i = 0; i < length; i++) {
      const t = timestamp[i];
      if (t >= startT && t <= endT) {
        const typeName = getCrimeTypeName(type[i]);
        const districtName = getDistrictName(district[i]);

        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        districtCounts[districtName] = (districtCounts[districtName] || 0) + 1;
        totalCount++;
      }
    }

    return {
      typeCounts,
      districtCounts,
      totalCount,
      isLoading: false,
    };
  }, [sliceId, slice, columns, isDataLoading]);
}
