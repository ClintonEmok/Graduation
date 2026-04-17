"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { bin, max } from 'd3-array';
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time';
import { useMeasure } from '@/hooks/useMeasure';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import {
  select,
  selectActiveSliceId,
  selectActiveSliceUpdatedAt,
  selectSlices,
  useDashboardDemoSliceStore,
} from '@/store/useDashboardDemoSliceStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { resolvePointByIndex } from '@/lib/selection';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { buildDemoSliceAuthoredWarpMap } from '@/components/dashboard-demo/lib/demo-warp-map';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import {
  computeDensityMap,
  useDensityStripDerivation,
  DETAIL_DENSITY_RECOMPUTE_MAX_DAYS,
} from './hooks/useDensityStripDerivation';
import { useScaleTransforms } from './hooks/useScaleTransforms';
import { useBrushZoomSync } from './hooks/useBrushZoomSync';
import { usePointSelection } from './hooks/usePointSelection';
import {
  clampToRange,
  computeRangeUpdate,
  resolveSelectionX,
} from './lib/interaction-guards';
import {
  buildSpanAwareTicks,
  formatSpanAwareTickLabel,
  type TickLabelStrategy,
} from './lib/tick-ux';

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const DENSITY_DOMAIN: [number, number] = [0, 1];
const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
const TIME_CURSOR_COLOR = '#10b981';

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

const clamp = clampToRange;

const buildDensityWarpMap = (
  densityMap: Float32Array | null,
  domain: [number, number]
): Float32Array | null => {
  if (!densityMap || densityMap.length < 2) {
    return null;
  }

  const [start, end] = domain;
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0) {
    return null;
  }

  let maxDensity = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    const value = densityMap[i] ?? 0;
    if (Number.isFinite(value) && value > maxDensity) {
      maxDensity = value;
    }
  }
  if (maxDensity <= 0) {
    maxDensity = 1;
  }

  const weights = new Float32Array(densityMap.length);
  let totalWeight = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    const normalized = (densityMap[i] ?? 0) / maxDensity;
    const safeNormalized = Number.isFinite(normalized) ? normalized : 0;
    const weight = 1 + safeNormalized * 5;
    weights[i] = weight;
    totalWeight += weight;
  }

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return null;
  }

  const warpMap = new Float32Array(densityMap.length);
  let accumulated = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    warpMap[i] = start + (accumulated / totalWeight) * span;
    accumulated += weights[i] ?? 1;
  }

  return warpMap;
};

interface ApplyRangeToStoresContractParams {
  interactive: boolean;
  startSec: number;
  endSec: number;
  domainStart: number;
  domainEnd: number;
  currentTime: number;
  setTimeRange: (range: [number, number]) => void;
  setRange: (range: [number, number]) => void;
  setBrushRange: (range: [number, number] | null) => void;
  setViewport: (startDate: number, endDate: number) => void;
  setTime: (time: number) => void;
}

export const applyRangeToStoresContract = ({
  interactive,
  startSec,
  endSec,
  domainStart,
  domainEnd,
  currentTime,
  setTimeRange,
  setRange,
  setBrushRange,
  setViewport,
  setTime,
}: ApplyRangeToStoresContractParams): void => {
  if (!interactive) {
    return;
  }

  const {
    safeStartSec: safeStart,
    safeEndSec: safeEnd,
    normalizedRange: nextRange,
  } = computeRangeUpdate(startSec, endSec, domainStart, domainEnd);

  setTimeRange([safeStart, safeEnd]);
  setRange(nextRange);
  setBrushRange(nextRange);
  setViewport(safeStart, safeEnd);

  const clampedCurrentTime = clamp(currentTime, nextRange[0], nextRange[1]);
  if (clampedCurrentTime !== currentTime) {
    setTime(clampedCurrentTime);
  }
};

interface TimelineSliceGeometry {
  id: string;
  left: number;
  width: number;
  rawLeft: number;
  rawWidth: number;
  isActive: boolean;
  isBurst: boolean;
  isPoint: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  color: string | undefined;
  warpEnabled: boolean;
  warpWeight: number;
}

