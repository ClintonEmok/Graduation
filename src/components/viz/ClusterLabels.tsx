import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useClusterStore } from '@/store/useClusterStore';

export const ClusterLabels: React.FC = () => {
  const { clusters, enabled, setSelectedClusterId } = useClusterStore();
  const controls = useThree((state: any) => state.controls) as any;

  const topClusters = useMemo(() => {
    if (!clusters) return [];
    return [...clusters]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [clusters]);

  if (!enabled || topClusters.length === 0) return null;

  return (
    <group name="cluster-labels">
      {topClusters.map((cluster) => (
        <group key={cluster.id} position={cluster.center}>
          <Html
            position={[0, cluster.size[1] / 2, 0]} // Exactly at the top edge of the box
            center
            distanceFactor={20}
            zIndexRange={[100, 0]}
          >
            <div className="flex flex-col items-center -translate-y-full pb-1 pointer-events-auto select-none group cursor-pointer"
              onClick={() => {
                setSelectedClusterId(cluster.id);
                if (controls && controls.fitToBox) {
                  const center = new THREE.Vector3().fromArray(cluster.center);
                  const size = new THREE.Vector3().fromArray(cluster.size);
                  const min = center.clone().sub(size.clone().multiplyScalar(0.5));
                  const max = center.clone().add(size.clone().multiplyScalar(0.5));
                  const box = new THREE.Box3(min, max);
                  controls.fitToBox(box, true, { 
                    paddingLeft: 1, 
                    paddingRight: 1, 
                    paddingTop: 1, 
                    paddingBottom: 1 
                  });
                }
              }}
            >
              <div 
                className="px-2 py-1 rounded bg-black/90 border border-white/20 text-white text-[10px] whitespace-nowrap shadow-xl flex items-center gap-2 transition-transform group-hover:scale-110 group-active:scale-95"
                style={{ borderTop: `2px solid ${cluster.color}` }}
              >
                <span className="font-medium">{cluster.dominantType}</span>
                <span className="opacity-60 text-[9px] px-1 bg-white/10 rounded">{cluster.count}</span>
              </div>
              {/* Leader Line (CSS) */}
              <div 
                className="w-[1px] h-6 bg-gradient-to-b from-white/60 to-transparent" 
              />
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
