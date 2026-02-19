import { useMemo } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useSliceStore } from '@/store/useSliceStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { focusTimelineRange } from '@/lib/slice-utils';

export type BurstWindow = {
  id: string;
  start: number;
  end: number;
  peak: number;
};

export const useBurstWindows = () => {
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const burstinessMap = useAdaptiveStore((state) => state.burstinessMap);
  const burstMetric = useAdaptiveStore((state) => state.burstMetric);
  const burstCutoff = useAdaptiveStore((state) => state.burstCutoff);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  return useMemo(() => {
    const selectedMap = burstMetric === 'burstiness' ? burstinessMap : densityMap;
    if (!selectedMap || selectedMap.length === 0) return [] as BurstWindow[];

    const span = Math.max(0.0001, mapDomain[1] - mapDomain[0]);
    const step = span / Math.max(1, selectedMap.length - 1);
    const windows: BurstWindow[] = [];

    let startIdx: number | null = null;
    let peak = 0;

    for (let i = 0; i < selectedMap.length; i += 1) {
      const value = selectedMap[i];
      if (value >= burstCutoff) {
        if (startIdx === null) startIdx = i;
        peak = Math.max(peak, value);
      } else if (startIdx !== null) {
        const start = mapDomain[0] + startIdx * step;
        const end = mapDomain[0] + i * step;
        windows.push({ id: `${startIdx}-${i}`, start, end, peak });
        startIdx = null;
        peak = 0;
      }
    }

    if (startIdx !== null) {
      const start = mapDomain[0] + startIdx * step;
      const end = mapDomain[1];
      windows.push({ id: `${startIdx}-end`, start, end, peak });
    }

    return windows.sort((a, b) => b.peak - a.peak).slice(0, 10);
  }, [burstCutoff, burstMetric, burstinessMap, densityMap, mapDomain]);
};

export function BurstList() {
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const setRange = useTimeStore((state) => state.setRange);
  const setTime = useTimeStore((state) => state.setTime);
  const setBrushRange = useCoordinationStore((state) => state.setBrushRange);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const findMatchingSlice = useSliceStore((state) => state.findMatchingSlice);

  const burstWindows = useBurstWindows();
  const burstMatches = useMemo(() => {
    const lookup = new Map<string, string | null>();
    for (const window of burstWindows) {
      const match = findMatchingSlice(window.start, window.end, undefined, { burstOnly: true });
      lookup.set(window.id, match?.id ?? null);
    }
    return lookup;
  }, [burstWindows, findMatchingSlice]);

  if (burstWindows.length === 0) return null;

  // Check if mapDomain is normalized (0-100) or actual epoch timestamps
  // Epoch timestamps are large numbers (billions for seconds, trillions for ms)
  const isNormalizedDomain = mapDomain[1] < 1000;

  const formatWindow = (start: number, end: number) => {
    let startEpoch: number;
    let endEpoch: number;

    if (isNormalizedDomain) {
      // Domain is normalized 0-100, need to convert using data store timestamps
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        startEpoch = normalizedToEpochSeconds(start, minTimestampSec, maxTimestampSec);
        endEpoch = normalizedToEpochSeconds(end, minTimestampSec, maxTimestampSec);
      } else {
        return `t=${start.toFixed(2)} → ${end.toFixed(2)}`;
      }
    } else {
      // Domain is already epoch timestamps (milliseconds)
      startEpoch = start / 1000; // Convert ms to seconds
      endEpoch = end / 1000;
    }

    const startLabel = new Date(startEpoch * 1000).toLocaleString();
    const endLabel = new Date(endEpoch * 1000).toLocaleString();
    return `${startLabel} → ${endLabel}`;
  };

  const handleSelectWindow = (window: BurstWindow) => {
    // Find matching existing burst slice (auto-created by useAutoBurstSlices effect)
    const matchingSlice = findMatchingSlice(window.start, window.end, undefined, { burstOnly: true });

    if (matchingSlice) {
      setActiveSlice(matchingSlice.id);
      setDetailsOpen(true);
    }

    // Always focus timeline to the burst range
    focusTimelineRange({
      start: window.start,
      end: window.end,
      minTimestampSec,
      maxTimestampSec,
      setTimeRange,
      setRange,
      setBrushRange,
      setTime,
    });
  };

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Burst Windows</h3>
        <span className="text-[10px] text-muted-foreground">Top {burstWindows.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {burstWindows.map((window, index) => {
          const matchingSliceId = burstMatches.get(window.id) ?? null;
          const isSelected = matchingSliceId === activeSliceId;
          const isLinked = matchingSliceId !== null;
          return (
          <button
            key={window.id}
            type="button"
            onClick={() => handleSelectWindow(window)}
            aria-pressed={isSelected}
            aria-label={`Burst ${index + 1}. Peak ${Math.round(window.peak * 100)}%. Selects existing burst slice. ${isSelected ? 'Selected.' : 'Not selected.'}`}
            className={`w-full text-left rounded-md border px-3 py-2 text-xs transition-colors ${
              isSelected
                ? 'border-primary/60 bg-primary/10'
                : 'border-border/70 hover:border-primary/40 hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Burst {index + 1}</span>
              <span className="inline-flex items-center gap-2">
                <span>Peak {Math.round(window.peak * 100)}%</span>
                {isLinked ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    Linked
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-1 text-foreground">
              {formatWindow(window.start, window.end)}
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
