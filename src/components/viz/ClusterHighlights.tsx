import React from 'react';
import { useClusterStore } from '@/store/useClusterStore';

export const ClusterHighlights: React.FC = () => {
  const { clusters, enabled } = useClusterStore();

  if (!enabled || !clusters || clusters.length === 0) return null;

  return (
    <group name="cluster-highlights">
      {clusters.map((cluster) => (
        <group key={cluster.id} position={cluster.center}>
          {/* Volume: Subtle transparent box */}
          <mesh scale={cluster.size}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial 
              color={cluster.color} 
              transparent 
              opacity={0.1} 
              depthWrite={false} 
            />
          </mesh>
          
          {/* Outline: Wireframe box */}
          <mesh scale={cluster.size}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial 
              color={cluster.color} 
              wireframe 
              transparent 
              opacity={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
