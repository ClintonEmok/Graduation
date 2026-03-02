"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bin, max } from 'd3-array';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import { scaleUtc, type ScaleTime } from 'd3-scale';
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time';
import { zoom, zoomIdentity } from 'd3-zoom';
import { useMeasure } from '@/hooks/useMeasure';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useSliceStore } from '@/store/useSliceStore';
import { findNearestIndexByTime, resolvePointByIndex } from '@/lib/selection';
import { useBurstWindows } from '@/components/viz/BurstList';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useAutoBurstSlices } from '@/store/useSliceStore';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const DENSITY_DOMAIN: [number, number] = [0, 1];
const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
const TIME_CURSOR_COLOR = '#10b981';
const DETAIL_DENSITY_RECOMPUTE_MAX_DAYS = 60;

const SLICE_COLOR_PALETTE: Record<string, { fill: string; stroke: string }> = {
  amber: { fill: 'rgba(251, 191, 36, 0.28)', stroke: 'rgba(251, 191, 36, 0.9)' },
  blue: { fill: 'rgba(59, 130, 246, 0.24)', stroke: 'rgba(96, 165, 250, 0.9)' },
  green: { fill: 'rgba(34, 197, 94, 0.26)', stroke: 'rgba(74, 222, 128, 0.9)' },
  red: { fill: 'rgba(248, 113, 113, 0.26)', stroke: 'rgba(252, 165, 165, 0.9)' },
  purple: { fill: 'rgba(167, 139, 250, 0.24)', stroke: 'rgba(196, 181, 253, 0.9)' },
  cyan: { fill: 'rgba(34, 211, 238, 0.24)', stroke: 'rgba(103, 232, 249, 0.9)' },
  pink: { fill: 'rgba(244, 114, 182, 0.26)', stroke: 'rgba(251, 207, 232, 0.9)' },
  gray: { fill: 'rgba(148, 163, 184, 0.24)', stroke: 'rgba(203, 213, 225, 0.9)' },
};

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
type StrictTimelineScale = ScaleTime<number, number>;

interface TimelineSliceGeometry {
  id: string;
  left: number;
  width: number;
  isActive: boolean;
  isBurst: boolean;
  isPoint: boolean;
  isSuggestion: boolean;
  overlapCount: number;
  color: string | undefined;
}

const computeDensityMap = (
  timestamps: number[],
  domain: [number, number],
  binCount: number,
  kernelWidth: number
): Float32Array => {
  const [start, end] = domain;
  const span = end - start || 1;
  const bins = new Float32Array(binCount);

  for (let i = 0; i < timestamps.length; i += 1) {
    const t = timestamps[i];
    if (!Number.isFinite(t)) continue;
    const norm = (t - start) / span;
    if (norm < 0 || norm > 1) continue;
    const idx = Math.min(Math.floor(norm * binCount), binCount - 1);
    bins[idx] += 1;
  }

  let smoothed = bins;
  if (kernelWidth > 1) {
    smoothed = new Float32Array(binCount);
    for (let i = 0; i < binCount; i += 1) {
      let sum = 0;
      let count = 0;
      for (let k = -kernelWidth; k <= kernelWidth; k += 1) {
        const idx = i + k;
        if (idx >= 0 && idx < binCount) {
          sum += bins[idx];
          count += 1;
        }
      }
      smoothed[i] = count > 0 ? sum / count : 0;
    }
  }

  let maxVal = 0;
  for (let i = 0; i < smoothed.length; i += 1) {
    if (smoothed[i] > maxVal) maxVal = smoothed[i];
  }
  if (maxVal === 0) maxVal = 1;

  const normalized = new Float32Array(binCount);
  for (let i = 0; i < binCount; i += 1) {
    normalized[i] = smoothed[i] / maxVal;
  }

  return normalized;
};

