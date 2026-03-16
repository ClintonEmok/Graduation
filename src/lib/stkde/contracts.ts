import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';

export type StkdeScoreVersion = 'stkde-v1';

export interface StkdeDomain {
  startEpochSec: number;
  endEpochSec: number;
}

export interface StkdeRequest {
  domain: StkdeDomain;
  filters: {
    crimeTypes?: string[];
    bbox?: [number, number, number, number];
  };
  params: {
    spatialBandwidthMeters: number;
    temporalBandwidthHours: number;
    gridCellMeters: number;
    topK: number;
    minSupport: number;
    timeWindowHours: number;
  };
  limits: {
    maxEvents: number;
    maxGridCells: number;
  };
}

export interface StkdeHeatmapCell {
  lng: number;
  lat: number;
  intensity: number;
  support: number;
}

export interface StkdeHotspot {
  id: string;
  centroidLng: number;
  centroidLat: number;
  intensityScore: number;
  supportCount: number;
  peakStartEpochSec: number;
  peakEndEpochSec: number;
  radiusMeters: number;
}

export interface StkdeResponse {
  meta: {
    eventCount: number;
    computeMs: number;
    truncated: boolean;
    fallbackApplied?: string | null;
  };
  heatmap: {
    cells: StkdeHeatmapCell[];
    maxIntensity: number;
  };
  hotspots: StkdeHotspot[];
  contracts: {
    scoreVersion: StkdeScoreVersion;
  };
}

export interface StkdeRequestValidationResult {
  ok: boolean;
  request?: StkdeRequest;
  error?: string;
  clampsApplied?: string[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DEFAULT_REQUEST: StkdeRequest = {
  domain: { startEpochSec: 978307200, endEpochSec: 1767571200 },
  filters: {},
  params: {
    spatialBandwidthMeters: 750,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 12,
    minSupport: 5,
    timeWindowHours: 24,
  },
  limits: {
    maxEvents: 50000,
    maxGridCells: 12000,
  },
};

const COERCION_RANGES = {
  spatialBandwidthMeters: [100, 5000] as const,
  temporalBandwidthHours: [1, 168] as const,
  gridCellMeters: [100, 5000] as const,
  topK: [1, 100] as const,
  minSupport: [1, 1000] as const,
  timeWindowHours: [1, 168] as const,
  maxEvents: [1000, 50000] as const,
  maxGridCells: [1000, 12000] as const,
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toFiniteEpoch(value: unknown): number | null {
  const candidate = coerceFiniteNumber(value);
  if (candidate === null) return null;
  return Math.floor(candidate);
}

export function validateAndNormalizeStkdeRequest(payload: unknown): StkdeRequestValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Request body must be an object' };
  }

  const source = payload as Record<string, unknown>;
  const domainRaw = (source.domain ?? {}) as Record<string, unknown>;
  const startEpochSec = toFiniteEpoch(domainRaw.startEpochSec);
  const endEpochSec = toFiniteEpoch(domainRaw.endEpochSec);

  if (startEpochSec === null || endEpochSec === null) {
    return { ok: false, error: 'domain.startEpochSec and domain.endEpochSec must be finite integers' };
  }
  if (startEpochSec >= endEpochSec) {
    return { ok: false, error: 'domain.startEpochSec must be less than domain.endEpochSec' };
  }

  const filtersRaw = (source.filters ?? {}) as Record<string, unknown>;
  let bbox: [number, number, number, number] | undefined;
  if (filtersRaw.bbox !== undefined) {
    if (!Array.isArray(filtersRaw.bbox) || filtersRaw.bbox.length !== 4) {
      return { ok: false, error: 'filters.bbox must be [minLng, minLat, maxLng, maxLat]' };
    }
    const values = filtersRaw.bbox.map((entry) => coerceFiniteNumber(entry));
    if (values.some((entry) => entry === null)) {
      return { ok: false, error: 'filters.bbox entries must be finite numbers' };
    }
    const [minLng, minLat, maxLng, maxLat] = values as number[];
    if (minLng >= maxLng || minLat >= maxLat) {
      return { ok: false, error: 'filters.bbox min values must be less than max values' };
    }
    bbox = [
      clamp(minLng, CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.maxLon),
      clamp(minLat, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLat),
      clamp(maxLng, CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.maxLon),
      clamp(maxLat, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLat),
    ];
    if (bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
      return { ok: false, error: 'filters.bbox does not overlap Chicago bounds after normalization' };
    }
  }

  const crimeTypes = Array.isArray(filtersRaw.crimeTypes)
    ? filtersRaw.crimeTypes.map((entry) => String(entry).trim()).filter(Boolean)
    : undefined;

  const paramsRaw = (source.params ?? {}) as Record<string, unknown>;
  const limitsRaw = (source.limits ?? {}) as Record<string, unknown>;
  const clampsApplied: string[] = [];

  const resolveClamped = (
    key: keyof typeof COERCION_RANGES,
    incoming: unknown,
    fallback: number,
  ): number => {
    const candidate = coerceFiniteNumber(incoming) ?? fallback;
    const [min, max] = COERCION_RANGES[key];
    const clamped = clamp(candidate, min, max);
    const rounded = Math.floor(clamped);
    if (rounded !== candidate) {
      clampsApplied.push(`${key}:${candidate}->${rounded}`);
    }
    return rounded;
  };

  const request: StkdeRequest = {
    domain: { startEpochSec, endEpochSec },
    filters: {
      crimeTypes,
      bbox,
    },
    params: {
      spatialBandwidthMeters: resolveClamped(
        'spatialBandwidthMeters',
        paramsRaw.spatialBandwidthMeters,
        DEFAULT_REQUEST.params.spatialBandwidthMeters,
      ),
      temporalBandwidthHours: resolveClamped(
        'temporalBandwidthHours',
        paramsRaw.temporalBandwidthHours,
        DEFAULT_REQUEST.params.temporalBandwidthHours,
      ),
      gridCellMeters: resolveClamped('gridCellMeters', paramsRaw.gridCellMeters, DEFAULT_REQUEST.params.gridCellMeters),
      topK: resolveClamped('topK', paramsRaw.topK, DEFAULT_REQUEST.params.topK),
      minSupport: resolveClamped('minSupport', paramsRaw.minSupport, DEFAULT_REQUEST.params.minSupport),
      timeWindowHours: resolveClamped('timeWindowHours', paramsRaw.timeWindowHours, DEFAULT_REQUEST.params.timeWindowHours),
    },
    limits: {
      maxEvents: resolveClamped('maxEvents', limitsRaw.maxEvents, DEFAULT_REQUEST.limits.maxEvents),
      maxGridCells: resolveClamped('maxGridCells', limitsRaw.maxGridCells, DEFAULT_REQUEST.limits.maxGridCells),
    },
  };

  return { ok: true, request, clampsApplied };
}

export const STKDE_RESPONSE_SIZE_LIMIT_BYTES = 2_500_000;
