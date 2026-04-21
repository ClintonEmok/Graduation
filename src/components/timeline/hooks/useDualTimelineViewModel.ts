import { useMemo } from 'react';
import { useDualTimelineScales } from '@/hooks/useDualTimelineScales';
import { formatDateByResolution, type DateResolution } from '@/lib/date-formatting';
import { useScaleTransforms } from './useScaleTransforms';
import { buildSpanAwareTicks, formatSpanAwareTickLabel, type TickLabelStrategy } from '../lib/tick-ux';

type TimeResolution = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface UseDualTimelineViewModelOptions {
  domainStart: number;
  domainEnd: number;
  detailRangeSec: [number, number];
  overviewInnerWidth: number;
  detailInnerWidth: number;
  timeScaleMode: 'linear' | 'adaptive';
  warpFactor: number;
  warpMap: Float32Array | null;
  warpDomain: [number, number];
  tickLabelStrategy: TickLabelStrategy;
  timeResolution: TimeResolution;
}

export interface DualTimelineViewModel {
  overviewInteractionScale: ReturnType<typeof useScaleTransforms>['overviewInteractionScale'];
  overviewScale: ReturnType<typeof useScaleTransforms>['overviewScale'];
  detailScale: ReturnType<typeof useScaleTransforms>['detailScale'];
  overviewTicks: Date[];
  detailTicks: Date[];
  overviewTickFormat: (date: Date) => string;
  detailTickFormat: (date: Date) => string;
}

const timeResolutionToDateResolution: Record<TimeResolution, DateResolution> = {
  seconds: 'hour',
  minutes: 'hour',
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
};

export function useDualTimelineViewModel({
  domainStart,
  domainEnd,
  detailRangeSec,
  overviewInnerWidth,
  detailInnerWidth,
  timeScaleMode,
  warpFactor,
  warpMap,
  warpDomain,
  tickLabelStrategy,
  timeResolution,
}: UseDualTimelineViewModelOptions): DualTimelineViewModel {
  const overviewBaseScales = useDualTimelineScales({
    width: overviewInnerWidth,
    height: 0,
    startEpoch: domainStart,
    endEpoch: domainEnd,
  });
  const detailBaseScales = useDualTimelineScales({
    width: detailInnerWidth,
    height: 0,
    startEpoch: detailRangeSec[0],
    endEpoch: detailRangeSec[1],
  });

  const { overviewInteractionScale, overviewScale, detailScale } = useScaleTransforms({
    domainStart,
    domainEnd,
    detailRangeSec,
    overviewInnerWidth,
    detailInnerWidth,
    timeScaleMode,
    warpFactor,
    warpMap,
    warpDomain,
  });

  const overviewTicks = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return buildSpanAwareTicks(overviewBaseScales.timeScale, {
        rangeStartSec: domainStart,
        rangeEndSec: domainEnd,
        axisWidth: overviewInnerWidth,
      });
    }

    return overviewBaseScales.timeScale.ticks(Math.max(2, Math.floor(overviewInnerWidth / 120)));
  }, [domainEnd, domainStart, overviewBaseScales.timeScale, overviewInnerWidth, tickLabelStrategy]);

  const detailTicks = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return buildSpanAwareTicks(detailBaseScales.timeScale, {
        rangeStartSec: detailRangeSec[0],
        rangeEndSec: detailRangeSec[1],
        axisWidth: detailInnerWidth,
      });
    }

    return detailBaseScales.timeScale.ticks(Math.max(2, Math.floor(detailInnerWidth / 100)));
  }, [detailBaseScales.timeScale, detailInnerWidth, detailRangeSec, tickLabelStrategy]);

  const detailTickFormat = useMemo(() => {
    if (tickLabelStrategy === 'span-aware') {
      return (date: Date) =>
        formatSpanAwareTickLabel(date, {
          rangeStartSec: detailRangeSec[0],
          rangeEndSec: detailRangeSec[1],
          axisWidth: detailInnerWidth,
        });
    }

    const dateResolution = timeResolutionToDateResolution[timeResolution] ?? 'day';
    return (date: Date) => formatDateByResolution(date, dateResolution);
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

    return (date: Date) => formatDateByResolution(date, 'day');
  }, [domainEnd, domainStart, overviewInnerWidth, tickLabelStrategy]);

  return {
    overviewInteractionScale,
    overviewScale,
    detailScale,
    overviewTicks,
    detailTicks,
    overviewTickFormat,
    detailTickFormat,
  };
}
