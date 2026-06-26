import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Orbit, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { computeSliceKde } from '@/lib/kde/compute-slice-kde';
import { buildHotspotEvolution } from '@/lib/hotspot-evolution';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';

export const metadata: Metadata = {
  title: 'Hotspot Evolution | Quiet Tiger',
  description: 'Standalone showcase of tracked STKDE hotspot movement across slices.',
};

type HotspotSeed = StkdeSurfaceResponse['hotspots'][number];

const TRACK_STATUS_LABELS = {
  stable: 'Stable',
  transient: 'Transient',
  displacing: 'Displacing',
} as const;

const TRACK_STATUS_STYLES = {
  stable: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  transient: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  displacing: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
} as const;

const TRACK_STATUS_STROKES = {
  stable: '#34d399',
  transient: '#fbbf24',
  displacing: '#fb7185',
} as const;

const TREND_LABELS = {
  increasing: 'support rising',
  decreasing: 'support falling',
  stable: 'support steady',
  expanding: 'extent expanding',
  contracting: 'extent contracting',
} as const;

function makeHotspot(id: string, overrides: Omit<HotspotSeed, 'id'>): HotspotSeed {
  return { id, ...overrides };
}

function makeSurface(hotspots: HotspotSeed[]): StkdeSurfaceResponse {
  const maxIntensity = hotspots.reduce((max, hotspot) => Math.max(max, hotspot.intensityScore), 0);

  return {
    meta: {
      eventCount: hotspots.reduce((sum, hotspot) => sum + hotspot.supportCount * 12, 0),
      computeMs: 18,
      truncated: false,
      requestedComputeMode: 'sampled',
      effectiveComputeMode: 'sampled',
    },
    heatmap: {
      cells: [],
      maxIntensity,
    },
    hotspots,
    contracts: {
      scoreVersion: 'stkde-v1',
    },
  };
}

