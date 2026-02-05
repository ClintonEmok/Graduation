import React from 'react';
import { Html } from '@react-three/drei';

interface TrajectoryTooltipProps {
  duration: number;
  distance: number;
  block: string;
}

export const TrajectoryTooltip: React.FC<TrajectoryTooltipProps> = ({ duration, distance, block }) => {
  return (
    <Html center distanceFactor={10}>
      <div className="bg-black/80 text-white p-3 rounded-lg border border-white/20 shadow-xl pointer-events-none min-w-[200px]">
        <h4 className="font-bold text-sm border-b border-white/10 pb-1 mb-2 uppercase tracking-wider text-blue-400">
          Trajectory Summary
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-white/60">Location:</span>
            <span className="font-mono">{block}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Duration:</span>
            <span className="font-mono">{duration.toFixed(1)} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Travel Dist:</span>
            <span className="font-mono">{distance.toFixed(2)} units</span>
          </div>
        </div>
      </div>
    </Html>
  );
};
