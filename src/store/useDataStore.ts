import { create } from 'zustand';
import { TIME_MIN, TIME_MAX } from '@/lib/constants';
import { toEpochSeconds } from '@/lib/time-domain';
import { RecordBatchReader, Table } from 'apache-arrow';
import { getCrimeTypeId, getDistrictId } from '@/lib/category-maps';

export interface DataPoint {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  type: string;
  [key: string]: any;
}

export interface ColumnarData {
  x: Float32Array;
  z: Float32Array;
  lat?: Float32Array;
  lon?: Float32Array;
  timestamp: Float32Array;
  type: Uint8Array;
  district: Uint8Array;
  length: number;
}

interface DataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  isLoading: boolean;
  
  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
  loadRealData: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  data: [],
  columns: null,
  minTimestampSec: null,
  maxTimestampSec: null,
  isLoading: false,

  setData: (data) => set({ data }),
  
  generateMockData: (count) => {
    const crimeTypes = ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism'];
    const data: DataPoint[] = Array.from({ length: count }).map((_, i) => ({
      id: String(i),
      timestamp: TIME_MIN + Math.random() * (TIME_MAX - TIME_MIN),
      x: (Math.random() - 0.5) * 100,
      y: 0, // Will be computed
      z: (Math.random() - 0.5) * 100,
      type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      value: Math.random()
    }));
    // Sort by timestamp
    data.sort((a, b) => a.timestamp - b.timestamp);
    set({ data, columns: null, minTimestampSec: null, maxTimestampSec: null }); // Clear columns when using mock data
  },

  loadRealData: async () => {
    const { isLoading, columns } = get();
    if (isLoading || columns) return;
    set({ isLoading: true });
    try {
      // 1. Fetch Metadata (min/max time)
      const metaRes = await fetch('/api/crime/meta');
      if (!metaRes.ok) throw new Error(`Meta HTTP error! status: ${metaRes.status}`);
      const meta = await metaRes.json();
      
      const minTimeSec = meta.minTime;
      const maxTimeSec = meta.maxTime;
      const timeSpanSec = maxTimeSec - minTimeSec || 1;

      console.log(`Metadata: ${new Date(minTimeSec*1000).toISOString()} to ${new Date(maxTimeSec*1000).toISOString()}, Count: ${meta.count}`);

      // 2. Fetch Data Stream
      const response = await fetch('/api/crime/stream');
      if (!response.ok) throw new Error(`Stream HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('Response body is null');

      const reader = await RecordBatchReader.from(response);
      const batches = [];
      for await (const batch of reader) {
          batches.push(batch);
      }
      const table = new Table(batches);
      const count = table.numRows;
      
      console.log(`Loaded ${count} rows`);

      // Extract columns
      const xCol = table.getChild('x');
      const yCol = table.getChild('y'); // This is Z (depth/latitude projection) in our 3D space
      const timeCol = table.getChild('timestamp'); // Raw timestamp
      const typeCol = table.getChild('primary_type');
      const districtCol = table.getChild('district');
      const latCol = table.getChild('lat');
      const lonCol = table.getChild('lon');

      if (!xCol || !yCol || !timeCol) {
         console.warn("Missing columns in stream data", table.schema.fields.map((f: any) => f.name));
      }

      // Convert to TypedArrays
      const xData = xCol ? new Float32Array(xCol.toArray()) : new Float32Array(count);
      const zData = yCol ? new Float32Array(yCol.toArray()) : new Float32Array(count);
      const latData = latCol ? new Float32Array(latCol.toArray()) : undefined;
      const lonData = lonCol ? new Float32Array(lonCol.toArray()) : undefined;
      
      // Use raw timestamp column to calculate normalized Y (Time)
      // This is redundant if parquet has 'y' as time, but our script maps:
      // x -> x
      // z -> z (lat projection)
      // y -> y (time projection)
      // Wait, let's check setup-data.js mapping again to be sure.
      // setup-data.js:
      // (lon + 180) / 360 AS x
      // (1.0 - ...) / 2.0 AS z
      // ((epoch(timestamp) ...)) AS y
      
      // So Parquet 'y' IS the normalized time (0-100).
      // Parquet 'z' IS the latitude projection.
      // Parquet 'x' IS the longitude projection.
      
      // But in store lines 113-114:
      // const xData = xCol ...
      // const zData = yCol ... (maps 'y' col to 'zData')
      
      // If Parquet col 'y' is Time, assigning it to 'zData' is wrong if 'zData' means depth.
      // However, check Variable Naming in Store:
      // interface ColumnarData { x, z, timestamp ... }
      
      // If setup-data.js named them x, z, y...
      // Then table.getChild('z') should be the depth.
      // And table.getChild('y') should be the time.
      
      // Let's fix the column retrieval based on setup-data.js
      const parquetX = table.getChild('x');
      const parquetZ = table.getChild('z'); // Depth
      const parquetY = table.getChild('y'); // Time (0-100)

      const xDataFinal = parquetX ? new Float32Array(parquetX.toArray()) : new Float32Array(count);
      // Map Parquet Z (depth) to Store Z
      const zDataFinal = parquetZ ? new Float32Array(parquetZ.toArray()) : new Float32Array(count);
      
      // Map Parquet Y (Time 0-100) to Store timestamp?
      // Store timestamp expects normalized 0-100 for visualization?
      // Interface says: timestamp: Float32Array
      // And usage in DualTimeline suggests it converts back to epoch seconds.
      
      // If we use the pre-calculated 'y' (0-100), we save calculation.
      const timestampData = parquetY ? new Float32Array(parquetY.toArray()) : new Float32Array(count);

      // Type mapping
      const typeData = new Uint8Array(count);
      const rawTypes = typeCol ? typeCol.toArray() : [];
      for(let i=0; i<count; i++) {
          typeData[i] = getCrimeTypeId(String(rawTypes[i]));
      }

      // District mapping
      const districtData = new Uint8Array(count);
      const rawDistricts = districtCol ? districtCol.toArray() : [];
      for(let i=0; i<count; i++) {
          districtData[i] = getDistrictId(String(rawDistricts[i]));
      }

      const columns: ColumnarData = {
          x: xDataFinal,
          z: zDataFinal,
          lat: latData,
          lon: lonData,
          timestamp: timestampData,
          type: typeData,
          district: districtData,
          length: count
      };

      set({
        columns,
        minTimestampSec: minTimeSec,
        maxTimestampSec: maxTimeSec,
        isLoading: false
      });

    } catch (err) {
      console.error('Error loading real data:', err);
      set({ isLoading: false });
    }
  }
}));
