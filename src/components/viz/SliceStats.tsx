'use client';

import { useSliceStats } from '@/hooks/useSliceStats';
import { Skeleton } from '@/components/ui/skeleton';

interface SliceStatsProps {
  sliceId: string;
}

export function SliceStats({ sliceId }: SliceStatsProps) {
  const { typeCounts, districtCounts, totalCount, isLoading } = useSliceStats(sliceId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No events found in this slice.
      </div>
    );
  }

  const sortedTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5

  const sortedDistricts = Object.entries(districtCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5

  const maxType = sortedTypes[0]?.[1] || 1;
  const maxDistrict = sortedDistricts[0]?.[1] || 1;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Total Events</h3>
        <p className="text-2xl font-bold">{totalCount}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Top Crime Types</h3>
        <div className="space-y-2">
          {sortedTypes.map(([type, count]) => (
            <div key={type} className="text-xs">
              <div className="flex justify-between mb-1">
                <span className="truncate pr-2">{type}</span>
                <span>{count}</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${(count / maxType) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Top Districts</h3>
        <div className="space-y-2">
          {sortedDistricts.map(([district, count]) => (
            <div key={district} className="text-xs">
              <div className="flex justify-between mb-1">
                <span className="truncate pr-2">{district}</span>
                <span>{count}</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-2" 
                  style={{ width: `${(count / maxDistrict) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
