"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import type { TimeSlice } from '@/store/useSliceDomainStore';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatMsDate(timestampMs: number): string {
  return DATE_FORMATTER.format(new Date(timestampMs));
}

function getSliceLabel(slice: TimeSlice): string {
  return slice.name || slice.notes || `Slice ${slice.id.slice(0, 6)}`;
}

function getSliceStartMs(slice: TimeSlice): number | null {
  if (slice.startDateTimeMs != null) return slice.startDateTimeMs;
  if (slice.range) return slice.range[0];
  return null;
}

function getSliceEndMs(slice: TimeSlice): number | null {
  if (slice.endDateTimeMs != null) return slice.endDateTimeMs;
  if (slice.range) return slice.range[1];
  return null;
}

export function DemoInspectPanel() {
  const slices = useSliceDomainStore((state) => state.slices);

  const sortedSlices = useMemo(() => {
    return [...slices].sort((a, b) => {
      const aMs = getSliceStartMs(a) ?? 0;
      const bMs = getSliceStartMs(b) ?? 0;
      return aMs - bMs;
    });
  }, [slices]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inspect Slices</CardTitle>
          <CardDescription className="text-xs">
            {sortedSlices.length} active slice{sortedSlices.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedSlices.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No active slices. Generate and apply drafts in the Detect tab.
            </p>
          ) : (
            sortedSlices.map((slice) => {
              const startMs = getSliceStartMs(slice);
              const endMs = getSliceEndMs(slice);
              return (
                <div
                  key={slice.id}
                  className="rounded-md border border-border/70 bg-background px-3 py-2 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {getSliceLabel(slice)}
                    </span>
                    {slice.warpWeight !== undefined && slice.warpWeight !== 1 && (
                      <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                        warp {slice.warpWeight.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 text-muted-foreground">
                    {startMs != null && (
                      <div className="flex justify-between">
                        <span>Start</span>
                        <span>{formatMsDate(startMs)}</span>
                      </div>
                    )}
                    {endMs != null && (
                      <div className="flex justify-between">
                        <span>End</span>
                        <span>{formatMsDate(endMs)}</span>
                      </div>
                    )}
                    {slice.source && (
                      <div className="flex justify-between">
                        <span>Source</span>
                        <span className="capitalize">{slice.source}</span>
                      </div>
                    )}
                    {slice.burstScore != null && (
                      <div className="flex justify-between">
                        <span>Burst</span>
                        <span>{(slice.burstScore * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
