import React from 'react';
import { Slider } from "@/components/ui/slider";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AdaptiveControls({ className }: { className?: string }) {
  const warpFactor = useAdaptiveStore((s) => s.warpFactor);
  const setWarpFactor = useAdaptiveStore((s) => s.setWarpFactor);

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
    </div>
  );
}
