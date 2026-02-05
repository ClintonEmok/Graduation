import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Trajectory as TrajectoryType } from '@/lib/trajectories';
import { useTimeStore } from '@/store/useTimeStore';
import { MathUtils } from 'three';

import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { TrajectoryTooltip } from './TrajectoryTooltip';

interface TrajectoryProps {
  trajectory: TrajectoryType;
  adaptiveYValues: Float32Array | null;
}

export const Trajectory: React.FC<TrajectoryProps> = ({ trajectory, adaptiveYValues }) => {
  const lineRef = useRef<any>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const currentTime = useTimeStore((state) => state.currentTime);
  const transitionRef = useRef(timeScaleMode === 'adaptive' ? 1 : 0);

  const hoveredBlock = useTrajectoryStore((state) => state.hoveredBlock);
  const selectedBlock = useTrajectoryStore((state) => state.selectedBlock);
  const setHoveredBlock = useTrajectoryStore((state) => state.setHoveredBlock);
  const setSelectedBlock = useTrajectoryStore((state) => state.setSelectedBlock);
  const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);

  const isSelected = selectedBlock === trajectory.block;
  const isHovered = hoveredBlock === trajectory.block;
  const hasSelection = selectedBlock !== null;

  // 1. Compute base positions and colors
  const { points, colors, thicknesses, duration, distance } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];
    const thks: number[] = [];

    let totalDist = 0;
    const p0 = trajectory.points[0];
    const minT = p0.y;
    const maxT = trajectory.points[trajectory.points.length - 1].y;

    trajectory.points.forEach((p, i) => {
      pts.push(new THREE.Vector3(p.x, p.y, p.z));
      
      if (i > 0) {
        const prev = trajectory.points[i - 1];
        // Euclidean distance on XZ plane
        totalDist += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.z - prev.z, 2));
      }

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

    return { 
      points: pts, 
      colors: cols, 
      thicknesses: thks,
      duration: maxT - minT,
      distance: totalDist
    };
  }, [trajectory]);

  // 2. Animate transition and update geometry
  useFrame((_state: any, delta: number) => {
    const target = timeScaleMode === 'adaptive' ? 1 : 0;
    transitionRef.current = MathUtils.damp(transitionRef.current, target, 5, delta);

    if (lineRef.current) {
      const trailWindow = 20; // Time units
      const currentPoints: number[] = [];
      const currentColors: number[] = [];

      points.forEach((p, i) => {
        const linearY = p.y;
        const adaptiveY = adaptiveYValues ? adaptiveYValues[trajectory.points[i].originalIndex] : linearY;
        const y = MathUtils.lerp(linearY, adaptiveY, transitionRef.current);
        currentPoints.push(p.x, y, p.z);

        // Trail Effect: Fade out points far from currentTime
        const timeDist = Math.abs(linearY - currentTime);
        const trailOpacity = MathUtils.clamp(1.0 - timeDist / trailWindow, 0, 1);
        
        const baseColor = colors[i];
        // We can't do per-vertex alpha easily with Line2, so we dim the color towards black
        currentColors.push(baseColor.r * trailOpacity, baseColor.g * trailOpacity, baseColor.b * trailOpacity);
      });

      lineRef.current.setPoints(currentPoints);
      lineRef.current.setColors(currentColors);
      
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

  // Calculate average thickness for the Line
  const avgThickness = useMemo(() => {
    let base = thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length;
    if (isHovered || isSelected) base *= 2;
    return base;
  }, [thicknesses, isHovered, isSelected]);

  const opacity = useMemo(() => {
    if (isSelected) return 1.0;
    if (hasSelection) return 0.05; // Ghosting
    if (isHovered) return 0.9;
    return 0.6;
  }, [isSelected, hasSelection, isHovered]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHoveredBlock(trajectory.block);
  };

  const handlePointerOut = () => {
    setHoveredBlock(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isSelected) {
      setSelectedBlock(null);
    } else {
      setSelectedBlock(trajectory.block);
      // Select the first point in the trajectory as a representative
      setSelectedIndex(trajectory.points[0].originalIndex, 'cube');
    }
  };

  return (
    <group 
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <Line
        ref={lineRef}
        points={points.map(p => [p.x, p.y, p.z] as [number, number, number])}
        color="white"
        lineWidth={avgThickness}
        vertexColors={colors.map(c => [c.r, c.g, c.b] as [number, number, number])}
        transparent
        opacity={opacity}
      />
      
      {/* Arrowhead (Cone) at the latest point */}
      <group ref={arrowRef} visible={!hasSelection || isSelected}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.8, 2, 8]} />
          <meshStandardMaterial color="white" transparent opacity={opacity} />
        </mesh>
      </group>

      {isHovered && (
        <TrajectoryTooltip 
          duration={duration} 
          distance={distance} 
          block={trajectory.block}
        />
      )}
    </group>
  );
};
