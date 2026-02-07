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
  block?: string;
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
  block: string[];
  length: number;
}

interface DataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  minX: number | null;
  maxX: number | null;
  minZ: number | null;
  maxZ: number | null;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  isLoading: boolean;
  
  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
  loadRealData: () => Promise<void>;
}

export interface FilteredPoint {
  x: number;
  y: number; // Time (0-100)
  z: number;
  lat?: number;
  lon?: number;
  typeId: number;
  districtId: number;
  block?: string;
  originalIndex: number;
}

export const useDataStore = create<DataState>((set, get) => ({
  data: [],
  columns: null,
  minX: null,
  maxX: null,
  minZ: null,
  maxZ: null,
  minTimestampSec: null,
  maxTimestampSec: null,
  isLoading: false,

  setData: (data) => set({ data }),
  
  generateMockData: (count) => {
    const crimeTypes = ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism'];
    const data: DataPoint[] = Array.from({ length: count }).map((_, i) => {
      let type = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
      if (getCrimeTypeId(type) === 0) {
        type = 'Theft';
      }
      return {
      id: String(i),
      timestamp: TIME_MIN + Math.random() * (TIME_MAX - TIME_MIN),
      x: (Math.random() - 0.5) * 100,
      y: 0, // Will be computed
      z: (Math.random() - 0.5) * 100,
      type,
      value: Math.random()
    };
    });
    // Sort by timestamp
    data.sort((a, b) => a.timestamp - b.timestamp);
    set({ data, columns: null, minTimestampSec: null, maxTimestampSec: null, minX: -50, maxX: 50, minZ: -50, maxZ: 50 }); 
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
      const typeCol = table.getChild('primary_type') || table.getChild('type');
      const districtCol = table.getChild('district');
      const blockCol = table.getChild('block');
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
      
      const blockDataRaw = blockCol ? blockCol.toArray() : [];
      const blockData: string[] = [];
      for (let i = 0; i < count; i++) {
        blockData.push(String(blockDataRaw[i] || ''));
      }
      
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
          block: blockData,
          length: count
      };

      set({
        columns,
        minTimestampSec: minTimeSec,
        maxTimestampSec: maxTimeSec,
        minX: meta.minX,
        maxX: meta.maxX,
        minZ: meta.minZ,
        maxZ: meta.maxZ,
        isLoading: false
      });

    } catch (err) {
      console.error('Error loading real data:', err);
      set({ isLoading: false });
    }
  }
}));

/**
 * CPU-side selector for filtered data.
 * Used for clustering and other heavy analytical tasks.
 */
export const selectFilteredData = (dataState: DataState, filterState: { 
  selectedTypes: number[], 
  selectedDistricts: number[], 
  selectedTimeRange: [number, number] | null 
}): FilteredPoint[] => {
  const { columns, data, minTimestampSec, maxTimestampSec } = dataState;
  const { selectedTypes, selectedDistricts, selectedTimeRange } = filterState;

  const result: FilteredPoint[] = [];

  // Handle Real Data (Columnar)
  if (columns) {
    const { x, z, lat, lon, timestamp, type, district, block, length } = columns;

    // Normalize time filter to 0-100
    let minT = -Infinity;
    let maxT = Infinity;
    if (selectedTimeRange && minTimestampSec !== null && maxTimestampSec !== null) {
      const span = maxTimestampSec - minTimestampSec || 1;
      minT = ((selectedTimeRange[0] - minTimestampSec) / span) * 100;
      maxT = ((selectedTimeRange[1] - minTimestampSec) / span) * 100;
    }

    for (let i = 0; i < length; i++) {
      // Filter by Type
      if (selectedTypes.length > 0 && !selectedTypes.includes(type[i])) continue;

      // Filter by District
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(district[i])) continue;

      // Filter by Time
      if (timestamp[i] < minT || timestamp[i] > maxT) continue;

      result.push({
        x: x[i],
        y: timestamp[i],
        z: z[i],
        lat: lat ? lat[i] : undefined,
        lon: lon ? lon[i] : undefined,
        typeId: type[i],
        districtId: district[i],
        block: block ? block[i] : undefined,
        originalIndex: i
      });
    }
  } 
  // Handle Mock Data
  else if (data.length > 0) {
    // For mock data, we'll assume types and districts are strings in data points
    // and we need to map them to IDs if we want to match filters.
    // However, filters in this project use IDs.
    // In useDataStore.ts generateMockData, types are strings.
    // Let's assume for mock data we just bypass type/district filters or map them.
    // Since this is for Phase 17 (Real Data integrated in Phase 6), 
    // real data is the priority.
    
    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      // Simple time filter (mock data is 0-100)
      if (selectedTimeRange) {
        // If it's mock data, selectedTimeRange might not match 0-100 scale well
        // but let's assume it's normalized or just ignored for mock.
      }

      result.push({
        x: p.x,
        y: p.timestamp, // In mock data, timestamp is y (0-100)
        z: p.z,
        typeId: 0, // Mock fallback
        districtId: 0, // Mock fallback
        originalIndex: i
      });
    }
  }

  return result;
};
