import React from 'react';
import { Slider } from "@/components/ui/slider";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { Label } from "@/components/ui/label";

export function AdaptiveControls() {
  const warpFactor = useAdaptiveStore((s) => s.warpFactor);
  const setWarpFactor = useAdaptiveStore((s) => s.setWarpFactor);

  return (
    <div className="flex items-center gap-4 w-64 p-2 bg-background/80 rounded-md border shadow-sm backdrop-blur-sm pointer-events-auto">
      <div className="grid gap-1.5 w-full">
        <div className="flex justify-between items-center">
            <Label htmlFor="warp-factor" className="text-xs font-medium">
            Adaptive Warp
            </Label>
            <span className="text-xs text-muted-foreground">{Math.round(warpFactor * 100)}%</span>
        </div>
        <Slider
          id="warp-factor"
          min={0}
          max={1}
          step={0.01}
          value={[warpFactor]}
          onValueChange={(vals) => setWarpFactor(vals[0])}
          className="w-full"
        />
      </div>
    </div>
  );
}
