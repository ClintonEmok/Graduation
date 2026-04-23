import { useMemo } from 'react';
import { useBurstWindows } from '@/components/viz/BurstList';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

const formatWindowLabel = (startNorm: number, endNorm: number, domainStart: number, domainEnd: number) => {
  const startSec = normalizedToEpochSeconds(startNorm, domainStart, domainEnd);
  const endSec = normalizedToEpochSeconds(endNorm, domainStart, domainEnd);

  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return 'Selected window unavailable';
  }

  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatter.format(new Date(startSec * 1000))} → ${formatter.format(new Date(endSec * 1000))}`;
};

export function useDemoTimelineSummary() {
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const warpMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const warpSource = useDashboardDemoWarpStore((state) => state.warpSource);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const { data, columns, minTimestampSec, maxTimestampSec } = useTimelineDataStore((state) => ({
    data: state.data,
    columns: state.columns,
    minTimestampSec: state.minTimestampSec,
    maxTimestampSec: state.maxTimestampSec,
  }));
  const burstWindows = useBurstWindows();

  return useMemo(() => {
    const domainStart = minTimestampSec ?? 0;
    const domainEnd = maxTimestampSec ?? 100;
    const pointCount = columns?.timestamp?.length ?? data.length;
    const selectedWindowLabel = brushRange
      ? formatWindowLabel(Math.min(brushRange[0], brushRange[1]), Math.max(brushRange[0], brushRange[1]), domainStart, domainEnd)
      : 'No brushed selection';

    const modeLabel = warpMode === 'adaptive' ? 'Adaptive' : 'Linear';
    const compareLabel = 'Uniform vs adaptive compare';
    const burstLabel = burstWindows.length > 0 ? `${burstWindows.length} burst window${burstWindows.length === 1 ? '' : 's'}` : 'No burst windows';
    const overviewLabel = `${pointCount.toLocaleString()} records in the overview`;
    const primaryDriverLabel = brushRange
      ? `Timeline driver · ${selectedWindowLabel}`
      : 'Timeline driver · Orient to the overview before brushing';

    return {
      overviewLabel,
      modeLabel,
      compareLabel,
      selectedWindowLabel,
      burstLabel,
      primaryDriverLabel,
      isAdaptive: warpMode === 'adaptive',
      isComparing: warpMode === 'adaptive' || warpFactor > 0,
      warpSource,
    };
  }, [brushRange, columns?.timestamp?.length, data.length, maxTimestampSec, minTimestampSec, burstWindows.length, warpFactor, warpMode, warpSource]);
}
