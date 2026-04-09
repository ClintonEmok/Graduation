"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { bin, max } from 'd3-array';
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time';
import { useMeasure } from '@/hooks/useMeasure';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import {
  select,
  selectActiveSliceId,
  selectActiveSliceUpdatedAt,
  selectSlices,
  useSliceDomainStore,
} from '@/store/useSliceDomainStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { resolvePointByIndex } from '@/lib/selection';
import { useBurstWindows } from '@/components/viz/BurstList';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useAutoBurstSlices } from '@/store/useSliceStore';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import { classifyBurstWindow } from '@/lib/binning/burst-taxonomy';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { useDensityStripDerivation, DETAIL_DENSITY_RECOMPUTE_MAX_DAYS } from './hooks/useDensityStripDerivation';
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
const DEBUG_PREVIEW_WARP_PROFILE_ID = '__debug-full-auto-preview__';

const clamp = clampToRange;

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
  isActive: boolean;
  isBurst: boolean;
  isPoint: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  color: string | undefined;
}

const resolveSliceColor = (color?: string): { fill: string; stroke: string } => {
  if (!color) {
    return { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
  }
  return SLICE_COLOR_PALETTE[color] ?? { fill: 'rgba(34, 211, 238, 0.22)', stroke: 'rgba(103, 232, 249, 0.8)' };
};

interface DualTimelineProps {
  adaptiveWarpMapOverride?: Float32Array | null;
  adaptiveWarpDomainOverride?: [number, number];
  warpFactorOverride?: number;
  timeScaleModeOverride?: 'linear' | 'adaptive';
  timeStoreOverride?: unknown;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  sliceDomainStoreOverride?: unknown;
  timeslicingModeStoreOverride?: unknown;
  warpOverlayBandsOverride?: Array<{
    id: string;
    startSec: number;
    endSec: number;
    isDebugPreview: boolean;
  }>;
  domainOverride?: [number, number];
  detailRangeOverride?: [number, number];
  interactive?: boolean;
  timestampSecondsOverride?: number[];
  detailPointsOverride?: number[];
  detailRenderMode?: 'auto' | 'points' | 'bins';
  detailBinCount?: number;
  disableAutoBurstSlices?: boolean;
  tickLabelStrategy?: TickLabelStrategy;
  showWarpConnectors?: boolean;
  warpConnectorStyle?: 'straight' | 'curved';
}

export const DualTimeline: React.FC<DualTimelineProps> = ({
  adaptiveWarpMapOverride,
  adaptiveWarpDomainOverride,
  warpFactorOverride,
  timeScaleModeOverride,
  timeStoreOverride,
  filterStoreOverride,
  coordinationStoreOverride,
  adaptiveStoreOverride,
  sliceDomainStoreOverride,
  timeslicingModeStoreOverride,
  warpOverlayBandsOverride,
  domainOverride,
  detailRangeOverride,
  interactive = true,
  timestampSecondsOverride,
  detailPointsOverride,
  detailRenderMode = 'auto',
  detailBinCount = 60,
  disableAutoBurstSlices = false,
  tickLabelStrategy = 'legacy',
  showWarpConnectors = false,
  warpConnectorStyle = 'curved',
}) => {
  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
  const sliceDomainStore = (sliceDomainStoreOverride ?? useSliceDomainStore) as typeof useSliceDomainStore;
  const timeslicingModeStore = (timeslicingModeStoreOverride ?? useTimeslicingModeStore) as typeof useTimeslicingModeStore;

  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const setTimeRange = useStore(filterStore, (state) => state.setTimeRange);
  const currentTime = useStore(timeStore, (state) => state.currentTime);
  const setTime = useStore(timeStore, (state) => state.setTime);
  const setRange = useStore(timeStore, (state) => state.setRange);
  const timeResolution = useStore(timeStore, (state) => state.timeResolution);
  const timeScaleMode = useStore(timeStore, (state) => state.timeScaleMode);
  const selectedIndex = useStore(coordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(coordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(coordinationStore, (state) => state.clearSelection);
  const brushRange = useStore(coordinationStore, (state) => state.brushRange);
  const setBrushRange = useStore(coordinationStore, (state) => state.setBrushRange);
  const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
  const warpMap = useStore(adaptiveStore, (state) => state.warpMap);
  const mapDomain = useStore(adaptiveStore, (state) => state.mapDomain);
  const densityMap = useStore(adaptiveStore, (state) => state.densityMap);
  const isComputing = useStore(adaptiveStore, (state) => state.isComputing);
  const slices = useStore(sliceDomainStore, selectSlices);
  const activeSliceId = useStore(sliceDomainStore, selectActiveSliceId);
  const activeSliceUpdatedAt = useStore(sliceDomainStore, selectActiveSliceUpdatedAt);
  const getSliceOverlapCounts = useStore(sliceDomainStore, select((state) => state.getOverlapCounts));
  const pendingGeneratedBins = useStore(timeslicingModeStore, (state) => state.pendingGeneratedBins);
  const warpSlices = useStore(useWarpSliceStore, (state) => state.slices);
  const effectiveWarpMap = adaptiveWarpMapOverride !== undefined ? adaptiveWarpMapOverride : warpMap;
  const effectiveWarpDomain = adaptiveWarpDomainOverride ?? mapDomain;
  const effectiveWarpFactor = warpFactorOverride ?? warpFactor;
  const effectiveTimeScaleMode = timeScaleModeOverride ?? timeScaleMode;

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

  const { overviewInteractionScale, overviewScale, detailScale } =
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

  const burstWindows = useBurstWindows();
  const burstWindowsForAutoSlices = disableAutoBurstSlices ? [] : burstWindows;
  const burstTaxonomySummary = useMemo(() => {
    const counts: Record<'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral', number> = {
      'prolonged-peak': 0,
      'isolated-spike': 0,
      valley: 0,
      neutral: 0,
    };

    for (const [index, window] of burstWindows.entries()) {
      const taxonomy = classifyBurstWindow({
        value: window.peak,
        count: window.count,
        durationSec: window.duration,
        neighborhood: [burstWindows[index - 1], burstWindows[index + 1]]
          .filter((neighbor): neighbor is typeof window => neighbor !== undefined)
          .map((neighbor) => ({ value: neighbor.peak, count: neighbor.count, durationSec: neighbor.duration })),
      });
      counts[taxonomy.burstClass] += 1;
    }

    return counts;
  }, [burstWindows]);

  // Auto-create burst slices when burst data becomes available (unless disabled)
  useAutoBurstSlices(burstWindowsForAutoSlices);
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
      warpOverlayBandsOverride ?? warpSlices
        .filter((slice) => slice.enabled)
        .map((slice) => {
          const startSec = normalizedToEpochSeconds(clamp(slice.range[0], 0, 100), domainStart, domainEnd);
          const endSec = normalizedToEpochSeconds(clamp(slice.range[1], 0, 100), domainStart, domainEnd);
          const rangeStart = Math.max(domainStart, Math.min(startSec, endSec));
          const rangeEnd = Math.min(domainEnd, Math.max(startSec, endSec));
          return {
            id: slice.id,
            startSec: rangeStart,
            endSec: rangeEnd,
            isDebugPreview: slice.warpProfileId === DEBUG_PREVIEW_WARP_PROFILE_ID,
          };
        })
        .filter((slice) => Number.isFinite(slice.startSec) && Number.isFinite(slice.endSec) && slice.endSec > slice.startSec),
    [domainEnd, domainStart, warpOverlayBandsOverride, warpSlices]
  );

  const warpConnectors = useMemo(() => {
    if (!showWarpConnectors || !userWarpOverlayBands.length || width <= 0) {
      return [];
    }

    const connectorHeight = 44;

    return userWarpOverlayBands.map((band, index) => {
      const startX = overviewScale(new Date(((band.startSec + band.endSec) / 2) * 1000));
      const endX = detailScale(new Date(((band.startSec + band.endSec) / 2) * 1000));

      if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
        return null;
      }

      const bend = warpConnectorStyle === 'curved' ? Math.max(12, Math.min(28, Math.abs(endX - startX) * 0.35 + 12)) : 0;
      const topY = 2;
      const bottomY = connectorHeight - 2;
      const controlOffset = index % 2 === 0 ? bend : -bend;

      return {
        id: band.id,
        path:
          warpConnectorStyle === 'curved'
            ? `M ${startX} ${topY} C ${startX + controlOffset} ${connectorHeight * 0.25}, ${endX - controlOffset} ${connectorHeight * 0.75}, ${endX} ${bottomY}`
            : `M ${startX} ${topY} L ${endX} ${bottomY}`,
        stroke: band.isDebugPreview ? 'rgba(34, 211, 238, 0.65)' : 'rgba(129, 140, 248, 0.5)',
      };
    }).filter((connector): connector is { id: string; path: string; stroke: string } => connector !== null);
  }, [detailScale, showWarpConnectors, userWarpOverlayBands, overviewScale, warpConnectorStyle, width]);

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

    const geometries = slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          if (!Number.isFinite(slice.range[0]) || !Number.isFinite(slice.range[1])) {
            return null;
          }
          const startX = toX(Math.min(slice.range[0], slice.range[1]));
          const endX = toX(Math.max(slice.range[0], slice.range[1]));
          if (startX === null || endX === null) {
            return null;
          }
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
            isSuggestion: (slice as { source?: string }).source === 'suggestion',
            isGeneratedDraft: false,
            isGeneratedApplied: slice.source === 'generated-applied',
            overlapCount: sliceOverlapCounts[slice.id] ?? 1,
            color: slice.color,
          };
        }

        if (!Number.isFinite(slice.time)) {
          return null;
        }
        const x = toX(slice.time);
        if (x === null || x < 0 || x > detailInnerWidth) {
          return null;
        }

        return {
          id: slice.id,
          left: Math.max(0, Math.min(detailInnerWidth, x - 1)),
          width: 2,
          isActive: activeSliceId === slice.id,
          isBurst: !!slice.isBurst,
          isPoint: true,
          isSuggestion: (slice as { source?: string }).source === 'suggestion',
          isGeneratedDraft: false,
          isGeneratedApplied: slice.source === 'generated-applied',
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
          isActive: false,
          isBurst: false,
          isPoint: false,
          isSuggestion: false,
          isGeneratedDraft: true,
          isGeneratedApplied: false,
          overlapCount: 1,
          color: 'purple',
        };
      })
      .filter((geometry): geometry is TimelineSliceGeometry => geometry !== null);
  }, [detailInnerWidth, detailScale, pendingGeneratedBins]);

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
                  fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.16)' : 'rgba(139, 92, 246, 0.15)'}
                  stroke={slice.isDebugPreview ? 'rgba(34, 211, 238, 0.7)' : 'rgba(99, 102, 241, 0.55)'}
                  strokeDasharray={slice.isDebugPreview ? '2 2' : '4 3'}
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
                      {overviewTickFormat(tick)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {warpConnectors.length > 0 ? (
          <div className="pointer-events-none relative h-11">
            <svg width={width} height={44} className="absolute inset-0 overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="warpConnectorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(129, 140, 248, 0.12)" />
                  <stop offset="100%" stopColor="rgba(125, 211, 252, 0.08)" />
                </linearGradient>
              </defs>
              {warpConnectors.map((connector) => (
                <path
                  key={connector.id}
                  d={connector.path}
                  fill="none"
                  stroke="url(#warpConnectorGlow)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.65}
                />
              ))}
              {warpConnectors.map((connector) => (
                <path
                  key={`${connector.id}-line`}
                  d={connector.path}
                  fill="none"
                  stroke={connector.stroke}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeDasharray="3 4"
                  opacity={0.95}
                />
              ))}
            </svg>
          </div>
        ) : null}

        <div className="relative">
          <div
            className="mb-2"
            style={{
              paddingLeft: DETAIL_MARGIN.left,
              paddingRight: DETAIL_MARGIN.right
            }}
          >
            {burstWindows.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="uppercase tracking-[0.18em] text-slate-500">Burst indicators</span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
                  prolonged-peak: {burstTaxonomySummary['prolonged-peak']}
                </span>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-100">
                  isolated-spike: {burstTaxonomySummary['isolated-spike']}
                </span>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-100">
                  valley: {burstTaxonomySummary.valley}
                </span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-200">
                  neutral: {burstTaxonomySummary.neutral}
                </span>
              </div>
            )}
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
                <rect
                  key={`detail-user-warp-${slice.id}`}
                  x={left}
                  y={0}
                  width={widthSpan}
                  height={DETAIL_HEIGHT}
                  fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.16)' : 'rgba(139, 92, 246, 0.15)'}
                  stroke={slice.isDebugPreview ? 'rgba(34, 211, 238, 0.7)' : 'rgba(99, 102, 241, 0.55)'}
                  strokeDasharray={slice.isDebugPreview ? '2 2' : '4 3'}
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
              const isGeneratedAppliedSlice = geometry.isGeneratedApplied;
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
                    fill={isGeneratedAppliedSlice
                      ? 'rgba(16, 185, 129, 0.18)'
                      : isSuggestionSlice
                        ? suggestionFill
                        : (geometry.isBurst ? 'rgba(251, 146, 60, 0.26)' : color.fill)}
                    stroke={isGeneratedAppliedSlice
                      ? 'rgba(74, 222, 128, 0.92)'
                      : isSuggestionSlice
                        ? suggestionStroke
                        : (geometry.isBurst ? 'rgba(251, 146, 60, 0.85)' : color.stroke)}
                    strokeWidth={geometry.isActive ? 2.3 : geometry.overlapCount >= 2 ? 1.5 : 1}
                    strokeDasharray={geometry.overlapCount >= 3 || isSuggestionSlice ? '5 3' : isGeneratedAppliedSlice ? '8 2' : undefined}
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
                <rect
                  x={geometry.left}
                  y={8}
                  width={Math.max(2, geometry.width)}
                  height={DETAIL_HEIGHT - 16}
                  rx={3}
                  fill="rgba(245, 158, 11, 0.16)"
                  stroke="rgba(251, 191, 36, 0.92)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
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
