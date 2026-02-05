'use client';

import { getCrimeTypeName, getDistrictName } from '@/lib/category-maps';
import { useDataStore } from '@/store/useDataStore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PointInspectorProps {
  pointId: string;
}

export function PointInspector({ pointId }: PointInspectorProps) {
  const { data, columns } = useDataStore();

  const point = useMemo(() => {
    // If using columnar data, assume pointId is the index
    if (columns) {
        const index = parseInt(pointId, 10);
        if (isNaN(index) || index < 0 || index >= columns.length) return null;
        
        const { timestamp, type, district, block } = columns;
        
        return {
            timestamp: timestamp[index], // normalized
            type: getCrimeTypeName(type[index]),
            district: getDistrictName(district[index]),
            block: block ? block[index] : 'Unknown',
        };
    }
    
    return data.find(p => p.id === pointId);
  }, [pointId, data, columns]);

  if (!point) {
      return (
          <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
          </div>
      );
  }

  return (
    <div className="p-4 border-t bg-muted/10">
      <h3 className="text-sm font-semibold mb-2">Selected Event</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type:</span>
          <span>{point.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">District:</span>
          <span>{point.district}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Block:</span>
          <span className="truncate max-w-[150px]">{point.block}</span>
        </div>
      </div>
    </div>
  );
}
