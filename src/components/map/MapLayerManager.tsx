"use client";

import React, { useState } from 'react';
import { MapPoiLayer, MapPoiLegend } from './MapPoiLayer';
import { MapDistrictLayer, MapDistrictLegend } from './MapDistrictLayer';

interface MapLayerManagerProps {
  className?: string;
}

interface LayerVisibility {
  poi: boolean;
  districts: boolean;
  stkde: boolean;
  heatmap: boolean;
  clusters: boolean;
  trajectories: boolean;
  events: boolean;
}

interface LayerOpacity {
  poi: number;
  districts: number;
  stkde: number;
  heatmap: number;
}

export function MapLayerManager({ className = '' }: MapLayerManagerProps) {
  const [visibility, setVisibility] = useState<LayerVisibility>({
    poi: true,
    districts: true,
    stkde: false,
    heatmap: false,
    clusters: false,
    trajectories: false,
    events: true,
  });

  const [opacity, setOpacity] = useState<LayerOpacity>({
    poi: 1,
    districts: 0.3,
    stkde: 0.6,
    heatmap: 0.5,
  });

  const [expanded, setExpanded] = useState(false);

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const setLayerOpacity = (layer: keyof LayerOpacity, value: number) => {
    setOpacity(prev => ({ ...prev, [layer]: value }));
  };

  const layers = [
    { id: 'events' as const, label: 'Crime Events', visible: visibility.events, color: '#3b82f6' },
    { id: 'heatmap' as const, label: 'Heatmap', visible: visibility.heatmap, color: '#f97316' },
    { id: 'clusters' as const, label: 'Clusters', visible: visibility.clusters, color: '#8b5cf6' },
    { id: 'stkde' as const, label: 'STKDE Hotspots', visible: visibility.stkde, color: '#ef4444' },
    { id: 'trajectories' as const, label: 'Trajectories', visible: visibility.trajectories, color: '#22c55e' },
    { id: 'districts' as const, label: 'Districts', visible: visibility.districts, color: '#6b7280' },
    { id: 'poi' as const, label: 'POIs', visible: visibility.poi, color: '#14b8a6' },
  ];

  return (
    <div className={`bg-background/80 backdrop-blur-sm rounded-lg border ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">Map Layers</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          {/* Layer Toggles */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Visibility</div>
            {layers.map(layer => (
              <div key={layer.id} className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayer(layer.id)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-xs">{layer.label}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Opacity Controls */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground">Opacity</div>
            
            {(visibility.poi || visibility.districts || visibility.stkde || visibility.heatmap) && (
              <>
                {visibility.poi && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>POIs</span>
                      <span>{Math.round(opacity.poi * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={opacity.poi}
                      onChange={(e) => setLayerOpacity('poi', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                
                {visibility.districts && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Districts</span>
                      <span>{Math.round(opacity.districts * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={opacity.districts}
                      onChange={(e) => setLayerOpacity('districts', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                
                {visibility.stkde && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>STKDE</span>
                      <span>{Math.round(opacity.stkde * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={opacity.stkde}
                      onChange={(e) => setLayerOpacity('stkde', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                
                {visibility.heatmap && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Heatmap</span>
                      <span>{Math.round(opacity.heatmap * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={opacity.heatmap}
                      onChange={(e) => setLayerOpacity('heatmap', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t space-y-2">
            {visibility.poi && <MapPoiLegend />}
            {visibility.districts && <MapDistrictLegend />}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export layer visibility for use in map rendering
 */
export function useLayerVisibility() {
  const [visibility] = useState<LayerVisibility>({
    poi: true,
    districts: true,
    stkde: false,
    heatmap: false,
    clusters: false,
    trajectories: false,
    events: true,
  });

  const [opacity] = useState<LayerOpacity>({
    poi: 1,
    districts: 0.3,
    stkde: 0.6,
    heatmap: 0.5,
  });

  return { visibility, opacity };
}