import { create } from 'zustand';
import { MOCK_END_MS, MOCK_END_SEC, MOCK_START_MS, MOCK_START_SEC } from '@/lib/constants';
import { RecordBatchReader, Table } from 'apache-arrow';
import { getCrimeTypeId, getDistrictId } from '@/lib/category-maps';
import { ColumnarData, DataPoint } from '@/lib/data/types';
import { epochSecondsToNormalized, toEpochSeconds } from '@/lib/time-domain';

export interface TimelineDataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  minX: number | null;
  maxX: number | null;
  minZ: number | null;
  maxZ: number | null;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  isLoading: boolean;
  isMock: boolean;
  dataCount: number | null;

  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
  loadRealData: () => Promise<void>;
}

export const useTimelineDataStore = create<TimelineDataState>((set, get) => ({
  data: [],
  columns: null,
  minX: null,
  maxX: null,
  minZ: null,
  maxZ: null,
  minTimestampSec: null,
  maxTimestampSec: null,
  isLoading: false,
  isMock: false,
  dataCount: null,

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
        timestamp: MOCK_START_MS + Math.random() * (MOCK_END_MS - MOCK_START_MS),
        x: (Math.random() - 0.5) * 100,
        y: 0,
        z: (Math.random() - 0.5) * 100,
        type,
        value: Math.random(),
      };
    });

    data.sort((a, b) => a.timestamp - b.timestamp);
    set({
      data,
      columns: null,
      minTimestampSec: MOCK_START_SEC,
      maxTimestampSec: MOCK_END_SEC,
      minX: -50,
      maxX: 50,
      minZ: -50,
      maxZ: 50,
    });
  },

  loadRealData: async () => {
    const { isLoading, columns } = get();
    if (isLoading || columns) return;
    set({ isLoading: true });

    try {
      const metaRes = await fetch('/api/crime/meta');
      if (!metaRes.ok) throw new Error(`Meta HTTP error! status: ${metaRes.status}`);
      const meta = await metaRes.json();

      const minTimeSec = meta.minTime;
      const maxTimeSec = meta.maxTime;

      const isUsingMock = meta.isMock === true;
      if (isUsingMock) {
        console.warn('Using demo data - dataset file not found or unavailable');
      }

      console.log(
        `Metadata: ${new Date(minTimeSec * 1000).toISOString()} to ${new Date(maxTimeSec * 1000).toISOString()}, Count: ${meta.count}, isMock: ${isUsingMock}`
      );

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

      const typeCol = table.getChild('primary_type') || table.getChild('type');
      const districtCol = table.getChild('district');
      const blockCol = table.getChild('block');
      const latCol = table.getChild('lat');
      const lonCol = table.getChild('lon');

      const parquetX = table.getChild('x');
      const parquetZ = table.getChild('z');
      const timestampCol = table.getChild('timestamp') || table.getChild('y');

      const xDataFinal = parquetX ? new Float32Array(parquetX.toArray()) : new Float32Array(count);
      const zDataFinal = parquetZ ? new Float32Array(parquetZ.toArray()) : new Float32Array(count);
      const timestampSecData = timestampCol
        ? Float64Array.from(timestampCol.toArray().map((value: number) => toEpochSeconds(value)))
        : new Float64Array(count);

      const timestampData = Float32Array.from(
        timestampSecData.map((value) => epochSecondsToNormalized(value, minTimeSec, maxTimeSec))
      );

      const latData = latCol ? new Float32Array(latCol.toArray()) : undefined;
      const lonData = lonCol ? new Float32Array(lonCol.toArray()) : undefined;

      const blockDataRaw = blockCol ? blockCol.toArray() : [];
      const blockData: string[] = [];
      for (let i = 0; i < count; i++) {
        blockData.push(String(blockDataRaw[i] || ''));
      }

      const typeData = new Uint8Array(count);
      const rawTypes = typeCol ? typeCol.toArray() : [];
      for (let i = 0; i < count; i++) {
        typeData[i] = getCrimeTypeId(String(rawTypes[i]));
      }

      const districtData = new Uint8Array(count);
      const rawDistricts = districtCol ? districtCol.toArray() : [];
      for (let i = 0; i < count; i++) {
        districtData[i] = getDistrictId(String(rawDistricts[i]));
      }

      const columns: ColumnarData = {
        x: xDataFinal,
        z: zDataFinal,
        lat: latData,
        lon: lonData,
        timestampSec: timestampSecData,
        timestamp: timestampData,
        type: typeData,
        district: districtData,
        block: blockData,
        length: count,
      };

      set({
        columns,
        minTimestampSec: minTimeSec,
        maxTimestampSec: maxTimeSec,
        minX: meta.minLon,
        maxX: meta.maxLon,
        minZ: meta.minLat,
        maxZ: meta.maxLat,
        isLoading: false,
        isMock: meta.isMock || false,
        dataCount: meta.count || count,
      });
    } catch (err) {
      console.error('Error loading real data:', err);
      console.warn('Using demo data - database unavailable');
      set({ isLoading: false, isMock: true });
    }
  },
}));
