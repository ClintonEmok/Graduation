'use client';

import React, { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { buildHotspotEvolution } from '@/lib/hotspot-evolution';

interface MapHotspotTrajectoryLayerProps {
  sliceResults?: Record<string, StkdeSurfaceResponse> | null;
}

type TrajectoryProperties = {
  trackId: string;
  color: string;
  radius: number;
};

const TRACK_COLORS = ['#67e8f9', '#60a5fa', '#a78bfa', '#34d399', '#f472b6'];

export function MapHotspotTrajectoryLayer({ sliceResults }: MapHotspotTrajectoryLayerProps) {
  const { lines, points } = useMemo(() => {
    const result = buildHotspotEvolution(sliceResults);
    const visibleTracks = result.tracks.slice(0, 5);

    const lineFeatures: FeatureCollection<LineString, TrajectoryProperties> = {
      type: 'FeatureCollection',
      features: [],
    };
    const pointFeatures: FeatureCollection<Point, TrajectoryProperties> = {
      type: 'FeatureCollection',
      features: [],
    };

    visibleTracks.forEach((track, trackIndex) => {
      const color = TRACK_COLORS[trackIndex % TRACK_COLORS.length] ?? TRACK_COLORS[0];
      const coordinates = track.snapshots.map((snapshot) => [snapshot.centroidLng, snapshot.centroidLat] as [number, number]);

      if (coordinates.length >= 2) {
        lineFeatures.features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            trackId: track.id,
            color,
            radius: 0,
          },
        });
      }

      track.snapshots.forEach((snapshot, snapshotIndex) => {
        pointFeatures.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [snapshot.centroidLng, snapshot.centroidLat],
          },
          properties: {
            trackId: track.id,
            color,
            radius: snapshotIndex === 0 || snapshotIndex === track.snapshots.length - 1 ? 5 : 3,
          },
        });
      });
    });

    return {
      lines: lineFeatures,
      points: pointFeatures,
    };
  }, [sliceResults]);

  if (lines.features.length === 0 && points.features.length === 0) return null;

  return (
    <>
      {lines.features.length > 0 ? (
        <Source id="hotspot-trajectories-line" type="geojson" data={lines}>
          <Layer
            id="hotspot-trajectories-line-layer"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': 0.8,
            }}
          />
        </Source>
      ) : null}

      {points.features.length > 0 ? (
        <Source id="hotspot-trajectories-points" type="geojson" data={points}>
          <Layer
            id="hotspot-trajectories-point-layer"
            type="circle"
            paint={{
              'circle-radius': ['get', 'radius'],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.92,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': 0.7,
            }}
          />
        </Source>
      ) : null}
    </>
  );
}
