import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { ScaleTime } from 'd3-scale';
import { DOMVector } from '@/app/timeline-test/lib/dom-vector';
import {
  MIN_SLICE_DURATION,
  constrainDuration,
  formatDuration,
  formatTimeRange,
  getSnapInterval,
  snapToInterval,
} from '@/app/timeline-test/lib/slice-utils';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';

export const DRAG_THRESHOLD = 10;

type GhostPosition = {
  x: number;
  width: number;
};

type DragStart = {
  x: number;
  timeSec: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getRangeBounds = (scale: ScaleTime<number, number>): [number, number] => {
  const range = scale.range();
  const start = Math.min(range[0], range[1]);
  const end = Math.max(range[0], range[1]);
  return [start, end];
};

const getDomainSec = (scale: ScaleTime<number, number>): [number, number] => {
  const domain = scale.domain();
  const start = Math.min(domain[0].getTime(), domain[1].getTime()) / 1000;
  const end = Math.max(domain[0].getTime(), domain[1].getTime()) / 1000;
  return [start, end];
};

const toNormalized = (timeSec: number, domainStartSec: number, domainEndSec: number): number => {
  const spanSec = Math.max(1, domainEndSec - domainStartSec);
  return clamp(((timeSec - domainStartSec) / spanSec) * 100, 0, 100);
};

const toSeconds = (x: number, scale: ScaleTime<number, number>, domainStartSec: number, domainEndSec: number): number => {
  const rawSec = scale.invert(x).getTime() / 1000;
  return clamp(rawSec, domainStartSec, domainEndSec);
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
  const snapEnabled = useSliceCreationStore((state) => state.snapEnabled);
  const previewStart = useSliceCreationStore((state) => state.previewStart);
  const previewEnd = useSliceCreationStore((state) => state.previewEnd);
  const updatePreview = useSliceCreationStore((state) => state.updatePreview);
  const setPreviewFeedback = useSliceCreationStore((state) => state.setPreviewFeedback);
  const setDragActive = useSliceCreationStore((state) => state.setDragActive);
  const commitCreation = useSliceCreationStore((state) => state.commitCreation);
  const cancelCreation = useSliceCreationStore((state) => state.cancelCreation);
  const previewIsValid = useSliceCreationStore((state) => state.previewIsValid);
  const previewReason = useSliceCreationStore((state) => state.previewReason);
  const previewDurationLabel = useSliceCreationStore((state) => state.previewDurationLabel);
  const previewTimeRangeLabel = useSliceCreationStore((state) => state.previewTimeRangeLabel);
  const snapInterval = useSliceCreationStore((state) => state.snapInterval);

  const dragStartRef = useRef<DragStart | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const [isNearEdge, setIsNearEdge] = useState(false);

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
    setDragActive(false);
    setGhostPosition(null);
    setIsNearEdge(false);
  }, [setDragActive]);

  const updatePreviewFromSeconds = useCallback(
    (startSec: number, endSec: number, validity: { isValid: boolean; reason?: string }, activeSnapInterval: number) => {
      const [domainStartSec, domainEndSec] = getDomainSec(scale);
      const startNorm = toNormalized(startSec, domainStartSec, domainEndSec);
      const endNorm = toNormalized(endSec, domainStartSec, domainEndSec);

      updatePreview(startNorm, endNorm);
      setPreviewFeedback({
        isValid: validity.isValid,
        reason: validity.reason,
        durationLabel: formatDuration(Math.abs(endSec - startSec)),
        timeRangeLabel: formatTimeRange(startNorm, endNorm, domainStartSec, domainEndSec),
        snapInterval: activeSnapInterval,
      });

      const [rangeStart, rangeEnd] = getRangeBounds(scale);
      const startX = clamp(scale(new Date(startSec * 1000)), rangeStart, rangeEnd);
      const endX = clamp(scale(new Date(endSec * 1000)), rangeStart, rangeEnd);
      setGhostPosition({
        x: Math.min(startX, endX),
        width: Math.abs(endX - startX),
      });
    },
    [scale, setPreviewFeedback, updatePreview]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating) return;

      const pointerX = getPointerX(event, containerRef, scale);
      if (pointerX === null) return;

      const [domainStartSec, domainEndSec] = getDomainSec(scale);
      const currentSnapInterval = getSnapInterval(domainStartSec, domainEndSec);
      const pointerSec = toSeconds(pointerX, scale, domainStartSec, domainEndSec);
      const startSec = snapEnabled
        ? clamp(snapToInterval(pointerSec, currentSnapInterval, domainStartSec), domainStartSec, domainEndSec)
        : pointerSec;

      dragStartRef.current = {
        x: pointerX,
        timeSec: startSec,
      };
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragActive(false);
      setGhostPosition(null);
      setIsNearEdge(false);
      setPreviewFeedback({ isValid: true, snapInterval: currentSnapInterval });

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [containerRef, isCreating, scale, setDragActive, setPreviewFeedback, snapEnabled]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating || !dragStartRef.current) return;

      const pointerX = getPointerX(event, containerRef, scale);
      if (pointerX === null) return;

      const [rangeStart, rangeEnd] = getRangeBounds(scale);
      const [domainStartSec, domainEndSec] = getDomainSec(scale);
      const currentSnapInterval = getSnapInterval(domainStartSec, domainEndSec);

      const dragVector = new DOMVector(
        dragStartRef.current.x,
        0,
        pointerX - dragStartRef.current.x,
        0
      );

      if (!isDraggingRef.current && dragVector.getDiagonalLength() >= DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        setIsDragging(true);
        setDragActive(true);
      }

      if (!isDraggingRef.current) {
        setPreviewFeedback({ isValid: true, snapInterval: currentSnapInterval });
        return;
      }

      const rawEndSec = toSeconds(pointerX, scale, domainStartSec, domainEndSec);
      const snappedEndSec = snapEnabled
        ? clamp(snapToInterval(rawEndSec, currentSnapInterval, domainStartSec), domainStartSec, domainEndSec)
        : rawEndSec;
      const snappedStartSec = snapEnabled
        ? clamp(
            snapToInterval(dragStartRef.current.timeSec, currentSnapInterval, domainStartSec),
            domainStartSec,
            domainEndSec
          )
        : dragStartRef.current.timeSec;

      const constrained = constrainDuration(snappedStartSec, snappedEndSec, domainStartSec, domainEndSec);
      updatePreviewFromSeconds(
        constrained.start,
        constrained.end,
        { isValid: constrained.isValid, reason: constrained.reason },
        currentSnapInterval
      );

      const edgeThreshold = Math.max(8, (rangeEnd - rangeStart) * 0.02);
      const nearRangeEdge = pointerX - rangeStart < edgeThreshold || rangeEnd - pointerX < edgeThreshold;
      const nearDomainEdge = constrained.start <= domainStartSec || constrained.end >= domainEndSec;
      setIsNearEdge(nearRangeEdge || nearDomainEdge);

      event.preventDefault();
      event.stopPropagation();
    },
    [containerRef, isCreating, scale, setDragActive, setPreviewFeedback, snapEnabled, updatePreviewFromSeconds]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isCreating || !dragStartRef.current) return;

      const [domainStartSec, domainEndSec] = getDomainSec(scale);
      const currentSnapInterval = getSnapInterval(domainStartSec, domainEndSec);
      const pointerX = getPointerX(event, containerRef, scale) ?? dragStartRef.current.x;
      const pointerSec = toSeconds(pointerX, scale, domainStartSec, domainEndSec);

      if (!isDraggingRef.current) {
        const clickSec = snapEnabled
          ? clamp(snapToInterval(pointerSec, currentSnapInterval, domainStartSec), domainStartSec, domainEndSec)
          : pointerSec;
        const defaultDurationSec = Math.max(MIN_SLICE_DURATION, (domainEndSec - domainStartSec) * 0.1);
        const halfDuration = defaultDurationSec / 2;
        const constrained = constrainDuration(
          clickSec - halfDuration,
          clickSec + halfDuration,
          domainStartSec,
          domainEndSec
        );

        updatePreviewFromSeconds(
          constrained.start,
          constrained.end,
          { isValid: constrained.isValid, reason: constrained.reason },
          currentSnapInterval
        );
      } else {
        const endSec = snapEnabled
          ? clamp(snapToInterval(pointerSec, currentSnapInterval, domainStartSec), domainStartSec, domainEndSec)
          : pointerSec;
        const startSec = snapEnabled
          ? clamp(
              snapToInterval(dragStartRef.current.timeSec, currentSnapInterval, domainStartSec),
              domainStartSec,
              domainEndSec
            )
          : dragStartRef.current.timeSec;
        const constrained = constrainDuration(startSec, endSec, domainStartSec, domainEndSec);

        updatePreviewFromSeconds(
          constrained.start,
          constrained.end,
          { isValid: constrained.isValid, reason: constrained.reason },
          currentSnapInterval
        );
      }

      commitCreation();
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      resetDragState();
    },
    [commitCreation, containerRef, isCreating, resetDragState, scale, snapEnabled, updatePreviewFromSeconds]
  );

  useEffect(() => {
    if (!isCreating) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      cancelCreation();
      resetDragState();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cancelCreation, isCreating, resetDragState]);

  useEffect(() => {
    if (isCreating) return;
    dragStartRef.current = null;
    isDraggingRef.current = false;
  }, [isCreating]);

  useEffect(() => {
    const onResize = () => {
      if (!isCreating || !dragStartRef.current) return;
      cancelCreation();
      resetDragState();
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [cancelCreation, isCreating, resetDragState]);

  return {
    isCreating,
    isPreviewValid: previewIsValid,
    previewReason,
    previewDurationLabel,
    previewTimeRangeLabel,
    snapInterval,
    isDragging: isCreating ? isDragging : false,
    isNearEdge: isCreating ? isNearEdge : false,
    ghostPosition: isCreating ? ghostPosition : null,
    currentRange,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
