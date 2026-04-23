import { useMemo } from 'react';
import { useBurstWindows } from '@/components/viz/BurstList';
import { useDashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

export function useDemoTimelineSummary() {
  const selectionStory = useDashboardDemoSelectionStory();
  const { data, columns } = useTimelineDataStore((state) => ({
    data: state.data,
    columns: state.columns,
  }));
  const burstWindows = useBurstWindows();

  return useMemo(() => {
    const pointCount = columns?.timestamp?.length ?? data.length;
    const selectedWindowLabel = selectionStory.activeWindowLabel;
    const modeLabel = selectionStory.compareStateLabel.includes('Adaptive') ? 'Adaptive' : 'Linear';
    const compareLabel = selectionStory.compareStateLabel;
    const burstLabel = burstWindows.length > 0 ? `${burstWindows.length} burst window${burstWindows.length === 1 ? '' : 's'}` : 'No burst windows';
    const overviewLabel = `${pointCount.toLocaleString()} records in the overview`;
    const primaryDriverLabel = selectionStory.storyLabel;

    return {
      overviewLabel,
      modeLabel,
      compareLabel,
      selectedWindowLabel,
      linkedHighlightLabel: selectionStory.linkedHighlightLabel,
      explanationLabel: selectionStory.explanationLabel,
      burstLabel,
      primaryDriverLabel,
      isAdaptive: selectionStory.compareStateLabel.includes('Adaptive'),
      isComparing: true,
      warpSource: undefined,
    };
  }, [columns?.timestamp?.length, data.length, burstWindows.length, selectionStory]);
}
