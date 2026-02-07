"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bin, max } from 'd3-array';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import { scaleUtc } from 'd3-scale';
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time';
import { zoom, zoomIdentity } from 'd3-zoom';
import { useMeasure } from '@/hooks/useMeasure';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds } from '@/lib/time-domain';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { findNearestIndexByTime, resolvePointByIndex } from '@/lib/selection';

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const DualTimeline: React.FC = () => {
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const { currentTime, setTime, setRange, timeResolution } = useTimeStore();
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
  const clearSelection = useCoordinationStore((state) => state.clearSelection);
  const setBrushRange = useCoordinationStore((state) => state.setBrushRange);
  const dataCount = useDataStore((state) => (state.columns ? state.columns.length : state.data.length));

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

  const [domainStart, domainEnd] = useMemo<[number, number]>(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      return [minTimestampSec, maxTimestampSec];
    }
    return [0, 100];
  }, [minTimestampSec, maxTimestampSec]);

  const detailRangeSec = useMemo<[number, number]>(() => {
    const range = selectedTimeRange ?? [domainStart, domainEnd];
    return range[0] <= range[1] ? [range[0], range[1]] : [range[1], range[0]];
  }, [selectedTimeRange, domainStart, domainEnd]);

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
    if (!timestampSeconds.length) return [];
    const binner = bin<number, number>()
      .value((d) => d)
      .domain([domainStart, domainEnd])
      .thresholds(50);
    return binner(timestampSeconds);
  }, [timestampSeconds, domainStart, domainEnd]);

  const overviewMax = useMemo(() => max(overviewBins, (d) => d.length) || 1, [overviewBins]);
  const detailPoints = useMemo(() => {
    if (!timestampSeconds.length) return [];
    const [start, end] = detailRangeSec;
    const points = timestampSeconds.filter((value) => value >= start && value <= end);
    const maxPoints = 4000;
    if (points.length <= maxPoints) return points;
    const step = Math.ceil(points.length / maxPoints);
    return points.filter((_, index) => index % step === 0);
  }, [timestampSeconds, detailRangeSec]);

  const overviewScale = useMemo(
    () =>
      scaleUtc()
        .domain([new Date(domainStart * 1000), new Date(domainEnd * 1000)])
        .range([0, overviewInnerWidth]),
    [domainStart, domainEnd, overviewInnerWidth]
  );

  const detailScale = useMemo(
    () =>
      scaleUtc()
        .domain([new Date(detailRangeSec[0] * 1000), new Date(detailRangeSec[1] * 1000)])
        .range([0, detailInnerWidth]),
    [detailRangeSec, detailInnerWidth]
  );

  const applyRangeToStores = useCallback(
    (startSec: number, endSec: number) => {
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

      const clampedTime = clamp(currentTime, nextRange[0], nextRange[1]);
      if (clampedTime !== currentTime) {
        setTime(clampedTime);
      }
    },
    [currentTime, domainEnd, domainStart, setRange, setTime, setTimeRange, setBrushRange]
  );

  useEffect(() => {
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
  }, [applyRangeToStores, currentTime, domainEnd, domainStart, timeResolution]);

  useEffect(() => {
    if (!overviewInnerWidth || !detailInnerWidth) return;
    if (!brushRef.current || !overviewSvgRef.current || !detailSvgRef.current || !zoomRef.current) return;

    const brushNode = brushRef.current;
    const zoomNode = zoomRef.current;

    const brushSelection: [number, number] = [
      overviewScale(new Date(detailRangeSec[0] * 1000)),
      overviewScale(new Date(detailRangeSec[1] * 1000))
    ];

    const brushBehavior = brushX()
      .extent([[0, 0], [overviewInnerWidth, OVERVIEW_HEIGHT]])
      .on('brush end', (event) => {
        if (isSyncingRef.current) return;
        if (!event.selection) return;
        const [x0, x1] = event.selection as [number, number];
        const startSec = overviewScale.invert(x0).getTime() / 1000;
        const endSec = overviewScale.invert(x1).getTime() / 1000;
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
        const rescaled = event.transform.rescaleX(overviewScale);
        const newDomain = rescaled.domain();
        const startSec = newDomain[0].getTime() / 1000;
        const endSec = newDomain[1].getTime() / 1000;
        applyRangeToStores(startSec, endSec);

        isSyncingRef.current = true;
        select(brushNode as SVGGElement).call(
          brushBehavior.move,
          [overviewScale(newDomain[0]), overviewScale(newDomain[1])]
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
    overviewInnerWidth,
    overviewScale
  ]);

  const scrubFromEvent = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
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
    [detailInnerWidth, detailScale, domainEnd, domainStart, setTime]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      isScrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      scrubFromEvent(event);
    },
    [scrubFromEvent]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (!detailInnerWidth) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, detailInnerWidth);
      const epochSeconds = detailScale.invert(x).getTime() / 1000;

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

      if (!isScrubbingRef.current) return;
      scrubFromEvent(event);
    },
    [detailInnerWidth, detailScale, detailRangeSec, minTimestampSec, maxTimestampSec, scrubFromEvent]
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

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex flex-col gap-6">
        <svg ref={overviewSvgRef} width={width} height={OVERVIEW_HEIGHT + AXIS_HEIGHT}>
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
            <g ref={brushRef} className="text-primary/60" />
            <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
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
          <svg ref={detailSvgRef} width={width} height={DETAIL_HEIGHT + AXIS_HEIGHT}>
            <g transform={`translate(${DETAIL_MARGIN.left},${DETAIL_MARGIN.top})`}>
            {detailPoints.map((timestamp, index) => {
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
            })}
            <line
              x1={cursorX}
              x2={cursorX}
              y1={0}
              y2={DETAIL_HEIGHT}
              className="stroke-primary"
              strokeWidth={2}
            />
            {selectionX !== null && (
              <line
                x1={selectionX}
                x2={selectionX}
                y1={0}
                y2={DETAIL_HEIGHT}
                className="stroke-sky-400"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
            <rect
              ref={zoomRef}
              width={detailInnerWidth}
              height={DETAIL_HEIGHT}
              fill="transparent"
              className="cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpWithSelection}
              onPointerLeave={handlePointerCancel}
            />
            <g transform={`translate(0, ${DETAIL_HEIGHT})`} className="text-muted-foreground">
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
