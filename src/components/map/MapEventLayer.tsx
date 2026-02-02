import React, { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { unproject } from '@/lib/projection';

const MAX_POINTS = 20000;

type ScenePoint = {
  x: number;
  z: number;
  index: number;
};

export default function MapEventLayer() {
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  const filteredPoints = useMemo<ScenePoint[]>(() => {
    const points: ScenePoint[] = [];

    if (columns) {
      let minTime = -Infinity;
      let maxTime = Infinity;

      if (selectedTimeRange) {
        const [rangeStart, rangeEnd] = selectedTimeRange;
        if (minTimestampSec !== null && maxTimestampSec !== null) {
          const normalizedStart = epochSecondsToNormalized(rangeStart, minTimestampSec, maxTimestampSec);
          const normalizedEnd = epochSecondsToNormalized(rangeEnd, minTimestampSec, maxTimestampSec);
          minTime = Math.min(normalizedStart, normalizedEnd);
          maxTime = Math.max(normalizedStart, normalizedEnd);
        } else {
          minTime = Math.min(rangeStart, rangeEnd);
          maxTime = Math.max(rangeStart, rangeEnd);
        }
      }

      for (let i = 0; i < columns.length; i += 1) {
        const timestamp = columns.timestamp[i];
        if (timestamp < minTime || timestamp > maxTime) continue;
        points.push({ x: columns.x[i], z: columns.z[i], index: i });
      }
    } else if (data.length > 0) {
      let minTime = -Infinity;
      let maxTime = Infinity;

      if (selectedTimeRange) {
        const [rangeStart, rangeEnd] = selectedTimeRange;
        minTime = Math.min(rangeStart, rangeEnd);
        maxTime = Math.max(rangeStart, rangeEnd);
      }

      for (let i = 0; i < data.length; i += 1) {
        const point = data[i];
        if (point.timestamp < minTime || point.timestamp > maxTime) continue;
        points.push({ x: point.x, z: point.z, index: i });
      }
    }

    if (points.length <= MAX_POINTS) {
      return points;
    }

    const stride = Math.ceil(points.length / MAX_POINTS);
    const sampled: ScenePoint[] = [];
    for (let i = 0; i < points.length; i += stride) {
      sampled.push(points[i]);
    }
    return sampled;
  }, [columns, data, maxTimestampSec, minTimestampSec, selectedTimeRange]);

  const geoJson = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    return {
      type: 'FeatureCollection' as const,
      features: filteredPoints.map((point) => {
        const [lat, lon] = unproject(point.x, point.z);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat]
          },
          properties: {
            index: point.index
          }
        };
      })
    };
  }, [filteredPoints]);

  if (!geoJson) return null;

  return (
    <Source id="map-events-source" type="geojson" data={geoJson}>
      <Layer
        id="map-events-layer"
        type="circle"
        paint={{
          'circle-radius': 3,
          'circle-color': '#94a3b8',
          'circle-opacity': 0.35
        }}
      />
    </Source>
  );
}
