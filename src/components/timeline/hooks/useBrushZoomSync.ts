import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import type { ScaleTime } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  buildZoomTransformFromBrush,
  brushSelectionToEpochRange,
  computeRangeUpdate,
  zoomDomainToEpochRange,
} from '@/components/timeline/lib/interaction-guards';

export interface UseBrushZoomSyncParams {
  interactive: boolean;
  selectedTimeRange: [number, number] | null;
  detailInnerWidth: number;
  overviewInnerWidth: number;
  domainStart: number;
  domainEnd: number;
  overviewInteractionScale: ScaleTime<number, number>;
  isSyncingRef: MutableRefObject<boolean>;
  brushRef: RefObject<SVGGElement | null>;
  overviewSvgRef: RefObject<SVGSVGElement | null>;
  detailSvgRef: RefObject<SVGSVGElement | null>;
  zoomRef: RefObject<SVGRectElement | null>;
  setBrushRange: (range: [number, number] | null) => void;
  setViewport: (startSec: number, endSec: number) => void;
  applyRangeToStores: (startSec: number, endSec: number) => void;
}

export interface UseDebouncedViewportCommitParams {
  interactive: boolean;
  selectedTimeRange: [number, number] | null;
  setViewport: (startSec: number, endSec: number) => void;
}

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const VIEWPORT_COMMIT_DEBOUNCE_MS = 1_500;

export const scheduleViewportCommit = (
  selectedTimeRange: [number, number] | null,
  setViewport: (startSec: number, endSec: number) => void,
  delayMs: number = VIEWPORT_COMMIT_DEBOUNCE_MS
): (() => void) => {
  if (!selectedTimeRange) {
    return () => {};
  }

  const timer = setTimeout(() => {
    setViewport(selectedTimeRange[0], selectedTimeRange[1]);
  }, delayMs);

  return () => {
    clearTimeout(timer);
  };
};

export const withSyncGuard = (
  isSyncingRef: MutableRefObject<boolean>,
  callback: () => void
): boolean => {
  if (isSyncingRef.current) {
    return false;
  }

  isSyncingRef.current = true;
  try {
    callback();
  } finally {
    isSyncingRef.current = false;
  }

  return true;
};

export const applyBrushSelectionToRange = ({
  selection,
  invert,
  domainStart,
  domainEnd,
  overviewInnerWidth,
  setBrushRange,
  applyRangeToStores,
  commit = true,
}: {
  selection: [number, number] | null;
  invert: (value: number) => Date;
  domainStart: number;
  domainEnd: number;
  overviewInnerWidth: number;
  setBrushRange: (range: [number, number] | null) => void;
  applyRangeToStores: (startSec: number, endSec: number) => void;
  commit?: boolean;
}): { scale: number; translateX: number } | null => {
  if (!selection) {
    setBrushRange(null);
    return null;
  }

  const { startSec, endSec } = brushSelectionToEpochRange(selection, invert);
  const { normalizedRange } = computeRangeUpdate(startSec, endSec, domainStart, domainEnd);
  setBrushRange(normalizedRange);
  if (commit) {
    applyRangeToStores(startSec, endSec);
  }

  return buildZoomTransformFromBrush(selection[0], selection[1], overviewInnerWidth);
};

export const applyZoomDomainToRange = ({
  domain,
  domainStart,
  domainEnd,
  overviewScale,
  applyRangeToStores,
  setBrushRange,
  commit = true,
}: {
  domain: [Date, Date];
  domainStart: number;
  domainEnd: number;
  overviewScale: (value: Date) => number;
  applyRangeToStores: (startSec: number, endSec: number) => void;
  setBrushRange: (range: [number, number]) => void;
  commit?: boolean;
}): [number, number] => {
  const { startSec, endSec } = zoomDomainToEpochRange(domain);
  const { normalizedRange } = computeRangeUpdate(startSec, endSec, domainStart, domainEnd);
  setBrushRange(normalizedRange);
  if (commit) {
    applyRangeToStores(startSec, endSec);
  }
  return [overviewScale(domain[0]), overviewScale(domain[1])];
};

export const useDebouncedViewportCommit = ({
  interactive,
  selectedTimeRange,
  setViewport,
}: UseDebouncedViewportCommitParams): void => {
  useEffect(() => {
    if (!interactive) return undefined;

    return scheduleViewportCommit(selectedTimeRange, setViewport);
  }, [interactive, selectedTimeRange, setViewport]);
};

