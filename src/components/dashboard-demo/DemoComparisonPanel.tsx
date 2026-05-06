"use client";

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSliceStats } from '@/hooks/useSliceStats';
import { compareAdjacentSlices } from '@/lib/stkde/adjacent-slice-comparison';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceStore } from '@/store/useSliceStore';

const formatCount = (value: number) => value.toLocaleString();

export function DemoComparisonPanel() {
  const comparisonSliceIds = useDashboardDemoCoordinationStore((state) => state.comparisonSliceIds);
  const leftSlice = useSliceStore((state) => state.slices.find((slice) => slice.id === comparisonSliceIds.left) ?? null);
  const rightSlice = useSliceStore((state) => state.slices.find((slice) => slice.id === comparisonSliceIds.right) ?? null);

  const leftStats = useSliceStats(comparisonSliceIds.left);
  const rightStats = useSliceStats(comparisonSliceIds.right);

  const comparison = useMemo(
    () => compareAdjacentSlices(
      comparisonSliceIds.left && leftStats.totalCount >= 0
        ? {
            sliceId: comparisonSliceIds.left,
            totalCount: leftStats.totalCount,
            typeCounts: leftStats.typeCounts,
            districtCounts: leftStats.districtCounts,
          }
        : null,
      comparisonSliceIds.right && rightStats.totalCount >= 0
        ? {
            sliceId: comparisonSliceIds.right,
            totalCount: rightStats.totalCount,
            typeCounts: rightStats.typeCounts,
            districtCounts: rightStats.districtCounts,
          }
        : null
    ),
    [comparisonSliceIds.left, comparisonSliceIds.right, leftStats, rightStats]
  );

  if (!comparisonSliceIds.left || !comparisonSliceIds.right) {
    return (
      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Compare slices</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pick a left and right slice to compare their density, dominant type, and hotspot shifts.
        </CardContent>
      </Card>
    );
  }

  const leftLabel = leftSlice?.name?.trim() || leftSlice?.id || comparison.left.sliceId || 'Left slice';
  const rightLabel = rightSlice?.name?.trim() || rightSlice?.id || comparison.right.sliceId || 'Right slice';

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Compare slices</CardTitle>
          <Badge variant="outline" className="rounded-full">
            {comparison.densityRatio.toFixed(2)}x density
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <div className="uppercase tracking-[0.2em]">Left</div>
            <div className="mt-1 font-medium text-foreground">{leftLabel}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <div className="uppercase tracking-[0.2em]">Right</div>
            <div className="mt-1 font-medium text-foreground">{rightLabel}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="countDelta" value={comparison.countDelta} />
          <Metric label="densityRatio" value={comparison.densityRatio.toFixed(2)} />
          <Metric label="dominantTypeShift" value={comparison.dominantTypeShift.shift} />
          <Metric label="hotspotDelta" value={comparison.hotspotDelta.delta} />
        </div>

        <div className="rounded-md border border-border/60 bg-muted/10 p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">District overlap</div>
          <div className="mt-2 text-sm font-medium text-foreground">
            {Math.round(comparison.districtOverlap.ratio * 100)}% shared
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {comparison.districtOverlap.shared.length > 0
              ? comparison.districtOverlap.shared.join(', ')
              : 'No overlapping districts yet.'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <SliceSummary title="Left slice" totalCount={leftStats.totalCount} dominantType={comparison.left.dominantType} dominantDistrict={comparison.left.dominantDistrict} />
          <SliceSummary title="Right slice" totalCount={rightStats.totalCount} dominantType={comparison.right.dominantType} dominantDistrict={comparison.right.dominantDistrict} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{typeof value === 'number' ? formatCount(value) : value}</div>
    </div>
  );
}

function SliceSummary({
  title,
  totalCount,
  dominantType,
  dominantDistrict,
}: {
  title: string;
  totalCount: number;
  dominantType: string | null;
  dominantDistrict: string | null;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background p-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{formatCount(totalCount)}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">Type: {dominantType ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">District: {dominantDistrict ?? '—'}</div>
    </div>
  );
}
