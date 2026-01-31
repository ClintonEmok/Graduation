import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { CrimeEvent, CrimeType } from '@/types';

// Map crime types to colors
const COLOR_MAP: Record<CrimeType, string> = {
  Theft: '#00FFFF', // Cyan
  Assault: '#FF0000', // Red
  Burglary: '#FFFF00', // Yellow
  Robbery: '#FF00FF', // Magenta
  Vandalism: '#00FF00', // Green
};

interface DataPointsProps {
  data: CrimeEvent[];
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const DataPoints: React.FC<DataPointsProps> = ({ data }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Set positions and colors for each instance
    data.forEach((point, i) => {
      // Position
      // X and Z are space, Y is time (Y-up)
      tempObject.position.set(point.x, point.y, point.z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // Color
      const colorHex = COLOR_MAP[point.type] || '#FFFFFF';
      tempColor.set(colorHex);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
    }

  }, [data]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.length]}
    >
      <sphereGeometry args={[0.5, 8, 8]} /> {/* Low poly sphere: radius 0.5, widthSeg 8, heightSeg 8 */}
      <meshStandardMaterial />
    </instancedMesh>
  );
};
