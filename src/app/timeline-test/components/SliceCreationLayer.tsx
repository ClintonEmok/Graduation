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

export function SliceCreationLayer({ scale, height, containerRef }: SliceCreationLayerProps) {
  const isCreating = useSliceCreationStore((state) => state.isCreating);
  const previewStart = useSliceCreationStore((state) => state.previewStart);
  const previewEnd = useSliceCreationStore((state) => state.previewEnd);
  const {
    isDragging,
    ghostPosition,
    currentRange,
    isPreviewValid,
    previewReason,
    previewDurationLabel,
    previewTimeRangeLabel,
    handlers,
  } = useSliceCreation(scale, containerRef);

  const previewRange = useMemo(() => {
    if (currentRange) return currentRange;
    if (previewStart === null || previewEnd === null) return null;
    return [Math.min(previewStart, previewEnd), Math.max(previewStart, previewEnd)] as [number, number];
  }, [currentRange, previewEnd, previewStart]);

  const hasGhost = Boolean(ghostPosition) || Boolean(previewRange);
  const ghostWidth = Math.max(2, ghostPosition?.width ?? 2);
  const tooltipLabel = previewTimeRangeLabel;

  if (!isCreating) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className={`pointer-events-auto absolute inset-0 ${isPreviewValid ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        aria-label="Create time slice by clicking or dragging"
        role="application"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      />

      {hasGhost && ghostPosition && (
        <div
          className={`pointer-events-none absolute top-0 rounded-sm border-2 transition-all duration-75 ${
            isPreviewValid
              ? 'border-amber-500/60 bg-amber-500/20'
              : 'border-red-500/40 bg-red-500/10'
          }`}
          style={{
            left: ghostPosition.x,
            width: ghostWidth,
            height,
          }}
        >
          {isDragging && tooltipLabel && (
            <div
              className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs text-white ${
                isPreviewValid ? 'bg-amber-500' : 'bg-red-500'
              }`}
              aria-live="polite"
            >
              {previewDurationLabel ? `${tooltipLabel} (${previewDurationLabel})` : tooltipLabel}
              {previewReason ? <span className="ml-2 font-semibold">{previewReason}</span> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
