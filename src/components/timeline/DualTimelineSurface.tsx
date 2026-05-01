"use client";

import React from 'react';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';

type BurstTaxonomy = 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';

interface SurfaceBurstWindow {
  id: string;
  start: number;
  end: number;
  peak: number;
  count: number;
  duration: number;
  burstClass?: BurstTaxonomy;
}

interface SurfaceBucket {
  x0?: number;
  x1?: number;
  length: number;
}

interface SurfaceSliceGeometry {
  id: string;
  left: number;
  width: number;
  isActive: boolean;
  isBurst: boolean;
  isPoint: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  color?: { fill?: string; stroke?: string } | string;
}

interface DualTimelineSurfaceProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  brushRangeLabel: string;
  isTimelineLoading: boolean;
  width: number;
  overviewInnerWidth: number;
  detailInnerWidth: number;
  isComputing: boolean;
  densityMap: Float32Array | null;
  overviewScale: (date: Date) => number;
  detailScale: (date: Date) => number;
  overviewSvgRef: React.RefObject<SVGSVGElement | null>;
  detailSvgRef: React.RefObject<SVGSVGElement | null>;
  overviewBins: SurfaceBucket[];
  overviewMax: number;
  stripSelection: { left: number; width: number } | null;
  userWarpOverlayBands: Array<{ id: string; startSec: number; endSec: number; isDebugPreview: boolean }>;
  timeScaleMode: 'linear' | 'adaptive';
  brushRef: React.RefObject<SVGGElement | null>;
  overviewTicks: Date[];
  overviewTickFormat: (date: Date) => string;
  burstWindows: SurfaceBurstWindow[];
  activeBurstWindowId: string | null;
  onBurstWindowClick?: (window: SurfaceBurstWindow) => void;
  detailDensityMap: Float32Array | null;
  detailMax: number;
  resolvedDetailRenderMode: 'points' | 'bins';
  detailPoints: number[];
  detailBins: SurfaceBucket[];
  orderedSliceGeometries: SurfaceSliceGeometry[];
  activeSliceUpdatedAt: number | null;
  pendingGeneratedGeometries: SurfaceSliceGeometry[];
  maxSliceOverlap: number;
  cursorX: number | null;
  selectionX: number | null;
  zoomRef: React.RefObject<SVGRectElement | null>;
  handlePointerDown: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerUpWithSelection: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerCancel: (event: React.PointerEvent<SVGRectElement>) => void;
  detailTicks: Date[];
  detailTickFormat: (date: Date) => string;
  hoveredDetail: { x: number; label: string } | null;
  isDetailEmpty: boolean;
}

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const DENSITY_DOMAIN: [number, number] = [0, 1];
const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
const TIME_CURSOR_COLOR = '#10b981';

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const resolveColorValue = (color: SurfaceSliceGeometry['color'], key: 'fill' | 'stroke'): string | undefined => {
  if (typeof color === 'string') {
    return color;
  }

  return color?.[key];
};

