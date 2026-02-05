'use client';
import { useMemo } from 'react';
import { ParentSize } from '@visx/responsive';
import { scaleTime, scaleLinear } from '@visx/scale';
import { max } from 'd3-array';
import { binTimeData } from '@/utils/binning';
import { HistogramLayer } from './layers/HistogramLayer';
import { AxisLayer } from './layers/AxisLayer';

// TODO: Replace with real data type
interface DataPoint {
  timestamp: Date | number;
  [key: string]: any;
}

interface TimelineProps {
  data?: DataPoint[];
  width: number;
  height: number;
}

const TimelineContent = ({ width, height, data = [] }: TimelineProps) => {
   if (width < 10) return null;

   const margin = { top: 20, right: 20, bottom: 40, left: 20 };
   const innerWidth = width - margin.left - margin.right;
   const innerHeight = height - margin.top - margin.bottom;

   const { xScale, yScale, bins } = useMemo(() => {
     if (!data.length) return { xScale: null, yScale: null, bins: [] };

     const timestamps = data.map(d => d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp));
     const xMin = new Date(Math.min(...timestamps.map(t => t.getTime())));
     const xMax = new Date(Math.max(...timestamps.map(t => t.getTime())));

     const xScale = scaleTime({
       range: [0, innerWidth],
       domain: [xMin, xMax],
     });

     const bins = binTimeData(data, d => d.timestamp, [xMin.getTime(), xMax.getTime()]);
     const yMax = max(bins, b => b.length) || 0;

     const yScale = scaleLinear({
       range: [0, innerHeight],
       domain: [0, yMax],
     });

     return { xScale, yScale, bins };
   }, [data, innerWidth, innerHeight]);

   if (!xScale || !yScale) {
     return (
       <svg width={width} height={height}>
         <text x={width/2} y={height/2} textAnchor="middle" fill="#666">No Data</text>
       </svg>
     );
   }

   return (
     <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <HistogramLayer 
            bins={bins} 
            xScale={xScale} 
            yScale={yScale} 
            height={innerHeight} 
            color="#3b82f6" 
          />
          <AxisLayer xScale={xScale} height={innerHeight} />
        </g>
     </svg>
   );
};

export function Timeline({ data }: { data?: any[] }) {
  return (
    <div className="w-full h-full min-h-[150px]">
      <ParentSize>
        {({ width, height }) => (
          <TimelineContent width={width} height={height} data={data} />
        )}
      </ParentSize>
    </div>
  );
}
