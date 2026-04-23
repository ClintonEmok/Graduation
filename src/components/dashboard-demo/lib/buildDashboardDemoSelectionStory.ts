import { useMemo } from 'react';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoSliceStore, selectActiveSliceId, selectSlices } from '@/store/useDashboardDemoSliceStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';

export interface DashboardDemoSelectionStoryInput {
  activeWindowLabel: string;
  compareStateLabel: string;
  linkedHighlightLabel: string;
  explanationLabel: string;
  workflowPhase: string;
  selectedSource: string | null;
  warpMode: 'linear' | 'adaptive';
  warpSource: 'density' | 'slice-authored';
  warpFactor: number;
}

export interface DashboardDemoSelectionStory {
  activeWindowLabel: string;
  compareStateLabel: string;
  linkedHighlightLabel: string;
  explanationLabel: string;
  storyLabel: string;
}

export function buildDashboardDemoSelectionStory(input: DashboardDemoSelectionStoryInput): DashboardDemoSelectionStory {
  const compareStateLabel = `${input.compareStateLabel} · ${input.warpMode === 'adaptive' ? 'Adaptive' : 'Linear'} · ${input.warpSource} · warp ${input.warpFactor.toFixed(2)}`;
  const storyLabel = `${input.activeWindowLabel} · ${input.linkedHighlightLabel}`;

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
    return 'No active window yet';
  }

  const [startNormRaw, endNormRaw] = brushRange;
  if (!Number.isFinite(startNormRaw) || !Number.isFinite(endNormRaw)) {
    return 'No active window yet';
  }

  const startNorm = Math.min(startNormRaw, endNormRaw);
  const endNorm = Math.max(startNormRaw, endNormRaw);
  const domainStart = minTimestampSec ?? 0;
  const domainEnd = maxTimestampSec ?? 100;
  const startSec = normalizedToEpochSeconds(startNorm, domainStart, domainEnd);
  const endSec = normalizedToEpochSeconds(endNorm, domainStart, domainEnd);

  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return 'No active window yet';
  }

  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatter.format(new Date(startSec * 1000))} → ${formatter.format(new Date(endSec * 1000))}`;
};

export function useDashboardDemoSelectionStory() {
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const selectedSource = useDashboardDemoCoordinationStore((state) => state.selectedSource);
  const workflowPhase = useDashboardDemoCoordinationStore((state) => state.workflowPhase);
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const warpMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const warpSource = useDashboardDemoWarpStore((state) => state.warpSource);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const activeSliceId = useDashboardDemoSliceStore(selectActiveSliceId);
  const slices = useDashboardDemoSliceStore(selectSlices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const currentTime = useDashboardDemoTimeStore((state) => state.currentTime);

  return useMemo(() => {
    const activeSlice = slices.find((slice) => slice.id === activeSliceId) ?? null;
    const activeWindowLabel = formatWindowLabel(brushRange, minTimestampSec, maxTimestampSec);
    const compareStateLabel = brushRange ? 'Timeline-led compare' : 'Timeline-ready compare';
    const linkedHighlightLabel = activeSlice
      ? `${activeSlice.name?.trim() || (activeSlice.type === 'range' ? 'Range slice' : 'Point slice')} · linked to ${selectedBurstWindows.length} burst window${selectedBurstWindows.length === 1 ? '' : 's'}`
      : selectedBurstWindows.length > 0
        ? `${selectedBurstWindows.length} burst window${selectedBurstWindows.length === 1 ? '' : 's'} linked`
        : 'No linked highlight yet';
    const explanationLabel = selectedSource
      ? `Workflow ${workflowPhase} · source ${selectedSource} · current time ${currentTime.toFixed(1)}`
      : `Workflow ${workflowPhase} · waiting on timeline selection`;

    return buildDashboardDemoSelectionStory({
      activeWindowLabel,
      compareStateLabel,
      linkedHighlightLabel,
      explanationLabel,
      workflowPhase,
      selectedSource,
      warpMode,
      warpSource,
      warpFactor,
    });
  }, [activeSliceId, brushRange, currentTime, maxTimestampSec, minTimestampSec, selectedBurstWindows.length, selectedSource, slices, warpFactor, warpMode, warpSource, workflowPhase]);
}
