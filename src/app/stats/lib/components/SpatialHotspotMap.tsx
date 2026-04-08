'use client';

import React, { useRef, useState, useMemo } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import MapBase from '@/components/map/MapBase';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point, Polygon } from 'geojson';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';
import { useStatsStore } from '@/store/useStatsStore';
import { getDistrictDisplayName } from '../stats-view-model';
import type { CrimeRecord } from '@/types/crime';

const MAX_POINTS = 10000;

const CHICAGO_DISTRICT_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  '1': { minLat: 41.88, maxLat: 41.92, minLon: -87.68, maxLon: -87.62 },
  '2': { minLat: 41.85, maxLat: 41.91, minLon: -87.70, maxLon: -87.63 },
  '3': { minLat: 41.80, maxLat: 41.87, minLon: -87.67, maxLon: -87.59 },
  '4': { minLat: 41.79, maxLat: 41.85, minLon: -87.58, maxLon: -87.52 },
  '5': { minLat: 41.73, maxLat: 41.82, minLon: -87.68, maxLon: -87.55 },
  '6': { minLat: 41.73, maxLat: 41.80, minLon: -87.77, maxLon: -87.62 },
  '7': { minLat: 41.73, maxLat: 41.79, minLon: -87.80, maxLon: -87.68 },
  '8': { minLat: 41.72, maxLat: 41.77, minLon: -87.75, maxLon: -87.65 },
  '9': { minLat: 41.78, maxLat: 41.85, minLon: -87.68, maxLon: -87.59 },
  '10': { minLat: 41.68, maxLat: 41.77, minLon: -87.72, maxLon: -87.59 },
  '11': { minLat: 41.65, maxLat: 41.73, minLon: -87.75, maxLon: -87.63 },
  '12': { minLat: 41.67, maxLat: 41.74, minLon: -87.68, maxLon: -87.57 },
  '14': { minLat: 41.89, maxLat: 41.95, minLon: -87.67, maxLon: -87.58 },
  '15': { minLat: 41.65, maxLat: 41.73, minLon: -87.77, maxLon: -87.67 },
  '16': { minLat: 41.60, maxLat: 41.68, minLon: -87.78, maxLon: -87.65 },
  '17': { minLat: 41.88, maxLat: 41.96, minLon: -87.75, maxLon: -87.62 },
  '18': { minLat: 41.87, maxLat: 41.96, minLon: -87.82, maxLon: -87.72 },
  '19': { minLat: 41.78, maxLat: 41.87, minLon: -87.76, maxLon: -87.65 },
  '20': { minLat: 41.72, maxLat: 41.79, minLon: -87.77, maxLon: -87.68 },
  '21': { minLat: 41.65, maxLat: 41.73, minLon: -87.68, maxLon: -87.55 },
  '22': { minLat: 41.60, maxLat: 41.69, minLon: -87.72, maxLon: -87.58 },
  '23': { minLat: 41.57, maxLat: 41.66, minLon: -87.78, maxLon: -87.62 },
  '24': { minLat: 41.50, maxLat: 41.60, minLon: -87.75, maxLon: -87.55 },
  '25': { minLat: 41.65, maxLat: 41.76, minLon: -87.58, maxLon: -87.45 },
};

export function SpatialHotspotMap() {
  const mapRef = useRef<MapRef>(null);
  const { crimes, stats, isLoading, isFetching, error } = useNeighborhoodStats();
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const timeRange = useStatsStore((s) => s.timeRange);
  const [viewMode, setViewMode] = useState<'heatmap' | 'points'>('heatmap');

  const geoJsonData = useMemo((): FeatureCollection<Point> => {
    if (!crimes || crimes.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = crimes
      .filter((crime): crime is CrimeRecord & { lat: number; lon: number } => 
        typeof crime.lat === 'number' && typeof crime.lon === 'number' &&
        !isNaN(crime.lat) && !isNaN(crime.lon)
      )
      .slice(0, MAX_POINTS)
      .map((crime) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [crime.lon, crime.lat],
        },
        properties: {
          type: crime.type,
          district: crime.district,
        },
      }));

    return { type: 'FeatureCollection', features };
  }, [crimes]);

  const pointCount = geoJsonData.features.length;

  const districtBoundaries = useMemo((): FeatureCollection<Polygon> => {
    const features = selectedDistricts
      .filter((d) => CHICAGO_DISTRICT_BOUNDS[d])
      .map((district) => {
        const b = CHICAGO_DISTRICT_BOUNDS[district];
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[
              [b.minLon, b.minLat],
              [b.maxLon, b.minLat],
              [b.maxLon, b.maxLat],
              [b.minLon, b.maxLat],
              [b.minLon, b.minLat],
            ]],
          },
          properties: {
            district,
            name: getDistrictDisplayName(district),
          },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [selectedDistricts]);

  const { bounds, dateRange } = useMemo(() => {
    if (selectedDistricts.length === 0) {
      return { bounds: null, dateRange: '' };
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    for (const district of selectedDistricts) {
      const bounds = CHICAGO_DISTRICT_BOUNDS[district];
      if (bounds) {
        minLat = Math.min(minLat, bounds.minLat);
        maxLat = Math.max(maxLat, bounds.maxLat);
        minLon = Math.min(minLon, bounds.minLon);
        maxLon = Math.max(maxLon, bounds.maxLon);
      }
    }

    if (minLat === Infinity) {
      return { bounds: null, dateRange: '' };
    }

    const boundsStr = `${minLat.toFixed(3)},${maxLat.toFixed(3)},${minLon.toFixed(3)},${maxLon.toFixed(3)}`;
    
    const startDate = new Date(timeRange.startEpoch * 1000).toLocaleDateString();
    const endDate = new Date(timeRange.endEpoch * 1000).toLocaleDateString();
    const dateRangeStr = `${startDate} - ${endDate}`;

    return { bounds: boundsStr, dateRange: dateRangeStr };
  }, [selectedDistricts, timeRange]);

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
          <Source id="district-boundaries" type="geojson" data={districtBoundaries}>
            <Layer
              id="district-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  'rgba(59, 130, 246, 0.3)',
                  'rgba(59, 130, 246, 0.1)',
                ],
              }}
            />
            <Layer
              id="district-outline"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.8,
              }}
            />
            <Layer
              id="district-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center',
              }}
              paint={{
                'text-color': '#94a3b8',
                'text-halo-color': '#0f172a',
                'text-halo-width': 1,
              }}
            />
          </Source>
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
                  'circle-radius': 4,
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

        <div className="absolute bottom-2 right-2 bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-400 space-y-1">
          <div>{pointCount.toLocaleString()} points</div>
          {dateRange && <div className="text-slate-500">{dateRange}</div>}
          {bounds && <div className="text-slate-500 font-mono">{bounds}</div>}
        </div>
      </div>
    </div>
  );
}
