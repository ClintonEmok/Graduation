import React, { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { unproject } from '@/lib/projection';
import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';

const MAX_POINTS = 20000;

type ScenePoint = {
  x: number;
  z: number;
  index: number;
};

interface MapEventLayerProps {
  colorMode: 'burst' | 'type';
  hoveredTypeId?: number | null;
}

export default function MapEventLayer({ colorMode, hoveredTypeId }: MapEventLayerProps) {
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const burstinessMap = useAdaptiveStore((state) => state.burstinessMap);
  const burstMetric = useAdaptiveStore((state) => state.burstMetric);
  const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);
  const burstCutoff = useAdaptiveStore((state) => state.burstCutoff);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

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
        } else if (rangeStart >= 0 && rangeEnd <= 100) {
          minTime = Math.min(rangeStart, rangeEnd);
          maxTime = Math.max(rangeStart, rangeEnd);
        }
      }

      for (let i = 0; i < columns.length; i += 1) {
        const timestamp = columns.timestamp[i];
        if (timestamp < minTime || timestamp > maxTime) continue;
        if (selectedTypes.length > 0 && !selectedTypes.includes(columns.type[i])) continue;
        if (selectedDistricts.length > 0 && !selectedDistricts.includes(columns.district[i])) continue;

        if (selectedSpatialBounds && columns.lat && columns.lon) {
          const lat = columns.lat[i];
          const lon = columns.lon[i];
          if (
            lat < selectedSpatialBounds.minLat ||
            lat > selectedSpatialBounds.maxLat ||
            lon < selectedSpatialBounds.minLon ||
            lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }
        points.push({ x: columns.x[i], z: columns.z[i], index: i });
      }
    } else if (data.length > 0) {
      let minTime = -Infinity;
      let maxTime = Infinity;

      if (selectedTimeRange) {
        const [rangeStart, rangeEnd] = selectedTimeRange;
        if (rangeStart >= 0 && rangeEnd <= 100) {
          minTime = Math.min(rangeStart, rangeEnd);
          maxTime = Math.max(rangeStart, rangeEnd);
        }
      }

      for (let i = 0; i < data.length; i += 1) {
        const point = data[i];
        if (point.timestamp < minTime || point.timestamp > maxTime) continue;
        const typeId = getCrimeTypeId(point.type);
        if (selectedTypes.length > 0 && !selectedTypes.includes(typeId)) continue;

        const districtId = point.districtId;
        if (selectedDistricts.length > 0 && typeof districtId === 'number' && !selectedDistricts.includes(districtId)) {
          continue;
        }

        if (selectedSpatialBounds && typeof point.lat === 'number' && typeof point.lon === 'number') {
          if (
            point.lat < selectedSpatialBounds.minLat ||
            point.lat > selectedSpatialBounds.maxLat ||
            point.lon < selectedSpatialBounds.minLon ||
            point.lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }
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
  }, [
    columns,
    data,
    maxTimestampSec,
    minTimestampSec,
    selectedDistricts,
    selectedSpatialBounds,
    selectedTimeRange,
    selectedTypes
  ]);

  const geoJson = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const densitySpan = Math.max(0.0001, mapDomain[1] - mapDomain[0]);
    const selectedMap = burstMetric === 'burstiness' ? burstinessMap : densityMap;
    const densitySize = selectedMap?.length ?? 0;
    return {
      type: 'FeatureCollection' as const,
      features: filteredPoints
        .map((point) => {
          const lat = columns?.lat ? columns.lat[point.index] : undefined;
          const lon = columns?.lon ? columns.lon[point.index] : undefined;
          let linearY = NaN;
          if (columns) {
            linearY = columns.timestamp[point.index];
          } else if (data.length > 0) {
            const candidate = data[point.index]?.y;
            if (typeof candidate === 'number') {
              linearY = candidate;
            } else {
              const raw = data[point.index]?.timestamp;
              linearY = typeof raw === 'number' ? raw : NaN;
            }
          }

          let burstIntensity = 0;
          if (selectedMap && densitySize > 0 && Number.isFinite(linearY)) {
            const normalized = Math.max(0, Math.min(1, (linearY - mapDomain[0]) / densitySpan));
            const idx = Math.min(Math.floor(normalized * densitySize), densitySize - 1);
            burstIntensity = selectedMap[idx] ?? 0;
          }

          const [resolvedLat, resolvedLon] =
            Number.isFinite(lat) && Number.isFinite(lon)
              ? [lat as number, lon as number]
              : unproject(point.x, point.z);
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [resolvedLon, resolvedLat]
            },
            properties: {
              index: point.index,
              burstIntensity,
              typeId: columns ? columns.type[point.index] : getCrimeTypeId(data[point.index]?.type)
            }
          };
        })
        .filter((feature) => {
          const coords = feature.geometry.coordinates;
          return Number.isFinite(coords[0]) && Number.isFinite(coords[1]);
        })
    };
  }, [burstMetric, burstinessMap, columns, data, densityMap, filteredPoints, mapDomain]);

  const typeColorExpression = useMemo(() => {
    const entries: (string | number)[] = [];
    for (let id = 1; id <= 35; id += 1) {
      const label = getCrimeTypeName(id);
      const key = label.toUpperCase();
      const color =
        palette.categoryColors[key] ||
        palette.categoryColors[label] ||
        palette.categoryColors['OTHER'] ||
        '#94a3b8';
      entries.push(id, color);
    }
    const fallback = palette.categoryColors['OTHER'] || '#94a3b8';
    return ['match', ['get', 'typeId'], ...entries, fallback] as unknown as any[];
  }, [palette]);

  const paint: any = colorMode === 'burst'
    ? {
        'circle-radius': [
          'case',
          ['>=', ['get', 'burstIntensity'], burstCutoff],
          4,
          3
        ],
        'circle-color': [
          'case',
          ['>=', ['get', 'burstIntensity'], burstCutoff],
          '#f97316',
          '#94a3b8'
        ],
        'circle-opacity': [
          'case',
          ['>=', ['get', 'burstIntensity'], burstCutoff],
          0.75,
          0.35
        ]
      }
    : hoveredTypeId
    ? {
        'circle-radius': [
          'case',
          ['==', ['get', 'typeId'], hoveredTypeId],
          4,
          2
        ],
        'circle-color': typeColorExpression,
        'circle-opacity': [
          'case',
          ['==', ['get', 'typeId'], hoveredTypeId],
          0.95,
          0.15
        ]
      }
    : {
        'circle-radius': 3,
        'circle-color': typeColorExpression,
        'circle-opacity': 0.7
      };

  if (!geoJson) return null;

  return (
    <Source id="map-events-source" type="geojson" data={geoJson}>
      <Layer
        id="map-events-layer"
        type="circle"
        paint={paint}
      />
    </Source>
  );
}
