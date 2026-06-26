'use client';

import { Canvas } from '@react-three/fiber';

function OverviewCubeVolume() {
  const points = [
    [-0.58, -0.46, -0.22],
    [-0.34, -0.28, 0.2],
    [-0.12, 0.02, -0.34],
    [0.16, -0.14, 0.34],
    [0.34, 0.24, -0.16],
    [0.52, -0.3, 0.18],
    [0.08, 0.38, 0.02],
    [-0.44, 0.18, 0.34],
    [0.58, 0.08, -0.08],
    [-0.18, -0.56, 0.08],
  ] as const;

  return (
    <group scale={0.65} position={[0, -0.12, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.2} roughness={0.35} metalness={0.02} />
      </mesh>

      <mesh>
        <boxGeometry args={[1.54, 1.54, 1.54]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.9} />
      </mesh>

      <mesh position={[0, -0.88, 0]}>
        <boxGeometry args={[2.1, 0.16, 2.1]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.95} roughness={0.8} />
      </mesh>

      <mesh position={[0, -0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.92, 40]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.22} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.86, 0.86, 0.86]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} roughness={0.2} />
      </mesh>

      {points.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.052, 20, 20]} />
          <meshStandardMaterial
            color={index % 3 === 0 ? '#0f172a' : index % 3 === 1 ? '#475569' : '#111827'}
            emissive="#111827"
            emissiveIntensity={0.18}
            roughness={0.28}
          />
        </mesh>
      ))}

      <mesh position={[0.02, 0.02, 0.02]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.05} />
      </mesh>

      <pointLight position={[3.2, 3.4, 3.2]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-2.2, -1.8, 2]} intensity={0.85} color="#cbd5e1" />
      <pointLight position={[0, 1.8, -2]} intensity={0.45} color="#e2e8f0" />
    </group>
  );
}

export function OverviewCubeSketch() {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-white">
      <Canvas camera={{ position: [2.05, 1.8, 2.15], fov: 34 }} dpr={[1, 2]}>
        <color attach="background" args={['#ffffff']} />
        <fog attach="fog" args={['#ffffff', 4.5, 10.5]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <OverviewCubeVolume />
      </Canvas>
    </div>
  );
}
