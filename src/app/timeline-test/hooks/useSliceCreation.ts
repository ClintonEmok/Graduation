import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { ScaleTime } from 'd3-scale';
import { DOMVector } from '@/app/timeline-test/lib/dom-vector';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';

export const DRAG_THRESHOLD = 10;

type GhostPosition = {
  x: number;
  width: number;
};

type DragStart = {
  x: number;
  time: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getRangeBounds = (scale: ScaleTime<number, number>): [number, number] => {
  const range = scale.range();
  const start = Math.min(range[0], range[1]);
  const end = Math.max(range[0], range[1]);
  return [start, end];
};

const getDomainMs = (scale: ScaleTime<number, number>): [number, number] => {
  const domain = scale.domain();
  const start = Math.min(domain[0].getTime(), domain[1].getTime());
  const end = Math.max(domain[0].getTime(), domain[1].getTime());
  return [start, end];
};

const normalizeTime = (date: Date, scale: ScaleTime<number, number>) => {
  const [domainStartMs, domainEndMs] = getDomainMs(scale);
  const domainSpanMs = Math.max(1, domainEndMs - domainStartMs);
  return clamp(((date.getTime() - domainStartMs) / domainSpanMs) * 100, 0, 100);
};

const getPointerX = (
  event: ReactPointerEvent<HTMLElement>,
  containerRef: RefObject<HTMLElement | null>,
  scale: ScaleTime<number, number>
) => {
  const rect = event.currentTarget.getBoundingClientRect() ?? containerRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const [rangeStart, rangeEnd] = getRangeBounds(scale);
  return clamp(event.clientX - rect.left, rangeStart, rangeEnd);
};

export function useSliceCreation(
  scale: ScaleTime<number, number>,
  containerRef: RefObject<HTMLElement | null>
) {
  const isCreating = useSliceCreationStore((state) => state.isCreating);
  const previewStart = useSliceCreationStore((state) => state.previewStart);
  const previewEnd = useSliceCreationStore((state) => state.previewEnd);
  const updatePreview = useSliceCreationStore((state) => state.updatePreview);
  const commitCreation = useSliceCreationStore((state) => state.commitCreation);

  const dragStartRef = useRef<DragStart | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);

  const currentRange = useMemo(() => {
    if (previewStart === null || previewEnd === null) {
      return null;
    }
    return [Math.min(previewStart, previewEnd), Math.max(previewStart, previewEnd)] as [number, number];
  }, [previewEnd, previewStart]);

  const resetDragState = useCallback(() => {
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
    setGhostPosition(null);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating) return;

      const pointerX = getPointerX(event, containerRef, scale);
      if (pointerX === null) return;

      const pointerTime = normalizeTime(scale.invert(pointerX), scale);
      dragStartRef.current = {
        x: pointerX,
        time: pointerTime,
      };
      isDraggingRef.current = false;
      setIsDragging(false);
      setGhostPosition(null);

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [containerRef, isCreating, scale]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating || !dragStartRef.current) return;

      const pointerX = getPointerX(event, containerRef, scale);
      if (pointerX === null) return;

      const dragVector = new DOMVector(
        dragStartRef.current.x,
        0,
        pointerX - dragStartRef.current.x,
        0
      );

      if (!isDraggingRef.current && dragVector.getDiagonalLength() >= DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (!isDraggingRef.current) {
        return;
      }

      const dragRect = dragVector.toDOMRect();
      const startTime = dragStartRef.current.time;
      const endTime = normalizeTime(scale.invert(pointerX), scale);
      updatePreview(startTime, endTime);
      setGhostPosition({
        x: dragRect.x,
        width: dragRect.width,
      });

      event.preventDefault();
      event.stopPropagation();
    },
    [containerRef, isCreating, scale, updatePreview]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating || !dragStartRef.current) return;

      const pointerX = getPointerX(event, containerRef, scale);
      if (pointerX === null) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resetDragState();
        return;
      }

      if (!isDraggingRef.current) {
        const clickTime = normalizeTime(scale.invert(pointerX), scale);
        const [domainStartMs, domainEndMs] = getDomainMs(scale);
        const defaultDurationMs = (domainEndMs - domainStartMs) * 0.1;
        const defaultDurationNorm = (defaultDurationMs / Math.max(1, domainEndMs - domainStartMs)) * 100;
        const halfDuration = defaultDurationNorm / 2;
        const start = clamp(clickTime - halfDuration, 0, 100);
        const end = clamp(clickTime + halfDuration, 0, 100);
        updatePreview(start, end);
      } else {
        const start = dragStartRef.current.time;
        const end = normalizeTime(scale.invert(pointerX), scale);
        updatePreview(start, end);
      }

      commitCreation();
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      resetDragState();
    },
    [commitCreation, containerRef, isCreating, resetDragState, scale, updatePreview]
  );

  return {
    isCreating,
    isDragging,
    ghostPosition,
    currentRange,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
