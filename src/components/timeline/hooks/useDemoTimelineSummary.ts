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
  const overviewBins = useTimelineDataStore((state) => state.overviewBins);
  const dataCount = useTimelineDataStore((state) => state.dataCount);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const burstWindows = useDemoBurstWindows();

  return useMemo(() => {
    // Phase 81: derive the point count from the canonical server-binned
    // overview bins (sum of `count`). Falls back to the dataset-level
    // `dataCount` from `/api/crime/meta`, then to the legacy Arrow columns
    // detail count, then to the in-memory mock `data` array.
    const binTotalCount = overviewBins.reduce((sum, bin) => sum + (Number.isFinite(bin.count) ? bin.count : 0), 0);
    const pointCount =
      binTotalCount > 0
        ? binTotalCount
        : dataCount ?? columns?.timestamp?.length ?? data.length;
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
  }, [
    columns?.timestamp?.length,
    data.length,
    dataCount,
    maxTimestampSec,
    minTimestampSec,
    overviewBins,
    burstWindows.length,
    selectionStory,
  ]);
}
