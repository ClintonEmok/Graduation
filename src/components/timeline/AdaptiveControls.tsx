import React from 'react';
import { Slider } from "@/components/ui/slider";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AdaptiveControls({ className }: { className?: string }) {
  const warpFactor = useAdaptiveStore((s) => s.warpFactor);
  const setWarpFactor = useAdaptiveStore((s) => s.setWarpFactor);
  const burstMetric = useAdaptiveStore((s) => s.burstMetric);
  const setBurstMetric = useAdaptiveStore((s) => s.setBurstMetric);
  const burstThreshold = useAdaptiveStore((s) => s.burstThreshold);
  const setBurstThreshold = useAdaptiveStore((s) => s.setBurstThreshold);

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
        <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Adaptive Warp</Label>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(warpFactor * 100)}%</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[warpFactor]}
          onValueChange={(vals) => setWarpFactor(vals[0])}
          className="w-full"
        />
        <p className="text-[10px] text-muted-foreground">
            Distort time to highlight dense clusters of events.
        </p>

        <div className="flex justify-between items-center pt-2">
            <Label className="text-sm font-medium">Burst Metric</Label>
        </div>
        <select
          value={burstMetric}
          onChange={(event) => setBurstMetric(event.target.value as typeof burstMetric)}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
        >
          <option value="density">Density</option>
          <option value="burstiness">Inter-arrival Burstiness</option>
        </select>
        <p className="text-[10px] text-muted-foreground">
            Choose how bursts are detected.
        </p>

        <div className="flex justify-between items-center pt-2">
            <Label className="text-sm font-medium">Burst Percentile</Label>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(burstThreshold * 100)}%</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[burstThreshold]}
          onValueChange={(vals) => setBurstThreshold(vals[0])}
          className="w-full"
        />
        <p className="text-[10px] text-muted-foreground">
            Highlights points in the top percentile for the selected metric.
        </p>
    </div>
  );
}
