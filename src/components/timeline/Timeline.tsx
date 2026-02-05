'use client';
import { ParentSize } from '@visx/responsive';

const TimelineContent = ({ width, height }: { width: number; height: number }) => {
   if (width < 10) return null; // Avoid render on initial layout
   return (
     <svg width={width} height={height}>
        <rect width={width} height={height} fill="transparent" />
        <text x="10" y="20" fill="white">Timeline Ready</text>
     </svg>
   );
};

export function Timeline() {
  return (
    <div className="w-full h-full min-h-[150px]">
      <ParentSize>
        {({ width, height }) => <TimelineContent width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
