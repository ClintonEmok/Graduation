import { useMemo } from 'react';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useSliceDomainStore, selectActiveSliceId, selectSlices } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

export interface DashboardDemoSelectionStoryInput {
  activeWindowLabel: string | null;
  compareStateLabel: string;
  linkedHighlightLabel: string;
  explanationLabel: string;
  selectedSource: string | null;
  warpMode: 'linear' | 'adaptive';
  warpSource: 'density' | 'slice-authored';
  warpFactor: number;
}

export interface DashboardDemoSelectionStory {
  activeWindowLabel: string | null;
  compareStateLabel: string;
  linkedHighlightLabel: string;
  explanationLabel: string;
  storyLabel: string;
}

export function buildDashboardDemoSelectionStory(input: DashboardDemoSelectionStoryInput): DashboardDemoSelectionStory {
  const compareStateLabel = `${input.compareStateLabel} · ${input.warpMode === 'adaptive' ? 'Adaptive' : 'Linear'} · ${input.warpSource} · warp ${input.warpFactor.toFixed(2)}`;
  const storyLabel = input.activeWindowLabel ? `${input.activeWindowLabel} · ${input.linkedHighlightLabel}` : input.linkedHighlightLabel;

  return {
    activeWindowLabel: input.activeWindowLabel,
    compareStateLabel,
    linkedHighlightLabel: input.linkedHighlightLabel,
    explanationLabel: input.explanationLabel,
    storyLabel,
  };
}

const formatWindowLabel = (brushRange: [number, number] | null, minTimestampSec: number | null, maxTimestampSec: number | null) => {
  if (!brushRange) {
    return null;
  }

  const [startNormRaw, endNormRaw] = brushRange;
  if (!Number.isFinite(startNormRaw) || !Number.isFinite(endNormRaw)) {
    return null;
  }

  const startNorm = Math.min(startNormRaw, endNormRaw);
  const endNorm = Math.max(startNormRaw, endNormRaw);
  const domainStart = minTimestampSec ?? 0;
  const domainEnd = maxTimestampSec ?? 100;
  const startSec = normalizedToEpochSeconds(startNorm, domainStart, domainEnd);
  const endSec = normalizedToEpochSeconds(endNorm, domainStart, domainEnd);

  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatter.format(new Date(startSec * 1000))} → ${formatter.format(new Date(endSec * 1000))}`;
};

export function useDashboardDemoSelectionStory() {
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const selectedSource = useDashboardDemoCoordinationStore((state) => state.selectedSource);
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const warpMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpSource = useDashboardDemoCoordinationStore((state) => state.warpSource);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const activeSliceId = useSliceDomainStore(selectActiveSliceId);
  const slices = useSliceDomainStore(selectSlices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const currentTime = useDashboardDemoTimeStore((state) => state.currentTime);

  return useMemo(() => {
    const activeSlice = slices.find((slice) => slice.id === activeSliceId) ?? null;
    const activeBurstWindow = selectedBurstWindows[0] ?? null;
    const activeWindowLabel = formatWindowLabel(brushRange, minTimestampSec, maxTimestampSec);
    const compareStateLabel = brushRange ? 'Timeline-led compare' : 'Timeline-ready compare';
    const linkedHighlightLabel = activeBurstWindow
      ? `${activeBurstWindow.burstClass.replace('-', ' ')} · ${activeBurstWindow.burstRationale}`
      : activeSlice
        ? `${activeSlice.name?.trim() || 'Applied slice'} · linked to the active burst`
        : 'No linked highlight yet';
    const explanationLabel = selectedSource
      ? `source ${selectedSource} · current time ${currentTime.toFixed(1)}`
      : `waiting on timeline selection`;

    return buildDashboardDemoSelectionStory({
      activeWindowLabel,
      compareStateLabel,
      linkedHighlightLabel,
      explanationLabel,
      selectedSource,
      warpMode,
      warpSource,
      warpFactor,
    });
  }, [activeSliceId, brushRange, currentTime, maxTimestampSec, minTimestampSec, selectedBurstWindows, selectedSource, slices, warpFactor, warpMode, warpSource]);
}
