import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useClusterStore } from '@/store/useClusterStore';

export function MapClusterHighlights() {
  const { clusters, enabled, selectedClusterId } = useClusterStore();

  const geoJson = useMemo(() => {
    if (!enabled || !clusters || clusters.length === 0) return null;

    const features = clusters.map((cluster) => {
      const isSelected = cluster.id === selectedClusterId;
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [cluster.minLon, cluster.minLat],
              [cluster.maxLon, cluster.minLat],
              [cluster.maxLon, cluster.maxLat],
              [cluster.minLon, cluster.maxLat],
              [cluster.minLon, cluster.minLat]
            ]
          ]
        },
        properties: {
          id: cluster.id,
          isSelected,
          color: cluster.color,
          count: cluster.count,
          dominantType: cluster.dominantType
        }
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [clusters, enabled, selectedClusterId]);

  if (!geoJson) return null;

  return (
    <Source id="cluster-highlights" type="geojson" data={geoJson}>
      <Layer
        id="cluster-highlight-fill"
        type="fill"
        paint={{
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['get', 'isSelected'],
            0.3,
            0.05
          ]
        }}
      />
      <Layer
        id="cluster-highlight-outline"
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['get', 'isSelected'],
            3,
            1
          ],
          'line-opacity': 0.8
        }}
      />
    </Source>
  );
}
