import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useDataStore } from '@/store/useDataStore';
import { FeatureCollection, LineString } from 'geojson';

export const MapTrajectoryLayer: React.FC = () => {
  const selectedBlock = useTrajectoryStore((state) => state.selectedBlock);
  const isVisible = useTrajectoryStore((state) => state.isVisible);
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);

  const geojson = useMemo<FeatureCollection<LineString> | null>(() => {
    if (!selectedBlock || !isVisible) return null;

    let points: { lat: number; lon: number }[] = [];

    if (columns && columns.lat && columns.lon) {
      for (let i = 0; i < columns.length; i++) {
        if (columns.block[i] === selectedBlock) {
          points.push({ lat: columns.lat[i], lon: columns.lon[i] });
        }
      }
    } else {
      points = data
        .filter(p => p.block === selectedBlock)
        .map(p => ({ lat: p.lat, lon: p.lon }));
    }

    if (points.length < 2) return null;

    // Sort by something if needed? In this project points are usually chronologically sorted in store.
    // If not, we might need timestamps.

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points.map(p => [p.lon, p.lat])
          }
        }
      ]
    };
  }, [selectedBlock, isVisible, columns, data]);

  if (!geojson) return null;

  return (
    <Source type="geojson" data={geojson}>
      <Layer
        id="trajectory-path"
        type="line"
        paint={{
          'line-color': '#60a5fa', // blue-400
          'line-width': 4,
          'line-opacity': 0.8
        }}
      />
      <Layer
        id="trajectory-points"
        type="circle"
        paint={{
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#60a5fa'
        }}
      />
    </Source>
  );
};
