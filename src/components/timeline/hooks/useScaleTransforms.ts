import { useMemo } from 'react';
import { scaleUtc, type ScaleTime } from 'd3-scale';
import { clampToRange } from '@/components/timeline/lib/interaction-guards';

type StrictTimelineScale = ScaleTime<number, number>;

export interface ScaleTransformParams {
  domainStart: number;
  domainEnd: number;
  detailRangeSec: [number, number];
  overviewInnerWidth: number;
  detailInnerWidth: number;
  timeScaleMode: 'linear' | 'adaptive';
  warpFactor: number;
  warpMap: Float32Array | null;
  warpDomain: [number, number];
}

export const sampleWarpSeconds = (
  linearSec: number,
  warpMap: Float32Array,
  warpDomain: [number, number]
): number => {
  if (warpMap.length === 0) return linearSec;
  const [warpStartSec, warpEndSec] = warpDomain;
  const warpSpan = Math.max(1e-9, warpEndSec - warpStartSec);
  const normalized = clampToRange((linearSec - warpStartSec) / warpSpan, 0, 1);
  const rawIndex = normalized * (warpMap.length - 1);
  const low = Math.floor(rawIndex);
  const high = Math.min(low + 1, warpMap.length - 1);
  const frac = rawIndex - low;
  const lowVal = warpMap[Math.max(0, low)] ?? linearSec;
  const highVal = warpMap[Math.max(0, high)] ?? lowVal;
  return lowVal * (1 - frac) + highVal * frac;
};

export const toDisplaySeconds = (
  linearSec: number,
  warpFactor: number,
  warpMap: Float32Array,
  warpDomain: [number, number]
): number => {
  const warpedSec = sampleWarpSeconds(linearSec, warpMap, warpDomain);
  return linearSec * (1 - warpFactor) + warpedSec * warpFactor;
};

export const toLinearSeconds = (
  displaySec: number,
  linearDomain: [number, number],
  warpFactor: number,
  warpMap: Float32Array,
  warpDomain: [number, number]
): number => {
  const [domainMin, domainMax] = linearDomain;
  let low = domainMin;
  let high = domainMax;

  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    const mapped = toDisplaySeconds(mid, warpFactor, warpMap, warpDomain);
    if (mapped < displaySec) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
};

const applyAdaptiveWarping = (
  linearScale: StrictTimelineScale,
  timeScaleMode: 'linear' | 'adaptive',
  warpFactor: number,
  warpMap: Float32Array | null,
  innerWidth: number,
  warpDomain: [number, number]
): StrictTimelineScale => {
  if (
    timeScaleMode !== 'adaptive' ||
    warpFactor <= 0 ||
    !warpMap ||
    warpMap.length < 2 ||
    innerWidth <= 0
  ) {
    return linearScale;
  }

  const [domainStartDate, domainEndDate] = linearScale.domain();
  const linearStartSec = domainStartDate.getTime() / 1000;
  const linearEndSec = domainEndDate.getTime() / 1000;
  const safeDomain: [number, number] =
    linearStartSec <= linearEndSec
      ? [linearStartSec, linearEndSec]
      : [linearEndSec, linearStartSec];

  const displayStartSec = toDisplaySeconds(safeDomain[0], warpFactor, warpMap, warpDomain);
  const displayEndSec = toDisplaySeconds(safeDomain[1], warpFactor, warpMap, warpDomain);
  const displaySpan = Math.max(1e-9, displayEndSec - displayStartSec);

  const adaptiveScale = ((value: Date | number) => {
    const date = value instanceof Date ? value : new Date(value);
    const linearSec = date.getTime() / 1000;
    const displaySec = toDisplaySeconds(linearSec, warpFactor, warpMap, warpDomain);
    const t = clampToRange((displaySec - displayStartSec) / displaySpan, 0, 1);
    return t * innerWidth;
  }) as StrictTimelineScale;

  Object.assign(adaptiveScale, linearScale);

  adaptiveScale.invert = (x: number) => {
    const t = clampToRange(innerWidth <= 0 ? 0 : x / innerWidth, 0, 1);
    const displaySec = displayStartSec + t * displaySpan;
    const linearSec = toLinearSeconds(displaySec, safeDomain, warpFactor, warpMap, warpDomain);
    return new Date(linearSec * 1000);
  };

  return adaptiveScale;
};

export interface ScaleTransformResult {
  overviewInteractionScale: StrictTimelineScale;
  detailInteractionScale: StrictTimelineScale;
  overviewScale: StrictTimelineScale;
  detailScale: StrictTimelineScale;
}

export const useScaleTransforms = ({
  domainStart,
  domainEnd,
  detailRangeSec,
  overviewInnerWidth,
  detailInnerWidth,
  timeScaleMode,
  warpFactor,
  warpMap,
  warpDomain,
}: ScaleTransformParams): ScaleTransformResult => {
  const overviewInteractionScale = useMemo(
    () =>
      scaleUtc()
        .domain([new Date(domainStart * 1000), new Date(domainEnd * 1000)])
        .range([0, overviewInnerWidth]),
    [domainStart, domainEnd, overviewInnerWidth]
  );

  const detailInteractionScale = useMemo(
    () =>
      scaleUtc()
        .domain([new Date(detailRangeSec[0] * 1000), new Date(detailRangeSec[1] * 1000)])
        .range([0, detailInnerWidth]),
    [detailRangeSec, detailInnerWidth]
  );

  const overviewScale = useMemo(
    () =>
      applyAdaptiveWarping(
        overviewInteractionScale.copy(),
        timeScaleMode,
        warpFactor,
        warpMap,
        overviewInnerWidth,
        warpDomain
      ),
    [overviewInteractionScale, timeScaleMode, warpFactor, warpMap, overviewInnerWidth, warpDomain]
  );

  const detailScale = useMemo(
    () =>
      applyAdaptiveWarping(
        detailInteractionScale.copy(),
        timeScaleMode,
        warpFactor,
        warpMap,
        detailInnerWidth,
        warpDomain
      ),
    [detailInteractionScale, timeScaleMode, warpFactor, warpMap, detailInnerWidth, warpDomain]
  );

  return {
    overviewInteractionScale,
    detailInteractionScale,
    overviewScale,
    detailScale,
  };
};
