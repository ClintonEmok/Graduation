"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Points, PointMaterial } from "@react-three/drei";
import { useCanonicalPoints, type CanonicalPoint } from "./useCanonicalPoints";
import * as THREE from "three";

function CrimePoints({ points }: { points: CanonicalPoint[] }) {
  const positionArray = new Float32Array(points.length * 3);
  const colorArray = new Float32Array(points.length * 3);

  const colorMap: Record<string, THREE.Color> = {
    theft: new THREE.Color("#f59e0b"),
    burglary: new THREE.Color("#3b82f6"),
    assault: new THREE.Color("#ef4444"),
    robbery: new THREE.Color("#8b5cf6"),
    default: new THREE.Color("#6b7280"),
  };

  points.forEach((point, i) => {
    positionArray[i * 3] = point.x;
    positionArray[i * 3 + 1] = point.y;
    positionArray[i * 3 + 2] = point.z;

    const color = colorMap[point.type] || colorMap.default;
    colorArray[i * 3] = color.r;
    colorArray[i * 3 + 1] = color.g;
    colorArray[i * 3 + 2] = color.b;
  });

  return (
    <Points positions={positionArray} colors={colorArray}>
      <PointMaterial
        vertexColors
        transparent
        size={0.5}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

function AxesHelper() {
  return (
    <group>
      <axesHelper args={[50]} />
    </group>
  );
}

export function Scene3D() {
  const { points, bounds } = useCanonicalPoints(10000);

  if (points.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-slate-900 text-slate-400">
        No crime data available
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-md bg-slate-900">
      <Canvas camera={{ position: [0, 100, 100], fov: 60 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <CrimePoints points={points} />
        <AxesHelper />
        <OrbitControls enableDamping dampingFactor={0.05} />
        <gridHelper args={[200, 20, "#334155", "#1e293b"]} position={[0, -0.1, 0]} />
      </Canvas>
      <div className="absolute bottom-2 right-2 rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-300">
        {points.length.toLocaleString()} points | X: [{bounds.minX.toFixed(0)}, {bounds.maxX.toFixed(0)}] | Z: [{bounds.minZ.toFixed(0)}, {bounds.maxZ.toFixed(0)}]
      </div>
    </div>
  );
}
