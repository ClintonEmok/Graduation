import { useMemo } from 'react';
import type { RefObject } from 'react';
import type { ScaleTime } from 'd3-scale';
import { useSliceCreation } from '@/app/timeline-test/hooks/useSliceCreation';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';

interface SliceCreationLayerProps {
  scale: ScaleTime<number, number>;
  height: number;
  containerRef: RefObject<HTMLElement | null>;
}

const formatTimeRange = (
  range: [number, number],
  scale: ScaleTime<number, number>
) => {
  const [start, end] = range;
  const domain = scale.domain();
  const domainStartMs = Math.min(domain[0].getTime(), domain[1].getTime());
  const domainEndMs = Math.max(domain[0].getTime(), domain[1].getTime());
  const spanMs = Math.max(1, domainEndMs - domainStartMs);

  const toDate = (normalized: number) =>
    new Date(domainStartMs + (normalized / 100) * spanMs);

  const startDate = toDate(start);
  const endDate = toDate(end);

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

export function SliceCreationLayer({ scale, height, containerRef }: SliceCreationLayerProps) {
  const isCreating = useSliceCreationStore((state) => state.isCreating);
  const previewStart = useSliceCreationStore((state) => state.previewStart);
  const previewEnd = useSliceCreationStore((state) => state.previewEnd);
  const { isDragging, ghostPosition, currentRange, handlers } = useSliceCreation(scale, containerRef);

  const previewRange = useMemo(() => {
    if (currentRange) return currentRange;
    if (previewStart === null || previewEnd === null) return null;
    return [Math.min(previewStart, previewEnd), Math.max(previewStart, previewEnd)] as [number, number];
  }, [currentRange, previewEnd, previewStart]);

  const hasGhost = Boolean(ghostPosition) || Boolean(previewRange);
  const ghostWidth = Math.max(2, ghostPosition?.width ?? 2);
  const tooltipLabel = previewRange ? formatTimeRange(previewRange, scale) : null;

  if (!isCreating) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="pointer-events-auto absolute inset-0 cursor-crosshair"
        role="presentation"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      />

      {hasGhost && ghostPosition && (
        <div
          className="pointer-events-none absolute top-0 rounded-sm border-2 border-amber-500/60 bg-amber-500/20 transition-all duration-75"
          style={{
            left: ghostPosition.x,
            width: ghostWidth,
            height,
          }}
        >
          {isDragging && tooltipLabel && (
            <div
              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500 px-2 py-1 text-xs text-white"
              aria-live="polite"
            >
              {tooltipLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
