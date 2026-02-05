'use client';
import { useMemo, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { scaleTime, scaleLinear } from '@visx/scale';
import { max } from 'd3-array';
import { BarChart2, CircleDot } from 'lucide-react';
import { binTimeData } from '@/utils/binning';
import { HistogramLayer } from './layers/HistogramLayer';
import { AxisLayer } from './layers/AxisLayer';
import { MarkerLayer } from './layers/MarkerLayer';
import { TimelineBrush } from './TimelineBrush';

interface DataPoint {
  timestamp: Date | number;
  [key: string]: any;
}

interface TimelineProps {
  data?: DataPoint[];
  onChange?: (domain: [Date, Date]) => void;
  selectedDomain?: [Date, Date];
}

const TimelineContent = ({ width, height, data = [], onChange, selectedDomain }: TimelineProps & { width: number; height: number }) => {
   const [viewMode, setViewMode] = useState<'histogram' | 'markers'>('histogram');

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
     <div className="relative w-full h-full">
        {/* View Toggle */}
        <button
          onClick={() => setViewMode(m => m === 'histogram' ? 'markers' : 'histogram')}
          className="absolute top-0 right-0 p-1 bg-background/80 backdrop-blur rounded border shadow-sm z-10 hover:bg-accent"
          title={`Switch to ${viewMode === 'histogram' ? 'Markers' : 'Histogram'}`}
        >
          {viewMode === 'histogram' ? <CircleDot className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
        </button>

        <svg width={width} height={height}>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {viewMode === 'histogram' && (
                  <HistogramLayer 
                    bins={bins} 
                    xScale={xScale} 
                    yScale={yScale} 
                    height={innerHeight} 
                    color="#3b82f6" 
                  />
              )}
              {viewMode === 'markers' && (
                  <MarkerLayer
                    data={data}
                    xScale={xScale}
                    yScale={yScale}
                    height={innerHeight}
                  />
              )}
              
              <AxisLayer xScale={xScale} height={innerHeight} />
              
              <TimelineBrush 
                xScale={xScale}
                yScale={yScale}
                width={innerWidth}
                height={innerHeight}
                onChange={(domain) => {
                    if (domain && onChange) {
                        onChange(domain);
                    }
                }}
                selectedDomain={selectedDomain}
              />
            </g>
        </svg>
     </div>
   );
};

export function Timeline(props: TimelineProps) {
  return (
    <div className="w-full h-full min-h-[150px]">
      <ParentSize>
        {({ width, height }) => (
          <TimelineContent width={width} height={height} {...props} />
        )}
      </ParentSize>
    </div>
  );
}
