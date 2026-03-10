/**
 * @deprecated Temporary compatibility shim.
 * Canonical timeline data store logic now lives in `useTimelineDataStore`.
 * This file should be removed after all imports migrate.
 */
export { useTimelineDataStore as useDataStore } from '@/store/useTimelineDataStore';
export type { TimelineDataState as DataState } from '@/store/useTimelineDataStore';

export type { DataPoint, ColumnarData, FilteredPoint } from '@/lib/data/types';
export { selectFilteredData } from '@/lib/data/selectors';
