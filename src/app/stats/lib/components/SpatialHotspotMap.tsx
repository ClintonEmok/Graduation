'use client';

import React, { useRef, useState, useCallback } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import MapBase from '@/components/map/MapBase';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';
import { useStatsStore } from '@/store/useStatsStore';

export function SpatialHotspotMap() {
  const mapRef = useRef<MapRef>(null);
  const { stats, isLoading, isFetching, error } = useNeighborhoodStats();
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const [viewMode, setViewMode] = useState<'heatmap' | 'points'>('heatmap');

  const handleClick = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 500,
    });
  }, []);

  if (isLoading || isFetching) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Spatial Distribution</h3>
        <div className="relative h-[300px] rounded-lg overflow-hidden bg-slate-800/50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
              <span className="text-sm text-slate-400">Loading map...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Spatial Distribution</h3>
        <div className="flex items-center justify-center h-[300px] rounded-lg bg-slate-800/50">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Map unavailable</p>
            <p className="text-xs text-slate-500">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedDistricts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Spatial Distribution</h3>
        <div className="flex items-center justify-center h-[300px] rounded-lg bg-slate-800/50">
          <p className="text-sm text-slate-500">Select districts to see hotspots</p>
        </div>
      </div>
    );
  }

  if (!stats || !stats.byDistrict || stats.byDistrict.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Spatial Distribution</h3>
        <div className="flex items-center justify-center h-[300px] rounded-lg bg-slate-800/50">
          <p className="text-sm text-slate-500">No crime data for selected districts</p>
        </div>
      </div>
    );
  }

  const geoJsonData: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: [],
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Spatial Distribution</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setViewMode('points')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'points'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Points
          </button>
        </div>
      </div>

      <div className="relative h-[300px] rounded-lg overflow-hidden">
        <MapBase
          ref={mapRef}
          dragPan={true}
        >
          <Source id="crime-points" type="geojson" data={geoJsonData}>
            {viewMode === 'heatmap' ? (
              <Layer
                id="crime-heatmap"
                type="heatmap"
                paint={{
                  'heatmap-weight': 1,
                  'heatmap-intensity': 1,
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 15,
                    12, 25,
                    15, 40,
                  ],
                  'heatmap-opacity': 0.7,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0, 0, 0, 0)',
                    0.2, 'rgba(59, 130, 246, 0.4)',
                    0.4, 'rgba(16, 185, 129, 0.5)',
                    0.6, 'rgba(234, 179, 8, 0.6)',
                    0.8, 'rgba(249, 115, 22, 0.7)',
                    1, 'rgba(239, 68, 68, 0.8)',
                  ],
                }}
              />
            ) : (
              <Layer
                id="crime-points"
                type="circle"
                paint={{
                  'circle-radius': 5,
                  'circle-color': '#3b82f6',
                  'circle-opacity': 0.7,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-opacity': 0.5,
                }}
              />
            )}
          </Source>
        </MapBase>

        <div className="absolute bottom-2 right-2 bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-400">
          {stats.byDistrict.length} districts
        </div>
      </div>
    </div>
  );
}
