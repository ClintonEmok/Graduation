"use client";

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { DemoStkdePanel } from '@/components/dashboard-demo/DemoStkdePanel';
import type { TimeslicingMode } from '@/store/useDashboardDemoTimeslicingModeStore';

const STKDE_SCOPE_LABELS = {
  'applied-slices': 'Applied slices',
  'full-viewport': 'Full viewport',
} as const;

type DemoStkdePreset = {
  id: string;
  label: string;
  description: string;
  scopeMode: 'applied-slices' | 'full-viewport';
  params: {
    spatialBandwidthMeters: number;
    temporalBandwidthHours: number;
    gridCellMeters: number;
    topK: number;
    minSupport: number;
    timeWindowHours: number;
  };
};

const STKDE_PRESETS: DemoStkdePreset[] = [
  {
    id: 'focus',
    label: 'Focus',
    description: 'Tighter hotspot hunt for applied slices.',
    scopeMode: 'applied-slices',
    params: {
      spatialBandwidthMeters: 450,
      temporalBandwidthHours: 12,
      gridCellMeters: 250,
      topK: 8,
      minSupport: 3,
      timeWindowHours: 12,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default demo scan with steady coverage.',
    scopeMode: 'applied-slices',
    params: {
      spatialBandwidthMeters: 750,
      temporalBandwidthHours: 24,
      gridCellMeters: 500,
      topK: 12,
      minSupport: 5,
      timeWindowHours: 24,
    },
  },
  {
    id: 'wide',
    label: 'Wide',
    description: 'Broader city sweep for full viewport analysis.',
    scopeMode: 'full-viewport',
    params: {
      spatialBandwidthMeters: 1200,
      temporalBandwidthHours: 48,
      gridCellMeters: 750,
      topK: 20,
      minSupport: 8,
      timeWindowHours: 48,
    },
  },
];

export function DemoConfigurePanel() {
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoWarpStore((state) => state.setWarpFactor);
  const mode = useDashboardDemoTimeslicingModeStore((state) => state.mode);
  const setMode = useDashboardDemoTimeslicingModeStore((state) => state.setMode);
  const autoConfig = useDashboardDemoTimeslicingModeStore((state) => state.autoConfig);
  const setAutoConfig = useDashboardDemoTimeslicingModeStore((state) => state.setAutoConfig);
  const scopeMode = useDashboardDemoAnalysisStore((state) => state.stkdeScopeMode);
  const stkdeParams = useDashboardDemoAnalysisStore((state) => state.stkdeParams);
  const setStkdeScopeMode = useDashboardDemoAnalysisStore((state) => state.setStkdeScopeMode);
  const setStkdeParams = useDashboardDemoAnalysisStore((state) => state.setStkdeParams);

  const activePreset = useMemo(
    () =>
      STKDE_PRESETS.find(
        (preset) =>
          preset.scopeMode === scopeMode &&
          preset.params.spatialBandwidthMeters === stkdeParams.spatialBandwidthMeters &&
          preset.params.temporalBandwidthHours === stkdeParams.temporalBandwidthHours &&
          preset.params.gridCellMeters === stkdeParams.gridCellMeters &&
          preset.params.topK === stkdeParams.topK &&
          preset.params.minSupport === stkdeParams.minSupport &&
          preset.params.timeWindowHours === stkdeParams.timeWindowHours
      ) ?? null,
    [scopeMode, stkdeParams]
  );

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

  const applyPreset = useCallback((preset: DemoStkdePreset) => {
    setStkdeScopeMode(preset.scopeMode);
    setStkdeParams(preset.params);
  }, [setStkdeParams, setStkdeScopeMode]);

  const handleStkdeParamChange = useCallback(
    (key: keyof DemoStkdePreset['params']) => (value: number[]) => {
      const nextValue = value[0] ?? stkdeParams[key];
      setStkdeParams({ [key]: nextValue } as Partial<typeof stkdeParams>);
    },
    [setStkdeParams, stkdeParams]
  );

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">STKDE</CardTitle>
          <CardDescription className="text-xs">
            Tune hotspot scope, grid resolution, and ranking behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-xs">Scope mode</Label>
                <p className="text-[10px] text-muted-foreground">Choose how much of the demo feeds STKDE.</p>
              </div>
              <span className="text-xs text-muted-foreground">{STKDE_SCOPE_LABELS[scopeMode]}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scopeMode === 'applied-slices' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setStkdeScopeMode('applied-slices')}
              >
                Applied slices
              </Button>
              <Button
                type="button"
                variant={scopeMode === 'full-viewport' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setStkdeScopeMode('full-viewport')}
              >
                Full viewport
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Presets</span>
              <span>{activePreset ? `Active: ${activePreset.label}` : 'Custom'}</span>
            </div>
            <div className="grid gap-2">
              {STKDE_PRESETS.map((preset) => {
                const isActive = activePreset?.id === preset.id;

                return (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={isActive ? 'secondary' : 'outline'}
                    onClick={() => applyPreset(preset)}
                    className="h-auto flex-col items-start justify-start gap-1 rounded-lg px-3 py-2 text-left"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground">{STKDE_SCOPE_LABELS[preset.scopeMode]}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{preset.description}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {preset.params.spatialBandwidthMeters}m • {preset.params.temporalBandwidthHours}h • {preset.params.gridCellMeters}m • top {preset.params.topK}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="spatial-bandwidth-slider" className="text-xs">
                  Spatial bandwidth
                </Label>
                <span className="text-xs text-muted-foreground">{stkdeParams.spatialBandwidthMeters}m</span>
              </div>
              <Slider
                id="spatial-bandwidth-slider"
                min={100}
                max={5000}
                step={50}
                value={[stkdeParams.spatialBandwidthMeters]}
                onValueChange={handleStkdeParamChange('spatialBandwidthMeters')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temporal-bandwidth-slider" className="text-xs">
                  Temporal bandwidth
                </Label>
                <span className="text-xs text-muted-foreground">{stkdeParams.temporalBandwidthHours}h</span>
              </div>
              <Slider
                id="temporal-bandwidth-slider"
                min={1}
                max={168}
                step={1}
                value={[stkdeParams.temporalBandwidthHours]}
                onValueChange={handleStkdeParamChange('temporalBandwidthHours')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="grid-cell-slider" className="text-xs">
                  Grid cell
                </Label>
                <span className="text-xs text-muted-foreground">{stkdeParams.gridCellMeters}m</span>
              </div>
              <Slider
                id="grid-cell-slider"
                min={100}
                max={5000}
                step={50}
                value={[stkdeParams.gridCellMeters]}
                onValueChange={handleStkdeParamChange('gridCellMeters')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topk-slider" className="text-xs">
                    Top K
                  </Label>
                  <span className="text-xs text-muted-foreground">{stkdeParams.topK}</span>
                </div>
                <Slider
                  id="topk-slider"
                  min={1}
                  max={100}
                  step={1}
                  value={[stkdeParams.topK]}
                  onValueChange={handleStkdeParamChange('topK')}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="min-support-slider" className="text-xs">
                    Min support
                  </Label>
                  <span className="text-xs text-muted-foreground">{stkdeParams.minSupport}</span>
                </div>
                <Slider
                  id="min-support-slider"
                  min={1}
                  max={1000}
                  step={1}
                  value={[stkdeParams.minSupport]}
                  onValueChange={handleStkdeParamChange('minSupport')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="time-window-slider" className="text-xs">
                  Time window
                </Label>
                <span className="text-xs text-muted-foreground">{stkdeParams.timeWindowHours}h</span>
              </div>
              <Slider
                id="time-window-slider"
                min={1}
                max={168}
                step={1}
                value={[stkdeParams.timeWindowHours]}
                onValueChange={handleStkdeParamChange('timeWindowHours')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DemoStkdePanel />
    </div>
  );
}
