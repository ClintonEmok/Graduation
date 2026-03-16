"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import MapBase from '@/components/map/MapBase';
import { MapStkdeHeatmapLayer } from '@/components/map/MapStkdeHeatmapLayer';
import { HotspotPanel } from './HotspotPanel';
import { DEFAULT_STKDE_BBOX, resolveStkdeQueryState, serializeStkdeQueryState, type StkdeQueryState } from './stkde-query-state';
import { buildStkdeViewModel, type StkdeHotspotRowModel } from './stkde-view-model';
import type { StkdeResponse } from '@/lib/stkde/contracts';
import { useStkdeStore } from '@/store/useStkdeStore';

const toRadiusDegrees = (lat: number, radiusMeters: number) => {
  const latDelta = radiusMeters / 111_320;
  const lonDelta = radiusMeters / Math.max(1, 111_320 * Math.cos((lat * Math.PI) / 180));
  return { latDelta, lonDelta };
};

const distanceSq = (a: [number, number], b: [number, number]) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

export function StkdeRouteShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapRef = useRef<MapRef>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const selectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const hoveredHotspotId = useStkdeStore((state) => state.hoveredHotspotId);
  const setSelectedHotspot = useStkdeStore((state) => state.setSelectedHotspot);
  const setHoveredHotspot = useStkdeStore((state) => state.setHoveredHotspot);
  const setSpatialFilter = useStkdeStore((state) => state.setSpatialFilter);
  const setTemporalFilter = useStkdeStore((state) => state.setTemporalFilter);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<StkdeResponse | null>(null);

  const queryState = useMemo(() => resolveStkdeQueryState(searchParams), [searchParams]);
  const viewModel = useMemo(() => buildStkdeViewModel(queryState, response), [queryState, response]);

  const selectedRow = useMemo(
    () => viewModel.rows.find((row) => row.id === selectedHotspotId) ?? null,
    [selectedHotspotId, viewModel.rows],
  );

  const runStkde = async (state: StkdeQueryState) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetch('/api/stkde/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          domain: {
            startEpochSec: state.startEpochSec,
            endEpochSec: state.endEpochSec,
          },
          filters: {
            bbox: DEFAULT_STKDE_BBOX,
          },
          params: {
            spatialBandwidthMeters: state.spatialBandwidthMeters,
            temporalBandwidthHours: state.temporalBandwidthHours,
            gridCellMeters: state.gridCellMeters,
            topK: state.topK,
            minSupport: state.minSupport,
            timeWindowHours: state.timeWindowHours,
          },
          limits: {
            maxEvents: 50000,
            maxGridCells: 12000,
          },
        }),
      });

      if (!result.ok) {
        const body = await result.json().catch(() => ({ error: `HTTP ${result.status}` }));
        throw new Error(body.error ?? `STKDE request failed (${result.status})`);
      }

      const data = (await result.json()) as StkdeResponse;
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResponse(data);
    } catch (runError) {
      if (controller.signal.aborted) return;
      setError(runError instanceof Error ? runError.message : 'Failed to run STKDE');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    runStkde(queryState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const setStateAndSyncUrl = (patch: Partial<StkdeQueryState>) => {
    const nextState = { ...queryState, ...patch };
    const nextParams = serializeStkdeQueryState(searchParams, nextState);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    void runStkde(nextState);
  };

  const selectHotspot = (row: StkdeHotspotRowModel) => {
    setSelectedHotspot(row.id);
    const { latDelta, lonDelta } = toRadiusDegrees(row.centroid[1], row.radiusMeters);
    setSpatialFilter({
      minLng: row.centroid[0] - lonDelta,
      maxLng: row.centroid[0] + lonDelta,
      minLat: row.centroid[1] - latDelta,
      maxLat: row.centroid[1] + latDelta,
    });

    const source = response?.hotspots.find((hotspot) => hotspot.id === row.id);
    if (source) {
      setTemporalFilter({
        startEpochSec: source.peakStartEpochSec,
        endEpochSec: source.peakEndEpochSec,
      });
    }

    mapRef.current?.flyTo({ center: row.centroid, zoom: 12.5, duration: 450 });
  };

  const findNearestRow = (event: MapLayerMouseEvent) => {
    const target: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    let nearest: StkdeHotspotRowModel | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const row of viewModel.rows) {
      const d = distanceSq(target, row.centroid);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = row;
      }
    }
    if (!nearest) return null;
    return nearestDistance < 0.02 ? nearest : null;
  };

  const handleMapHover = (event: MapLayerMouseEvent) => {
    const nearest = findNearestRow(event);
    setHoveredHotspot(nearest?.id ?? null);
  };

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const nearest = findNearestRow(event);
    if (!nearest) return;
    selectHotspot(nearest);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12" data-testid="stkde-route-shell">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">STKDE QA Route</h1>
          <p className="max-w-4xl text-sm text-slate-300">
            Dedicated spatiotemporal kernel density exploration route. Isolated from /timeslicing and /timeslicing-algos suggestion workflows.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            <label className="text-xs text-slate-300">Start
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.startEpochSec} onChange={(event) => setStateAndSyncUrl({ startEpochSec: Number(event.target.value) || queryState.startEpochSec })} />
            </label>
            <label className="text-xs text-slate-300">End
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.endEpochSec} onChange={(event) => setStateAndSyncUrl({ endEpochSec: Number(event.target.value) || queryState.endEpochSec })} />
            </label>
            <label className="text-xs text-slate-300">Spatial BW (m)
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.spatialBandwidthMeters} onChange={(event) => setStateAndSyncUrl({ spatialBandwidthMeters: Number(event.target.value) || queryState.spatialBandwidthMeters })} />
            </label>
            <label className="text-xs text-slate-300">Temporal BW (h)
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.temporalBandwidthHours} onChange={(event) => setStateAndSyncUrl({ temporalBandwidthHours: Number(event.target.value) || queryState.temporalBandwidthHours })} />
            </label>
            <label className="text-xs text-slate-300">Cell (m)
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.gridCellMeters} onChange={(event) => setStateAndSyncUrl({ gridCellMeters: Number(event.target.value) || queryState.gridCellMeters })} />
            </label>
            <label className="text-xs text-slate-300">Top K
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.topK} onChange={(event) => setStateAndSyncUrl({ topK: Number(event.target.value) || queryState.topK })} />
            </label>
            <label className="text-xs text-slate-300">Min support
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.minSupport} onChange={(event) => setStateAndSyncUrl({ minSupport: Number(event.target.value) || queryState.minSupport })} />
            </label>
            <label className="text-xs text-slate-300">Window (h)
              <input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" value={queryState.timeWindowHours} onChange={(event) => setStateAndSyncUrl({ timeWindowHours: Number(event.target.value) || queryState.timeWindowHours })} />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
            <button className="rounded border border-indigo-500/70 bg-indigo-500/20 px-3 py-1.5 text-indigo-100" type="button" onClick={() => void runStkde(queryState)}>
              Run STKDE
            </button>
            <span data-testid="stkde-summary-label">{viewModel.summaryLabel}</span>
            {isLoading ? <span className="text-amber-300">computing...</span> : null}
            {error ? <span className="text-rose-300">{error}</span> : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="relative h-[620px] overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/50">
            <MapBase
              ref={mapRef}
              onMouseMove={handleMapHover}
              onMouseLeave={() => setHoveredHotspot(null)}
              onClick={handleMapClick}
            >
              <MapStkdeHeatmapLayer
                cells={response?.heatmap.cells ?? []}
                activeHotspotId={selectedHotspotId}
                activeHotspotCentroid={selectedRow?.centroid ?? null}
              />
            </MapBase>
          </div>

          <HotspotPanel
            rows={viewModel.rows}
            selectedHotspotId={selectedHotspotId}
            hoveredHotspotId={hoveredHotspotId}
            onSelectHotspot={selectHotspot}
            onHoverHotspot={setHoveredHotspot}
          />
        </section>
      </div>
    </main>
  );
}
