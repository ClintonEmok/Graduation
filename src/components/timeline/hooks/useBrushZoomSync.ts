import { useEffect, type MutableRefObject, type RefObject } from 'react';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import type { ScaleTime } from 'd3-scale';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  buildZoomTransformFromBrush,
  brushSelectionToEpochRange,
  zoomDomainToEpochRange,
} from '@/components/timeline/lib/interaction-guards';

export interface UseBrushZoomSyncParams {
  interactive: boolean;
  detailInnerWidth: number;
  detailRangeSec: [number, number];
  overviewInnerWidth: number;
  overviewInteractionScale: ScaleTime<number, number>;
  isSyncingRef: MutableRefObject<boolean>;
  brushRef: RefObject<SVGGElement | null>;
  overviewSvgRef: RefObject<SVGSVGElement | null>;
  detailSvgRef: RefObject<SVGSVGElement | null>;
  zoomRef: RefObject<SVGRectElement | null>;
  setBrushRange: (range: [number, number] | null) => void;
  applyRangeToStores: (startSec: number, endSec: number) => void;
}

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;

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
  overviewInnerWidth,
  setBrushRange,
  applyRangeToStores,
}: {
  selection: [number, number] | null;
  invert: (value: number) => Date;
  overviewInnerWidth: number;
  setBrushRange: (range: [number, number] | null) => void;
  applyRangeToStores: (startSec: number, endSec: number) => void;
}): { scale: number; translateX: number } | null => {
  if (!selection) {
    setBrushRange(null);
    return null;
  }

  const { startSec, endSec } = brushSelectionToEpochRange(selection, invert);
  applyRangeToStores(startSec, endSec);

  return buildZoomTransformFromBrush(selection[0], selection[1], overviewInnerWidth);
};

export const applyZoomDomainToRange = ({
  domain,
  overviewScale,
  applyRangeToStores,
}: {
  domain: [Date, Date];
  overviewScale: (value: Date) => number;
  applyRangeToStores: (startSec: number, endSec: number) => void;
}): [number, number] => {
  const { startSec, endSec } = zoomDomainToEpochRange(domain);
  applyRangeToStores(startSec, endSec);
  return [overviewScale(domain[0]), overviewScale(domain[1])];
};

export const useBrushZoomSync = ({
  interactive,
  detailInnerWidth,
  detailRangeSec,
  overviewInnerWidth,
  overviewInteractionScale,
  isSyncingRef,
  brushRef,
  overviewSvgRef,
  detailSvgRef,
  zoomRef,
  setBrushRange,
  applyRangeToStores,
}: UseBrushZoomSyncParams): void => {
  useEffect(() => {
    if (!interactive) return;
    if (!overviewInnerWidth || !detailInnerWidth) return;
    if (!brushRef.current || !overviewSvgRef.current || !detailSvgRef.current || !zoomRef.current) return;

    const brushNode = brushRef.current;
    const zoomNode = zoomRef.current;

    const brushSelection: [number, number] = [
      overviewInteractionScale(new Date(detailRangeSec[0] * 1000)),
      overviewInteractionScale(new Date(detailRangeSec[1] * 1000)),
    ];

    const brushBehavior = brushX()
      .extent([[0, 0], [overviewInnerWidth, OVERVIEW_HEIGHT]])
      .on('brush end', (event) => {
        if (isSyncingRef.current) return;
        const transform = applyBrushSelectionToRange({
          selection: (event.selection as [number, number] | null) ?? null,
          invert: (value) => overviewInteractionScale.invert(value),
          overviewInnerWidth,
          setBrushRange,
          applyRangeToStores,
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
          overviewScale: (value) => overviewInteractionScale(value),
          applyRangeToStores,
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
    applyRangeToStores,
    brushRef,
    detailInnerWidth,
    detailRangeSec,
    detailSvgRef,
    interactive,
    isSyncingRef,
    overviewInnerWidth,
    overviewInteractionScale,
    overviewSvgRef,
    setBrushRange,
    zoomRef,
  ]);
};