export const useBrushZoomSync = ({
  interactive,
  selectedTimeRange,
  detailInnerWidth,
  overviewInnerWidth,
  domainStart,
  domainEnd,
  overviewInteractionScale,
  isSyncingRef,
  brushRef,
  overviewSvgRef,
  detailSvgRef,
  zoomRef,
  setBrushRange,
  setViewport,
  applyRangeToStores,
}: UseBrushZoomSyncParams): void => {
  const applyRangeToStoresRef = useRef(applyRangeToStores);

  useEffect(() => {
    applyRangeToStoresRef.current = applyRangeToStores;
  }, [applyRangeToStores]);

  useDebouncedViewportCommit({
    interactive,
    selectedTimeRange,
    setViewport,
  });

  useEffect(() => {
    if (!interactive) return;
    if (!overviewInnerWidth || !detailInnerWidth) return;
    if (!brushRef.current || !overviewSvgRef.current || !detailSvgRef.current || !zoomRef.current) return;

    const brushNode = brushRef.current;
    const zoomNode = zoomRef.current;

    const brushSelection: [number, number] | null = selectedTimeRange
      ? [
          overviewInteractionScale(new Date(selectedTimeRange[0] * 1000)),
          overviewInteractionScale(new Date(selectedTimeRange[1] * 1000)),
        ]
      : null;

    const brushBehavior = brushX()
      .extent([[0, 0], [overviewInnerWidth, OVERVIEW_HEIGHT]])
      .on('brush end', (event) => {
        if (isSyncingRef.current) return;
        const transform = applyBrushSelectionToRange({
          selection: (event.selection as [number, number] | null) ?? null,
          invert: (value) => overviewInteractionScale.invert(value),
          domainStart,
          domainEnd,
          overviewInnerWidth,
          setBrushRange,
          applyRangeToStores: applyRangeToStoresRef.current,
          commit: event.type === 'end',
        });
        if (!transform) {
          return;
        }

        withSyncGuard(isSyncingRef, () => {
          select(zoomNode).call(
            zoomBehavior.transform,
            zoomIdentity.scale(transform.scale).translate(transform.translateX, 0)
          );
        });
      });

    const zoomBehavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 50])
      .translateExtent([[0, 0], [detailInnerWidth, DETAIL_HEIGHT]])
      .extent([[0, 0], [detailInnerWidth, DETAIL_HEIGHT]])
      .on('zoom', (event) => {
        if (isSyncingRef.current) return;
        const rescaled = event.transform.rescaleX(overviewInteractionScale);
        const newDomain = rescaled.domain() as [Date, Date];
        const brushSelectionNext = applyZoomDomainToRange({
          domain: newDomain,
          domainStart,
          domainEnd,
          overviewScale: (value) => overviewInteractionScale(value),
          applyRangeToStores: applyRangeToStoresRef.current,
          setBrushRange,
          commit: false,
        });

        withSyncGuard(isSyncingRef, () => {
          select(brushNode).call(brushBehavior.move, brushSelectionNext);
        });
      })
      .on('end', (event) => {
        if (isSyncingRef.current) return;
        const rescaled = event.transform.rescaleX(overviewInteractionScale);
        const newDomain = rescaled.domain() as [Date, Date];
        const brushSelectionNext = applyZoomDomainToRange({
          domain: newDomain,
          domainStart,
          domainEnd,
          overviewScale: (value) => overviewInteractionScale(value),
          applyRangeToStores: applyRangeToStoresRef.current,
          setBrushRange,
          commit: true,
        });

        withSyncGuard(isSyncingRef, () => {
          select(brushNode).call(brushBehavior.move, brushSelectionNext);
        });
      });

    select(brushNode)
      .call(brushBehavior)
      .call(brushBehavior.move, brushSelection);
    select(zoomNode).call(zoomBehavior);

    return () => {
      select(brushNode).on('.brush', null);
      select(zoomNode).on('.zoom', null);
    };
  }, [
    brushRef,
    detailInnerWidth,
    detailSvgRef,
    domainEnd,
    domainStart,
    interactive,
    isSyncingRef,
    overviewInnerWidth,
    overviewInteractionScale,
    overviewSvgRef,
    selectedTimeRange,
    setBrushRange,
    zoomRef,
  ]);
};
