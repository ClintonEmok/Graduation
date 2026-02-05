import { Brush } from '@visx/brush';
import { ScaleLinear, ScaleTime } from 'd3-scale';

interface TimelineBrushProps {
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  onChange: (domain: [Date, Date] | null) => void;
  selectedDomain?: [Date, Date];
}

export function TimelineBrush({ 
  xScale, 
  yScale, 
  width, 
  height, 
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
  onChange,
  selectedDomain
}: TimelineBrushProps) {
  
  return (
    <Brush
      xScale={xScale}
      yScale={yScale}
      width={width}
      height={height}
      margin={margin}
      handleSize={8}
      resizeTriggerAreas={['left', 'right']}
      brushRegion="xAxis"
      selectedBoxStyle={{
        fill: 'rgba(255, 255, 255, 0.1)',
        stroke: 'white',
      }}
      onChange={(brush) => {
          if (brush && typeof brush.x0 === 'number' && typeof brush.x1 === 'number') {
               const start = xScale.invert(brush.x0);
               const end = xScale.invert(brush.x1);
               onChange([start, end]);
          }
      }}
    />
  );
}
