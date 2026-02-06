import React from 'react';
import { Slider } from "@/components/ui/slider";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";

export function AdaptiveControls() {
  const warpFactor = useAdaptiveStore((s) => s.warpFactor);
  const setWarpFactor = useAdaptiveStore((s) => s.setWarpFactor);

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Warp Factor</span>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[warpFactor]}
          onValueChange={(vals) => setWarpFactor(vals[0])}
          className="w-24"
        />
        <span className="text-xs font-mono w-9 text-right">{Math.round(warpFactor * 100)}%</span>
    </div>
  );
}
