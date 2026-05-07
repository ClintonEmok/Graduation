import { useMemo, useCallback, useEffect } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useStore } from 'zustand';
import { useSliceStore } from '@/store/useSliceStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDemoEvolutionSequence } from '@/components/dashboard-demo/lib/useDemoEvolutionSequence';
import { SlicePlane } from './SlicePlane';
import { BurstEvolutionOverlay } from './BurstEvolutionOverlay';
import { EvolutionFlowOverlay } from './EvolutionFlowOverlay';
import { SliceClusterOverlay } from './SliceClusterOverlay';
import { scaleLinear } from 'd3-scale';
import { getAdaptiveScaleConfig, getAdaptiveScaleConfigColumnar } from '@/lib/adaptive-scale';
import { useFilterStore } from '@/store/useFilterStore';
import { useClusterStore } from '@/store/useClusterStore';
import { selectFilteredData } from '@/lib/data/selectors';
import { analyzeClusters, groupClusterAnalysesBySlice } from '@/lib/clustering/cluster-analysis';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';

interface TimeSlicesProps {
  sliceStoreOverride?: unknown;
  timeStoreOverride?: unknown;
}

export function TimeSlices({ sliceStoreOverride, timeStoreOverride }: TimeSlicesProps) {
  const sliceStore = (sliceStoreOverride ?? useSliceStore) as typeof useSliceStore;
  const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;

  const slices = useStore(sliceStore, (state) => state.slices);
  const addSlice = useStore(sliceStore, (state) => state.addSlice);
  const updateSlice = useStore(sliceStore, (state) => state.updateSlice);

  const data = useTimelineDataStore((state) => state.data);
  const columns = useTimelineDataStore((state) => state.columns);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const timeScaleMode = useStore(timeStore, (state) => state.timeScaleMode);
  const stkdeResponse = useDashboardDemoAnalysisStore((state) => state.stkdeResponse);
  const selectedBurstWindows = useDashboardDemoCoordinationStore((state) => state.selectedBurstWindows);
  const evolutionSequence = useDemoEvolutionSequence();
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const clusteringEnabled = useFeatureFlagsStore((state) => state.isEnabled('clustering'));
  const clusterStoreEnabled = useClusterStore((state) => state.enabled);
  const clusterSensitivity = useClusterStore((state) => state.sensitivity);
  const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
  
  // Compute relational scale for the slice scene
  const scale = useMemo(() => {
    if (timeScaleMode === 'linear') {
      return scaleLinear().domain([0, 100]).range([0, 100]);
    }
    
    // Adaptive relational projection
    let config;
    if (columns) {
      config = getAdaptiveScaleConfigColumnar(columns.timestamp, [0, 100], [0, 100]);
    } else {
      config = getAdaptiveScaleConfig(data, [0, 100], [0, 100]);
    }
    return scaleLinear().domain(config.domain).range(config.range);
  }, [timeScaleMode, data, columns]);

  const yToTime = useCallback((y: number) => {
    return scale.invert(y);
  }, [scale]);

  const filteredPoints = useMemo(
    () => selectFilteredData(
      { columns, data, minTimestampSec, maxTimestampSec },
      { selectedTypes, selectedDistricts, selectedTimeRange }
    ),
    [columns, data, maxTimestampSec, minTimestampSec, selectedDistricts, selectedTimeRange, selectedTypes]
  );

  const sliceClustersById = useMemo(() => {
    if (!clusteringEnabled || !clusterStoreEnabled || slices.length === 0 || filteredPoints.length === 0) {
      return {};
    }

    const sliceAnalyses = slices
      .filter((slice) => slice.isVisible !== false)
      .map((slice) => {
        const range = slice.type === 'range' && slice.range
          ? slice.range
          : [Math.max(0, slice.time - 2), Math.min(100, slice.time + 2)];
        const [start, end] = range[0] <= range[1] ? range : [range[1], range[0]];
        const slicePoints = filteredPoints.filter((point) => point.y >= start && point.y <= end);
        const analysis = analyzeClusters(slicePoints, clusterSensitivity, { kind: 'slice', sliceId: slice.id });

        return {
          sliceId: slice.id,
          clusters: analysis.clusters,
        };
      });

    return groupClusterAnalysesBySlice(sliceAnalyses);
  }, [clusterSensitivity, clusterStoreEnabled, clusteringEnabled, filteredPoints, slices]);

  useEffect(() => {
    setSliceClustersById(sliceClustersById);
    return () => setSliceClustersById({});
  }, [setSliceClustersById, sliceClustersById]);

  const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Calculate Y from point (in local coords? MainScene centers everything? 
    // Usually points are in world coords if inside <Scene>).
    // The hit box is at [0, 50, 0] with size 100.
    // e.point is world space.
    const y = e.point.y;
    const time = yToTime(y);
    const clampedTime = Math.max(0, Math.min(100, time));
    addSlice({ type: 'point', time: clampedTime });
  }, [addSlice, yToTime]);

  return (
    <group>
      {/* Relational hit box for creating slices - translucent/invisible */}
      <mesh 
        position={[0, 50, 0]} 
        onDoubleClick={handleDoubleClick}
        visible={true}
      >
        <boxGeometry args={[100, 100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {slices.map((slice) => (
        <group key={slice.id}>
          <SlicePlane
            slice={slice}
            y={scale(slice.time)}
            onUpdate={(updates) => updateSlice(slice.id, updates)}
            yToTime={yToTime}
            timeToY={scale}
            stkdeSurface={stkdeResponse?.sliceResults?.[slice.id] ?? null}
            evolutionState={
              evolutionSequence.activeSliceId === slice.id
                ? 'active'
                : evolutionSequence.previousSliceId === slice.id
                  ? 'previous'
                  : evolutionSequence.nextSliceId === slice.id
                    ? 'next'
                    : 'distant'
            }
          />
          <SliceClusterOverlay slice={slice} y={scale(slice.time)} />
        </group>
      ))}

      <BurstEvolutionOverlay slices={slices} burstWindows={selectedBurstWindows} timeToY={scale} />
      <EvolutionFlowOverlay slices={slices} activeSliceId={evolutionSequence.activeSliceId} timeToY={scale} />
    </group>
  );
}
