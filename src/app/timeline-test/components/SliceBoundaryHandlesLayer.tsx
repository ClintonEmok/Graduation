import { useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ScaleTime } from 'd3-scale';
import { formatDuration } from '@/app/timeline-test/lib/slice-utils';
import { useSliceBoundaryAdjustment } from '@/app/timeline-test/hooks/useSliceBoundaryAdjustment';
import type { AdjustmentHandle } from '@/app/timeline-test/lib/slice-adjustment';
import { useSliceStore } from '@/store/useSliceStore';

interface SliceBoundaryHandlesLayerProps {
  scale: ScaleTime<number, number>;
  height: number;
  domainSec: [number, number];
}

interface HandleGeometry {
  sliceId: string;
  handle: AdjustmentHandle;
  x: number;
}

const VISUAL_WIDTH = 8;
const HIT_WIDTH = 12;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const toBoundarySec = (normalized: number, domainStartSec: number, domainEndSec: number): number => {
  const span = Math.max(1, domainEndSec - domainStartSec);
  return domainStartSec + (clamp(normalized, 0, 100) / 100) * span;
};

export function SliceBoundaryHandlesLayer({ scale, height, domainSec }: SliceBoundaryHandlesLayerProps) {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);

  const {
    draggingSliceId,
    draggingHandle,
    hoverSliceId,
    hoverHandle,
    tooltip,
    limitCue,
    handlers,
  } = useSliceBoundaryAdjustment(scale, domainSec);

  const geometries = useMemo<HandleGeometry[]>(() => {
    const [rangeStart, rangeEnd] = scale.range();
    const minRange = Math.min(rangeStart, rangeEnd);
    const maxRange = Math.max(rangeStart, rangeEnd);
    const [domainStartSec, domainEndSec] = [Math.min(domainSec[0], domainSec[1]), Math.max(domainSec[0], domainSec[1])];

    const handles: HandleGeometry[] = [];
    for (const slice of slices) {
      if (slice.type !== 'range' || !slice.range || !slice.isVisible || slice.isLocked) {
        continue;
      }

      const shouldShow =
        slice.id === activeSliceId || slice.id === hoverSliceId || slice.id === draggingSliceId;
      if (!shouldShow) {
        continue;
      }

      const startSec = toBoundarySec(Math.min(slice.range[0], slice.range[1]), domainStartSec, domainEndSec);
      const endSec = toBoundarySec(Math.max(slice.range[0], slice.range[1]), domainStartSec, domainEndSec);
      const startX = clamp(scale(new Date(startSec * 1000)), minRange, maxRange);
      const endX = clamp(scale(new Date(endSec * 1000)), minRange, maxRange);

      handles.push({ sliceId: slice.id, handle: 'start', x: startX });
      handles.push({ sliceId: slice.id, handle: 'end', x: endX });
    }

    return handles;
  }, [activeSliceId, domainSec, draggingSliceId, hoverSliceId, scale, slices]);

  if (geometries.length === 0 && !tooltip) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {geometries.map((geometry) => {
          const isDraggingHandle = draggingSliceId === geometry.sliceId && draggingHandle === geometry.handle;
          const isHoveredHandle = hoverSliceId === geometry.sliceId && hoverHandle === geometry.handle;

          const handleClass = isDraggingHandle
            ? 'fill-amber-200/95 stroke-amber-50'
            : isHoveredHandle
              ? 'fill-cyan-200/90 stroke-cyan-50'
              : 'fill-cyan-300/65 stroke-cyan-100/80';

          return (
            <g key={`${geometry.sliceId}-${geometry.handle}`}>
              <rect
                x={geometry.x - VISUAL_WIDTH / 2}
                y={0}
                width={VISUAL_WIDTH}
                height={height}
                rx={2}
                className={`${handleClass} pointer-events-none stroke-[1.25] transition-all duration-75`}
              />
              <rect
                x={geometry.x - HIT_WIDTH / 2}
                y={0}
                width={HIT_WIDTH}
                height={height}
                fill="transparent"
                className="pointer-events-auto cursor-ew-resize"
                style={{ touchAction: 'none' }}
                onPointerEnter={() => handlers.onHandlePointerEnter(geometry.sliceId, geometry.handle)}
                onPointerLeave={handlers.onHandlePointerLeave}
                onPointerDown={(event: ReactPointerEvent<SVGRectElement>) =>
                  handlers.onHandlePointerDown(event, geometry.sliceId, geometry.handle)
                }
                onPointerMove={handlers.onHandlePointerMove}
                onPointerUp={handlers.onHandlePointerUp}
                onPointerCancel={handlers.onHandlePointerCancel}
              />
            </g>
          );
        })}
      </svg>

      {tooltip ? (
        <div
          className="pointer-events-none absolute -top-12 rounded-md border border-slate-600/80 bg-slate-950/95 px-2.5 py-1 text-[11px] text-slate-100 shadow-lg"
          style={{
            left: tooltip.x,
            transform: 'translateX(-50%)',
          }}
          aria-live="polite"
        >
          <span className="font-medium">{tooltip.label}</span>
          <span className="ml-2 text-slate-300">{formatDuration(tooltip.durationSec)}</span>
          {limitCue !== 'none' ? (
            <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-200">{limitCue}</span>
          ) : null}
          <span
            className={`ml-2 rounded px-1.5 py-0.5 ${
              tooltip.snapState === 'snapped'
                ? 'bg-cyan-500/20 text-cyan-200'
                : tooltip.snapState === 'bypass'
                  ? 'bg-rose-500/20 text-rose-200'
                  : 'bg-slate-700 text-slate-200'
            }`}
          >
            {tooltip.snapState === 'snapped'
              ? 'Snapped'
              : tooltip.snapState === 'bypass'
                ? 'Snap bypass'
                : 'Free'}
          </span>
        </div>
      ) : null}
    </div>
  );
}
