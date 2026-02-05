import { useState, useRef, useEffect, useMemo } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TimeSlice } from '@/store/useSliceStore';

interface SlicePlaneProps {
  slice: TimeSlice;
  y: number;
  onUpdate: (time: number) => void;
  yToTime: (y: number) => number;
}

export function SlicePlane({ slice, y, onUpdate, yToTime }: SlicePlaneProps) {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  // Visual props
  const color = slice.isLocked ? '#999' : '#00ffff';
  const opacity = 0.2;

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

      // 3. Intersect with a virtual vertical plane facing the camera
      // We want a plane that passes through the current handle position
      // and is roughly perpendicular to the camera to maximize drag area.
      // But since we only care about Y, a generic plane like Z=0 works if we're not edge-on.
      // Better: Plane with normal = (cameraDir.x, 0, cameraDir.z) normalized.
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      
      const planeNormal = cameraDir.clone().negate(); // Face camera
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal, 
        new THREE.Vector3(0, y, 0)
      );

      const target = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, target);

      if (intersection) {
        // Update Y
        // We calculate new Time from Y
        // Clamp Y to reasonable bounds (e.g. 0-100? or domain of scale?)
        // Let yToTime handle the logic/clamping via scale.invert()
        const newTime = yToTime(intersection.y);
        onUpdate(newTime);
      }
    };

    const onPointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, camera, gl.domElement, onUpdate, yToTime, y]);

  // Format label
  const label = useMemo(() => {
    // Basic formatting - assuming 0-100 is normalized, 
    // but if it's a timestamp, format date.
    // For now, if > 1000000000 assume timestamp
    if (slice.time > 1000000000) {
      return new Date(slice.time).toLocaleDateString();
    }
    return slice.time.toFixed(1);
  }, [slice.time]);

  if (!slice.isVisible) return null;

  return (
    <group position={[0, y, 0]}>
      {/* The Plane */}
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

      {/* Grid Helper on the plane for visual reference */}
      <gridHelper args={[100, 10]} position={[0, 0.01, 0]} rotation={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </gridHelper>

      {/* Handle and Label */}
      {/* Positioned at one corner or edge? Let's put it on the axis or corner */}
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