const resolveSliceColor = (color?: string): { fill: string; stroke: string } => {
  if (!color) {
    return { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
  }
  return SLICE_COLOR_PALETTE[color] ?? { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
};

interface DemoDualTimelineProps {
  domainOverride?: [number, number];
  detailRangeOverride?: [number, number];
  interactive?: boolean;
  timestampSecondsOverride?: number[];
  detailPointsOverride?: number[];
  detailRenderMode?: 'auto' | 'points' | 'bins';
  detailBinCount?: number;
  tickLabelStrategy?: TickLabelStrategy;
}

export const DemoDualTimeline: React.FC<DemoDualTimelineProps> = ({
  domainOverride,
  detailRangeOverride,
  interactive = true,
  timestampSecondsOverride,
  detailPointsOverride,
  detailRenderMode = 'auto',
  detailBinCount = 60,
  tickLabelStrategy = 'legacy',
}) => {
  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useStore(useDashboardDemoFilterStore, (state) => state.selectedTimeRange);
  const setTimeRange = useStore(useDashboardDemoFilterStore, (state) => state.setTimeRange);
  const currentTime = useStore(useDashboardDemoTimeStore, (state) => state.currentTime);
  const setTime = useStore(useDashboardDemoTimeStore, (state) => state.setTime);
  const setRange = useStore(useDashboardDemoTimeStore, (state) => state.setRange);
  const timeResolution = useStore(useDashboardDemoTimeStore, (state) => state.timeResolution);
  const selectedIndex = useStore(useDashboardDemoCoordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(useDashboardDemoCoordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(useDashboardDemoCoordinationStore, (state) => state.clearSelection);
  const brushRange = useStore(useDashboardDemoCoordinationStore, (state) => state.brushRange);
  const setBrushRange = useStore(useDashboardDemoCoordinationStore, (state) => state.setBrushRange);
  const timeScaleMode = useStore(useDashboardDemoWarpStore, (state) => state.timeScaleMode);
  const warpSource = useStore(useDashboardDemoWarpStore, (state) => state.warpSource);
  const warpFactor = useStore(useDashboardDemoWarpStore, (state) => state.warpFactor);
  const densityMap = useStore(useDashboardDemoWarpStore, (state) => state.densityMap);
  const precomputedWarpMap = useStore(useDashboardDemoWarpStore, (state) => state.warpMap);
  const precomputedMapDomain = useStore(useDashboardDemoWarpStore, (state) => state.mapDomain);
  const isComputing = useStore(useDashboardDemoWarpStore, (state) => state.isComputing);
  const setPrecomputedMaps = useStore(useDashboardDemoWarpStore, (state) => state.setPrecomputedMaps);
  const setIsComputing = useStore(useDashboardDemoWarpStore, (state) => state.setIsComputing);
  const slices = useStore(useDashboardDemoSliceStore, selectSlices);
  const activeSliceId = useStore(useDashboardDemoSliceStore, selectActiveSliceId);
  const activeSliceUpdatedAt = useStore(useDashboardDemoSliceStore, selectActiveSliceUpdatedAt);
  const getSliceOverlapCounts = useStore(useDashboardDemoSliceStore, select((state) => state.getOverlapCounts));
  const pendingGeneratedBins = useStore(useDashboardDemoTimeslicingModeStore, (state) => state.pendingGeneratedBins);

  const warpDomain = useMemo<[number, number]>(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [maxTimestampSec, minTimestampSec]);

  const hasVisibleWarpSlices = useMemo(
    () => slices.some((slice) => slice.isVisible && (slice.warpEnabled ?? true)),
    [slices]
  );

  const authoredWarpMap = useMemo(
    () => buildDemoSliceAuthoredWarpMap(slices, warpDomain, Math.max(96, slices.length * 8 || 0)),
    [slices, warpDomain]
  );

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

  // Active window range: override > selectedTimeRange > viewport bounds (first year)
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

  const nextDensityMap = useMemo(() => {
    if (!timestampSeconds.length || warpDomain[1] <= warpDomain[0]) {
      return null;
    }

    return computeDensityMap(timestampSeconds, warpDomain, ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH);
  }, [timestampSeconds, warpDomain]);

  const nextDensityWarpMap = useMemo(
    () => buildDensityWarpMap(nextDensityMap, warpDomain),
    [nextDensityMap, warpDomain]
  );

  useEffect(() => {
    setIsComputing(true);
    setPrecomputedMaps(nextDensityMap, nextDensityWarpMap, warpDomain);
  }, [nextDensityMap, nextDensityWarpMap, setIsComputing, setPrecomputedMaps, warpDomain]);

  const usingDensitySource = warpSource === 'density';
  const shouldForceAdaptiveFromSlices = warpSource === 'slice-authored' && hasVisibleWarpSlices;

  const effectiveWarpMap = usingDensitySource ? precomputedWarpMap : authoredWarpMap;
  const effectiveWarpDomain = usingDensitySource ? precomputedMapDomain : warpDomain;
  const effectiveWarpFactor = shouldForceAdaptiveFromSlices ? (warpFactor > 0 ? warpFactor : 1) : warpFactor;
  const effectiveTimeScaleMode = shouldForceAdaptiveFromSlices ? 'adaptive' : timeScaleMode;

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

  const { detailSpanDays, detailDensityMap } = useDensityStripDerivation({
    detailPoints,
    detailRangeSec,
    densityMap,
    domainStart,
    domainEnd,
  });

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

  const { overviewInteractionScale, detailInteractionScale, overviewScale, detailScale } =
    useScaleTransforms({
      domainStart,
      domainEnd,
      detailRangeSec,
      overviewInnerWidth,
      detailInnerWidth,
      timeScaleMode: effectiveTimeScaleMode,
      warpFactor: effectiveWarpFactor,
      warpMap: effectiveWarpMap,
      warpDomain: effectiveWarpDomain,
    });

  const applyRangeToStores = useCallback(
    (startSec: number, endSec: number) => {
      applyRangeToStoresContract({
        interactive,
        startSec,
        endSec,
        domainStart,
        domainEnd,
        currentTime,
        setTimeRange,
        setRange,
        setBrushRange,
        setViewport,
        setTime,
      });
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

  useBrushZoomSync({
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
  });

  const {
    hoveredDetail,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
  } = usePointSelection({
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
  });

  const cursorEpochSeconds = useMemo(() => {
    if (!Number.isFinite(currentTime) || !Number.isFinite(domainStart) || !Number.isFinite(domainEnd)) {
      return null;
    }
    return normalizedToEpochSeconds(clamp(currentTime, 0, 100), domainStart, domainEnd);
  }, [currentTime, domainStart, domainEnd]);

  const cursorX = useMemo(() => {
    return resolveSelectionX(cursorEpochSeconds, (date) => detailScale(date), detailInnerWidth);
  }, [cursorEpochSeconds, detailInnerWidth, detailScale]);

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex]);

  const selectionX = useMemo(() => {
    return resolveSelectionX(selectionPoint?.timestampSec, (date) => detailScale(date), detailInnerWidth);
  }, [detailInnerWidth, detailScale, selectionPoint]);


  const overviewTicks = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return buildSpanAwareTicks(overviewScale, {
        rangeStartSec: domainStart,
        rangeEndSec: domainEnd,
        axisWidth: overviewInnerWidth,
      });
    }

    return overviewScale.ticks(Math.max(2, Math.floor(overviewInnerWidth / 120)));
  }, [domainEnd, domainStart, overviewInnerWidth, overviewScale, tickLabelStrategy]);
  const detailTicks = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return buildSpanAwareTicks(detailScale, {
        rangeStartSec: detailRangeSec[0],
        rangeEndSec: detailRangeSec[1],
        axisWidth: detailInnerWidth,
      });
    }

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
  }, [detailInnerWidth, detailRangeSec, detailScale, tickLabelStrategy, timeResolution]);
  const detailTickFormat = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return (date: Date) =>
        formatSpanAwareTickLabel(date, {
          rangeStartSec: detailRangeSec[0],
          rangeEndSec: detailRangeSec[1],
          axisWidth: detailInnerWidth,
        });
    }

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
  }, [detailInnerWidth, detailRangeSec, tickLabelStrategy, timeResolution]);
  const overviewTickFormat = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return (date: Date) =>
        formatSpanAwareTickLabel(date, {
          rangeStartSec: domainStart,
          rangeEndSec: domainEnd,
          axisWidth: overviewInnerWidth,
        });
    }

    return (date: Date) => date.toLocaleDateString();
  }, [domainEnd, domainStart, overviewInnerWidth, tickLabelStrategy]);

  const stripSelection = useMemo(() => {
    if (!overviewInnerWidth) return null;
    if (!Number.isFinite(detailRangeSec[0]) || !Number.isFinite(detailRangeSec[1])) {
      return null;
    }
    const x0 = overviewScale(new Date(detailRangeSec[0] * 1000));
    const x1 = overviewScale(new Date(detailRangeSec[1] * 1000));
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
      return null;
    }
    const left = Math.min(x0, x1);
    const widthSpan = Math.max(2, Math.abs(x1 - x0));
    if (!Number.isFinite(left) || !Number.isFinite(widthSpan)) {
      return null;
    }
    return { left, width: widthSpan };
  }, [detailRangeSec, overviewInnerWidth, overviewScale]);

  const userWarpOverlayBands = useMemo(
    () =>
      slices
        .filter((slice) => slice.isVisible && (slice.warpEnabled ?? true))
        .map((slice) => {
          const [normalizedStart, normalizedEnd] =
            slice.type === 'range' && slice.range
              ? [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])]
              : [Math.max(0, slice.time - (slice.isBurst ? 2.5 : 1.5)), Math.min(100, slice.time + (slice.isBurst ? 2.5 : 1.5))];

          const startSec = normalizedToEpochSeconds(normalizedStart, domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(normalizedEnd, domainStart, domainEnd);

          return {
            id: slice.id,
            startSec: Math.min(startSec, endSec),
            endSec: Math.max(startSec, endSec),
            isDebugPreview: false,
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [domainEnd, domainStart, slices]
  );

  const overviewSliceBoxes = useMemo(
    () =>
      slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          const [normalizedStart, normalizedEnd] =
            slice.type === 'range' && slice.range
              ? [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])]
              : [Math.max(0, slice.time - 1.5), Math.min(100, slice.time + 1.5)];

          const startSec = normalizedToEpochSeconds(normalizedStart, domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(normalizedEnd, domainStart, domainEnd);

          return {
            id: slice.id,
            startSec: Math.min(startSec, endSec),
            endSec: Math.max(startSec, endSec),
            color: slice.color,
            isActive: activeSliceId === slice.id,
            warpEnabled: slice.warpEnabled ?? true,
            warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [activeSliceId, domainEnd, domainStart, slices]
  );

  const sliceOverlapCounts = getSliceOverlapCounts();

  const sliceGeometries = useMemo<TimelineSliceGeometry[]>(() => {
    if (!slices.length || detailInnerWidth <= 0) {
      return [];
    }

    const spanSec = Math.max(1, domainEnd - domainStart);
    const toX = (normalized: number): number | null => {
      if (!Number.isFinite(normalized)) {
        return null;
      }
      const clampedNorm = clamp(normalized, 0, 100);
      const sec = domainStart + (clampedNorm / 100) * spanSec;
      if (!Number.isFinite(sec)) {
        return null;
      }
      const x = detailScale(new Date(sec * 1000));
      return Number.isFinite(x) ? x : null;
    };

    const toRawX = (normalized: number): number | null => {
      if (!Number.isFinite(normalized)) {
        return null;
      }
      const clampedNorm = clamp(normalized, 0, 100);
      const sec = domainStart + (clampedNorm / 100) * spanSec;
      if (!Number.isFinite(sec)) {
        return null;
      }
      const x = detailInteractionScale(new Date(sec * 1000));
      return Number.isFinite(x) ? x : null;
    };

    const geometries = slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          if (!Number.isFinite(slice.range[0]) || !Number.isFinite(slice.range[1])) {
            return null;
          }
          const startX = toX(Math.min(slice.range[0], slice.range[1]));
          const endX = toX(Math.max(slice.range[0], slice.range[1]));
          const rawStartX = toRawX(Math.min(slice.range[0], slice.range[1]));
          const rawEndX = toRawX(Math.max(slice.range[0], slice.range[1]));
          if (startX === null || endX === null || rawStartX === null || rawEndX === null) {
            return null;
          }
          const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
          const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
          const rawLeft = Math.max(0, Math.min(detailInnerWidth, Math.min(rawStartX, rawEndX)));
          const rawRight = Math.max(0, Math.min(detailInnerWidth, Math.max(rawStartX, rawEndX)));
          if (right <= 0 || left >= detailInnerWidth) {
            return null;
          }

          return {
            id: slice.id,
            left,
            width: Math.max(2, right - left),
            rawLeft,
            rawWidth: Math.max(2, rawRight - rawLeft),
            isActive: activeSliceId === slice.id,
            isBurst: !!slice.isBurst,
            isPoint: false,
            isSuggestion: (slice as { source?: string }).source === 'suggestion',
            isGeneratedDraft: false,
            isGeneratedApplied: slice.source === 'generated-applied',
            overlapCount: sliceOverlapCounts[slice.id] ?? 1,
            color: slice.color,
            warpEnabled: slice.warpEnabled ?? true,
            warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
          };
        }

        if (!Number.isFinite(slice.time)) {
          return null;
        }
        const x = toX(slice.time);
        const rawX = toRawX(slice.time);
        if (x === null || rawX === null || x < 0 || x > detailInnerWidth) {
          return null;
        }

        return {
          id: slice.id,
          left: Math.max(0, Math.min(detailInnerWidth, x - 1)),
          width: 2,
          rawLeft: Math.max(0, Math.min(detailInnerWidth, rawX - 1)),
          rawWidth: 2,
          isActive: activeSliceId === slice.id,
          isBurst: !!slice.isBurst,
          isPoint: true,
          isSuggestion: (slice as { source?: string }).source === 'suggestion',
          isGeneratedDraft: false,
          isGeneratedApplied: slice.source === 'generated-applied',
          overlapCount: 1,
          color: slice.color,
          warpEnabled: slice.warpEnabled ?? true,
          warpWeight: Math.min(3, Math.max(0, slice.warpWeight ?? 1)),
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);

    return geometries;
  }, [activeSliceId, detailInnerWidth, detailInteractionScale, detailScale, domainEnd, domainStart, sliceOverlapCounts, slices]);

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

  const pendingGeneratedGeometries = useMemo<TimelineSliceGeometry[]>(() => {
    if (!pendingGeneratedBins.length || detailInnerWidth <= 0) {
      return [];
    }

    return pendingGeneratedBins
      .map<TimelineSliceGeometry | null>((bin) => {
        const startX = detailScale(new Date(bin.startTime));
        const endX = detailScale(new Date(bin.endTime));
        if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
          return null;
        }

        const left = Math.max(0, Math.min(detailInnerWidth, Math.min(startX, endX)));
        const right = Math.max(0, Math.min(detailInnerWidth, Math.max(startX, endX)));
        if (right <= 0 || left >= detailInnerWidth || right <= left) {
          return null;
        }

        return {
          id: `pending-${bin.id}`,
          left,
          width: Math.max(2, right - left),
          rawLeft: left,
          rawWidth: Math.max(2, right - left),
          isActive: false,
          isBurst: false,
          isPoint: false,
          isSuggestion: false,
          isGeneratedDraft: true,
          isGeneratedApplied: false,
          overlapCount: 1,
          color: 'purple',
          warpEnabled: true,
          warpWeight: 1,
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);
  }, [detailInnerWidth, detailScale, pendingGeneratedBins]);

  const pendingGeneratedBinsByGeometryId = useMemo(() => {
    return new Map(pendingGeneratedBins.map((bin) => [`pending-${bin.id}`, bin] as const));
  }, [pendingGeneratedBins]);

  const formatBurstCoefficient = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return value.toFixed(2);
  };

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
    if (!Number.isFinite(startNorm) || !Number.isFinite(endNorm)) {
      return 'No selection';
    }

    const clampedStartNorm = clamp(Math.min(startNorm, endNorm), 0, 100);
    const clampedEndNorm = clamp(Math.max(startNorm, endNorm), 0, 100);
    const startSec = normalizedToEpochSeconds(clampedStartNorm, domainStart, domainEnd);
    const endSec = normalizedToEpochSeconds(clampedEndNorm, domainStart, domainEnd);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      return 'No selection';
    }

    const startDate = new Date(startSec * 1000);
    const endDate = new Date(endSec * 1000);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 'No selection';
    }

    return `${brushDateFormatter.format(startDate)} - ${brushDateFormatter.format(endDate)}`;
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
            {overviewSliceBoxes.map((slice) => {
              const x0 = overviewScale(new Date(slice.startSec * 1000));
              const x1 = overviewScale(new Date(slice.endSec * 1000));
              const rawX0 = overviewInteractionScale(new Date(slice.startSec * 1000));
              const rawX1 = overviewInteractionScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const rawLeft = Math.min(rawX0, rawX1);
              const widthSpan = Math.max(2, Math.abs(x1 - x0));
              const rawWidthSpan = Math.max(2, Math.abs(rawX1 - rawX0));
              const color = resolveSliceColor(slice.color);
              const warpWeight = slice.warpWeight;
              const warpEnabled = slice.warpEnabled;
              const shouldShowWarpReference = effectiveTimeScaleMode === 'adaptive' && warpEnabled;
              const warpStrength = Math.max(0, Math.min(1, warpWeight / 3));
              const fillOpacity = warpEnabled
                ? slice.isActive
                  ? 0.2 + warpStrength * 0.14
                  : 0.12 + warpStrength * 0.1
                : slice.isActive
                  ? 0.14
                  : 0.08;
              const strokeOpacity = warpEnabled
                ? slice.isActive
                  ? 0.95
                  : 0.6 + warpStrength * 0.28
                : 0.45;
              const strokeWidth = warpEnabled
                ? slice.isActive
                  ? 1.8 + warpStrength * 0.8
                : 1 + warpStrength * 0.6
                : slice.isActive
                  ? 1.4
                  : 1;
              return (
                <g key={`overview-slice-box-${slice.id}`}>
                  {shouldShowWarpReference ? (
                    <rect
                      x={rawLeft}
                      y={2}
                      width={rawWidthSpan}
                      height={Math.max(2, OVERVIEW_HEIGHT - 4)}
                      rx={2}
                      fill="rgba(148, 163, 184, 0.06)"
                      stroke="rgba(148, 163, 184, 0.45)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                  ) : null}
                  <rect
                    x={left}
                    y={2}
                    width={widthSpan}
                    height={Math.max(2, OVERVIEW_HEIGHT - 4)}
                    rx={2}
                    fill={warpEnabled ? `rgba(15, 23, 42, ${fillOpacity})` : 'rgba(15, 23, 42, 0.08)'}
                    stroke={warpEnabled ? color.stroke : 'rgba(148, 163, 184, 0.7)'}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                    strokeDasharray={warpEnabled ? (slice.isActive ? undefined : '4 2') : '2 3'}
                  />
                </g>
              );
            })}
            {userWarpOverlayBands.map((slice) => {
              const x0 = overviewScale(new Date(slice.startSec * 1000));
              const x1 = overviewScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              return (
                <g key={`overview-user-warp-${slice.id}`}>
                  <rect
                    x={left}
                    y={1}
                    width={widthSpan}
                    height={Math.max(2, OVERVIEW_HEIGHT - 2)}
                    rx={2}
                    fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.1)' : 'rgba(139, 92, 246, 0.06)'}
                  />
                  <rect
                    x={left}
                    y={1}
                    width={widthSpan}
                    height={Math.max(2, OVERVIEW_HEIGHT - 2)}
                    rx={2}
                    fill="none"
                    stroke={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.45)' : 'rgba(139, 92, 246, 0.32)'}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                  />
                </g>
              );
            })}
            <g ref={brushRef} className="text-primary/60" />
            <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
              {effectiveTimeScaleMode === 'adaptive' ? (
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
                      {overviewTickFormat(tick)}
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
              if (!Number.isFinite(slice.startSec) || !Number.isFinite(slice.endSec)) {
                return null;
              }
              const x0 = detailScale(new Date(slice.startSec * 1000));
              const x1 = detailScale(new Date(slice.endSec * 1000));
              if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
                return null;
              }
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              if (!Number.isFinite(left) || !Number.isFinite(widthSpan)) {
                return null;
              }
              return (
                <g key={`detail-user-warp-${slice.id}`}>
                  <rect
                    x={left}
                    y={3}
                    width={widthSpan}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.08)' : 'rgba(139, 92, 246, 0.06)'}
                  />
                  <rect
                    x={left}
                    y={3}
                    width={widthSpan}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill="none"
                    stroke={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.45)' : 'rgba(139, 92, 246, 0.3)'}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {orderedSliceGeometries.map((geometry) => {
              const color = resolveSliceColor(geometry.color);
              const warpStrength = Math.max(0, Math.min(1, geometry.warpWeight / 3));
              const warpEnabled = geometry.warpEnabled;
              const shouldShowWarpReference = effectiveTimeScaleMode === 'adaptive' && warpEnabled;
              const baseOpacity = geometry.isActive
                ? warpEnabled
                  ? 0.64 + warpStrength * 0.2
                  : 0.56
                : geometry.overlapCount >= 3
                  ? warpEnabled
                    ? 0.16 + warpStrength * 0.1
                    : 0.14
                  : geometry.overlapCount === 2
                    ? warpEnabled
                      ? 0.24 + warpStrength * 0.12
                      : 0.22
                    : warpEnabled
                      ? 0.34 + warpStrength * 0.14
                      : 0.28;

              // Suggestion slices get a distinct violet styling
              const isSuggestionSlice = geometry.isSuggestion && !geometry.isBurst;
              const isGeneratedAppliedSlice = geometry.isGeneratedApplied;
              const suggestionFill = 'rgba(139, 92, 246, 0.2)';
              const suggestionStroke = 'rgba(167, 139, 250, 0.85)';

              return (
                <g key={`${geometry.id}-${geometry.isActive ? activeSliceUpdatedAt : 'base'}`}>
                  {shouldShowWarpReference ? (
                    <rect
                      x={geometry.rawLeft}
                      y={3}
                      width={Math.max(2, geometry.rawWidth)}
                      height={DETAIL_HEIGHT - 6}
                      rx={3}
                      fill="rgba(148, 163, 184, 0.06)"
                      stroke="rgba(148, 163, 184, 0.42)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                  ) : null}
                  <rect
                    x={geometry.left}
                    y={3}
                    width={Math.max(2, geometry.width)}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill={isGeneratedAppliedSlice
                      ? 'rgba(16, 185, 129, 0.18)'
                      : isSuggestionSlice
                        ? suggestionFill
                        : geometry.isBurst
                          ? 'rgba(251, 146, 60, 0.26)'
                          : warpEnabled
                            ? color.fill
                            : 'rgba(148, 163, 184, 0.16)'}
                    stroke={isGeneratedAppliedSlice
                      ? 'rgba(74, 222, 128, 0.92)'
                      : isSuggestionSlice
                        ? suggestionStroke
                        : geometry.isBurst
                          ? 'rgba(251, 146, 60, 0.85)'
                          : warpEnabled
                            ? color.stroke
                            : 'rgba(148, 163, 184, 0.78)'}
                    strokeWidth={
                      geometry.isActive
                        ? 2 + (warpEnabled ? warpStrength * 0.9 : 0)
                        : geometry.overlapCount >= 2
                          ? 1.4 + (warpEnabled ? warpStrength * 0.5 : 0)
                          : 1 + (warpEnabled ? warpStrength * 0.35 : 0)
                    }
                    strokeDasharray={
                      !warpEnabled
                        ? '2 3'
                        : geometry.overlapCount >= 3 || isSuggestionSlice
                          ? '5 3'
                          : isGeneratedAppliedSlice
                            ? '8 2'
                            : undefined
                    }
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

            {pendingGeneratedGeometries.map((geometry) => (
              <g key={geometry.id}>
                {(() => {
                  const pendingDraft = pendingGeneratedBinsByGeometryId.get(geometry.id);
                  const burstCoefficient = formatBurstCoefficient(pendingDraft?.burstScore);
                  const draftLabelY = 6;
                  const draftRectY = burstCoefficient ? 18 : 8;
                  const draftRectHeight = burstCoefficient ? DETAIL_HEIGHT - 26 : DETAIL_HEIGHT - 16;
                  const accentY = burstCoefficient ? 19 : 9;

                  return (
                    <>
                <text
                  x={geometry.left + 4}
                  y={draftLabelY}
                  fontSize={9}
                  fill="rgba(254, 243, 199, 0.95)"
                  className="uppercase tracking-[0.18em]"
                >
                  Editable burst draft
                </text>
                {burstCoefficient ? (
                  <text
                    x={geometry.left + 4}
                    y={16}
                    fontSize={9}
                    fill="rgba(254, 243, 199, 0.9)"
                    className="uppercase tracking-[0.16em]"
                  >
                    Burstiness coefficient {burstCoefficient}
                  </text>
                ) : null}
                <rect
                  x={geometry.left}
                  y={draftRectY}
                  width={Math.max(2, geometry.width)}
                  height={draftRectHeight}
                  rx={3}
                  fill={geometry.isGeneratedDraft ? 'rgba(245, 158, 11, 0.18)' : 'rgba(148, 163, 184, 0.12)'}
                  stroke={geometry.isGeneratedDraft ? 'rgba(251, 191, 36, 0.95)' : 'rgba(148, 163, 184, 0.75)'}
                  strokeWidth={1.5}
                  strokeDasharray={geometry.isGeneratedDraft ? '4 2' : '2 3'}
                  opacity={geometry.isGeneratedDraft ? 0.95 : 0.65}
                />
                <rect
                  x={geometry.left + 1}
                  y={accentY}
                  width={Math.max(0, Math.max(2, geometry.width) - 2)}
                  height={2}
                  rx={1}
                  fill="rgba(251, 191, 36, 0.8)"
                  opacity={geometry.isGeneratedDraft ? 0.8 : 0.35}
                />
                    </>
                  );
                })()}
              </g>
            ))}

            {maxSliceOverlap >= 3 && (
              <g transform={`translate(${Math.max(0, detailInnerWidth - 90)}, 4)`}>
                <rect width={86} height={18} rx={9} fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.55)" />
                <text x={43} y={12} textAnchor="middle" fontSize={10} fill="rgba(226, 232, 240, 0.95)">
                  {maxSliceOverlap}x overlap
                </text>
              </g>
            )}

            {cursorX !== null && (
              <>
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
              </>
            )}
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
              {effectiveTimeScaleMode === 'adaptive' ? (
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
