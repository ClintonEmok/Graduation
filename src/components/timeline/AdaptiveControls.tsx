import React from 'react';
import { Slider } from "@/components/ui/slider";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AdaptiveControls({ className }: { className?: string }) {
  const warpFactor = useAdaptiveStore((s) => s.warpFactor);
  const setWarpFactor = useAdaptiveStore((s) => s.setWarpFactor);
  const densityScope = useAdaptiveStore((s) => s.densityScope);
  const setDensityScope = useAdaptiveStore((s) => s.setDensityScope);
  const burstMetric = useAdaptiveStore((s) => s.burstMetric);
  const setBurstMetric = useAdaptiveStore((s) => s.setBurstMetric);
  const [draftWarpFactor, setDraftWarpFactor] = React.useState<number | null>(null);
  const [isPreviewingWarp, setIsPreviewingWarp] = React.useState(false);

  const displayedWarpFactor = draftWarpFactor ?? warpFactor;
  const displayedWarpPercent = Math.round(displayedWarpFactor * 100);
  const previewWarpPercent = displayedWarpPercent;

  const handleWarpChange = (values: number[]) => {
    const next = values[0];
    if (!Number.isFinite(next)) {
      return;
    }
    setDraftWarpFactor(next);
    setIsPreviewingWarp(true);
  };

  const handleWarpCommit = (values: number[]) => {
    const next = values[0];
    if (!Number.isFinite(next)) {
      setDraftWarpFactor(null);
      setIsPreviewingWarp(false);
      return;
    }
    setWarpFactor(next);
    setDraftWarpFactor(null);
    setIsPreviewingWarp(false);
  };

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
        <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Adaptive Warp</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{displayedWarpPercent}%</span>
              {isPreviewingWarp ? (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  previewing...
                </span>
              ) : null}
            </div>
        </div>
        <Slider
          min={0}
          max={5}
          step={0.01}
          value={[displayedWarpFactor]}
          onValueChange={handleWarpChange}
          onValueCommit={handleWarpCommit}
          className="w-full"
        />
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Axis distortion preview</span>
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500/70 transition-[width] duration-75"
              style={{ width: `${previewWarpPercent}%` }}
            />
          </div>
          <span className="font-mono">{previewWarpPercent}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
            Distort time to highlight dense clusters of events.
        </p>

        <div className="flex justify-between items-center pt-2">
            <Label className="text-sm font-medium">Density Scope</Label>
        </div>
        <select
          value={densityScope}
          onChange={(event) => setDensityScope(event.target.value as typeof densityScope)}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="w-full rounded-md border bg-background px-2 py-1 text-xs"
        >
          <option value="viewport">Viewport (live brush range)</option>
          <option value="global">Global (full dataset baseline)</option>
        </select>
        <p className="text-[10px] text-muted-foreground">
            Choose whether adaptive density uses current viewport or all loaded data.
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
          <option value="burstiness">Inter-arrival Burstiness</option>
          <option value="density">Density</option>
        </select>
        <p className="text-[10px] text-muted-foreground">
            Burstiness is the default signal; density stays available as the fallback.
        </p>
    </div>
  );
}
