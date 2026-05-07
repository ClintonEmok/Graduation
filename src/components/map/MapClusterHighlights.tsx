import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useClusterStore } from '@/store/useClusterStore';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';

export function MapClusterHighlights() {
  const { clusters, selectedClusterId } = useClusterStore();
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme].categoryColors;

  const resolveClusterColor = (dominantType: string) =>
    palette[dominantType.toUpperCase()] || palette[dominantType] || '#8b5cf6';

  const geoJson = useMemo(() => {
    if (!clusters || clusters.length === 0) return null;

    const features = clusters.map((cluster) => {
      const isSelected = cluster.id === selectedClusterId;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
          coordinates: [
            [
              [cluster.bounds.minLon, cluster.bounds.minLat],
              [cluster.bounds.maxLon, cluster.bounds.minLat],
              [cluster.bounds.maxLon, cluster.bounds.maxLat],
              [cluster.bounds.minLon, cluster.bounds.maxLat],
              [cluster.bounds.minLon, cluster.bounds.minLat]
            ]
          ]
          },
          properties: {
            id: cluster.id,
            isSelected,
            color: resolveClusterColor(cluster.dominantType),
            count: cluster.count,
            dominantType: cluster.dominantType
          }
        };
    });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [clusters, selectedClusterId]);

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
            0.2,
            0.03
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
            4,
            2
          ],
          'line-opacity': 0.9
        }}
      />
    </Source>
  );
}
