import { useFrame } from '@react-three/fiber';
import { useTimeStore } from '@/store/useTimeStore';
import * as THREE from 'three';

interface TimeLoopProps {
  pointsRef: React.RefObject<THREE.InstancedMesh>;
  planeRef: React.RefObject<THREE.Mesh>;
}

export function TimeLoop({ pointsRef, planeRef }: TimeLoopProps) {
  useFrame((state, delta) => {
    const { 
      isPlaying, 
      speed, 
      currentTime, 
      timeRange, 
      timeWindow, 
      setTime 
    } = useTimeStore.getState();
    
    let nextTime = currentTime;

    if (isPlaying) {
      // Advance time
      // Base speed: 10 units per second at 1x speed
      // Adjust multiplier as needed for good UX
      nextTime += delta * speed * 10; 
      
      // Loop handling
      if (nextTime > timeRange[1]) {
        nextTime = timeRange[0];
      }
      
      // Update store (this triggers UI updates)
      setTime(nextTime);
    }
    
    // Update visual elements directly (bypassing React state for performance)
    
    // 1. Update TimePlane position
    if (planeRef.current) {
      planeRef.current.position.y = nextTime;
    }

    // 2. Update DataPoints shader uniforms
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
