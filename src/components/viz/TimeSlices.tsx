import { useRef, useMemo, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useSliceStore } from '@/store/useSliceStore';
import { useDataStore } from '@/store/useDataStore';
import { useTimeStore } from '@/store/useTimeStore';
import { SlicePlane } from './SlicePlane';
import { scaleLinear } from 'd3-scale';
import { getAdaptiveScaleConfig, getAdaptiveScaleConfigColumnar } from '@/lib/adaptive-scale';

export function TimeSlices() {
  const slices = useSliceStore((state) => state.slices);
  const addSlice = useSliceStore((state) => state.addSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  
  // Compute scale
  const scale = useMemo(() => {
    if (timeScaleMode === 'linear') {
      return scaleLinear().domain([0, 100]).range([0, 100]);
    }
    
    // Adaptive
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
      {/* Hit Box for creating slices - Translucent/Invisible */}
      <mesh 
        position={[0, 50, 0]} 
        onDoubleClick={handleDoubleClick}
        visible={true}
      >
        <boxGeometry args={[100, 100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {slices.map((slice) => (
        <SlicePlane
          key={slice.id}
          slice={slice}
          y={scale(slice.time)}
          onUpdate={(t) => updateSlice(slice.id, { time: t })}
          yToTime={yToTime}
        />
      ))}
    </group>
  );
}
