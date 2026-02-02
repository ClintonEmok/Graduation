import { create } from 'zustand';
import { TIME_MIN, TIME_MAX } from '@/lib/constants';
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
  timestamp: Float32Array;
  type: Uint8Array;
  district: Uint8Array;
  length: number;
}

interface DataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  isLoading: boolean;
  
  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
  loadRealData: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  columns: null,
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
    set({ data, columns: null }); // Clear columns when using mock data
  },

  loadRealData: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/crime/stream');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
      // Expecting columns: x, y, timestamp, primary_type from DB
      // We map API x->x, API y->z.
      
      const xCol = table.getChild('x');
      const yCol = table.getChild('y'); // This maps to Z in our 3D space
      const timeCol = table.getChild('timestamp');
      const typeCol = table.getChild('primary_type');

      if (!xCol || !yCol || !timeCol) {
         console.warn("Missing columns in stream data", table.schema.fields.map((f: any) => f.name));
         // Fallback or error?
      }

      // Convert to TypedArrays
      // Arrow vectors can be zero-copy if we use them right, but Table combines chunks.
      // toFloat32Array() might copy.
      // We use Float32 for rendering coordinates.
      
      // Handle potential nulls or different types
      // x and y are likely Float64 in Parquet, we convert to Float32 for WebGL
      const xData = xCol ? new Float32Array(xCol.toArray()) : new Float32Array(count);
      const zData = yCol ? new Float32Array(yCol.toArray()) : new Float32Array(count);
      
      // Timestamp: Arrow Timestamp is BigInt usually. 
      // We need number (epoch ms) or similar for our logic.
      // We'll convert to Float32 for now as our adaptive logic uses numbers.
      // WARNING: Float32 has low precision for timestamps (epoch ms).
      // We should offset them relative to a start time or use Float64.
      // Store interface says Float32Array for timestamp...
      // Let's use Float64Array for timestamp to preserve precision during calcs, 
      // but if we pass to shader we might need to offset.
      // For now, let's update the interface to Float64Array for timestamp?
      // No, let's keep it Float32 but normalized (0-100 or something)?
      // No, `loadRealData` should normalize?
      // Our `generateMockData` uses `TIME_MIN` (0) to `TIME_MAX` (100).
      // Real data timestamps are dates.
      // We should normalize them to our 0-100 range OR update the application to work with real dates.
      // Phase 2 decisions said "Time Range 0-100".
      // If we use real data, we should probably normalize it to 0-100 or update the store/constants.
      // Mapping real dates to 0-100 is safer for float precision in shaders.
      
      const rawTimestamps = timeCol ? Array.from(timeCol).map(t => Number(t)) : new Array(count).fill(0);
      const minTime = Math.min(...rawTimestamps);
      const maxTime = Math.max(...rawTimestamps);
      const timeSpan = maxTime - minTime || 1;
      
      const timestampData = new Float32Array(count);
      for(let i=0; i<count; i++) {
          // Normalize to 0-100 range
          timestampData[i] = ((rawTimestamps[i] - minTime) / timeSpan) * 100;
      }

      // Type mapping
      const typeData = new Uint8Array(count);
      const rawTypes = typeCol ? typeCol.toArray() : [];
      for(let i=0; i<count; i++) {
          typeData[i] = getCrimeTypeId(String(rawTypes[i]));
      }

      // District mapping
      const districtCol = table.getChild('district');
      const districtData = new Uint8Array(count);
      const rawDistricts = districtCol ? districtCol.toArray() : [];
      for(let i=0; i<count; i++) {
          districtData[i] = getDistrictId(String(rawDistricts[i]));
      }

      const columns: ColumnarData = {
          x: xData,
          z: zData,
          timestamp: timestampData,
          type: typeData,
          district: districtData,
          length: count
      };

      set({ columns, isLoading: false });

    } catch (err) {
      console.error('Error loading real data:', err);
      set({ isLoading: false });
    }
  }
}));
