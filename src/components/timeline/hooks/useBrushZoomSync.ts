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
        if (!event.selection) {
          setBrushRange(null);
          return;
        }

        const [x0, x1] = event.selection as [number, number];
        const { startSec, endSec } = brushSelectionToEpochRange(
          [x0, x1],
          (value) => overviewInteractionScale.invert(value)
        );
        applyRangeToStores(startSec, endSec);

        const { scale, translateX } = buildZoomTransformFromBrush(x0, x1, overviewInnerWidth);
        withSyncGuard(isSyncingRef, () => {
          select(zoomNode).call(
            zoomBehavior.transform,
            zoomIdentity.scale(scale).translate(translateX, 0)
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
        const newDomain = rescaled.domain();
        const { startSec, endSec } = zoomDomainToEpochRange(newDomain as [Date, Date]);
        applyRangeToStores(startSec, endSec);

        withSyncGuard(isSyncingRef, () => {
          select(brushNode).call(
            brushBehavior.move,
            [overviewInteractionScale(newDomain[0]), overviewInteractionScale(newDomain[1])]
          );
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