const resolveSliceColor = (color?: string): { fill: string; stroke: string } => {
  if (!color) {
    return { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
  }
  return SLICE_COLOR_PALETTE[color] ?? { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
};

interface DualTimelineProps {
  adaptiveWarpMapOverride?: Float32Array | null;
  adaptiveWarpDomainOverride?: [number, number];
  domainOverride?: [number, number];
  detailRangeOverride?: [number, number];
  interactive?: boolean;
  timestampSecondsOverride?: number[];
  detailPointsOverride?: number[];
  detailRenderMode?: 'auto' | 'points' | 'bins';
  detailBinCount?: number;
  disableAutoBurstSlices?: boolean;
}

export const DualTimeline: React.FC<DualTimelineProps> = ({
  adaptiveWarpMapOverride,
  adaptiveWarpDomainOverride,
  domainOverride,
  detailRangeOverride,
  interactive = true,
  timestampSecondsOverride,
  detailPointsOverride,
  detailRenderMode = 'auto',
  detailBinCount = 60,
  disableAutoBurstSlices = false,
}) => {
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const currentTime = useTimeStore((state) => state.currentTime);
  const setTime = useTimeStore((state) => state.setTime);
  const setRange = useTimeStore((state) => state.setRange);
  const timeResolution = useTimeStore((state) => state.timeResolution);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const clearSelection = useCoordinationStore((state) => state.clearSelection);
  const brushRange = useCoordinationStore((state) => state.brushRange);
  const setBrushRange = useCoordinationStore((state) => state.setBrushRange);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const isComputing = useAdaptiveStore((state) => state.isComputing);
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const activeSliceUpdatedAt = useSliceStore((state) => state.activeSliceUpdatedAt);
  const getSliceOverlapCounts = useSliceStore((state) => state.getOverlapCounts);
  const warpSlices = useWarpSliceStore((state) => state.slices);
  const dataCount = useDataStore((state) => (state.columns ? state.columns.length : state.data.length));
  const effectiveWarpMap = adaptiveWarpMapOverride !== undefined ? adaptiveWarpMapOverride : warpMap;
  const effectiveWarpDomain = adaptiveWarpDomainOverride ?? mapDomain;

  // Get viewport-based crime data
  const { data: viewportCrimes, isLoading: isViewportLoading } = useViewportCrimeData({
    bufferDays: 30,
  });

  // Get viewport store for brush/zoom sync
  const setViewport = useViewportStore((state) => state.setViewport);
  
  // NOTE: Viewport stays at initial default (2001-2002) until user zooms/brushes
  // This enables fast initial load - only fetching first year of data
  // The useViewportCrimeData hook fetches data for the current viewport range

  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const overviewSvgRef = useRef<SVGSVGElement | null>(null);
  const detailSvgRef = useRef<SVGSVGElement | null>(null);
  const brushRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<SVGRectElement | null>(null);
  const isSyncingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const [hoveredDetail, setHoveredDetail] = useState<{ x: number; label: string } | null>(null);

  const width = Math.max(0, bounds.width ?? 0);
  const overviewInnerWidth = Math.max(0, width - OVERVIEW_MARGIN.left - OVERVIEW_MARGIN.right);
  const detailInnerWidth = Math.max(0, width - DETAIL_MARGIN.left - DETAIL_MARGIN.right);

  // Full data range for timeline scale
  const [domainStart, domainEnd] = useMemo<[number, number]>(() => {
    if (domainOverride && Number.isFinite(domainOverride[0]) && Number.isFinite(domainOverride[1])) {
      const start = Math.min(domainOverride[0], domainOverride[1]);
      const end = Math.max(domainOverride[0], domainOverride[1]);
      if (end > start) {
        return [start, end];
      }
    }
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [domainOverride, minTimestampSec, maxTimestampSec]);

  // Viewport bounds for initial selection (first year)
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  // Detail range: override > selectedTimeRange > viewport bounds (first year)
  const detailRangeSec = useMemo<[number, number]>(() => {
    if (detailRangeOverride && Number.isFinite(detailRangeOverride[0]) && Number.isFinite(detailRangeOverride[1])) {
      const start = Math.min(detailRangeOverride[0], detailRangeOverride[1]);
      const end = Math.max(detailRangeOverride[0], detailRangeOverride[1]);
      if (end > start) {
        return [start, end];
      }
    }
    if (selectedTimeRange) {
      const [rawStart, rawEnd] = selectedTimeRange;
      const start = Math.min(rawStart, rawEnd);
      const end = Math.max(rawStart, rawEnd);
      const overlaps = end >= domainStart && start <= domainEnd;
      if (Number.isFinite(start) && Number.isFinite(end) && overlaps) {
        return [start, end];
      }
    }
    // Default to viewport bounds (first year) instead of full domain
    return [viewportStart, viewportEnd];
  }, [detailRangeOverride, selectedTimeRange, domainStart, domainEnd, viewportStart, viewportEnd]);

  const timestampSeconds = useMemo<number[]>(() => {
    if (columns && columns.length > 0 && minTimestampSec !== null && maxTimestampSec !== null) {
      const result = new Array<number>(columns.length);
      for (let i = 0; i < columns.length; i += 1) {
        result[i] = normalizedToEpochSeconds(columns.timestamp[i], minTimestampSec, maxTimestampSec);
      }
      return result;
    }
    if (data && data.length > 0) {
      return data.map((point) => point.timestamp as number);
    }
    return [];
  }, [columns, data, minTimestampSec, maxTimestampSec]);

  const overviewBins = useMemo(() => {
    const values = timestampSecondsOverride ?? timestampSeconds;
    if (!values.length) return [];
    const binner = bin<number, number>()
      .value((d) => d)
      .domain([domainStart, domainEnd])
      .thresholds(50);
    return binner(values);
  }, [timestampSecondsOverride, timestampSeconds, domainStart, domainEnd]);

  const overviewMax = useMemo(() => max(overviewBins, (d) => d.length) || 1, [overviewBins]);
  
  // Use viewport crime data when available, fallback to computed timestampSeconds
  const detailPoints = useMemo(() => {
    if (detailPointsOverride) {
      return detailPointsOverride;
    }
    // If we have viewport crime data, use it directly
    if (viewportCrimes && viewportCrimes.length > 0) {
      const [start, end] = detailRangeSec;
      const points = viewportCrimes
        .map(crime => crime.timestamp)  // Use 'timestamp' not 'date'
        .filter((date) => date >= start && date <= end);
      const maxPoints = 4000;
      if (points.length <= maxPoints) return points;
      const step = Math.ceil(points.length / maxPoints);
      return points.filter((_, index) => index % step === 0);
    }
    
    // Fallback to computed timestampSeconds
    if (!timestampSeconds.length) return [];
    const [start, end] = detailRangeSec;
    const points = timestampSeconds.filter((value) => value >= start && value <= end);
    const maxPoints = 4000;
    if (points.length <= maxPoints) return points;
    const step = Math.ceil(points.length / maxPoints);
    return points.filter((_, index) => index % step === 0);
  }, [detailPointsOverride, viewportCrimes, timestampSeconds, detailRangeSec]);

  const detailSpanDays = useMemo(() => {
    const spanSeconds = Math.abs(detailRangeSec[1] - detailRangeSec[0]);
    return spanSeconds / 86400;
  }, [detailRangeSec]);

  const resolvedDetailRenderMode = useMemo(() => {
    if (detailRenderMode === 'auto') {
      return detailSpanDays > DETAIL_DENSITY_RECOMPUTE_MAX_DAYS ? 'bins' : 'points';
    }
    return detailRenderMode;
  }, [detailRenderMode, detailSpanDays]);

  const detailBins = useMemo(() => {
    if (resolvedDetailRenderMode !== 'bins') return [];
    if (!detailPoints.length) return [];
    const binner = bin<number, number>()
      .value((d) => d)
      .domain([detailRangeSec[0], detailRangeSec[1]])
      .thresholds(detailBinCount);
    return binner(detailPoints);
  }, [detailBinCount, detailPoints, detailRangeSec, resolvedDetailRenderMode]);

  const detailMax = useMemo(
    () => (detailBins.length ? max(detailBins, (d) => d.length) || 1 : 1),
    [detailBins]
  );

  const detailDensityMap = useMemo(() => {
    const hasPoints = detailPoints.length > 0;
    const binCount = densityMap?.length ?? ADAPTIVE_BIN_COUNT;
    if (hasPoints && detailSpanDays <= DETAIL_DENSITY_RECOMPUTE_MAX_DAYS) {
      return computeDensityMap(detailPoints, detailRangeSec, binCount, ADAPTIVE_KERNEL_WIDTH);
    }

    if (!densityMap || densityMap.length === 0) return densityMap;
    const span = domainEnd - domainStart || 1;
    const startRatio = clamp((detailRangeSec[0] - domainStart) / span, 0, 1);
    const endRatio = clamp((detailRangeSec[1] - domainStart) / span, 0, 1);
    const rangeStart = Math.min(startRatio, endRatio);
    const rangeEnd = Math.max(startRatio, endRatio);
    const lastIndex = Math.max(0, densityMap.length - 1);
    const startIndex = clamp(Math.floor(rangeStart * lastIndex), 0, lastIndex);
    const endIndex = clamp(Math.ceil(rangeEnd * lastIndex), startIndex, lastIndex);
    return densityMap.subarray(startIndex, Math.min(densityMap.length, endIndex + 1));
  }, [densityMap, detailPoints, detailRangeSec, detailSpanDays, domainEnd, domainStart]);

  const sampleWarpSeconds = useCallback(
    (linearSec: number, warpMapVal: Float32Array, warpDomain: [number, number]) => {
      if (warpMapVal.length === 0) return linearSec;
      const [warpStartSec, warpEndSec] = warpDomain;
      const warpSpan = Math.max(1e-9, warpEndSec - warpStartSec);
      const normalized = clamp((linearSec - warpStartSec) / warpSpan, 0, 1);
      const rawIndex = normalized * (warpMapVal.length - 1);
      const low = Math.floor(rawIndex);
      const high = Math.min(low + 1, warpMapVal.length - 1);
      const frac = rawIndex - low;
      const lowVal = warpMapVal[Math.max(0, low)] ?? linearSec;
      const highVal = warpMapVal[Math.max(0, high)] ?? lowVal;
      return lowVal * (1 - frac) + highVal * frac;
    },
    []
  );

  const toDisplaySeconds = useCallback(
    (
      linearSec: number,
      warpFactorVal: number,
      warpMapVal: Float32Array,
      warpDomain: [number, number]
    ) => {
      const warpedSec = sampleWarpSeconds(linearSec, warpMapVal, warpDomain);
      return linearSec * (1 - warpFactorVal) + warpedSec * warpFactorVal;
    },
    [sampleWarpSeconds]
  );

  const toLinearSeconds = useCallback(
    (
      displaySec: number,
      linearDomain: [number, number],
      warpFactorVal: number,
      warpMapVal: Float32Array,
      warpDomain: [number, number]
    ) => {
      const [domainMin, domainMax] = linearDomain;
      let low = domainMin;
      let high = domainMax;

      for (let i = 0; i < 24; i += 1) {
        const mid = (low + high) / 2;
        const mapped = toDisplaySeconds(mid, warpFactorVal, warpMapVal, warpDomain);
        if (mapped < displaySec) {
          low = mid;
        } else {
          high = mid;
        }
      }

      return (low + high) / 2;
    },
    [toDisplaySeconds]
  );

  const applyAdaptiveWarping = useCallback(
    (
      linearScale: StrictTimelineScale,
      warpFactorVal: number,
      warpMapVal: Float32Array | null,
      innerWidth: number,
      warpDomain: [number, number]
    ): StrictTimelineScale => {
      if (
        timeScaleMode !== 'adaptive' ||
        warpFactorVal <= 0 ||
        !warpMapVal ||
        warpMapVal.length < 2 ||
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

      const displayStartSec = toDisplaySeconds(safeDomain[0], warpFactorVal, warpMapVal, warpDomain);
      const displayEndSec = toDisplaySeconds(safeDomain[1], warpFactorVal, warpMapVal, warpDomain);
      const displaySpan = Math.max(1e-9, displayEndSec - displayStartSec);

      const adaptiveScale = ((value: Date | number) => {
        const date = value instanceof Date ? value : new Date(value);
        const linearSec = date.getTime() / 1000;
        const displaySec = toDisplaySeconds(linearSec, warpFactorVal, warpMapVal, warpDomain);
        const t = clamp((displaySec - displayStartSec) / displaySpan, 0, 1);
        return t * innerWidth;
      }) as StrictTimelineScale;

      Object.assign(adaptiveScale, linearScale);

      adaptiveScale.invert = (x: number) => {
        const t = clamp(innerWidth <= 0 ? 0 : x / innerWidth, 0, 1);
        const displaySec = displayStartSec + t * displaySpan;
        const linearSec = toLinearSeconds(
          displaySec,
          safeDomain,
          warpFactorVal,
          warpMapVal,
          warpDomain
        );
        return new Date(linearSec * 1000);
      };

      return adaptiveScale;
    },
    [timeScaleMode, toDisplaySeconds, toLinearSeconds]
  );

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
        warpFactor,
        effectiveWarpMap,
        overviewInnerWidth,
        effectiveWarpDomain
      ),
    [
      applyAdaptiveWarping,
      effectiveWarpDomain,
      effectiveWarpMap,
      overviewInnerWidth,
      overviewInteractionScale,
      warpFactor,
    ]
  );

  const detailScale = useMemo(
    () =>
      applyAdaptiveWarping(
        detailInteractionScale.copy(),
        warpFactor,
        effectiveWarpMap,
        detailInnerWidth,
        effectiveWarpDomain
      ),
    [
      applyAdaptiveWarping,
      detailInnerWidth,
      detailInteractionScale,
      effectiveWarpDomain,
      effectiveWarpMap,
      warpFactor,
    ]
  );

  const applyRangeToStores = useCallback(
    (startSec: number, endSec: number) => {
      if (!interactive) {
        return;
      }
      const safeStart = clamp(startSec, domainStart, domainEnd);
      const safeEnd = clamp(endSec, domainStart, domainEnd);
      const normalizedStart = clamp(
        epochSecondsToNormalized(safeStart, domainStart, domainEnd),
        0,
        100
      );
      const normalizedEnd = clamp(
        epochSecondsToNormalized(safeEnd, domainStart, domainEnd),
        0,
        100
      );
      const nextRange: [number, number] =
        normalizedStart <= normalizedEnd
          ? [normalizedStart, normalizedEnd]
          : [normalizedEnd, normalizedStart];

      setTimeRange([safeStart, safeEnd]);
      setRange(nextRange);
      setBrushRange(nextRange);
      
      // Sync viewport store for viewport-based data loading
      setViewport(safeStart, safeEnd);

      const clampedTime = clamp(currentTime, nextRange[0], nextRange[1]);
      if (clampedTime !== currentTime) {
        setTime(clampedTime);
      }
    },
    [currentTime, domainEnd, domainStart, interactive, setRange, setTime, setTimeRange, setBrushRange, setViewport]
  );

  useEffect(() => {
    if (!interactive) return;
    if (!selectedTimeRange) return;
    const [rawStart, rawEnd] = selectedTimeRange;
    const start = Math.min(rawStart, rawEnd);
    const end = Math.max(rawStart, rawEnd);
    const overlaps = end >= domainStart && start <= domainEnd;
    if (!Number.isFinite(start) || !Number.isFinite(end) || !overlaps) {
      isSyncingRef.current = true;
      applyRangeToStores(domainStart, domainEnd);
      isSyncingRef.current = false;
    }
  }, [applyRangeToStores, domainEnd, domainStart, interactive, selectedTimeRange]);

  useEffect(() => {
    if (!interactive) return;
    const resolutionSeconds: Record<typeof timeResolution, number> = {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
      weeks: 604800,
      months: 2592000,
      years: 31536000
    };
    const visibleUnits: Record<typeof timeResolution, number> = {
      seconds: 60,
      minutes: 60,
      hours: 24,
      days: 14,
      weeks: 12,
      months: 12,
      years: 10
    };

    const unitSeconds = resolutionSeconds[timeResolution] ?? 86400;
    const span = unitSeconds * (visibleUnits[timeResolution] ?? 14);
    const centerSec = normalizedToEpochSeconds(currentTime, domainStart, domainEnd);
    isSyncingRef.current = true;
    applyRangeToStores(centerSec - span / 2, centerSec + span / 2);
    isSyncingRef.current = false;
  }, [applyRangeToStores, currentTime, domainEnd, domainStart, interactive, timeResolution]);

  useEffect(() => {
    if (!interactive) return;
    if (!overviewInnerWidth || !detailInnerWidth) return;
    if (!brushRef.current || !overviewSvgRef.current || !detailSvgRef.current || !zoomRef.current) return;

    const brushNode = brushRef.current;
    const zoomNode = zoomRef.current;

    const brushSelection: [number, number] = [
      overviewInteractionScale(new Date(detailRangeSec[0] * 1000)),
      overviewInteractionScale(new Date(detailRangeSec[1] * 1000))
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
        const startSec = overviewInteractionScale.invert(x0).getTime() / 1000;
        const endSec = overviewInteractionScale.invert(x1).getTime() / 1000;
        applyRangeToStores(startSec, endSec);

        const scale = overviewInnerWidth / Math.max(1, x1 - x0);
        const translateX = -x0;
        isSyncingRef.current = true;
        select(zoomNode as SVGRectElement).call(
          zoomBehavior.transform,
          zoomIdentity.scale(scale).translate(translateX, 0)
        );
        isSyncingRef.current = false;
      });

    const zoomBehavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 50])
      .translateExtent([[0, 0], [detailInnerWidth, DETAIL_HEIGHT]])
      .extent([[0, 0], [detailInnerWidth, DETAIL_HEIGHT]])
      .on('zoom', (event) => {
        if (isSyncingRef.current) return;
        const rescaled = event.transform.rescaleX(overviewInteractionScale);
        const newDomain = rescaled.domain();
        const startSec = newDomain[0].getTime() / 1000;
        const endSec = newDomain[1].getTime() / 1000;
        applyRangeToStores(startSec, endSec);

        isSyncingRef.current = true;
        select(brushNode as SVGGElement).call(
          brushBehavior.move,
          [overviewInteractionScale(newDomain[0]), overviewInteractionScale(newDomain[1])]
        );
        isSyncingRef.current = false;
      });

    select(brushNode as SVGGElement)
      .call(brushBehavior)
      .call(brushBehavior.move, brushSelection as [number, number]);
    select(zoomNode as SVGRectElement).call(zoomBehavior);

    return () => {
      select(brushNode as SVGGElement).on('.brush', null);
      select(zoomNode as SVGRectElement).on('.zoom', null);
    };
  }, [
    applyRangeToStores,
    detailInnerWidth,
    detailRangeSec,
    interactive,
    overviewInnerWidth,
    overviewInteractionScale,
    setBrushRange
  ]);

  const scrubFromEvent = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      if (!detailInnerWidth) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, detailInnerWidth);
      const epochSeconds = detailScale.invert(x).getTime() / 1000;
      const normalized = clamp(
        epochSecondsToNormalized(epochSeconds, domainStart, domainEnd),
        0,
        100
      );
      setTime(normalized);
    },
    [detailInnerWidth, detailScale, domainEnd, domainStart, interactive, setTime]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      isScrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      scrubFromEvent(event);
    },
    [interactive, scrubFromEvent]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (!interactive) return;
      if (!detailInnerWidth) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, detailInnerWidth);
      const epochSeconds = detailScale.invert(x).getTime() / 1000;

      if (resolvedDetailRenderMode === 'points') {
        const nearest = findNearestIndexByTime(epochSeconds);
        if (nearest) {
          const rangeSpan = Math.abs(detailRangeSec[1] - detailRangeSec[0]) || 1;
          const maxDistance = Math.max(rangeSpan * 0.01, 60);
          if (nearest.distance <= maxDistance) {
            const ts = nearest.point.timestampSec ?? epochSeconds;
            const label =
              minTimestampSec !== null && maxTimestampSec !== null
                ? new Date(ts * 1000).toLocaleString()
                : `t=${ts.toFixed(2)}`;
            setHoveredDetail({ x, label });
          } else {
            setHoveredDetail(null);
          }
        } else {
          setHoveredDetail(null);
        }
      } else {
        setHoveredDetail(null);
      }

      if (!isScrubbingRef.current) return;
      scrubFromEvent(event);
    },
    [detailInnerWidth, detailScale, detailRangeSec, interactive, minTimestampSec, maxTimestampSec, resolvedDetailRenderMode, scrubFromEvent]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<SVGRectElement>) => {
    isScrubbingRef.current = false;
    setHoveredDetail(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const cursorEpochSeconds = useMemo(() => {
    return normalizedToEpochSeconds(currentTime, domainStart, domainEnd);
  }, [currentTime, domainStart, domainEnd]);

  const cursorX = detailScale(new Date(cursorEpochSeconds * 1000));

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex, dataCount]);

  const selectionX = useMemo(() => {
    if (!selectionPoint || selectionPoint.timestampSec === null) return null;
    return detailScale(new Date(selectionPoint.timestampSec * 1000));
  }, [detailScale, selectionPoint]);

  const burstWindows = useBurstWindows();
  
  // Auto-create burst slices when burst data becomes available (unless disabled)
  if (!disableAutoBurstSlices) {
    useAutoBurstSlices(burstWindows);
  }
  

  const handleSelectFromEvent = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (!detailInnerWidth) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, detailInnerWidth);
      const epochSeconds = detailScale.invert(x).getTime() / 1000;
      const nearest = findNearestIndexByTime(epochSeconds);
      if (!nearest) {
        clearSelection();
        return;
      }
      const rangeSpan = Math.abs(detailRangeSec[1] - detailRangeSec[0]) || 1;
      const maxDistance = Math.max(rangeSpan * 0.01, 60);
      if (nearest.distance <= maxDistance) {
        setSelectedIndex(nearest.index, 'timeline');
      } else {
        clearSelection();
      }
    },
    [clearSelection, detailInnerWidth, detailRangeSec, detailScale, setSelectedIndex]
  );

  const handlePointerUpWithSelection = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      isScrubbingRef.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      handleSelectFromEvent(event);
    },
    [handleSelectFromEvent]
  );

  const overviewTicks = overviewScale.ticks(Math.max(2, Math.floor(overviewInnerWidth / 120)));
  const detailTicks = useMemo(() => {
    const spanSeconds = Math.max(1, detailRangeSec[1] - detailRangeSec[0]);
    const maxTicks = Math.max(2, Math.floor(detailInnerWidth / 140));
    const pickStep = (unitSeconds: number, steps: number[]) => {
      for (const step of steps) {
        if (spanSeconds / (unitSeconds * step) <= maxTicks) return step;
      }
      return steps[steps.length - 1];
    };

    switch (timeResolution) {
      case 'seconds': {
        const step = pickStep(1, [1, 2, 5, 10, 15, 30]);
        return detailScale.ticks(timeSecond.every(step) ?? timeSecond);
      }
      case 'minutes': {
        const step = pickStep(60, [1, 2, 5, 10, 15, 30]);
        return detailScale.ticks(timeMinute.every(step) ?? timeMinute);
      }
      case 'hours': {
        const step = pickStep(3600, [1, 2, 3, 6, 12]);
        return detailScale.ticks(timeHour.every(step) ?? timeHour);
      }
      case 'days': {
        const step = pickStep(86400, [1, 2, 3, 7, 14]);
        return detailScale.ticks(timeDay.every(step) ?? timeDay);
      }
      case 'weeks': {
        const step = pickStep(604800, [1, 2, 4, 8]);
        return detailScale.ticks(timeWeek.every(step) ?? timeWeek);
      }
      case 'months': {
        const step = pickStep(2592000, [1, 2, 3, 6]);
        return detailScale.ticks(timeMonth.every(step) ?? timeMonth);
      }
      case 'years': {
        const step = pickStep(31536000, [1, 2, 5, 10]);
        return detailScale.ticks(timeYear.every(step) ?? timeYear);
      }
      default:
        return detailScale.ticks(Math.max(2, Math.floor(detailInnerWidth / 100)));
    }
  }, [detailInnerWidth, detailRangeSec, detailScale, timeResolution]);
  const detailTickFormat = useMemo(() => {
    switch (timeResolution) {
      case 'seconds':
        return (date: Date) => date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      case 'minutes':
        return (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'hours':
        return (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'days':
        return (date: Date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'weeks':
        return (date: Date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'months':
        return (date: Date) => date.toLocaleDateString([], { month: 'short', year: 'numeric' });
      case 'years':
        return (date: Date) => date.getFullYear().toString();
      default:
        return (date: Date) => date.toLocaleDateString();
    }
  }, [timeResolution]);

  const stripSelection = useMemo(() => {
    if (!overviewInnerWidth) return null;
    const x0 = overviewScale(new Date(detailRangeSec[0] * 1000));
    const x1 = overviewScale(new Date(detailRangeSec[1] * 1000));
    const left = Math.min(x0, x1);
    const widthSpan = Math.max(2, Math.abs(x1 - x0));
    return { left, width: widthSpan };
  }, [detailRangeSec, overviewInnerWidth, overviewScale]);

  const userWarpOverlayBands = useMemo(
    () =>
      warpSlices
        .filter((slice) => slice.enabled && slice.source === 'manual')
        .map((slice) => {
          const startSec = normalizedToEpochSeconds(clamp(slice.range[0], 0, 100), domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(clamp(slice.range[1], 0, 100), domainStart, domainEnd);
          const rangeStart = Math.max(domainStart, Math.min(startSec, endSec));
          const rangeEnd = Math.min(domainEnd, Math.max(startSec, endSec));
          return {
            id: slice.id,
            startSec: rangeStart,
            endSec: rangeEnd,
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [domainEnd, domainStart, warpSlices]
  );

  const sliceOverlapCounts = getSliceOverlapCounts();

  const sliceGeometries = useMemo<TimelineSliceGeometry[]>(() => {
    if (!slices.length || detailInnerWidth <= 0) {
      return [];
    }

    const spanSec = Math.max(1, domainEnd - domainStart);
    const toX = (normalized: number) => {
      const clampedNorm = clamp(normalized, 0, 100);
      const sec = domainStart + (clampedNorm / 100) * spanSec;
      return detailScale(new Date(sec * 1000));
    };

    const geometries = slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          const startX = toX(Math.min(slice.range[0], slice.range[1]));
          const endX = toX(Math.max(slice.range[0], slice.range[1]));
          const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
          const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
          if (right <= 0 || left >= detailInnerWidth) {
            return null;
          }

          return {
            id: slice.id,
            left,
            width: Math.max(2, right - left),
            isActive: activeSliceId === slice.id,
            isBurst: !!slice.isBurst,
            isPoint: false,
            isSuggestion: slice.source === 'suggestion',
            overlapCount: sliceOverlapCounts[slice.id] ?? 1,
            color: slice.color,
          };
        }

        const x = toX(slice.time);
        if (x < 0 || x > detailInnerWidth) {
          return null;
        }

        return {
          id: slice.id,
          left: Math.max(0, Math.min(detailInnerWidth, x - 1)),
          width: 2,
          isActive: activeSliceId === slice.id,
          isBurst: !!slice.isBurst,
          isPoint: true,
          isSuggestion: slice.source === 'suggestion',
          overlapCount: 1,
          color: slice.color,
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);

    return geometries;
  }, [activeSliceId, detailInnerWidth, detailScale, domainEnd, domainStart, sliceOverlapCounts, slices]);

  const maxSliceOverlap = useMemo(
    () =>
      sliceGeometries.reduce((maxOverlap, geometry) => {
        if (geometry.isPoint) {
          return maxOverlap;
        }
        return Math.max(maxOverlap, geometry.overlapCount);
      }, 1),
    [sliceGeometries]
  );

  const orderedSliceGeometries = useMemo(() => {
    const stackWeight = (geometry: TimelineSliceGeometry) => {
      let weight = 0;
      if (geometry.overlapCount >= 2) {
        weight += 1;
      }
      if (geometry.isBurst) {
        weight += 1;
      }
      if (geometry.isActive) {
        weight += 3;
      }
      return weight;
    };

    return [...sliceGeometries].sort((a, b) => stackWeight(a) - stackWeight(b));
  }, [sliceGeometries]);

  const isTimelineLoading = isViewportLoading;
  const isDetailEmpty = !isTimelineLoading && detailPoints.length === 0;

  const brushDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  const brushRangeLabel = useMemo(() => {
    if (!brushRange) {
      return 'No selection';
    }

    const [startNorm, endNorm] = brushRange;
    const startSec = normalizedToEpochSeconds(Math.min(startNorm, endNorm), domainStart, domainEnd);
    const endSec = normalizedToEpochSeconds(Math.max(startNorm, endNorm), domainStart, domainEnd);

    return `${brushDateFormatter.format(new Date(startSec * 1000))} - ${brushDateFormatter.format(
      new Date(endSec * 1000)
    )}`;
  }, [brushDateFormatter, brushRange, domainEnd, domainStart]);


  return (
    <div ref={containerRef} className="relative w-full" aria-busy={isTimelineLoading}>
      <div className="flex flex-col gap-6">
        <div
          className="flex flex-wrap items-center gap-3"
          style={{
            paddingLeft: OVERVIEW_MARGIN.left,
            paddingRight: OVERVIEW_MARGIN.right
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="text-xs font-medium text-foreground">{brushRangeLabel}</div>
              <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="leading-none">Low</span>
                <span
                  className="h-2 w-20 rounded-sm border border-foreground/15"
                  style={{
                    background: `linear-gradient(90deg, rgb(${DENSITY_COLOR_LOW.join(',')}) 0%, rgb(${DENSITY_COLOR_HIGH.join(',')}) 100%)`
                  }}
                  aria-hidden="true"
                />
                <span className="leading-none">High</span>
              </div>
            </div>
            <div className="relative w-full">
              {width > 0 ? (
                <DensityHeatStrip
                  densityMap={densityMap}
                  width={overviewInnerWidth}
                  scale={overviewScale}
                  height={12}
                  isLoading={isComputing}
                  densityDomain={DENSITY_DOMAIN}
                  colorLow={DENSITY_COLOR_LOW}
                  colorHigh={DENSITY_COLOR_HIGH}
                />
              ) : (
                <div className="h-3" />
              )}
              {stripSelection && (
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute top-0 h-full rounded-sm border border-primary/60 bg-primary/15"
                    style={{ left: stripSelection.left, width: stripSelection.width }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <svg ref={overviewSvgRef} width={width} height={OVERVIEW_HEIGHT + AXIS_HEIGHT}>
          <defs>
            <linearGradient id="adaptiveAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.09" />
            </linearGradient>
          </defs>
          <g transform={`translate(${OVERVIEW_MARGIN.left},${OVERVIEW_MARGIN.top})`}>
            {overviewBins.map((bucket, index) => {
              if (bucket.x0 === undefined || bucket.x1 === undefined) return null;
              const x0 = overviewScale(new Date(bucket.x0 * 1000));
              const x1 = overviewScale(new Date(bucket.x1 * 1000));
              const barWidth = Math.max(0, x1 - x0 - 1);
              const barHeight = (bucket.length / overviewMax) * OVERVIEW_HEIGHT;
              return (
                <rect
                  key={`overview-${index}`}
                  x={x0}
                  y={OVERVIEW_HEIGHT - barHeight}
                  width={barWidth}
                  height={barHeight}
                  className="fill-primary/20"
                />
              );
            })}
            {userWarpOverlayBands.map((slice) => {
              const x0 = overviewScale(new Date(slice.startSec * 1000));
              const x1 = overviewScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              return (
                <rect
                  key={`overview-user-warp-${slice.id}`}
                  x={left}
                  y={0}
                  width={widthSpan}
                  height={OVERVIEW_HEIGHT}
                  fill="rgba(139, 92, 246, 0.15)"
                  stroke="rgba(99, 102, 241, 0.55)"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
              );
            })}
            <g ref={brushRef} className="text-primary/60" />
            <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
              {timeScaleMode === 'adaptive' ? (
                <rect
                  x={0}
                  y={0}
                  width={overviewInnerWidth}
                  height={AXIS_HEIGHT}
                  fill="url(#adaptiveAxisGradient)"
                />
              ) : null}
              {overviewTicks.map((tick, index) => {
                const x = overviewScale(tick);
                return (
                  <g key={`overview-tick-${index}`} transform={`translate(${x}, 0)`}>
                    <line y2={6} stroke="currentColor" />
                    <text
                      y={14}
                      textAnchor="middle"
                      fontSize={10}
                      fill="currentColor"
                    >
                      {tick.toLocaleDateString()}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        <div className="relative">
          <div
            className="mb-2"
            style={{
              paddingLeft: DETAIL_MARGIN.left,
              paddingRight: DETAIL_MARGIN.right
            }}
          >
            {width > 0 ? (
              <DensityHeatStrip
                densityMap={detailDensityMap}
                width={detailInnerWidth}
                scale={detailScale}
                height={10}
                isLoading={isComputing}
                densityDomain={DENSITY_DOMAIN}
                colorLow={DENSITY_COLOR_LOW}
                colorHigh={DENSITY_COLOR_HIGH}
              />
            ) : (
              <div className="h-2" />
            )}
          </div>
          <svg ref={detailSvgRef} width={width} height={DETAIL_HEIGHT + AXIS_HEIGHT}>
            <defs>
              <filter id="timeCursorGlow" x="-50%" y="-10%" width="200%" height="120%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={TIME_CURSOR_COLOR} floodOpacity="0.65" />
              </filter>
              <pattern id="sliceOverlapHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="2" />
              </pattern>
            </defs>
            <g transform={`translate(${DETAIL_MARGIN.left},${DETAIL_MARGIN.top})`}>
            {resolvedDetailRenderMode === 'points'
              ? detailPoints.map((timestamp, index) => {
                  const x = detailScale(new Date(timestamp * 1000));
                  return (
                    <circle
                      key={`detail-point-${index}`}
                      cx={x}
                      cy={DETAIL_HEIGHT - 6}
                      r={2}
                      className="fill-primary/60"
                    />
                  );
                })
              : detailBins.map((bucket, index) => {
                  if (bucket.x0 === undefined || bucket.x1 === undefined) return null;
                  const x0 = detailScale(new Date(bucket.x0 * 1000));
                  const x1 = detailScale(new Date(bucket.x1 * 1000));
                  const barWidth = Math.max(0, x1 - x0 - 1);
                  const barHeight = (bucket.length / detailMax) * DETAIL_HEIGHT;
                  return (
                    <rect
                      key={`detail-bin-${index}`}
                      x={x0}
                      y={DETAIL_HEIGHT - barHeight}
                      width={barWidth}
                      height={barHeight}
                      className="fill-primary/20"
                    />
                  );
                })}
            {userWarpOverlayBands.map((slice) => {
              const x0 = detailScale(new Date(slice.startSec * 1000));
              const x1 = detailScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              return (
                <rect
                  key={`detail-user-warp-${slice.id}`}
                  x={left}
                  y={0}
                  width={widthSpan}
                  height={DETAIL_HEIGHT}
                  fill="rgba(139, 92, 246, 0.15)"
                  stroke="rgba(99, 102, 241, 0.55)"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
              );
            })}

            {orderedSliceGeometries.map((geometry) => {
              const color = resolveSliceColor(geometry.color);
              const baseOpacity = geometry.isActive
                ? 0.68
                : geometry.overlapCount >= 3
                  ? 0.2
                  : geometry.overlapCount === 2
                    ? 0.28
                    : 0.38;

              // Suggestion slices get a distinct violet styling
              const isSuggestionSlice = geometry.isSuggestion && !geometry.isBurst;
              const suggestionFill = 'rgba(139, 92, 246, 0.2)';
              const suggestionStroke = 'rgba(167, 139, 250, 0.85)';

              return (
                <g key={`${geometry.id}-${geometry.isActive ? activeSliceUpdatedAt : 'base'}`}>
                  <rect
                    x={geometry.left}
                    y={3}
                    width={Math.max(2, geometry.width)}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill={isSuggestionSlice ? suggestionFill : (geometry.isBurst ? 'rgba(251, 146, 60, 0.26)' : color.fill)}
                    stroke={isSuggestionSlice ? suggestionStroke : (geometry.isBurst ? 'rgba(251, 146, 60, 0.85)' : color.stroke)}
                    strokeWidth={geometry.isActive ? 2.3 : geometry.overlapCount >= 2 ? 1.5 : 1}
                    strokeDasharray={geometry.overlapCount >= 3 || isSuggestionSlice ? '5 3' : undefined}
                    opacity={baseOpacity}
                  />
                  {geometry.overlapCount >= 2 && !geometry.isActive && (
                    <rect
                      x={geometry.left}
                      y={3}
                      width={Math.max(2, geometry.width)}
                      height={DETAIL_HEIGHT - 6}
                      rx={3}
                      fill="url(#sliceOverlapHatch)"
                      opacity={geometry.overlapCount >= 3 ? 0.42 : 0.3}
                    />
                  )}
                  {geometry.isActive && (
                    <rect
                      x={geometry.left}
                      y={2}
                      width={Math.max(2, geometry.width)}
                      height={DETAIL_HEIGHT - 4}
                      rx={3}
                      fill="none"
                      stroke={geometry.isBurst ? 'rgba(253, 186, 116, 0.95)' : 'rgba(125, 211, 252, 0.95)'}
                      strokeWidth={2.2}
                      opacity={0.9}
                    >
                      <animate attributeName="opacity" values="0.55;1;0.55" dur="1.8s" repeatCount="indefinite" />
                    </rect>
                  )}
                </g>
              );
            })}

            {maxSliceOverlap >= 3 && (
              <g transform={`translate(${Math.max(0, detailInnerWidth - 90)}, 4)`}>
                <rect width={86} height={18} rx={9} fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.55)" />
                <text x={43} y={12} textAnchor="middle" fontSize={10} fill="rgba(226, 232, 240, 0.95)">
                  {maxSliceOverlap}x overlap
                </text>
              </g>
            )}

            <line
              x1={cursorX}
              x2={cursorX}
              y1={0}
              y2={DETAIL_HEIGHT}
              stroke={TIME_CURSOR_COLOR}
              strokeWidth={2}
              filter="url(#timeCursorGlow)"
            />
            <circle
              cx={cursorX}
              cy={0}
              r={8}
              fill="rgba(16,185,129,0.2)"
              stroke="rgba(16,185,129,0.45)"
              strokeWidth={1}
              pointerEvents="none"
            />
            <circle
              cx={cursorX}
              cy={0}
              r={5.5}
              fill={TIME_CURSOR_COLOR}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={2}
              filter="url(#timeCursorGlow)"
            />
            {selectionX !== null && (
              <g>
                <line
                  x1={selectionX}
                  x2={selectionX}
                  y1={0}
                  y2={DETAIL_HEIGHT}
                  stroke="rgba(56, 189, 248, 0.3)"
                  strokeWidth={6}
                />
                <line
                  x1={selectionX}
                  x2={selectionX}
                  y1={0}
                  y2={DETAIL_HEIGHT}
                  stroke="rgba(125, 211, 252, 0.95)"
                  strokeWidth={2.2}
                  strokeDasharray="4 2"
                >
                  <animate attributeName="opacity" values="0.45;1;0.45" dur="1.7s" repeatCount="indefinite" />
                </line>
                <circle cx={selectionX} cy={4} r={3.5} fill="rgba(186, 230, 253, 0.95)">
                  <animate attributeName="r" values="3;4.5;3" dur="1.7s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
            <rect
              ref={zoomRef}
              width={detailInnerWidth}
              height={DETAIL_HEIGHT}
              fill="transparent"
              pointerEvents="auto"
              className="cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpWithSelection}
              onPointerLeave={handlePointerCancel}
            />
            <g transform={`translate(0, ${DETAIL_HEIGHT})`} className="text-muted-foreground">
              {timeScaleMode === 'adaptive' ? (
                <rect
                  x={0}
                  y={0}
                  width={detailInnerWidth}
                  height={AXIS_HEIGHT}
                  fill="url(#adaptiveAxisGradient)"
                />
              ) : null}
              {detailTicks.map((tick, index) => {
                const x = detailScale(tick);
                return (
                  <g key={`detail-tick-${index}`} transform={`translate(${x}, 0)`}>
                    <line y2={6} stroke="currentColor" />
                    <text
                      y={14}
                      textAnchor="middle"
                      fontSize={10}
                      fill="currentColor"
                    >
                      {detailTickFormat(tick)}
                    </text>
                  </g>
                );
              })}
            </g>
            </g>
          </svg>
          {isTimelineLoading && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" aria-hidden="true" />
                Loading timeline data...
              </div>
            </div>
          )}
          {isDetailEmpty && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
              <div className="rounded-md border border-border/60 bg-background/90 px-4 py-3 text-center shadow-sm">
                <p className="text-sm font-medium text-foreground">No data in this range</p>
                <p className="mt-1 text-xs text-muted-foreground">Try expanding the brush range or adjusting filters.</p>
              </div>
            </div>
          )}
          {hoveredDetail && (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded bg-background/95 px-2 py-1 text-xs text-foreground shadow-sm"
              style={{
                left: hoveredDetail.x + DETAIL_MARGIN.left,
                transform: 'translate(-50%, -100%)'
              }}
            >
              {hoveredDetail.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