const SAMPLE_SLICE_RESULTS: Record<string, StkdeSurfaceResponse> = {
  'slice-01': makeSurface([
    makeHotspot('north-core', {
      centroidLng: -87.6748,
      centroidLat: 41.8892,
      supportCount: 28,
      intensityScore: 0.94,
      radiusMeters: 420,
      peakStartEpochSec: 1704067200,
      peakEndEpochSec: 1704074400,
    }),
    makeHotspot('east-drift', {
      centroidLng: -87.6192,
      centroidLat: 41.8711,
      supportCount: 16,
      intensityScore: 0.74,
      radiusMeters: 320,
      peakStartEpochSec: 1704067200,
      peakEndEpochSec: 1704070800,
    }),
    makeHotspot('south-flare', {
      centroidLng: -87.6618,
      centroidLat: 41.8604,
      supportCount: 9,
      intensityScore: 0.58,
      radiusMeters: 210,
      peakStartEpochSec: 1704067200,
      peakEndEpochSec: 1704069000,
    }),
    makeHotspot('west-pulse', {
      centroidLng: -87.6912,
      centroidLat: 41.8828,
      supportCount: 14,
      intensityScore: 0.68,
      radiusMeters: 260,
      peakStartEpochSec: 1704067200,
      peakEndEpochSec: 1704072600,
    }),
    makeHotspot('river-glow', {
      centroidLng: -87.6348,
      centroidLat: 41.8789,
      supportCount: 12,
      intensityScore: 0.63,
      radiusMeters: 240,
      peakStartEpochSec: 1704067200,
      peakEndEpochSec: 1704070800,
    }),
  ]),
  'slice-02': makeSurface([
    makeHotspot('north-core', {
      centroidLng: -87.6741,
      centroidLat: 41.8893,
      supportCount: 30,
      intensityScore: 0.95,
      radiusMeters: 430,
      peakStartEpochSec: 1704153600,
      peakEndEpochSec: 1704160800,
    }),
    makeHotspot('east-drift', {
      centroidLng: -87.6116,
      centroidLat: 41.8732,
      supportCount: 17,
      intensityScore: 0.79,
      radiusMeters: 340,
      peakStartEpochSec: 1704153600,
      peakEndEpochSec: 1704157200,
    }),
    makeHotspot('metro-transient', {
      centroidLng: -87.6409,
      centroidLat: 41.8677,
      supportCount: 7,
      intensityScore: 0.51,
      radiusMeters: 180,
      peakStartEpochSec: 1704153600,
      peakEndEpochSec: 1704155400,
    }),
    makeHotspot('west-pulse', {
      centroidLng: -87.6868,
      centroidLat: 41.8837,
      supportCount: 15,
      intensityScore: 0.71,
      radiusMeters: 280,
      peakStartEpochSec: 1704153600,
      peakEndEpochSec: 1704159000,
    }),
    makeHotspot('river-glow', {
      centroidLng: -87.6299,
      centroidLat: 41.8796,
      supportCount: 13,
      intensityScore: 0.67,
      radiusMeters: 250,
      peakStartEpochSec: 1704153600,
      peakEndEpochSec: 1704159000,
    }),
  ]),
  'slice-03': makeSurface([
    makeHotspot('north-core', {
      centroidLng: -87.6734,
      centroidLat: 41.8896,
      supportCount: 32,
      intensityScore: 0.96,
      radiusMeters: 440,
      peakStartEpochSec: 1704240000,
      peakEndEpochSec: 1704247200,
    }),
    makeHotspot('east-drift', {
      centroidLng: -87.6048,
      centroidLat: 41.8751,
      supportCount: 18,
      intensityScore: 0.84,
      radiusMeters: 360,
      peakStartEpochSec: 1704240000,
      peakEndEpochSec: 1704243600,
    }),
    makeHotspot('west-pulse', {
      centroidLng: -87.6819,
      centroidLat: 41.8841,
      supportCount: 16,
      intensityScore: 0.74,
      radiusMeters: 300,
      peakStartEpochSec: 1704240000,
      peakEndEpochSec: 1704245400,
    }),
    makeHotspot('river-glow', {
      centroidLng: -87.6253,
      centroidLat: 41.8802,
      supportCount: 14,
      intensityScore: 0.69,
      radiusMeters: 270,
      peakStartEpochSec: 1704240000,
      peakEndEpochSec: 1704245400,
    }),
  ]),
  'slice-04': makeSurface([
    makeHotspot('north-core', {
      centroidLng: -87.6728,
      centroidLat: 41.8898,
      supportCount: 34,
      intensityScore: 0.97,
      radiusMeters: 445,
      peakStartEpochSec: 1704326400,
      peakEndEpochSec: 1704333600,
    }),
    makeHotspot('east-drift', {
      centroidLng: -87.5975,
      centroidLat: 41.8768,
      supportCount: 19,
      intensityScore: 0.88,
      radiusMeters: 380,
      peakStartEpochSec: 1704326400,
      peakEndEpochSec: 1704330000,
    }),
    makeHotspot('west-pulse', {
      centroidLng: -87.6764,
      centroidLat: 41.8846,
      supportCount: 18,
      intensityScore: 0.78,
      radiusMeters: 320,
      peakStartEpochSec: 1704326400,
      peakEndEpochSec: 1704331800,
    }),
    makeHotspot('river-glow', {
      centroidLng: -87.6201,
      centroidLat: 41.8812,
      supportCount: 15,
      intensityScore: 0.72,
      radiusMeters: 290,
      peakStartEpochSec: 1704326400,
      peakEndEpochSec: 1704331800,
    }),
  ]),
};

const EVOLUTION = buildHotspotEvolution(SAMPLE_SLICE_RESULTS);

const SLICE_ORDER = Object.keys(SAMPLE_SLICE_RESULTS);

