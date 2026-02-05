import { Bar } from '@visx/shape';
import { Bin } from '@/utils/binning';
import { ScaleLinear, ScaleTime } from 'd3-scale';

interface HistogramLayerProps {
  bins: Bin[];
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  height: number;
  color?: string;
}

export function HistogramLayer({ bins, xScale, yScale, height, color = 'currentColor' }: HistogramLayerProps) {
  if (!bins || bins.length === 0) return null;

  return (
    <g>
      {bins.map((bin, i) => {
        const x = xScale(new Date(bin.x0));
        const barHeight = height - (yScale(bin.length) ?? 0);
        const barWidth = Math.max(0, (xScale(new Date(bin.x1)) - x) - 1);
        const y = height - barHeight;

        return (
          <Bar
            key={`bar-${i}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            opacity={0.6}
            className="transition-opacity hover:opacity-80"
          />
        );
      })}
    </g>
  );
}