export function DualTimelineSurface(props: DualTimelineSurfaceProps) {
  const {
    containerRef,
    brushRangeLabel,
    isTimelineLoading,
    width,
    overviewInnerWidth,
    detailInnerWidth,
    isComputing,
    densityMap,
    overviewScale,
    detailScale,
    overviewSvgRef,
    detailSvgRef,
    overviewBins,
    overviewMax,
    stripSelection,
    userWarpOverlayBands,
    timeScaleMode,
    brushRef,
    overviewTicks,
    overviewTickFormat,
    burstWindows,
    activeBurstWindowId,
    onBurstWindowClick,
    detailDensityMap,
    detailMax,
    resolvedDetailRenderMode,
    detailPoints,
    detailBins,
    orderedSliceGeometries,
    activeSliceUpdatedAt,
    pendingGeneratedGeometries,
    maxSliceOverlap,
    cursorX,
    selectionX,
    zoomRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
    detailTicks,
    detailTickFormat,
    hoveredDetail,
    isDetailEmpty,
  } = props;

  return (
    <div ref={containerRef} className="relative w-full" aria-busy={isTimelineLoading}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3" style={{ paddingLeft: OVERVIEW_MARGIN.left, paddingRight: OVERVIEW_MARGIN.right }}>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="text-xs font-medium text-foreground">{brushRangeLabel}</div>
              <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="leading-none">Low</span>
                <span className="h-2 w-20 rounded-sm border border-foreground/15" style={{ background: `linear-gradient(90deg, rgb(${DENSITY_COLOR_LOW.join(',')}) 0%, rgb(${DENSITY_COLOR_HIGH.join(',')}) 100%)` }} aria-hidden="true" />
                <span className="leading-none">High</span>
              </div>
            </div>
            <div className="relative w-full">
              {width > 0 ? (
                <DensityHeatStrip densityMap={densityMap} width={overviewInnerWidth} scale={overviewScale} height={12} isLoading={isComputing} densityDomain={DENSITY_DOMAIN} colorLow={DENSITY_COLOR_LOW} colorHigh={DENSITY_COLOR_HIGH} />
              ) : (
                <div className="h-3" />
              )}
              {stripSelection && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-0 h-full rounded-sm border border-primary/60 bg-primary/15" style={{ left: stripSelection.left, width: stripSelection.width }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <svg ref={overviewSvgRef} width={width} height={OVERVIEW_HEIGHT + AXIS_HEIGHT}>
          <defs>
            <linearGradient id="adaptiveAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.09" />
            </linearGradient>
          </defs>
          <g transform={`translate(${OVERVIEW_MARGIN.left},${OVERVIEW_MARGIN.top})`}>
            {overviewBins.map((bucket: SurfaceBucket, index: number) => {
              if (bucket.x0 === undefined || bucket.x1 === undefined) return null;
              const x0 = overviewScale(new Date(bucket.x0 * 1000));
              const x1 = overviewScale(new Date(bucket.x1 * 1000));
              const barWidth = Math.max(0, x1 - x0 - 1);
              const barHeight = (bucket.length / overviewMax) * OVERVIEW_HEIGHT;
              return <rect key={`overview-${index}`} x={x0} y={OVERVIEW_HEIGHT - barHeight} width={barWidth} height={barHeight} className="fill-primary/20" />;
            })}
            {userWarpOverlayBands.map((slice) => {
              const x0 = overviewScale(new Date(slice.startSec * 1000));
              const x1 = overviewScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              return <rect key={`overview-user-warp-${slice.id}`} x={left} y={0} width={widthSpan} height={OVERVIEW_HEIGHT} fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.16)' : 'rgba(139, 92, 246, 0.15)'} stroke={slice.isDebugPreview ? 'rgba(34, 211, 238, 0.7)' : 'rgba(99, 102, 241, 0.55)'} strokeDasharray={slice.isDebugPreview ? '2 2' : '4 3'} strokeWidth={1} />;
            })}
            <g ref={brushRef} />
            <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
              {timeScaleMode === 'adaptive' ? <rect x={0} y={0} width={overviewInnerWidth} height={AXIS_HEIGHT} fill="url(#adaptiveAxisGradient)" /> : null}
              {overviewTicks.map((tick: Date, index: number) => {
                const x = overviewScale(tick);
                return (
                  <g key={`overview-tick-${index}`} transform={`translate(${x}, 0)`}>
                    <line y2={6} stroke="currentColor" />
                    <text y={14} textAnchor="middle" fontSize={10} fill="currentColor">{overviewTickFormat(tick)}</text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        <div className="relative">
          <div className="mb-2" style={{ paddingLeft: DETAIL_MARGIN.left, paddingRight: DETAIL_MARGIN.right }}>
            {width > 0 ? <DensityHeatStrip densityMap={detailDensityMap} width={detailInnerWidth} scale={detailScale} height={10} isLoading={isComputing} densityDomain={DENSITY_DOMAIN} colorLow={DENSITY_COLOR_LOW} colorHigh={DENSITY_COLOR_HIGH} /> : <div className="h-2" />}
          </div>

          <svg ref={detailSvgRef} width={width} height={DETAIL_HEIGHT + AXIS_HEIGHT}>
            <defs>
              <filter id="timeCursorGlow" x="-50%" y="-10%" width="200%" height="120%"><feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={TIME_CURSOR_COLOR} floodOpacity="0.65" /></filter>
              <pattern id="sliceOverlapHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="2" /></pattern>
            </defs>
            <g transform={`translate(${DETAIL_MARGIN.left},${DETAIL_MARGIN.top})`}>
              {resolvedDetailRenderMode === 'points'
                ? detailPoints.map((timestamp: number, index: number) => {
                    const x = detailScale(new Date(timestamp * 1000));
                    return <circle key={`detail-point-${index}`} cx={x} cy={DETAIL_HEIGHT - 6} r={2} className="fill-primary/60" />;
                  })
                : detailBins.map((bucket: SurfaceBucket, index: number) => {
                    if (bucket.x0 === undefined || bucket.x1 === undefined) return null;
                    const x0 = detailScale(new Date(bucket.x0 * 1000));
                    const x1 = detailScale(new Date(bucket.x1 * 1000));
                    const barWidth = Math.max(0, x1 - x0 - 1);
                    const barHeight = (bucket.length / detailMax) * DETAIL_HEIGHT;
                    return <rect key={`detail-bin-${index}`} x={x0} y={DETAIL_HEIGHT - barHeight} width={barWidth} height={barHeight} className="fill-primary/20" />;
                  })}

              {orderedSliceGeometries.map((geometry: SurfaceSliceGeometry) => {
                const baseOpacity = geometry.isActive ? 0.68 : geometry.overlapCount >= 3 ? 0.2 : geometry.overlapCount === 2 ? 0.28 : 0.38;
                const isSuggestionSlice = geometry.isSuggestion && !geometry.isBurst;
                const isGeneratedAppliedSlice = geometry.isGeneratedApplied;
                const fill = isGeneratedAppliedSlice
                  ? 'rgba(16, 185, 129, 0.18)'
                  : isSuggestionSlice
                    ? 'rgba(139, 92, 246, 0.2)'
                    : geometry.isBurst
                      ? 'rgba(251, 146, 60, 0.26)'
                      : resolveColorValue(geometry.color, 'fill') ?? 'rgba(148, 163, 184, 0.3)';
                const stroke = isGeneratedAppliedSlice
                  ? 'rgba(74, 222, 128, 0.92)'
                  : isSuggestionSlice
                    ? 'rgba(167, 139, 250, 0.85)'
                    : geometry.isBurst
                      ? 'rgba(251, 146, 60, 0.85)'
                      : resolveColorValue(geometry.color, 'stroke') ?? 'rgba(100, 116, 139, 0.8)';
                return (
                  <g key={`${geometry.id}-${geometry.isActive ? activeSliceUpdatedAt : 'base'}`}>
                    <rect x={geometry.left} y={3} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 6} rx={3} fill={fill} stroke={stroke} strokeWidth={geometry.isActive ? 2.3 : geometry.overlapCount >= 2 ? 1.5 : 1} strokeDasharray={geometry.overlapCount >= 3 || isSuggestionSlice ? '5 3' : isGeneratedAppliedSlice ? '8 2' : undefined} opacity={baseOpacity} />
                    {geometry.overlapCount >= 2 && !geometry.isActive && <rect x={geometry.left} y={3} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 6} rx={3} fill="url(#sliceOverlapHatch)" opacity={geometry.overlapCount >= 3 ? 0.42 : 0.3} />}
                    {geometry.isActive && <rect x={geometry.left} y={2} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 4} rx={3} fill="none" stroke={geometry.isBurst ? 'rgba(253, 186, 116, 0.95)' : 'rgba(125, 211, 252, 0.95)'} strokeWidth={2.2} opacity={0.9}><animate attributeName="opacity" values="0.55;1;0.55" dur="1.8s" repeatCount="indefinite" /></rect>}
                  </g>
                );
              })}

              {pendingGeneratedGeometries.map((geometry: SurfaceSliceGeometry) => (
                <g key={geometry.id}>
                  <rect
                    x={geometry.left}
                    y={3}
                    width={Math.max(2, geometry.width)}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill="rgba(245, 158, 11, 0.08)"
                    stroke="rgba(251, 191, 36, 0.82)"
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                </g>
              ))}

              {burstWindows
                .filter((window: SurfaceBurstWindow) => window.burstClass && window.burstClass !== 'neutral')
                .map((window: SurfaceBurstWindow) => {
                  if (!Number.isFinite(window.start) || !Number.isFinite(window.end)) {
                    return null;
                  }

                  const x0 = detailScale(new Date(window.start * 1000));
                  const x1 = detailScale(new Date(window.end * 1000));
                  if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
                    return null;
                  }

                  const left = Math.max(0, Math.min(detailInnerWidth, Math.min(x0, x1)));
                  const right = Math.max(0, Math.min(detailInnerWidth, Math.max(x0, x1)));
                  if (right <= left) {
                    return null;
                  }

                  const fill = window.burstClass === 'prolonged-peak'
                    ? 'rgba(251, 191, 36, 0.24)'
                    : window.burstClass === 'isolated-spike'
                      ? 'rgba(251, 113, 133, 0.24)'
                      : 'rgba(96, 165, 250, 0.24)';
                  const stroke = window.id === activeBurstWindowId
                    ? 'rgba(248, 250, 252, 0.95)'
                    : window.burstClass === 'prolonged-peak'
                      ? 'rgba(251, 191, 36, 0.82)'
                      : window.burstClass === 'isolated-spike'
                        ? 'rgba(251, 113, 133, 0.82)'
                        : 'rgba(96, 165, 250, 0.82)';

                  return (
                    <rect
                      key={`burst-${window.id}`}
                      x={left}
                      y={3}
                      width={Math.max(2, right - left)}
                      height={DETAIL_HEIGHT - 6}
                      rx={3}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={window.id === activeBurstWindowId ? 2 : 1.2}
                      opacity={window.id === activeBurstWindowId ? 1 : 0.9}
                      pointerEvents="none"
                    />
                  );
                })}

              {maxSliceOverlap >= 3 && <g transform={`translate(${Math.max(0, detailInnerWidth - 90)}, 4)`}><rect width={86} height={18} rx={9} fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.55)" /><text x={43} y={12} textAnchor="middle" fontSize={10} fill="rgba(226, 232, 240, 0.95)">{maxSliceOverlap}x overlap</text></g>}

              {cursorX !== null && <><line x1={cursorX} x2={cursorX} y1={0} y2={DETAIL_HEIGHT} stroke={TIME_CURSOR_COLOR} strokeWidth={2} filter="url(#timeCursorGlow)" /><circle cx={cursorX} cy={0} r={8} fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.45)" strokeWidth={1} pointerEvents="none" /><circle cx={cursorX} cy={0} r={5.5} fill={TIME_CURSOR_COLOR} stroke="rgba(255,255,255,0.95)" strokeWidth={2} filter="url(#timeCursorGlow)" /></>}
              {selectionX !== null && <g><line x1={selectionX} x2={selectionX} y1={0} y2={DETAIL_HEIGHT} stroke="rgba(125, 211, 252, 0.95)" strokeWidth={2.2} strokeDasharray="4 2"><animate attributeName="opacity" values="0.45;1;0.45" dur="1.7s" repeatCount="indefinite" /></line><circle cx={selectionX} cy={4} r={3.5} fill="rgba(186, 230, 253, 0.95)"><animate attributeName="r" values="3;4.5;3" dur="1.7s" repeatCount="indefinite" /></circle></g>}

              <rect ref={zoomRef} width={detailInnerWidth} height={DETAIL_HEIGHT} fill="transparent" pointerEvents="auto" className="cursor-crosshair" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUpWithSelection} onPointerLeave={handlePointerCancel} />

              <g transform={`translate(0, ${DETAIL_HEIGHT})`} className="text-muted-foreground">
                {detailTicks.map((tick: Date, index: number) => { const x = detailScale(tick); return <g key={`detail-tick-${index}`} transform={`translate(${x}, 0)`}><line y2={6} stroke="currentColor" /><text y={14} textAnchor="middle" fontSize={10} fill="currentColor">{detailTickFormat(tick)}</text></g>; })}
              </g>
            </g>
          </svg>

          {isTimelineLoading && <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"><div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm"><span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" aria-hidden="true" />Loading timeline data...</div></div>}
          {isDetailEmpty && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6"><div className="rounded-md border border-border/60 bg-background/90 px-4 py-3 text-center shadow-sm"><p className="text-sm font-medium text-foreground">No data in this range</p><p className="mt-1 text-xs text-muted-foreground">Try expanding the brush range or adjusting filters.</p></div></div>}
          {hoveredDetail && <div className="pointer-events-none absolute top-0 z-10 rounded bg-background/95 px-2 py-1 text-xs text-foreground shadow-sm" style={{ left: hoveredDetail.x + DETAIL_MARGIN.left, transform: 'translate(-50%, -100%)' }}>{hoveredDetail.label}</div>}
        </div>
      </div>
    </div>
  );
}
