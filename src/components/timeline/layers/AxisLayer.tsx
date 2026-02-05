import { AxisBottom } from '@visx/axis';
import { ScaleTime } from 'd3-scale';

interface AxisLayerProps {
  xScale: ScaleTime<number, number>;
  height: number;
}

export function AxisLayer({ xScale, height }: AxisLayerProps) {
  return (
    <AxisBottom
      scale={xScale}
      top={height}
      stroke="#333"
      tickStroke="#333"
      tickLabelProps={{
        fill: '#666',
        fontSize: 10,
        textAnchor: 'middle',
      }}
    />
  );
}
