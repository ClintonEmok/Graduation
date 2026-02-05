import { useState, useRef, useEffect, useMemo } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TimeSlice } from '@/store/useSliceStore';

interface SlicePlaneProps {
  slice: TimeSlice;
  y: number;
  onUpdate: (updates: Partial<TimeSlice>) => void;
  yToTime: (y: number) => number;
  timeToY: (t: number) => number;
}

export function SlicePlane({ slice, y, onUpdate, yToTime, timeToY }: SlicePlaneProps) {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  const isRange = slice.type === 'range';
  
  // Visual props
  const color = slice.isLocked ? '#999' : (isRange ? '#ff00ff' : '#00ffff');
  const opacity = isRange ? 0.1 : 0.2;

  // Calculate range specifics
  const rangeYStart = isRange ? timeToY(slice.range?.[0] ?? 0) : y;
  const rangeYEnd = isRange ? timeToY(slice.range?.[1] ?? 0) : y;
  const height = isRange ? Math.abs(rangeYEnd - rangeYStart) : 0.1;
  const centerY = isRange ? (rangeYStart + rangeYEnd) / 2 : y;

  // Handle drag logic
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (slice.isLocked) return;
    e.stopPropagation(); // Stop camera controls
    setIsDragging(true);
    // @ts-ignore - setPointerCapture exists on Element
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (slice.isLocked) return;
    e.stopPropagation();
    setIsDragging(false);
    // @ts-ignore
    gl.domElement.releasePointerCapture(e.pointerId);
  };

  // Global pointer move for robust dragging
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      // 1. Calculate NDC
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yNDC = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 2. Raycast from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, yNDC), camera);

      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      
      const planeNormal = cameraDir.clone().negate(); // Face camera
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal, 
        new THREE.Vector3(0, centerY, 0)
      );

      const target = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, target);

      if (intersection) {
        if (isRange) {
          // Simplistic range drag: shift both by same amount
          const deltaY = intersection.y - centerY;
          const newStart = yToTime(rangeYStart + deltaY);
          const newEnd = yToTime(rangeYEnd + deltaY);
          onUpdate({ range: [newStart, newEnd] });
        } else {
          const newTime = yToTime(intersection.y);
          onUpdate({ time: newTime });
        }
      }
    };

    const onPointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, camera, gl.domElement, onUpdate, yToTime, centerY, isRange, rangeYStart, rangeYEnd]);

  // Format label
  const label = useMemo(() => {
    if (isRange) {
      const r = slice.range || [0, 0];
      return `${r[0].toFixed(1)} - ${r[1].toFixed(1)}`;
    }
    if (slice.time > 1000000000) {
      return new Date(slice.time).toLocaleDateString();
    }
    return slice.time.toFixed(1);
  }, [slice.time, slice.range, isRange]);

  if (!slice.isVisible) return null;

  return (
    <group position={[0, centerY, 0]}>
      {/* Visual Representation */}
      {isRange ? (
        <mesh>
          <boxGeometry args={[100, height, 100]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={opacity} 
            depthWrite={false}
          />
        </mesh>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity} 
              side={THREE.DoubleSide} 
              depthWrite={false}
            />
          </mesh>
          <gridHelper args={[100, 10]} position={[0, 0.01, 0]} rotation={[0, 0, 0]}>
            <meshBasicMaterial color={color} transparent opacity={0.3} />
          </gridHelper>
        </>
      )}

      {/* Handle and Label */}
      <group position={[50, 0, 50]}>
        <mesh 
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color={isDragging || hovered ? '#ffffff' : color} />
        </mesh>
        
        <Html position={[2, 0, 0]} center className="pointer-events-none select-none">
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-white/20">
            {label}
          </div>
        </Html>
      </group>
    </group>
  );
}
