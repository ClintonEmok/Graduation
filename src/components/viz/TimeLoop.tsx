import { useFrame } from '@react-three/fiber';
import { useTimeStore } from '@/store/useTimeStore';
import { useDataStore } from '@/store/useDataStore';
import { resolutionToNormalizedStep } from '@/lib/time-domain';
import * as THREE from 'three';

interface TimeLoopProps {
  pointsRef: React.RefObject<THREE.InstancedMesh | null>;
}

export function TimeLoop({ pointsRef }: TimeLoopProps) {
  useFrame((state, delta) => {
    const { 
      isPlaying, 
      speed, 
      currentTime, 
      timeRange, 
      timeWindow, 
      setTime,
      timeResolution
    } = useTimeStore.getState();
    const { minTimestampSec, maxTimestampSec } = useDataStore.getState();
    
    let nextTime = currentTime;

    if (isPlaying) {
      const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
      const span = Math.max(0.0001, timeRange[1] - timeRange[0]);
      const deltaNorm = delta * speed * stepSize;
      const offset = (currentTime - timeRange[0] + deltaNorm) % span;
      nextTime = timeRange[0] + (offset < 0 ? offset + span : offset);

      // Update store (this triggers UI updates)
      setTime(nextTime);
    }
    
    // Update visual elements directly (bypassing React state for performance)
    
    // Update DataPoints shader uniforms
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.MeshStandardMaterial;
      // Access the shader we attached in DataPoints.tsx onBeforeCompile
      const shader = material.userData.shader;
      
      if (shader) {
        shader.uniforms.uTimePlane.value = nextTime;
        shader.uniforms.uRange.value = timeWindow;
      }
    }
  });

  return null;
}
