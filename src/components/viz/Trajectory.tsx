import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Trajectory as TrajectoryType } from '@/lib/trajectories';
import { useTimeStore } from '@/store/useTimeStore';
import { MathUtils } from 'three';

interface TrajectoryProps {
  trajectory: TrajectoryType;
  adaptiveYValues: Float32Array | null;
}

export const Trajectory: React.FC<TrajectoryProps> = ({ trajectory, adaptiveYValues }) => {
  const lineRef = useRef<any>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const transitionRef = useRef(timeScaleMode === 'adaptive' ? 1 : 0);

  // 1. Compute base positions and colors
  const { points, colors, thicknesses } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];
    const thks: number[] = [];

    trajectory.points.forEach((p, i) => {
      pts.push(new THREE.Vector3(p.x, p.y, p.z));
      
      // Gradient: Dim at start, bright at end
      const progress = i / (trajectory.points.length - 1 || 1);
      const color = new THREE.Color().setHSL(0.6, 0.8, 0.2 + progress * 0.6);
      cols.push(color);

      // Dynamic Thickness: Inversely proportional to time gap
      if (i < trajectory.points.length - 1) {
        const nextP = trajectory.points[i + 1];
        const gap = Math.max(0.1, nextP.y - p.y);
        thks.push(Math.min(5, 1 / gap * 2)); // Adjust multipliers for visual balance
      } else {
        thks.push(thks[thks.length - 1] || 1);
      }
    });

    return { points: pts, colors: cols, thicknesses: thks };
  }, [trajectory]);

  // 2. Animate transition and update geometry
  useFrame((_state: any, delta: number) => {
    const target = timeScaleMode === 'adaptive' ? 1 : 0;
    transitionRef.current = MathUtils.damp(transitionRef.current, target, 5, delta);

    if (lineRef.current) {
      const currentPoints = points.map((p, i) => {
        const linearY = p.y;
        const adaptiveY = adaptiveYValues ? adaptiveYValues[trajectory.points[i].originalIndex] : linearY;
        const y = MathUtils.lerp(linearY, adaptiveY, transitionRef.current);
        return [p.x, y, p.z] as [number, number, number];
      }).flat();

      lineRef.current.setPoints(currentPoints);
      
      // Update Arrowhead position and orientation
      if (arrowRef.current && trajectory.points.length > 1) {
        const lastIdx = trajectory.points.length - 1;
        const pLast = trajectory.points[lastIdx];
        const pPrev = trajectory.points[lastIdx - 1];
        
        const yLast = MathUtils.lerp(
          pLast.y, 
          adaptiveYValues ? adaptiveYValues[pLast.originalIndex] : pLast.y, 
          transitionRef.current
        );
        const yPrev = MathUtils.lerp(
          pPrev.y, 
          adaptiveYValues ? adaptiveYValues[pPrev.originalIndex] : pPrev.y, 
          transitionRef.current
        );

        arrowRef.current.position.set(pLast.x, yLast, pLast.z);
        arrowRef.current.lookAt(pPrev.x, yPrev, pPrev.z);
      }
    }
  });

  // Calculate average thickness for the Line (Line2 doesn't support per-vertex thickness easily in drei)
  const avgThickness = useMemo(() => {
    return thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length;
  }, [thicknesses]);

  return (
    <group>
      <Line
        ref={lineRef}
        points={points.map(p => [p.x, p.y, p.z] as [number, number, number])}
        color="white"
        lineWidth={avgThickness}
        vertexColors={colors.map(c => [c.r, c.g, c.b] as [number, number, number])}
        transparent
        opacity={0.8}
      />
      
      {/* Arrowhead (Cone) at the latest point */}
      <group ref={arrowRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.8, 2, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
};
