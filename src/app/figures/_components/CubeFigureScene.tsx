'use client';

import { Canvas } from '@react-three/fiber';

function CubeScene() {
  const plotPoints = [
    [-0.48, -0.42, -0.28],
    [-0.24, -0.18, 0.16],
    [-0.06, 0.08, -0.34],
    [0.16, -0.12, 0.28],
    [0.34, 0.2, -0.14],
    [0.48, -0.32, 0.18],
    [0.04, 0.36, 0.02],
    [-0.38, 0.22, 0.32],
  ] as const;

  return (
    <group scale={1.85} position={[0, -0.06, 0]}>
      <mesh>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.16} roughness={0.3} metalness={0.05} />
      </mesh>

      <mesh>
        <boxGeometry args={[1.62, 1.62, 1.62]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.8} />
      </mesh>

      {plotPoints.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshStandardMaterial
            color={index % 3 === 0 ? '#111827' : index % 3 === 1 ? '#475569' : '#0f172a'}
            emissive="#111827"
            emissiveIntensity={0.2}
            roughness={0.25}
          />
        </mesh>
      ))}

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.06} />
      </mesh>

      <pointLight position={[2.5, 3, 2.5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-2, -1.5, 2]} intensity={0.8} color="#cbd5e1" />
    </group>
  );
}

export function CubeFigureScene() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[1.5rem] bg-white">
      <Canvas camera={{ position: [2.2, 1.9, 2.2], fov: 38 }} dpr={[1, 2]}>
        <color attach="background" args={["#ffffff"]} />
        <fog attach="fog" args={["#ffffff", 4, 10]} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <CubeScene />
      </Canvas>
    </div>
  );
}
