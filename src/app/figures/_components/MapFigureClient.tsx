'use client';

import { useState } from 'react';
import { MapPinned, Waves } from 'lucide-react';
import { Map, MapMarker, MapTileLayer } from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { CENTER } from '@/lib/projection';
import type { LatLngExpression } from 'leaflet';

type MapFigureClientProps = {
  screenshot?: boolean;
};

const CHICAGO_COORDINATES = [CENTER.latitude, CENTER.longitude] satisfies LatLngExpression;

const FIGURE_MARKERS = [
  { name: 'Loop', coordinates: [41.8833, -87.6324] satisfies LatLngExpression },
  { name: 'River North', coordinates: [41.8903, -87.6347] satisfies LatLngExpression },
  { name: 'West Town', coordinates: [41.8975, -87.6715] satisfies LatLngExpression },
  { name: 'South Loop', coordinates: [41.8594, -87.6278] satisfies LatLngExpression },
  { name: 'Near West', coordinates: [41.874, -87.6622] satisfies LatLngExpression },
];

const HEAT_BLOBS = [
  { top: '30%', left: '45%', size: '34%' },
  { top: '42%', left: '31%', size: '28%' },
  { top: '58%', left: '53%', size: '30%' },
  { top: '24%', left: '62%', size: '22%' },
];

export function MapFigureClient({ screenshot }: MapFigureClientProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPois, setShowPois] = useState(true);

  return (
    <div className="mx-auto flex w-full justify-center px-6 py-6 sm:px-8 lg:px-10">
      <div
        className={screenshot ? 'relative w-[min(75vw,1280px)]' : 'relative w-[min(75vw,1280px)]'}
        style={{ height: 'min(72vh, 760px)' }}
      >
        <div className="absolute inset-0 rounded-[2rem] border border-neutral-300 bg-neutral-100 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
          <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white">
            <Map center={CHICAGO_COORDINATES} zoom={12} className="rounded-[1.5rem]">
              <MapTileLayer />
              {showPois
                ? FIGURE_MARKERS.map((marker) => (
                <MapMarker
                  key={marker.name}
                  position={marker.coordinates}
                  icon={
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-900 bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.9)]">
                      <div className="h-2 w-2 rounded-full bg-neutral-900" />
                    </div>
                  }
                />
                ))
                : null}
            </Map>

            {showHeatmap ? (
              <div className="pointer-events-none absolute inset-0 z-[55]">
                {HEAT_BLOBS.map((blob, index) => (
                  <div
                    key={`${blob.top}-${blob.left}`}
                    className="absolute rounded-full bg-neutral-500/10 blur-3xl"
                    style={{
                      top: blob.top,
                      left: blob.left,
                      width: blob.size,
                      aspectRatio: '1',
                      transform: `translate(-50%, -50%) scale(${1 - index * 0.08})`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-[60]">
              <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 p-2 shadow-lg backdrop-blur-sm">
                <Button
                  type="button"
                  size="icon"
                  variant={showHeatmap ? 'default' : 'outline'}
                  className="rounded-full"
                  aria-label="Toggle heatmap"
                  title="Toggle heatmap"
                  onClick={() => setShowHeatmap((value) => !value)}
                >
                  <Waves className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={showPois ? 'default' : 'outline'}
                  className="rounded-full"
                  aria-label="Toggle POIs"
                  title="Toggle POIs"
                  onClick={() => setShowPois((value) => !value)}
                >
                  <MapPinned className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
