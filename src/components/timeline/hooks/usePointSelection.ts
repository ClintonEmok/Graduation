import { useCallback, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import type { ScaleTime } from 'd3-scale';
import { epochSecondsToNormalized } from '@/lib/time-domain';
import { findNearestIndexByTime } from '@/lib/selection';
import { clampToRange } from '@/components/timeline/lib/interaction-guards';

export interface HoveredDetailState {
  x: number;
  label: string;
}

export interface NearestSelectionResult {
  index: number;
  distance: number;
  point: {
    timestampSec: number | null;
  };
}

export interface PointerPosition {
  x: number;
  epochSeconds: number;
}

export const getSelectionThresholdSeconds = (detailRangeSec: [number, number]): number => {
  const rangeSpan = Math.abs(detailRangeSec[1] - detailRangeSec[0]) || 1;
  return Math.max(rangeSpan * 0.01, 60);
};

export const resolvePointerPosition = (
  clientX: number,
  rectLeft: number,
  width: number,
  invert: (x: number) => Date
): PointerPosition | null => {
  if (!Number.isFinite(clientX) || !Number.isFinite(rectLeft) || !Number.isFinite(width) || width <= 0) {
    return null;
  }
  const x = clampToRange(clientX - rectLeft, 0, width);
  const epochSeconds = invert(x).getTime() / 1000;
  if (!Number.isFinite(epochSeconds)) {
    return null;
  }
  return { x, epochSeconds };
};

export const resolveNearestSelectionIndex = (
  nearest: NearestSelectionResult | null,
  detailRangeSec: [number, number]
): number | null => {
  if (!nearest) {
    return null;
  }
  return nearest.distance <= getSelectionThresholdSeconds(detailRangeSec) ? nearest.index : null;
};

export interface UsePointSelectionParams {
  interactive: boolean;
  detailInnerWidth: number;
  detailScale: ScaleTime<number, number>;
  detailRangeSec: [number, number];
  domainStart: number;
  domainEnd: number;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  resolvedDetailRenderMode: 'points' | 'bins';
  isScrubbingRef: MutableRefObject<boolean>;
  setTime: (value: number) => void;
  setSelectedIndex: (index: number, source: 'map' | 'cube' | 'timeline') => void;
  clearSelection: () => void;
}

export interface UsePointSelectionResult {
  hoveredDetail: HoveredDetailState | null;
  handlePointerDown: (event: ReactPointerEvent<SVGRectElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<SVGRectElement>) => void;
  handlePointerUpWithSelection: (event: ReactPointerEvent<SVGRectElement>) => void;
  handlePointerCancel: (event: ReactPointerEvent<SVGRectElement>) => void;
}

export const usePointSelection = ({
  interactive,
  detailInnerWidth,
  detailScale,
  detailRangeSec,
  domainStart,
  domainEnd,
  minTimestampSec,
  maxTimestampSec,
  resolvedDetailRenderMode,
  isScrubbingRef,
  setTime,
  setSelectedIndex,
  clearSelection,
}: UsePointSelectionParams): UsePointSelectionResult => {
  const [hoveredDetail, setHoveredDetail] = useState<HoveredDetailState | null>(null);

  const resolvePointerEvent = useCallback(
    (event: ReactPointerEvent<SVGRectElement>): PointerPosition | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      return resolvePointerPosition(event.clientX, rect.left, detailInnerWidth, (x) => detailScale.invert(x));
    },
    [detailInnerWidth, detailScale]
  );

  const scrubFromEvent = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      const pointer = resolvePointerEvent(event);
      if (!pointer) return;
      const normalized = clampToRange(epochSecondsToNormalized(pointer.epochSeconds, domainStart, domainEnd), 0, 100);
      setTime(normalized);
    },
    [domainEnd, domainStart, interactive, resolvePointerEvent, setTime]
  );

  const handleSelectFromEvent = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const pointer = resolvePointerEvent(event);
      if (!pointer) {
        return;
      }
      const nearest = findNearestIndexByTime(pointer.epochSeconds);
      const selected = resolveNearestSelectionIndex(nearest, detailRangeSec);
      if (selected !== null) {
        setSelectedIndex(selected, 'timeline');
      } else {
        clearSelection();
      }
    },
    [clearSelection, detailRangeSec, resolvePointerEvent, setSelectedIndex]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      isScrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      scrubFromEvent(event);
    },
    [interactive, isScrubbingRef, scrubFromEvent]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      const pointer = resolvePointerEvent(event);
      if (!pointer) {
        setHoveredDetail(null);
        return;
      }

      if (resolvedDetailRenderMode === 'points') {
        const nearest = findNearestIndexByTime(pointer.epochSeconds);
        const selected = resolveNearestSelectionIndex(nearest, detailRangeSec);
        if (nearest && selected !== null) {
          const ts = nearest.point.timestampSec ?? pointer.epochSeconds;
          const label =
            minTimestampSec !== null && maxTimestampSec !== null
              ? new Date(ts * 1000).toLocaleString()
              : `t=${ts.toFixed(2)}`;
          setHoveredDetail({ x: pointer.x, label });
        } else {
          setHoveredDetail(null);
        }
      } else {
        setHoveredDetail(null);
      }

      if (!isScrubbingRef.current) return;
      scrubFromEvent(event);
    },
    [
      detailRangeSec,
      interactive,
      isScrubbingRef,
      maxTimestampSec,
      minTimestampSec,
      resolvePointerEvent,
      resolvedDetailRenderMode,
      scrubFromEvent,
    ]
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      isScrubbingRef.current = false;
      setHoveredDetail(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [isScrubbingRef]
  );

  const handlePointerUpWithSelection = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      isScrubbingRef.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      handleSelectFromEvent(event);
    },
    [handleSelectFromEvent, isScrubbingRef]
  );

  return {
    hoveredDetail,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
  };
};
