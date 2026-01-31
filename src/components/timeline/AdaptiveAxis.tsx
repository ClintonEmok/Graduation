import React from 'react';
import { AxisBottom } from '@visx/axis';
import { useAdaptiveScale } from '@/hooks/useAdaptiveScale';

interface AdaptiveAxisProps {
  width: number;
  height: number;
}

export const AdaptiveAxis: React.FC<AdaptiveAxisProps> = ({ width, height }) => {
  const scale = useAdaptiveScale(width);

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <AxisBottom
        scale={scale}
        top={0}
        stroke="currentColor"
        tickStroke="currentColor"
        tickLabelProps={{
          fill: "currentColor",
          fontSize: 10,
          textAnchor: "middle",
          fontFamily: "var(--font-sans)",
        }}
        numTicks={Math.max(2, Math.floor(width / 80))}
        tickLength={4}
      />
    </svg>
  );
};
