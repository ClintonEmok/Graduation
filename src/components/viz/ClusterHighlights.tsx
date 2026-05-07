import React from 'react';
import { useClusterStore } from '@/store/useClusterStore';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';

export const ClusterHighlights: React.FC = () => {
  const { clusters, enabled, selectedClusterId, hoveredClusterId } = useClusterStore();
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme].categoryColors;

  const resolveClusterColor = (dominantType: string) =>
    palette[dominantType.toUpperCase()] || palette[dominantType] || '#a855f7';

  if (!enabled || !clusters || clusters.length === 0) return null;

  return (
    <group name="cluster-highlights">
      {clusters.map((cluster) => (
        <group key={cluster.id} position={cluster.center}>
          {(() => {
            const isSelected = cluster.id === selectedClusterId;
            const isHovered = cluster.id === hoveredClusterId;
            const clusterColor = resolveClusterColor(cluster.dominantType);
            const volumeOpacity = isSelected ? 0.18 : isHovered ? 0.12 : 0.08;
            const wireOpacity = isSelected ? 0.8 : isHovered ? 0.6 : 0.35;

            return (
              <>
                {/* Volume: Subtle transparent box */}
                <mesh scale={cluster.size}>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshBasicMaterial
                    color={clusterColor}
                    transparent
                    opacity={volumeOpacity}
                    depthWrite={false}
                  />
                </mesh>

                {/* Outline: Wireframe box */}
                <mesh scale={cluster.size}>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshBasicMaterial
                    color={clusterColor}
                    wireframe
                    transparent
                    opacity={wireOpacity}
                  />
                </mesh>
              </>
            );
          })()}
        </group>
      ))}
    </group>
  );
};
