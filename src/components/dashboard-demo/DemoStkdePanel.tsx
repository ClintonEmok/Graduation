"use client";

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDemoStkde } from '@/components/dashboard-demo/lib/useDemoStkde';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { getDistrictDisplayName } from '@/app/stats/lib/stats-view-model';

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

const toRadiusDegrees = (lat: number, radiusMeters: number) => {
  const latDelta = radiusMeters / 111_320;
  const lonDelta = radiusMeters / Math.max(1, 111_320 * Math.cos((lat * Math.PI) / 180));
  return { latDelta, lonDelta };
};

export function DemoStkdePanel() {
  const {
    rows,
    summaryLabel,
    heatmapCellCount,
    isLoading,
    error,
    response,
    refresh,
    setSelectedHotspot,
    setHoveredHotspot,
    setStkdeParams,
    setScopeMode,
  } = useDemoStkde();

  const scopeMode = useDashboardDemoAnalysisStore((state) => state.stkdeScopeMode);
  const params = useDashboardDemoAnalysisStore((state) => state.stkdeParams);
  const selectedHotspotId = useDashboardDemoAnalysisStore((state) => state.selectedHotspotId);
  const hoveredHotspotId = useDashboardDemoAnalysisStore((state) => state.hoveredHotspotId);
  const setSpatialFilter = useDashboardDemoAnalysisStore((state) => state.setSpatialFilter);
  const setTemporalFilter = useDashboardDemoAnalysisStore((state) => state.setTemporalFilter);
  const selectedDistricts = useDashboardDemoAnalysisStore((state) => state.selectedDistricts);

  const selectedDistrictLabels = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map((district) => getDistrictDisplayName(district)) : ['All districts']),
    [selectedDistricts]
  );

  const activePreset = useMemo(
    () =>
      STKDE_PRESETS.find(
        (preset) =>
          preset.scopeMode === scopeMode &&
          preset.params.spatialBandwidthMeters === params.spatialBandwidthMeters &&
          preset.params.temporalBandwidthHours === params.temporalBandwidthHours &&
          preset.params.gridCellMeters === params.gridCellMeters &&
          preset.params.topK === params.topK &&
          preset.params.minSupport === params.minSupport &&
          preset.params.timeWindowHours === params.timeWindowHours
      ) ?? null,
    [params, scopeMode]
  );

  const applyPreset = (preset: DemoStkdePreset) => {
    setScopeMode(preset.scopeMode);
    setStkdeParams(preset.params);
  };

  return (
    <Card className="border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardHeader className="gap-2 px-4 pb-3 pt-4">
        <CardTitle className="text-xs uppercase tracking-[0.26em] text-muted-foreground">STKDE Rail</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Balanced hotspot surface for the selected district context.
        </CardDescription>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">District context: {selectedDistrictLabels.join(', ')}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 pb-4">
        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-100">
                {STKDE_SCOPE_LABELS[scopeMode]}
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={refresh} className="gap-2">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
            <div className="text-muted-foreground">{summaryLabel}</div>
            <div className="text-muted-foreground">{heatmapCellCount.toLocaleString()} heatmap cells</div>
            {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">{error}</div> : null}
            {isLoading ? <div className="text-muted-foreground">Computing hotspot surface…</div> : null}
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Presets</span>
              <span>{activePreset ? `Active: ${activePreset.label}` : 'Preset-driven controls'}</span>
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
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-2 p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scopeMode === 'applied-slices' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setScopeMode('applied-slices')}
              >
                Applied slices
              </Button>
              <Button
                type="button"
                variant={scopeMode === 'full-viewport' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setScopeMode('full-viewport')}
              >
                Full viewport
              </Button>
            </div>
            <p className="text-muted-foreground">Parameters are preset-only in the demo rail.</p>
          </CardContent>
        </Card>

        <Card className="p-0 shadow-none">
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">District hotspots</h3>
              <span className="text-[11px] text-muted-foreground">Top matches</span>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                No hotspots found for the current district context. Try Refresh or a wider preset.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((row, index) => {
                  const selected = row.id === selectedHotspotId;
                  const hovered = row.id === hoveredHotspotId;

                  return (
                    <li key={row.id}>
                      <Button
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        className={`h-auto w-full flex-col items-start justify-start gap-1 rounded-lg px-3 py-2 text-left ${
                          hovered && !selected ? 'border-muted-foreground/60' : ''
                        }`}
                        onMouseEnter={() => setHoveredHotspot(row.id)}
                        onMouseLeave={() => setHoveredHotspot(null)}
                        onFocus={() => setHoveredHotspot(row.id)}
                        onBlur={() => setHoveredHotspot(null)}
                        onClick={() => {
                          setSelectedHotspot(row.id);
                          const { latDelta, lonDelta } = toRadiusDegrees(row.centroid[1], row.radiusMeters);
                          setSpatialFilter({
                            minLng: row.centroid[0] - lonDelta,
                            maxLng: row.centroid[0] + lonDelta,
                            minLat: row.centroid[1] - latDelta,
                            maxLat: row.centroid[1] + latDelta,
                          });

                          const selectedHotspot = response?.hotspots.find((hotspot) => hotspot.id === row.id);
                          if (selectedHotspot) {
                            setTemporalFilter({
                              startEpochSec: selectedHotspot.peakStartEpochSec,
                              endEpochSec: selectedHotspot.peakEndEpochSec,
                            });
                          }
                        }}
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">District cluster {index + 1}</span>
                          <span className="text-[11px] text-muted-foreground">{row.supportLabel} support</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Place context: {selectedDistrictLabels.join(', ')}</span>
                          <span>Shared hotspot surface</span>
                        </div>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
