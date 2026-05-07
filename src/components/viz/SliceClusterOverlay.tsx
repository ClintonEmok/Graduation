import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useClusterStore } from '@/store/useClusterStore';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';
import type { TimeSlice } from '@/store/useSliceStore';
import { SLICE_CLUSTER_OVERLAY_ELEVATION } from './SlicePlane';

interface SliceClusterOverlayProps {
  slice: TimeSlice;
  y: number;
}

export function SliceClusterOverlay({ slice, y }: SliceClusterOverlayProps) {
  const sliceClusters = useClusterStore((state) => state.sliceClustersById[slice.id] ?? []);
  const selectedClusterId = useClusterStore((state) => state.selectedClusterId);
  const hoveredClusterId = useClusterStore((state) => state.hoveredClusterId);
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme].categoryColors;

  const resolveClusterColor = (dominantType: string) =>
    palette[dominantType.toUpperCase()] || palette[dominantType] || '#8b5cf6';

  const visibleClusters = useMemo(() => {
    if (slice.isVisible === false) return [];
    return sliceClusters;
  }, [slice.isVisible, sliceClusters]);

  if (visibleClusters.length === 0) return null;

  return (
    <group position={[0, y + SLICE_CLUSTER_OVERLAY_ELEVATION, 0]} name={`slice-cluster-overlay-${slice.id}`}>
      {visibleClusters.map((cluster) => {
        const width = Math.max(0.5, cluster.bounds.maxX - cluster.bounds.minX);
        const depth = Math.max(0.5, cluster.bounds.maxZ - cluster.bounds.minZ);
        const centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
        const centerZ = (cluster.bounds.minZ + cluster.bounds.maxZ) / 2;
        const clusterColor = resolveClusterColor(cluster.dominantType);
        const isSelected = cluster.id === selectedClusterId;
        const isHovered = cluster.id === hoveredClusterId;
        const fillOpacity = isSelected ? 0.16 : isHovered ? 0.1 : 0.06;
        const lineOpacity = isSelected ? 0.9 : isHovered ? 0.7 : 0.45;

        return (
          <group key={cluster.id} position={[centerX, 0, centerZ]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width, depth]} />
              <meshBasicMaterial color={clusterColor} transparent opacity={fillOpacity} depthWrite={false} />
            </mesh>
            <Line
              points={[
                [cluster.bounds.minX, 0.02, cluster.bounds.minZ],
                [cluster.bounds.maxX, 0.02, cluster.bounds.minZ],
                [cluster.bounds.maxX, 0.02, cluster.bounds.maxZ],
                [cluster.bounds.minX, 0.02, cluster.bounds.maxZ],
                [cluster.bounds.minX, 0.02, cluster.bounds.minZ],
              ]}
              color={clusterColor}
              lineWidth={1.5}
              transparent
              opacity={lineOpacity}
            />
          </group>
        );
      })}
    </group>
  );
}
