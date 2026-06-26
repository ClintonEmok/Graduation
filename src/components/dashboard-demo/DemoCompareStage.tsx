'use client';

import { ComparisonKdeHeatmap } from '@/components/dashboard-demo/ComparisonKdeHeatmap';
import { useDemoCompareData } from './lib/useDemoCompareData';

export function DemoCompareStage() {
  const {
    leftSlice,
    rightSlice,
    leftKde,
    rightKde,
    leftIsLoading,
    rightIsLoading,
  } = useDemoCompareData();

  return (
    <div className="flex h-full w-full items-stretch justify-center gap-6 bg-slate-950 p-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <ComparisonKdeHeatmap
          kde={leftKde}
          label={leftSlice ? `${leftSlice.label} (left)` : 'Left KDE'}
          crimeCount={leftSlice?.crimeCount ?? 0}
          colorScheme="blue"
          isLoading={leftIsLoading}
          size={420}
        />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <ComparisonKdeHeatmap
          kde={rightKde}
          label={rightSlice ? `${rightSlice.label} (right)` : 'Right KDE'}
          crimeCount={rightSlice?.crimeCount ?? 0}
          colorScheme="orange"
          isLoading={rightIsLoading}
          size={420}
        />
      </div>
    </div>
  );
}
