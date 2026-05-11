"use client";

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import type { TimeslicingMode } from '@/store/useDashboardDemoTimeslicingModeStore';

export function DemoConfigurePanel() {
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoWarpStore((state) => state.setWarpFactor);
  const mode = useDashboardDemoTimeslicingModeStore((state) => state.mode);
  const setMode = useDashboardDemoTimeslicingModeStore((state) => state.setMode);
  const autoConfig = useDashboardDemoTimeslicingModeStore((state) => state.autoConfig);
  const setAutoConfig = useDashboardDemoTimeslicingModeStore((state) => state.setAutoConfig);

  const handleWarpChange = useCallback((value: number[]) => {
    setWarpFactor(value[0] ?? 1);
  }, [setWarpFactor]);

  const handleModeToggle = useCallback((checked: boolean) => {
    setMode(checked ? 'auto' : 'manual' as TimeslicingMode);
  }, [setMode]);

  const isAuto = mode === 'auto';

  const handleThresholdChange = useCallback((value: number[]) => {
    setAutoConfig({ burstThreshold: value[0] ?? 0.5 });
  }, [setAutoConfig]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Configure</CardTitle>
          <CardDescription className="text-xs">
            Adjust time scaling and binning behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-mode-toggle" className="text-xs">
                Auto slice generation
              </Label>
              <Switch
                id="auto-mode-toggle"
                checked={isAuto}
                onCheckedChange={handleModeToggle}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isAuto
                ? 'Slices are generated automatically from burst detection'
                : 'Manual slice creation and editing'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="threshold-slider" className="text-xs">
                Burst threshold
              </Label>
              <span className="text-xs text-muted-foreground">
                {autoConfig.burstThreshold.toFixed(2)}
              </span>
            </div>
            <Slider
              id="threshold-slider"
              min={0}
              max={1}
              step={0.05}
              value={[autoConfig.burstThreshold]}
              onValueChange={handleThresholdChange}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Quiet</span>
              <span>Bursty</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="warp-slider" className="text-xs">
                Warp factor
              </Label>
              <span className="text-xs text-muted-foreground">
                {warpFactor.toFixed(1)}x
              </span>
            </div>
            <Slider
              id="warp-slider"
              min={0}
              max={3}
              step={0.1}
              value={[warpFactor]}
              onValueChange={handleWarpChange}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Linear</span>
              <span>Aggressive</span>
            </div>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/50 px-3 py-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Slice Allocation
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isAuto
                ? 'Slices are distributed proportionally to burstiness scores. Bursty bins receive more slices (finer temporal resolution).'
                : 'Manual mode — create and edit slices directly.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
