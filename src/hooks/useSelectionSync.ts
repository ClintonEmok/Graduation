import { useEffect } from 'react';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useDataStore } from '@/store/useDataStore';

/**
 * useSelectionSync - The "Conductor" that synchronizes all views
 * 
 * This hook ties together:
 * - CoordinationStore: Single source of truth for selection state
 * - TimeStore: Controls the timeline/scrubber position
 * - SliceStore: Manages time slice panels
 * - DataStore: Provides point data for time lookup
 * 
 * Truths enforced:
 * - Selecting in Map updates 3D view
 * - Selecting in 3D updates Map
 * - Timeline scrolls to selection
 */
export function useSelectionSync() {
  const selectedIndex = useCoordinationStore((state) => state.selectedIndex);
  const timeRange = useTimeStore((state) => state.timeRange);
  const setTime = useTimeStore((state) => state.setTime);
  const slices = useSliceStore((state) => state.slices);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const columns = useDataStore((state) => state.columns);

  // Effect 1: Sync selection to timeline (scroll to selected point's time)
  useEffect(() => {
    if (selectedIndex === null) return;

    // Get point data for the selected index
    let pointTime: number | null = null;

    if (columns && selectedIndex < columns.length) {
      // Real data: timestamp is normalized 0-100
      pointTime = columns.timestamp[selectedIndex];
    } else {
      // Mock data fallback: get from data array
      const data = useDataStore.getState().data;
      if (data[selectedIndex]) {
        pointTime = data[selectedIndex].timestamp;
      }
    }

    if (pointTime !== null) {
      // Center the timeline on the selected point's time
      // Convert normalized 0-100 to actual time value
      const timeSpan = timeRange[1] - timeRange[0];
      const actualTime = timeRange[0] + (pointTime / 100) * timeSpan;
      
      setTime(actualTime);
    }
  }, [selectedIndex, columns, timeRange, setTime]);

  // Effect 2: Sync selection to slices (activate slice if point is inside)
  useEffect(() => {
    if (selectedIndex === null || slices.length === 0) {
      // Clear active slice when selection is cleared
      if (selectedIndex === null && slices.length > 0) {
        setActiveSlice(null);
      }
      return;
    }

    // Get point time
    let pointTime: number | null = null;

    if (columns && selectedIndex < columns.length) {
      pointTime = columns.timestamp[selectedIndex];
    } else {
      const data = useDataStore.getState().data;
      if (data[selectedIndex]) {
        pointTime = data[selectedIndex].timestamp;
      }
    }

    if (pointTime === null) return;

    // Find if point is inside any slice
    const containingSlice = slices.find((slice) => {
      if (slice.type === 'point') {
        // Point slice: check if within small tolerance (±2 normalized units)
        return Math.abs(slice.time - pointTime!) <= 2;
      } else if (slice.type === 'range' && slice.range) {
        // Range slice: check if within range
        return pointTime! >= slice.range[0] && pointTime! <= slice.range[1];
      }
      return false;
    });

    // Activate the containing slice, or clear if none
    if (containingSlice) {
      setActiveSlice(containingSlice.id);
    } else {
      setActiveSlice(null);
    }
  }, [selectedIndex, slices, columns, setActiveSlice]);

  // Note: timeRange changes are already handled by the brush uniforms in shaders
  // via DataPoints component. No additional store sync needed for brush.
}
