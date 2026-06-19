import { create } from 'zustand';
import { MOCK_END_MS, MOCK_END_SEC, MOCK_START_MS, MOCK_START_SEC } from '@/lib/constants';
import { RecordBatchReader, Table } from 'apache-arrow';
import { getCrimeTypeId, getDistrictId } from '@/lib/category-maps';
import { ColumnarData, DataPoint } from '@/lib/data/types';
import { epochSecondsToNormalized, toEpochSeconds } from '@/lib/time-domain';
import { TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS } from '@/lib/timeline-series';
import type { OverviewFilter } from '@/lib/queries/types';

export interface LoadRealDataOptions {
  maxRows?: number;
}

export interface LoadSummaryDataOptions {
  /**
   * Legacy `maxPoints` cap. Phase 81 dropped sampled-timestamp responses in
   * favor of server-binned counts at a fixed medium resolution, so this field
   * is kept on the wire for backward compatibility but is otherwise a no-op.
   */
  maxPoints?: number;
  /**
   * Optional filter inputs forwarded to the overview endpoint. The endpoint
   * contract is filter-aware for crime-type and district (D-02); viewport
   * movement must NOT change these inputs.
   */
  filters?: Partial<OverviewFilter>;
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

export interface OverviewBinState {
  binIndex: number;
  startEpoch: number;
  endEpoch: number;
  count: number;
}

export type TimelineDataMode = 'summary' | 'detail' | 'mock';

export interface TimelineDataState {
  data: DataPoint[];
  columns: ColumnarData | null;
  overviewBins: OverviewBinState[];
  overviewBinsDomain: { startEpoch: number; endEpoch: number; binCount: number; binSizeSec: number } | null;
  overviewBinsFilter: OverviewFilter;
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
  /**
   * Phase 81: explicit summary-vs-detail mode.
   *
   * - `summary`: only the persisted overview bins + metadata are loaded.
   *   `columns` is null and the dashboard is in preview mode.
   * - `detail`: `columns` is loaded; dashboard surfaces that need full Arrow
   *   detail can render against the in-memory working-window cache.
   * - `mock`: dataset unavailable; the store is using the mock fallback.
   */
  mode: TimelineDataMode;
  /**
   * Last filter inputs passed to `loadSummaryData`. Tracked so callers can
   * reason about what triggered the most recent request (and so test
   * fixtures can assert filter-aware behavior).
   */
  lastSummaryFilters: OverviewFilter;

  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
  loadSummaryData: (options?: LoadSummaryDataOptions) => Promise<void>;
  loadRealData: (options?: LoadRealDataOptions) => Promise<void>;
  /**
   * Phase 81: explicit detail-on-intent entry point. Callers (e.g. brush or
   * zoom handlers in `CubeVisualization` or `MainScene`) invoke this when
   * the user has narrowed a window. Mount-time callers should NOT use this.
   */
  loadDetailOnIntent: (options?: LoadRealDataOptions) => Promise<void>;
}

const EMPTY_FILTERS: OverviewFilter = { crimeTypes: [], districts: [] };

const sanitizeFilters = (filters?: Partial<OverviewFilter>): OverviewFilter => ({
  crimeTypes: Array.isArray(filters?.crimeTypes) ? filters!.crimeTypes.filter((value) => typeof value === 'string') : [],
  districts: Array.isArray(filters?.districts) ? filters!.districts.filter((value) => typeof value === 'string') : [],
});

const areFiltersEqual = (a: OverviewFilter, b: OverviewFilter): boolean => {
  if (a.crimeTypes.length !== b.crimeTypes.length) return false;
  if (a.districts.length !== b.districts.length) return false;
  for (let i = 0; i < a.crimeTypes.length; i += 1) {
    if (a.crimeTypes[i] !== b.crimeTypes[i]) return false;
  }
  for (let i = 0; i < a.districts.length; i += 1) {
    if (a.districts[i] !== b.districts[i]) return false;
  }
  return true;
};

export const useTimelineDataStore = create<TimelineDataState>((set, get) => ({
  data: [],
  columns: null,
  overviewBins: [],
  overviewBinsDomain: null,
  overviewBinsFilter: EMPTY_FILTERS,
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
  mode: 'summary',
  lastSummaryFilters: EMPTY_FILTERS,

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
      overviewBins: [],
      overviewBinsDomain: null,
      overviewBinsFilter: EMPTY_FILTERS,
      crimeTypes,
      minTimestampSec: MOCK_START_SEC,
      maxTimestampSec: MOCK_END_SEC,
      minX: -50,
      maxX: 50,
      minZ: -50,
      maxZ: 50,
      dataCount: count,
      mode: 'mock',
    });
  },

