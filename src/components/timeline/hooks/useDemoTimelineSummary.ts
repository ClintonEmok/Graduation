import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardDemoSelectionStory } from '@/components/dashboard-demo/lib/buildDashboardDemoSelectionStory';
import { useDemoBurstWindows } from '@/components/dashboard-demo/lib/useDemoBurstWindows';
import { formatDateByResolution } from '@/lib/date-formatting';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

export function useDemoTimelineSummary() {
  const selectionStory = useDashboardDemoSelectionStory();
  const { data, columns } = useTimelineDataStore(
    useShallow((state) => ({
      data: state.data,
      columns: state.columns,
    }))
  );
  const overviewTimestampSec = useTimelineDataStore((state) => state.overviewTimestampSec);
  const dataCount = useTimelineDataStore((state) => state.dataCount);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const burstWindows = useDemoBurstWindows();

  return useMemo(() => {
    const pointCount = dataCount ?? overviewTimestampSec.length ?? columns?.timestamp?.length ?? data.length;
    const selectedWindowLabel = selectionStory.activeWindowLabel;
    const overviewRangeLabel =
      minTimestampSec !== null && maxTimestampSec !== null
        ? `${formatDateByResolution(new Date(minTimestampSec * 1000), 'year')} → ${formatDateByResolution(new Date(maxTimestampSec * 1000), 'year')}`
        : 'Loading full dataset range…';
    const modeLabel = selectionStory.compareStateLabel.includes('Adaptive') ? 'Adaptive' : 'Linear';
    const compareLabel = selectionStory.compareStateLabel;
    const burstLabel = burstWindows.length > 0 ? `${burstWindows.length} burst window${burstWindows.length === 1 ? '' : 's'}` : 'No burst windows';
    const overviewLabel = `${pointCount.toLocaleString()} records in the overview`;
    const primaryDriverLabel = selectionStory.storyLabel;

    return {
      overviewLabel,
      overviewRangeLabel,
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
  }, [columns?.timestamp?.length, data.length, dataCount, maxTimestampSec, minTimestampSec, overviewTimestampSec.length, burstWindows.length, selectionStory]);
}
