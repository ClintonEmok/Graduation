import { create } from 'zustand';
import { MOCK_END_MS, MOCK_END_SEC, MOCK_START_MS, MOCK_START_SEC } from '@/lib/constants';
import { RecordBatchReader, Table } from 'apache-arrow';
import { getCrimeTypeId, getDistrictId } from '@/lib/category-maps';
import { ColumnarData, DataPoint } from '@/lib/data/types';
import { epochSecondsToNormalized, toEpochSeconds } from '@/lib/time-domain';
import { TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS } from '@/lib/timeline-series';

export interface LoadRealDataOptions {
  maxRows?: number;
}

export interface LoadSummaryDataOptions {
  maxPoints?: number;
}

function getBounds(values: ArrayLike<number>): { min: number; max: number } | null {
  if (values.length === 0) {
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return { min, max };
}

export interface TimelineDataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  overviewTimestampSec: number[];
  crimeTypes: string[];
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
  loadSummaryData: (options?: LoadSummaryDataOptions) => Promise<void>;
  loadRealData: (options?: LoadRealDataOptions) => Promise<void>;
}

export const useTimelineDataStore = create<TimelineDataState>((set, get) => ({
  data: [],
  columns: null,
  overviewTimestampSec: [],
  crimeTypes: [],
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
      overviewTimestampSec: data.map((point) => point.timestamp / 1000),
      crimeTypes,
      minTimestampSec: MOCK_START_SEC,
      maxTimestampSec: MOCK_END_SEC,
      minX: -50,
      maxX: 50,
      minZ: -50,
      maxZ: 50,
      dataCount: count,
    });
  },

  loadSummaryData: async (options?: LoadSummaryDataOptions) => {
    const { isLoading, overviewTimestampSec, columns } = get();
    if (isLoading || (columns && overviewTimestampSec.length > 0)) return;
    set({ isLoading: true });

    try {
      const maxPoints = Math.max(1, Math.floor(options?.maxPoints ?? TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS));
      const [metaRes, overviewRes] = await Promise.all([
        fetch('/api/crime/meta'),
        fetch(`/api/crime/overview?maxPoints=${maxPoints}`),
      ]);

      if (!metaRes.ok) throw new Error(`Meta HTTP error! status: ${metaRes.status}`);
      if (!overviewRes.ok) throw new Error(`Overview HTTP error! status: ${overviewRes.status}`);

      const meta = await metaRes.json();
      const overview = await overviewRes.json();

      const minTimeSec = meta?.minTime ?? null;
      const maxTimeSec = meta?.maxTime ?? null;

      if (meta?.isMock === true) {
        console.warn('Using demo data - dataset file not found or unavailable');
      }

      if (minTimeSec !== null && maxTimeSec !== null) {
        console.log(
          `Metadata: ${new Date(minTimeSec * 1000).toISOString()} to ${new Date(maxTimeSec * 1000).toISOString()}, Count: ${meta?.count}, isMock: ${meta?.isMock === true}`
        );
      }

      set({
        data: [],
        columns: null,
        overviewTimestampSec: Array.isArray(overview?.timestampsSec) ? overview.timestampsSec.map((value: number) => Number(value)).filter(Number.isFinite) : [],
        crimeTypes: Array.isArray(meta?.crimeTypes) ? meta.crimeTypes.filter((value: string) => typeof value === 'string') : [],
        minTimestampSec: minTimeSec,
        maxTimestampSec: maxTimeSec,
        minX: meta?.minLon ?? null,
        maxX: meta?.maxLon ?? null,
        minZ: meta?.minLat ?? null,
        maxZ: meta?.maxLat ?? null,
        isLoading: false,
        isMock: meta?.isMock || false,
        dataCount: meta?.count ?? null,
      });
    } catch (err) {
      console.error('Error loading summary data:', err);
      console.warn('Using demo data - database unavailable');
      get().generateMockData(1000);
      set({ isLoading: false, isMock: true });
    }
  },

  loadRealData: async (options?: LoadRealDataOptions) => {
    const { isLoading, columns } = get();
    if (isLoading || columns) return;
    set({ isLoading: true });

    try {
      const maxRows = options?.maxRows ?? null;
      const meta = maxRows === null
        ? await (async () => {
            const metaRes = await fetch('/api/crime/meta');
            if (!metaRes.ok) throw new Error(`Meta HTTP error! status: ${metaRes.status}`);
            return metaRes.json();
          })()
        : null;

      const minTimeSec = meta?.minTime ?? null;
      const maxTimeSec = meta?.maxTime ?? null;

      if (meta?.isMock === true) {
        console.warn('Using demo data - dataset file not found or unavailable');
      }

      if (minTimeSec !== null && maxTimeSec !== null) {
        console.log(
          `Metadata: ${new Date(minTimeSec * 1000).toISOString()} to ${new Date(maxTimeSec * 1000).toISOString()}, Count: ${meta?.count}, isMock: ${meta?.isMock === true}`
        );
      }

      const streamUrl = new URL('/api/crime/stream', 'http://localhost');
      if (maxRows !== null) {
        streamUrl.searchParams.set('maxRows', String(maxRows));
      }

      const response = await fetch(streamUrl.pathname + streamUrl.search);
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

      const loadedTimestampBounds = minTimeSec === null || maxTimeSec === null ? getBounds(timestampSecData) : null;
      const effectiveMinTimeSec = minTimeSec ?? loadedTimestampBounds?.min ?? 0;
      const effectiveMaxTimeSec = maxTimeSec ?? loadedTimestampBounds?.max ?? effectiveMinTimeSec;

      const timestampData = Float32Array.from(
        timestampSecData.map((value) => epochSecondsToNormalized(value, effectiveMinTimeSec, effectiveMaxTimeSec))
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
        overviewTimestampSec: [],
        crimeTypes: meta?.crimeTypes || [],
        minTimestampSec: effectiveMinTimeSec,
        maxTimestampSec: effectiveMaxTimeSec,
        minX: meta?.minLon ?? getBounds(xDataFinal)?.min ?? null,
        maxX: meta?.maxLon ?? getBounds(xDataFinal)?.max ?? null,
        minZ: meta?.minLat ?? getBounds(zDataFinal)?.min ?? null,
        maxZ: meta?.maxLat ?? getBounds(zDataFinal)?.max ?? null,
        isLoading: false,
        isMock: meta?.isMock || false,
        dataCount: meta?.count || count,
      });
    } catch (err) {
      console.error('Error loading real data:', err);
      console.warn('Using demo data - database unavailable');
      set({ isLoading: false, isMock: true });
    }
  },
}));
