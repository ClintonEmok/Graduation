"use client";

import { useEffect, useMemo, useState } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point, Polygon } from 'geojson';
import { useDemoNeighborhoodStats } from '@/components/dashboard-demo/lib/useDemoNeighborhoodStats';
import { ALL_DEMO_DISTRICTS, useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import type { CrimeRecord } from '@/types/crime';

const MAX_POINTS = 10000;

type PoliceDistrictProperties = {
  dist_num?: string;
  dist_label?: string;
};

const POLICE_DISTRICTS_URL = '/data/chicago-police-districts.geojson';

const toFeatureCollection = (crimes: CrimeRecord[]): FeatureCollection<Point> => {
  const features = crimes
    .filter((crime): crime is CrimeRecord & { lat: number; lon: number } => typeof crime.lat === 'number' && typeof crime.lon === 'number' && !Number.isNaN(crime.lat) && !Number.isNaN(crime.lon))
    .slice(0, MAX_POINTS)
    .map((crime) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [crime.lon, crime.lat],
      },
      properties: {
        district: crime.district,
        type: crime.type,
      },
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
};

export function DemoStatsMapOverlay() {
  const { crimes, isLoading, isFetching, error } = useDemoNeighborhoodStats();
  const selectedDistricts = useDashboardDemoAnalysisStore((state) => state.selectedDistricts);
  const [districtBoundaries, setDistrictBoundaries] = useState<FeatureCollection<Polygon, PoliceDistrictProperties> | null>(null);

  useEffect(() => {
    let active = true;

    const loadDistrictBoundaries = async () => {
      try {
        const response = await fetch(POLICE_DISTRICTS_URL);
        if (!response.ok) {
          throw new Error(`Failed to load police district boundaries (${response.status})`);
        }

        const data = (await response.json()) as FeatureCollection<Polygon, PoliceDistrictProperties>;

        if (active) {
          setDistrictBoundaries(data);
        }
      } catch {
        if (active) {
          setDistrictBoundaries(null);
        }
      }
    };

    void loadDistrictBoundaries();

    return () => {
      active = false;
    };
  }, []);

  const districtIds = selectedDistricts.length > 0 ? selectedDistricts : ALL_DEMO_DISTRICTS;

  const filteredDistrictBoundaries = useMemo(() => {
    if (!districtBoundaries) {
      return null;
    }

    const features = districtBoundaries.features.filter((feature) => {
      const districtId = feature.properties?.dist_num;
      return districtId ? districtIds.includes(districtId) : false;
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [districtBoundaries, districtIds]);

  const crimePoints = useMemo(() => toFeatureCollection(crimes ?? []), [crimes]);

  if (isLoading || isFetching || error) {
    return null;
  }

  return (
    <>
      {filteredDistrictBoundaries ? (
        <Source id="demo-stats-districts" type="geojson" data={filteredDistrictBoundaries}>
          <Layer
            id="demo-stats-district-fill"
            type="fill"
            paint={{
              'fill-color': 'rgba(56, 189, 248, 0.08)',
              'fill-opacity': 1,
            }}
          />
          <Layer
            id="demo-stats-district-outline"
            type="line"
            paint={{
              'line-color': '#7dd3fc',
              'line-width': 1.5,
              'line-opacity': 0.65,
            }}
          />
          <Layer
            id="demo-stats-district-label"
            type="symbol"
            layout={{
              'text-field': ['concat', ['get', 'dist_num'], ' District'],
              'text-size': 10,
              'text-anchor': 'center',
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#e2e8f0',
              'text-halo-color': '#0f172a',
              'text-halo-width': 1,
            }}
          />
        </Source>
      ) : null}

      <Source id="demo-stats-hotspots" type="geojson" data={crimePoints}>
        <Layer
          id="demo-stats-heatmap"
          type="heatmap"
          paint={{
            'heatmap-weight': 1,
            'heatmap-intensity': 1,
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              15,
              12,
              25,
              15,
              40,
            ],
            'heatmap-opacity': 0.75,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(0, 0, 0, 0)',
              0.2,
              'rgba(56, 189, 248, 0.35)',
              0.4,
              'rgba(34, 197, 94, 0.45)',
              0.6,
              'rgba(234, 179, 8, 0.55)',
              0.8,
              'rgba(249, 115, 22, 0.65)',
              1,
              'rgba(239, 68, 68, 0.75)',
            ],
          }}
        />
      </Source>
    </>
  );
}
