import { useCallback, useMemo } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useSliceStore } from '@/store/useSliceStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds, toEpochSeconds } from '@/lib/time-domain';
import { focusTimelineRange } from '@/lib/slice-utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { classifyBurstWindow } from '@/lib/binning/burst-taxonomy';

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

export type BurstWindow = {
  id: string;
  start: number;
  end: number;
  peak: number;
  count: number;
  duration: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence?: number;
  burstScore?: number;
  burstRationale?: string;
  burstRuleVersion?: string;
  burstProvenance?: string;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
};

export const useBurstWindows = () => {
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const burstinessMap = useAdaptiveStore((state) => state.burstinessMap);
  const countMap = useAdaptiveStore((state) => state.countMap);
  const burstMetric = useAdaptiveStore((state) => state.burstMetric);
  const burstCutoff = useAdaptiveStore((state) => state.burstCutoff);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  return useMemo(() => {
    if (!Number.isFinite(mapDomain[0]) || !Number.isFinite(mapDomain[1]) || mapDomain[1] <= mapDomain[0]) {
      return [] as BurstWindow[];
    }

    const selectedMap = burstMetric === 'burstiness' ? burstinessMap : densityMap;
    if (!selectedMap || selectedMap.length === 0) return [] as BurstWindow[];

    const span = Math.max(0.0001, mapDomain[1] - mapDomain[0]);
    const step = span / Math.max(1, selectedMap.length - 1);
    const windows: BurstWindow[] = [];

    let startIdx: number | null = null;
    let peak = 0;
    let windowCount = 0;

    for (let i = 0; i < selectedMap.length; i += 1) {
      const value = Number.isFinite(selectedMap[i]) ? selectedMap[i] : 0;
      if (countMap && Number.isFinite(countMap[i])) {
        windowCount += countMap[i];
      }
      if (value >= burstCutoff) {
        if (startIdx === null) startIdx = i;
        peak = Math.max(peak, value);
      } else if (startIdx !== null) {
        const start = mapDomain[0] + startIdx * step;
        const end = mapDomain[0] + i * step;
        windows.push({ id: `${startIdx}-${i}`, start, end, peak, count: Math.round(windowCount), duration: end - start });
        startIdx = null;
        peak = 0;
        windowCount = 0;
      }
    }

    if (startIdx !== null) {
      const start = mapDomain[0] + startIdx * step;
      const end = mapDomain[1];
      windows.push({ id: `${startIdx}-end`, start, end, peak, count: Math.round(windowCount), duration: end - start });
    }

    return windows.sort((a, b) => b.peak - a.peak).slice(0, 10);
  }, [burstCutoff, burstMetric, burstinessMap, countMap, densityMap, mapDomain]);
};