  loadSummaryData: async (options?: LoadSummaryDataOptions) => {
    const { isLoading, mode, lastSummaryFilters } = get();
    if (isLoading) return;
    const filters = sanitizeFilters(options?.filters);
    // Reuse the previously-loaded summary when the request would be identical
    // (e.g. a no-op filter change). A genuinely new request always goes
    // through; this matches the existing "guard against in-flight load only"
    // behavior we had pre-Phase 81 plus a filter-equality short-circuit.
    if (mode === 'summary' && areFiltersEqual(filters, lastSummaryFilters) && get().overviewBins.length > 0) {
      return;
    }
    set({ isLoading: true });

    try {
      // Phase 81: legacy `maxPoints` is now a no-op for the server contract
      // (the server returns pre-binned counts at a fixed medium resolution)
      // but the query param is kept on the wire for backward compatibility.
      const maxPoints = Math.max(1, Math.floor(options?.maxPoints ?? TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS));
      const overviewParams = new URLSearchParams({ maxPoints: String(maxPoints) });
      if (filters.crimeTypes.length > 0) {
        overviewParams.set('crimeTypes', filters.crimeTypes.join(','));
      }
      if (filters.districts.length > 0) {
        overviewParams.set('districts', filters.districts.join(','));
      }
      const overviewQuery = overviewParams.toString();

      const [metaRes, overviewRes] = await Promise.all([
        fetch('/api/crime/meta'),
        fetch(`/api/crime/overview?${overviewQuery}`),
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

      // Phase 81: overview is now server-binned counts. We materialize the
      // bins as a new `overviewBins` field; there is no client-side rebucketing
      // of large raw timestamp arrays on the summary path. Direct consumers
      // (e.g. `DemoDualTimeline`) read the bins shape directly.
      const rawBins = Array.isArray(overview?.bins) ? overview.bins : [];
      const normalizedBins: OverviewBinState[] = [];
      for (const raw of rawBins) {
        if (!raw) continue;
        const startEpoch = Number(raw.startEpoch);
        const endEpoch = Number(raw.endEpoch);
        const count = Number(raw.count);
        const binIndex = Number(raw.binIndex);
        if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch) || !Number.isFinite(count)) {
          continue;
        }
        normalizedBins.push({
          binIndex: Number.isFinite(binIndex) ? binIndex : normalizedBins.length,
          startEpoch,
          endEpoch,
          count,
        });
      }

      const domainMeta = overview?.domain;
      const domain =
        domainMeta && Number.isFinite(Number(domainMeta.startEpoch)) && Number.isFinite(Number(domainMeta.endEpoch))
          ? {
              startEpoch: Number(domainMeta.startEpoch),
              endEpoch: Number(domainMeta.endEpoch),
              binCount: Number.isFinite(Number(domainMeta.binCount)) ? Number(domainMeta.binCount) : normalizedBins.length,
              binSizeSec: Number.isFinite(Number(domainMeta.binSizeSec)) ? Number(domainMeta.binSizeSec) : 0,
            }
          : null;

      const responseFilter = overview?.filter;
      const normalizedFilter: OverviewFilter = {
        crimeTypes: Array.isArray(responseFilter?.crimeTypes) ? responseFilter.crimeTypes.filter((v: unknown) => typeof v === 'string') : [],
        districts: Array.isArray(responseFilter?.districts) ? responseFilter.districts.filter((v: unknown) => typeof v === 'string') : [],
      };

      set({
        data: [],
        columns: null,
        overviewBins: normalizedBins,
        overviewBinsDomain: domain,
        overviewBinsFilter: normalizedFilter,
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
        mode: meta?.isMock ? 'mock' : 'summary',
        lastSummaryFilters: filters,
      });
    } catch (err) {
      console.error('Error loading summary data:', err);
      console.warn('Using demo data - database unavailable');
      get().generateMockData(1000);
      set({ isLoading: false, isMock: true, mode: 'mock', lastSummaryFilters: filters });
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
        overviewBins: [],
        overviewBinsDomain: null,
        overviewBinsFilter: EMPTY_FILTERS,
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
        mode: meta?.isMock ? 'mock' : 'detail',
      });
    } catch (err) {
      console.error('Error loading real data:', err);
      console.warn('Using demo data - database unavailable');
      set({ isLoading: false, isMock: true, mode: 'mock' });
    }
  },

  /**
   * Phase 81: explicit detail-on-intent entry point. Identical to
   * `loadRealData()` today, but separates the "fetch on first user
   * narrowing" semantics from the "fetch on mount" semantics. Callers
   * that need detail (CubeVisualization's intent button, MainScene's
   * brush handlers) should call this so a future Wave 3 migration can
   * route this call to the paged `/api/crimes/range` endpoint with the
   * narrowed window instead of `/api/crime/stream` (full Arrow).
   */
  loadDetailOnIntent: async (options?: LoadRealDataOptions) => {
    await get().loadRealData(options);
  },
}));