function getBounds() {
  const hotspots = Object.values(SAMPLE_SLICE_RESULTS).flatMap((surface) => surface.hotspots);
  const lngs = hotspots.map((hotspot) => hotspot.centroidLng);
  const lats = hotspots.map((hotspot) => hotspot.centroidLat);

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

function projectPoint(
  lng: number,
  lat: number,
  bounds: ReturnType<typeof getBounds>,
  width: number,
  height: number,
  padding: number,
) {
  const lngSpan = Math.max(1e-6, bounds.maxLng - bounds.minLng);
  const latSpan = Math.max(1e-6, bounds.maxLat - bounds.minLat);
  const x = padding + ((lng - bounds.minLng) / lngSpan) * (width - padding * 2);
  const y = height - padding - ((lat - bounds.minLat) / latSpan) * (height - padding * 2);
  return { x, y };
}

function formatTime(epochSec: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(epochSec * 1000));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function projectHotspotToScene(
  hotspot: HotspotSeed,
  bounds: ReturnType<typeof getBounds>,
) {
  const lngSpan = Math.max(1e-6, bounds.maxLng - bounds.minLng);
  const latSpan = Math.max(1e-6, bounds.maxLat - bounds.minLat);

  return {
    x: -50 + ((hotspot.centroidLng - bounds.minLng) / lngSpan) * 100,
    z: -50 + ((hotspot.centroidLat - bounds.minLat) / latSpan) * 100,
  };
}

function buildLayerKde(hotspots: HotspotSeed[]) {
  const bounds = getBounds();
  const points: Array<{ x: number; z: number }> = [];

  for (let index = 0; index < hotspots.length; index += 1) {
    const hotspot = hotspots[index]!;
    const center = projectHotspotToScene(hotspot, bounds);
    const coreCount = Math.max(18, Math.round(hotspot.supportCount * 2.4));
    const haloCount = Math.max(10, Math.round(hotspot.supportCount * 1.4));
    const spread = Math.max(1.6, hotspot.radiusMeters / 220);

    for (let i = 0; i < coreCount; i += 1) {
      const angle = (i / coreCount) * Math.PI * 2 + index * 0.73;
      const radial = spread * (0.18 + ((i % 7) / 18));
      points.push({
        x: clamp(center.x + Math.cos(angle) * radial, -49, 49),
        z: clamp(center.z + Math.sin(angle) * radial, -49, 49),
      });
    }

    for (let i = 0; i < haloCount; i += 1) {
      const angle = (i / haloCount) * Math.PI * 2 + index * 1.17;
      const radial = spread * (0.48 + ((i % 4) / 5));
      points.push({
        x: clamp(center.x + Math.cos(angle) * radial, -49, 49),
        z: clamp(center.z + Math.sin(angle) * radial, -49, 49),
      });
    }

    for (let i = 0; i < 6; i += 1) {
      points.push({
        x: clamp(center.x + Math.cos(i * 1.3 + index) * spread * 0.9, -49, 49),
        z: clamp(center.z + Math.sin(i * 1.1 + index * 0.4) * spread * 0.9, -49, 49),
      });
    }
  }

  return computeSliceKde(points, {
    gridSize: 24,
    sigmaCells: 2.1,
    kernelRadiusCells: 6,
    threshold: 0.008,
  });
}

function colorForLayerCell(intensity: number): string {
  const value = Math.min(1, Math.max(0, intensity));
  if (value < 0.18) return 'rgba(15, 23, 42, 0.18)';
  if (value < 0.36) return 'rgba(56, 189, 248, 0.42)';
  if (value < 0.62) return 'rgba(34, 211, 238, 0.6)';
  if (value < 0.82) return 'rgba(248, 180, 0, 0.76)';
  return 'rgba(248, 113, 113, 0.92)';
}

function renderLayerTile(surface: StkdeSurfaceResponse, sliceId: string) {
  const bounds = getBounds();
  const layer = buildLayerKde(surface.hotspots);
  const cells = layer.cells;
  const size = 182;
  const padding = 14;
  const cellSize = (size - padding * 2) / 24;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-50">{sliceId}</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {cells.length} cells · peak {layer.maxIntensity.toFixed(2)} · mean {layer.meanIntensity.toFixed(2)}
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {cells.length} cells
        </div>
      </div>

      <svg viewBox={`0 0 ${size} ${size}`} className="mt-3 h-[182px] w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
        {cells.map((cell) => {
          const x = padding + ((cell.x + 50) / 100) * (size - padding * 2) - cellSize / 2;
          const y = size - padding - ((cell.z + 50) / 100) * (size - padding * 2) - cellSize / 2;
          return (
            <rect
              key={`${sliceId}-${cell.x.toFixed(4)}-${cell.z.toFixed(4)}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx="2"
              fill={colorForLayerCell(cell.intensity)}
              stroke="rgba(15, 23, 42, 0.24)"
              strokeWidth="0.4"
            />
          );
        })}
        {surface.hotspots.map((hotspot, index) => {
          const layerPoint = projectHotspotToScene(hotspot, bounds);
          const x = padding + ((layerPoint.x + 50) / 100) * (size - padding * 2);
          const y = size - padding - ((layerPoint.z + 50) / 100) * (size - padding * 2);
          return (
            <g key={`${sliceId}-${hotspot.id}`}>
              <circle cx={x} cy={y} r="7" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.22)" />
              <circle cx={x} cy={y} r={3.5 + Math.min(2.5, index)} fill="rgba(248, 250, 252, 0.72)" />
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <span>layer first, hotspots embedded in the surface</span>
        <span>{surface.hotspots.length} hotspots embedded in the surface</span>
      </div>
    </div>
  );
}

function HotspotTrajectoryChart() {
  const bounds = getBounds();
  const width = 840;
  const height = 420;
  const padding = 40;

  return (
    <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.8)] backdrop-blur-sm">
      <CardHeader className="gap-2 px-5 pb-3 pt-5">
        <CardTitle className="text-sm uppercase tracking-[0.24em] text-slate-300">
          Evolution map
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          Sample hotspot paths plotted from the same STKDE slice-result shape used in the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[420px] w-full rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.14),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.82),rgba(15,23,42,0.92))]">
          <defs>
            <pattern id="hotspot-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
            </pattern>
            <marker id="hotspot-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="rgba(148,163,184,0.55)" />
            </marker>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#hotspot-grid)" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
          <text x={padding} y={height - 14} fill="rgba(226,232,240,0.55)" fontSize="11" letterSpacing="0.16em">WEST</text>
          <text x={width - 76} y={height - 14} fill="rgba(226,232,240,0.55)" fontSize="11" letterSpacing="0.16em">EAST</text>
          <text x={14} y={padding + 6} fill="rgba(226,232,240,0.55)" fontSize="11" letterSpacing="0.16em" transform={`rotate(-90 14 ${padding + 6})`}>
            NORTH
          </text>
          <text x={14} y={height - 18} fill="rgba(226,232,240,0.55)" fontSize="11" letterSpacing="0.16em" transform={`rotate(-90 14 ${height - 18})`}>
            SOUTH
          </text>

          {EVOLUTION.tracks.map((track) => {
            const stroke = TRACK_STATUS_STROKES[track.status];
            const points = track.snapshots.map((snapshot) => {
              const { x, y } = projectPoint(snapshot.centroidLng, snapshot.centroidLat, bounds, width, height, padding);
              return `${x},${y}`;
            });

            return (
              <g key={track.id}>
                {track.snapshots.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke={stroke}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points.join(' ')}
                    markerEnd="url(#hotspot-arrow)"
                  />
                ) : null}
                {track.snapshots.map((snapshot, index) => {
                  const { x, y } = projectPoint(snapshot.centroidLng, snapshot.centroidLat, bounds, width, height, padding);
                  return (
                    <g key={`${track.id}-${snapshot.sliceId}`}>
                      <circle cx={x} cy={y} r={12 + index} fill={stroke} fillOpacity="0.18" stroke={stroke} strokeWidth="2" />
                      <circle cx={x} cy={y} r="4.5" fill={stroke} />
                      <text x={x + 9} y={y - 9} fill="rgba(241,245,249,0.9)" fontSize="10" fontWeight="600">
                        {index + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export default function HotspotEvolutionPage() {
  const stable = EVOLUTION.tracks.filter((track) => track.status === 'stable').length;
  const displacing = EVOLUTION.tracks.filter((track) => track.status === 'displacing').length;
  const transient = EVOLUTION.tracks.filter((track) => track.status === 'transient').length;
  const totalSnapshots = EVOLUTION.tracks.reduce((sum, track) => sum + track.snapshots.length, 0);

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(244,63,94,0.1),_transparent_30%),linear-gradient(180deg,#020617_0%,#020b18_55%,#01040c_100%)] text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/70 px-5 py-5 shadow-[0_26px_90px_-50px_rgba(14,165,233,0.55)] backdrop-blur-md lg:px-6 lg:py-6">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-400">
            <Badge variant="outline" className="border-sky-500/25 bg-sky-500/10 text-sky-100">
              isolated route
            </Badge>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">sample STKDE slices</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">no dashboard store</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-sky-200/90">
                <Orbit className="size-4" />
                Hotspot evolution
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-slate-50 sm:text-4xl lg:text-5xl">
                A standalone view of where hotspots move, linger, and fade across slices.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                This page uses a fixed STKDE response sample so the evolution logic can be read in isolation from the dashboard chrome, filters, and coordination store.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard-demo"
                className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15"
              >
                Back to dashboard demo
                <ArrowLeft className="size-4" />
              </Link>
              <Link
                href="/stkde-3d"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              >
                Open STKDE 3D
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tracks</div>
                <div className="mt-2 text-2xl font-semibold text-slate-50">{EVOLUTION.tracks.length}</div>
                <div className="mt-1 text-xs text-slate-400">across {EVOLUTION.sliceCount} slices</div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Snapshots</div>
                <div className="mt-2 text-2xl font-semibold text-slate-50">{totalSnapshots}</div>
                <div className="mt-1 text-xs text-slate-400">linked centroid positions</div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Movement</div>
                <div className="mt-2 text-2xl font-semibold text-slate-50">{EVOLUTION.totalDisplacementKm.toFixed(1)} km</div>
                <div className="mt-1 text-xs text-slate-400">total displacement</div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mix</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-100">{stable} stable</Badge>
                  <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 text-rose-100">{displacing} displacing</Badge>
                  <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-100">{transient} transient</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <HotspotTrajectoryChart />

          <div className="flex flex-col gap-6">
            <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.8)] backdrop-blur-sm">
              <CardHeader className="gap-2 px-5 pb-3 pt-5">
                <CardTitle className="text-sm uppercase tracking-[0.24em] text-slate-300">
                  STKDE layers
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  The layers that generated the hotspot tracks, shown as compact heatmaps.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5">
                {SLICE_ORDER.map((sliceId) => renderLayerTile(SAMPLE_SLICE_RESULTS[sliceId]!, sliceId))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.8)] backdrop-blur-sm">
              <CardHeader className="gap-2 px-5 pb-3 pt-5">
                <CardTitle className="text-sm uppercase tracking-[0.24em] text-slate-300">
                  Track legend
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  What the isolated sample is emphasizing.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5 pb-5 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-emerald-400" />
                  Stable track: little centroid drift across slices.
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-rose-400" />
                  Displacing track: meaningful centroid shift across slices.
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-amber-400" />
                  Transient track: appears once and then drops out.
                </div>
                <Separator className="bg-white/10" />
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                  <Waves className="mt-0.5 size-4 shrink-0 text-sky-300" />
                  The sample is synthetic, but the geometry and summary metrics are produced by the same `buildHotspotEvolution()` function used in the dashboard.
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.8)] backdrop-blur-sm">
              <CardHeader className="gap-2 px-5 pb-3 pt-5">
                <CardTitle className="text-sm uppercase tracking-[0.24em] text-slate-300">
                  Slice sequence
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  The sample hotspots that produce the tracks.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5 pb-5">
                {SLICE_ORDER.map((sliceId) => {
                  const surface = SAMPLE_SLICE_RESULTS[sliceId];
                  const hotspotSummary = surface.hotspots
                    .map((hotspot) => `${hotspot.id} ${hotspot.supportCount}`)
                    .join(' • ');

                  return (
                    <div key={sliceId} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-50">{sliceId}</div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          {formatTime(surface.hotspots[0]?.peakStartEpochSec ?? 0)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-400">{hotspotSummary}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.8)] backdrop-blur-sm">
              <CardHeader className="gap-2 px-5 pb-3 pt-5">
                <CardTitle className="text-sm uppercase tracking-[0.24em] text-slate-300">
                  Track detail
                </CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Each row is built from linked snapshots across adjacent slices.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5 pb-5">
                {EVOLUTION.tracks.map((track) => {
                  const first = track.snapshots[0];
                  const last = track.snapshots[track.snapshots.length - 1];
                  const stroke = TRACK_STATUS_STROKES[track.status];
                  const statusClass = TRACK_STATUS_STYLES[track.status];
                  const trendLine = [TREND_LABELS[track.supportTrend], TREND_LABELS[track.extentTrend]].join(' · ');

                  return (
                    <div key={track.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusClass}>
                            {TRACK_STATUS_LABELS[track.status]}
                          </Badge>
                          <div className="text-sm font-medium text-slate-50">{track.label}</div>
                        </div>
                        <div className="text-xs text-slate-400">{track.displacementKm.toFixed(1)} km</div>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ backgroundColor: stroke, width: `${Math.min(100, Math.max(18, track.displacementKm * 28))}%` }} />
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-slate-400">
                        <div>{first.sliceId} to {last.sliceId}</div>
                        <div>centroid {first.centroidLat.toFixed(3)}, {first.centroidLng.toFixed(3)}</div>
                        <div>{track.snapshots.length} snapshots · {trendLine}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