export function BurstList() {
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const setRange = useTimeStore((state) => state.setRange);
  const setTime = useTimeStore((state) => state.setTime);
  const setBrushRange = useCoordinationStore((state) => state.setBrushRange);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const findMatchingSlice = useSliceStore((state) => state.findMatchingSlice);
  
  // Burst adjustment controls
  const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);
  const setBurstThreshold = useAdaptiveStore((state) => state.setBurstThreshold);
  const burstMetric = useAdaptiveStore((state) => state.burstMetric);
  const setBurstMetric = useAdaptiveStore((state) => state.setBurstMetric);

  const burstWindows = useBurstWindows();
  const burstWindowsWithTaxonomy = useMemo(() => {
    return burstWindows.map((window, index, windows) => {
      const neighborhood = [windows[index - 1], windows[index + 1]]
        .filter((neighbor): neighbor is BurstWindow => neighbor !== undefined)
        .map((neighbor) => ({
          value: neighbor.peak,
          count: neighbor.count,
          durationSec: neighbor.duration,
        }));

      const taxonomy = classifyBurstWindow({
        value: window.peak,
        count: window.count,
        durationSec: window.duration,
        neighborhood,
      });

      return {
        ...window,
        burstClass: taxonomy.burstClass,
        burstConfidence: taxonomy.burstConfidence,
        burstScore: taxonomy.burstScore,
        burstRationale: taxonomy.rationale,
        burstRuleVersion: taxonomy.burstRuleVersion,
        burstProvenance: taxonomy.burstProvenance,
        tieBreakReason: taxonomy.tieBreakReason,
        thresholdSource: taxonomy.thresholdSource,
        neighborhoodSummary: taxonomy.neighborhoodSummary,
      };
    });
  }, [burstWindows]);

  // Check if mapDomain is normalized (0-100) or actual epoch timestamps
  // Epoch timestamps are large numbers (billions for seconds, trillions for ms)
  const isNormalizedDomain = mapDomain[1] < 1000;
  const isEpochMilliseconds = mapDomain[1] > 1e11;

  const toNormalizedRange = useCallback((start: number, end: number): [number, number] | null => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    if (isNormalizedDomain) {
      return [
        Math.max(0, Math.min(100, Math.min(start, end))),
        Math.max(0, Math.min(100, Math.max(start, end))),
      ];
    }

    if (minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
      return null;
    }

    const startSec = isEpochMilliseconds ? start / 1000 : toEpochSeconds(start);
    const endSec = isEpochMilliseconds ? end / 1000 : toEpochSeconds(end);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      return null;
    }

    const normalizedStart = epochSecondsToNormalized(startSec, minTimestampSec, maxTimestampSec);
    const normalizedEnd = epochSecondsToNormalized(endSec, minTimestampSec, maxTimestampSec);
    if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
      return null;
    }

    return [
      Math.max(0, Math.min(100, Math.min(normalizedStart, normalizedEnd))),
      Math.max(0, Math.min(100, Math.max(normalizedStart, normalizedEnd))),
    ];
  }, [isEpochMilliseconds, isNormalizedDomain, maxTimestampSec, minTimestampSec]);

  const burstMatches = useMemo(() => {
    const lookup = new Map<string, string | null>();
    for (const window of burstWindowsWithTaxonomy) {
      const normalizedRange = toNormalizedRange(window.start, window.end);
      if (!normalizedRange) {
        lookup.set(window.id, null);
        continue;
      }
      const match = findMatchingSlice(normalizedRange[0], normalizedRange[1], undefined, { burstOnly: true });
      lookup.set(window.id, match?.id ?? null);
    }
    return lookup;
  }, [burstWindowsWithTaxonomy, findMatchingSlice, toNormalizedRange]);

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
      // Domain is already epoch timestamps (seconds or milliseconds)
      startEpoch = isEpochMilliseconds ? start / 1000 : start;
      endEpoch = isEpochMilliseconds ? end / 1000 : end;
    }

    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
      return `t=${start.toFixed(2)} → ${end.toFixed(2)}`;
    }

    const startDate = new Date(startEpoch * 1000);
    const endDate = new Date(endEpoch * 1000);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `t=${start.toFixed(2)} → ${end.toFixed(2)}`;
    }

    const startLabel = startDate.toLocaleString();
    const endLabel = endDate.toLocaleString();
    return `${startLabel} → ${endLabel}`;
  };

  const handleSelectWindow = (window: BurstWindow) => {
    const normalizedRange = toNormalizedRange(window.start, window.end);
    if (!normalizedRange) {
      return;
    }

    // Find matching existing burst slice (auto-created by useAutoBurstSlices effect)
    const matchingSlice = findMatchingSlice(normalizedRange[0], normalizedRange[1], undefined, { burstOnly: true });

    if (matchingSlice) {
      setActiveSlice(matchingSlice.id);
      setDetailsOpen(true);
    }

    // Always focus timeline to the burst range
    focusTimelineRange({
      start: normalizedRange[0],
      end: normalizedRange[1],
      minTimestampSec,
      maxTimestampSec,
      setTimeRange,
      setRange,
      setBrushRange,
      setTime,
    });
  };

  if (burstWindowsWithTaxonomy.length === 0) return null;

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Burst Windows</h3>
          <span className="text-[10px] text-muted-foreground">Top {burstWindowsWithTaxonomy.length}</span>
        </div>
      
      {/* Burst Adjustment Controls */}
      <div className="mt-3 space-y-3 pb-3 border-b">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Threshold</Label>
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(burstThreshold * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[burstThreshold]}
            onValueChange={(vals) => setBurstThreshold(vals[0])}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Adjust to show more or fewer bursts
          </p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs">Metric</Label>
          <select
            value={burstMetric}
            onChange={(e) => setBurstMetric(e.target.value as 'density' | 'burstiness')}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            <option value="density">Density (event count)</option>
            <option value="burstiness">Burstiness (clustering)</option>
          </select>
        </div>
      </div>
      
      <div className="mt-3 space-y-2">
        {burstWindowsWithTaxonomy.map((window, index) => {
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
                <span title={burstMetric === 'density' ? 'Crime density relative to densest area' : 'Temporal clustering intensity'}>
                  Peak {Math.round(window.peak * 100)}%
                </span>
                <span className="text-muted-foreground/60">|</span>
                <span>{window.count} crimes</span>
                <span className="text-muted-foreground/60">|</span>
                <span>{formatDuration(window.duration)}</span>
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
                Class: {window.burstClass ?? 'neutral'}
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-100">
                Confidence: {Math.round(window.burstConfidence ?? 0)}%
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-muted-foreground">
                Reason: {window.burstRationale ?? 'No taxonomy rationale available.'}
              </span>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
