import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ScaleTime } from 'd3-scale';
import {
  adjustBoundary,
  getAdaptiveIntervalSec,
  normalizedToSec,
  resolveNeighborCandidates,
  type AdjustmentHandle,
} from '@/app/timeline-test/lib/slice-adjustment';
import { MIN_SLICE_DURATION } from '@/app/timeline-test/lib/slice-utils';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';
import { useSliceStore } from '@/store/useSliceStore';

const GRID_CANDIDATE_RADIUS = 4;

type DragContext = {
  pointerId: number;
  sliceId: string;
  handle: AdjustmentHandle;
  fixedBoundarySec: number;
  domainStartSec: number;
  domainEndSec: number;
  scaleDomainStartSec: number;
  scaleDomainEndSec: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const toRangeBounds = (scale: ScaleTime<number, number>): [number, number] => {
  const [start, end] = scale.range();
  return [Math.min(start, end), Math.max(start, end)];
};

const toDomainBounds = (domainSec: [number, number]): [number, number] => [
  Math.min(domainSec[0], domainSec[1]),
  Math.max(domainSec[0], domainSec[1]),
];

const toScaleDomainBounds = (scale: ScaleTime<number, number>): [number, number] => {
  const [start, end] = scale.domain();
  const startSec = start.getTime() / 1000;
  const endSec = end.getTime() / 1000;
  return [Math.min(startSec, endSec), Math.max(startSec, endSec)];
};

const toPointerX = (
  event: ReactPointerEvent<SVGRectElement>,
  scale: ScaleTime<number, number>
): number => {
  const [rangeStart, rangeEnd] = toRangeBounds(scale);
  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  return clamp(localX, rangeStart, rangeEnd);
};

const toBoundaryLabel = (boundarySec: number): string => {
  const boundary = new Date(boundarySec * 1000);
  return boundary.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildGridCandidates = (
  rawSec: number,
  intervalSec: number,
  domainStartSec: number,
  domainEndSec: number
): number[] => {
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    return [];
  }

  const offset = rawSec - domainStartSec;
  const center = domainStartSec + Math.round(offset / intervalSec) * intervalSec;
  const candidates: number[] = [];

  for (let i = -GRID_CANDIDATE_RADIUS; i <= GRID_CANDIDATE_RADIUS; i += 1) {
    const candidate = center + i * intervalSec;
    if (candidate >= domainStartSec && candidate <= domainEndSec) {
      candidates.push(candidate);
    }
  }

  return candidates;
};

export function useSliceBoundaryAdjustment(
  scale: ScaleTime<number, number>,
  domainSec: [number, number]
) {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);

  const draggingSliceId = useSliceAdjustmentStore((state) => state.draggingSliceId);
  const draggingHandle = useSliceAdjustmentStore((state) => state.draggingHandle);
  const hoverSliceId = useSliceAdjustmentStore((state) => state.hoverSliceId);
  const hoverHandle = useSliceAdjustmentStore((state) => state.hoverHandle);
  const tooltip = useSliceAdjustmentStore((state) => state.tooltip);
  const limitCue = useSliceAdjustmentStore((state) => state.limitCue);
  const snapEnabled = useSliceAdjustmentStore((state) => state.snapEnabled);
  const snapMode = useSliceAdjustmentStore((state) => state.snapMode);
  const fixedSnapPresetSec = useSliceAdjustmentStore((state) => state.fixedSnapPresetSec);

  const beginDrag = useSliceAdjustmentStore((state) => state.beginDrag);
  const updateDrag = useSliceAdjustmentStore((state) => state.updateDrag);
  const endDrag = useSliceAdjustmentStore((state) => state.endDrag);
  const setHover = useSliceAdjustmentStore((state) => state.setHover);
  const updateTooltip = useSliceAdjustmentStore((state) => state.updateTooltip);

  const dragContextRef = useRef<DragContext | null>(null);
  const [domainStartSec, domainEndSec] = toDomainBounds(domainSec);
  const [scaleDomainStartSec, scaleDomainEndSec] = toScaleDomainBounds(scale);

  const rangeBoundaries = useMemo(
    () =>
      slices
        .filter((slice) => slice.type === 'range' && slice.range)
        .map((slice) => ({
          id: slice.id,
          startSec: normalizedToSec(Math.min(slice.range![0], slice.range![1]), domainStartSec, domainEndSec),
          endSec: normalizedToSec(Math.max(slice.range![0], slice.range![1]), domainStartSec, domainEndSec),
          isVisible: slice.isVisible,
        })),
    [domainEndSec, domainStartSec, slices]
  );

  const finishDrag = useCallback(() => {
    dragContextRef.current = null;
    endDrag();
    updateTooltip(null);
  }, [endDrag, updateTooltip]);

  useEffect(() => {
    const context = dragContextRef.current;
    if (!context) {
      return;
    }

    const domainChanged =
      context.domainStartSec !== domainStartSec ||
      context.domainEndSec !== domainEndSec ||
      context.scaleDomainStartSec !== scaleDomainStartSec ||
      context.scaleDomainEndSec !== scaleDomainEndSec;

    if (domainChanged) {
      finishDrag();
    }
  }, [domainEndSec, domainStartSec, finishDrag, scaleDomainEndSec, scaleDomainStartSec]);

  const applyDragUpdate = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const context = dragContextRef.current;
      if (!context || event.pointerId !== context.pointerId) {
        return;
      }

      const [rangeStart, rangeEnd] = toRangeBounds(scale);
      const pointerX = toPointerX(event, scale);
      const pointerSec = clamp(scale.invert(pointerX).getTime() / 1000, domainStartSec, domainEndSec);
      const intervalSec =
        snapMode === 'fixed' && fixedSnapPresetSec
          ? fixedSnapPresetSec
          : getAdaptiveIntervalSec(domainStartSec, domainEndSec);

      const modifierBypass = event.altKey;
      const gridCandidates = buildGridCandidates(pointerSec, intervalSec, domainStartSec, domainEndSec);
      const neighborCandidates = resolveNeighborCandidates({
        boundaries: rangeBoundaries,
        activeSliceId: context.sliceId,
        handle: context.handle,
        domainStartSec,
        domainEndSec,
        fixedBoundarySec: context.fixedBoundarySec,
      });

      const result = adjustBoundary({
        handle: context.handle,
        rawPointerSec: pointerSec,
        fixedBoundarySec: context.fixedBoundarySec,
        domainStartSec,
        domainEndSec,
        minDurationSec: MIN_SLICE_DURATION,
        snap: {
          enabled: snapEnabled,
          bypass: modifierBypass,
          mode: snapMode,
          toleranceSec: Math.max(1, intervalSec * 0.35),
          gridCandidatesSec: gridCandidates,
          neighborCandidatesSec: neighborCandidates,
        },
      });

      updateSlice(context.sliceId, {
        range: [result.startNorm, result.endNorm],
      });

      const activeBoundarySec = context.handle === 'start' ? result.startSec : result.endSec;
      const boundaryX = clamp(scale(new Date(activeBoundarySec * 1000)), rangeStart, rangeEnd);

      updateDrag({
        limitCue: result.limitCue,
        modifierBypass,
        liveBoundarySec: activeBoundarySec,
        liveBoundaryX: boundaryX,
      });

      updateTooltip({
        x: boundaryX,
        y: 8,
        boundarySec: activeBoundarySec,
        durationSec: Math.max(0, result.endSec - result.startSec),
        label: toBoundaryLabel(activeBoundarySec),
        snapState: modifierBypass ? 'bypass' : result.snapSource === 'none' ? 'free' : 'snapped',
      });

      event.preventDefault();
      event.stopPropagation();
    },
    [
      domainEndSec,
      domainStartSec,
      fixedSnapPresetSec,
      rangeBoundaries,
      scale,
      snapEnabled,
      snapMode,
      updateDrag,
      updateSlice,
      updateTooltip,
    ]
  );

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, sliceId: string, handle: AdjustmentHandle) => {
      const targetSliceId = sliceId;
      const selected = slices.find(
        (slice) =>
          slice.id === targetSliceId &&
          slice.type === 'range' &&
          slice.range &&
          slice.isVisible &&
          !slice.isLocked
      );
      if (!selected?.range) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const selectedStartSec = normalizedToSec(
        Math.min(selected.range[0], selected.range[1]),
        domainStartSec,
        domainEndSec
      );
      const selectedEndSec = normalizedToSec(
        Math.max(selected.range[0], selected.range[1]),
        domainStartSec,
        domainEndSec
      );

      if (activeSliceId !== selected.id) {
        setActiveSlice(selected.id);
      }

      dragContextRef.current = {
        pointerId: event.pointerId,
        sliceId: selected.id,
        handle,
        fixedBoundarySec: handle === 'start' ? selectedEndSec : selectedStartSec,
        domainStartSec,
        domainEndSec,
        scaleDomainStartSec,
        scaleDomainEndSec,
      };

      beginDrag({ sliceId: selected.id, handle });
      updateTooltip(null);
      event.currentTarget.setPointerCapture(event.pointerId);
      applyDragUpdate(event);
    },
    [
      activeSliceId,
      applyDragUpdate,
      beginDrag,
      domainEndSec,
      domainStartSec,
      scaleDomainEndSec,
      scaleDomainStartSec,
      setActiveSlice,
      slices,
      updateTooltip,
    ]
  );

  const onHandlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!dragContextRef.current) {
        return;
      }

      applyDragUpdate(event);
    },
    [applyDragUpdate]
  );

  const onHandlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const context = dragContextRef.current;
      if (!context || event.pointerId !== context.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      event.preventDefault();
      event.stopPropagation();
      finishDrag();
    },
    [finishDrag]
  );

  const onHandlePointerCancel = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const context = dragContextRef.current;
      if (!context || event.pointerId !== context.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      event.preventDefault();
      event.stopPropagation();
      finishDrag();
    },
    [finishDrag]
  );

  const onHandlePointerEnter = useCallback(
    (sliceId: string, handle: AdjustmentHandle) => {
      if (dragContextRef.current) {
        return;
      }
      setHover(sliceId, handle);
    },
    [setHover]
  );

  const onHandlePointerLeave = useCallback(() => {
    if (dragContextRef.current) {
      return;
    }
    setHover(null, null);
  }, [setHover]);

  return {
    draggingSliceId,
    draggingHandle,
    hoverSliceId,
    hoverHandle,
    tooltip,
    limitCue,
    handlers: {
      onHandlePointerDown,
      onHandlePointerMove,
      onHandlePointerUp,
      onHandlePointerCancel,
      onHandlePointerEnter,
      onHandlePointerLeave,
    },
  };
}
