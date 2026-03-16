import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';
import type { CrimeRecord } from '@/types/crime';
import {
  STKDE_RESPONSE_SIZE_LIMIT_BYTES,
  type StkdeHeatmapCell,
  type StkdeHotspot,
  type StkdeRequest,
  type StkdeResponse,
} from './contracts';

const METERS_PER_LAT_DEGREE = 111_320;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toLonDegreeMeters = (lat: number) => METERS_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180);

const stableCrimeSort = (a: CrimeRecord, b: CrimeRecord) => {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  if (a.lon !== b.lon) return a.lon - b.lon;
  if (a.lat !== b.lat) return a.lat - b.lat;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  if (a.district !== b.district) return a.district < b.district ? -1 : 1;
  return 0;
};

function buildGridConfig(request: StkdeRequest) {
  const bbox = request.filters.bbox ?? [CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLon, CHICAGO_BOUNDS.maxLat];
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const meanLat = (minLat + maxLat) / 2;

  const latCellDegrees = request.params.gridCellMeters / METERS_PER_LAT_DEGREE;
  const lonMeters = Math.max(1, Math.abs(toLonDegreeMeters(meanLat)));
  const lonCellDegrees = request.params.gridCellMeters / lonMeters;

  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lonSpan = Math.max(1e-6, maxLng - minLng);

  let rows = Math.max(1, Math.ceil(latSpan / latCellDegrees));
  let cols = Math.max(1, Math.ceil(lonSpan / lonCellDegrees));
  const totalCells = rows * cols;
  let coarsenFactor = 1;

  if (totalCells > request.limits.maxGridCells) {
    coarsenFactor = Math.ceil(Math.sqrt(totalCells / request.limits.maxGridCells));
    rows = Math.max(1, Math.ceil(rows / coarsenFactor));
    cols = Math.max(1, Math.ceil(cols / coarsenFactor));
  }

  return {
    bbox,
    minLng,
    minLat,
    maxLng,
    maxLat,
    meanLat,
    rows,
    cols,
    latCellDegrees: latSpan / rows,
    lonCellDegrees: lonSpan / cols,
    coarsenFactor,
  };
}

function computePeakWindow(
  timestamps: number[],
  domainStart: number,
  domainEnd: number,
  windowSeconds: number,
): [number, number] {
  if (timestamps.length === 0) {
    return [domainStart, Math.min(domainEnd, domainStart + windowSeconds)];
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  let bestStart = sorted[0];
  let bestCount = 1;
  let startIdx = 0;
  for (let endIdx = 0; endIdx < sorted.length; endIdx += 1) {
    const endValue = sorted[endIdx] ?? sorted[0];
    while (endValue - (sorted[startIdx] ?? endValue) > windowSeconds) {
      startIdx += 1;
    }
    const count = endIdx - startIdx + 1;
    if (count > bestCount) {
      bestCount = count;
      bestStart = sorted[startIdx] ?? bestStart;
    }
  }

  const clampedStart = clamp(bestStart, domainStart, domainEnd);
  const clampedEnd = clamp(clampedStart + windowSeconds, domainStart, domainEnd);
  return [clampedStart, Math.max(clampedStart, clampedEnd)];
}

function createHotspotId(row: number, col: number, peakStartEpochSec: number, peakEndEpochSec: number): string {
  return `hs-${row}-${col}-${peakStartEpochSec}-${peakEndEpochSec}`;
}

export interface ComputeStkdeOutput {
  response: StkdeResponse;
  metaNotes: string[];
}

export function computeStkdeFromCrimes(request: StkdeRequest, crimes: CrimeRecord[]): ComputeStkdeOutput {
  const computeStart = performance.now();
  const metaNotes: string[] = [];
  const grid = buildGridConfig(request);
  if (grid.coarsenFactor > 1) {
    metaNotes.push(`grid-coarsened-x${grid.coarsenFactor}`);
  }

  const [domainStart, domainEnd] = [request.domain.startEpochSec, request.domain.endEpochSec];
  const [minLng, minLat, maxLng, maxLat] = [grid.minLng, grid.minLat, grid.maxLng, grid.maxLat];
  const allowedTypes = request.filters.crimeTypes?.length ? new Set(request.filters.crimeTypes) : null;

  const filtered = crimes
    .filter((crime) => {
      if (crime.timestamp < domainStart || crime.timestamp > domainEnd) return false;
      if (allowedTypes && !allowedTypes.has(crime.type)) return false;
      if (crime.lon < minLng || crime.lon > maxLng || crime.lat < minLat || crime.lat > maxLat) return false;
      return Number.isFinite(crime.lon) && Number.isFinite(crime.lat);
    })
    .sort(stableCrimeSort);

  const truncatedByEvents = filtered.length > request.limits.maxEvents;
  const boundedEvents = truncatedByEvents ? filtered.slice(0, request.limits.maxEvents) : filtered;
  if (truncatedByEvents) {
    metaNotes.push(`event-cap:${request.limits.maxEvents}`);
  }

  const cellCount = grid.rows * grid.cols;
  const support = new Float64Array(cellCount);
  const cellTimestamps = Array.from({ length: cellCount }, () => [] as number[]);

  const toCellIndex = (lon: number, lat: number): number => {
    const col = clamp(Math.floor((lon - minLng) / grid.lonCellDegrees), 0, grid.cols - 1);
    const row = clamp(Math.floor((lat - minLat) / grid.latCellDegrees), 0, grid.rows - 1);
    return row * grid.cols + col;
  };

  for (const crime of boundedEvents) {
    const idx = toCellIndex(crime.lon, crime.lat);
    support[idx] += 1;
    cellTimestamps[idx].push(crime.timestamp);
  }

  const bandwidthCells = Math.max(1, Math.ceil(request.params.spatialBandwidthMeters / request.params.gridCellMeters));
  const sigmaCells = Math.max(0.5, bandwidthCells / 2);
  const kernelRadius = Math.max(1, Math.ceil(3 * sigmaCells));
  const intensity = new Float64Array(cellCount);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const centerIndex = row * grid.cols + col;
      let sum = 0;
      for (let r = Math.max(0, row - kernelRadius); r <= Math.min(grid.rows - 1, row + kernelRadius); r += 1) {
        for (let c = Math.max(0, col - kernelRadius); c <= Math.min(grid.cols - 1, col + kernelRadius); c += 1) {
          const neighborIndex = r * grid.cols + c;
          const count = support[neighborIndex];
          if (count <= 0) continue;
          const dr = r - row;
          const dc = c - col;
          const distance = Math.sqrt(dr * dr + dc * dc);
          const weight = Math.exp(-0.5 * (distance / sigmaCells) ** 2);
          sum += count * weight;
        }
      }
      intensity[centerIndex] = sum;
    }
  }

  let maxIntensity = 0;
  for (let i = 0; i < intensity.length; i += 1) {
    if (intensity[i] > maxIntensity) maxIntensity = intensity[i];
  }
  if (maxIntensity <= 0) maxIntensity = 1;

  const cells: StkdeHeatmapCell[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const idx = row * grid.cols + col;
      const rawIntensity = intensity[idx];
      const normalized = rawIntensity / maxIntensity;
      const count = support[idx];
      if (normalized <= 0 && count <= 0) continue;
      const lng = minLng + (col + 0.5) * grid.lonCellDegrees;
      const lat = minLat + (row + 0.5) * grid.latCellDegrees;
      cells.push({
        lng,
        lat,
        intensity: Number(normalized.toFixed(6)),
        support: Math.round(count),
      });
    }
  }

  const hotspotCandidates: StkdeHotspot[] = [];
  const timeWindowSec = request.params.timeWindowHours * 3600;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const idx = row * grid.cols + col;
      const supportCount = Math.round(support[idx]);
      if (supportCount < request.params.minSupport) continue;
      const peak = computePeakWindow(cellTimestamps[idx], domainStart, domainEnd, timeWindowSec);
      const normalizedIntensity = Number((intensity[idx] / maxIntensity).toFixed(6));
      hotspotCandidates.push({
        id: createHotspotId(row, col, peak[0], peak[1]),
        centroidLng: Number((minLng + (col + 0.5) * grid.lonCellDegrees).toFixed(6)),
        centroidLat: Number((minLat + (row + 0.5) * grid.latCellDegrees).toFixed(6)),
        intensityScore: normalizedIntensity,
        supportCount,
        peakStartEpochSec: peak[0],
        peakEndEpochSec: peak[1],
        radiusMeters: request.params.spatialBandwidthMeters,
      });
    }
  }

  const hotspots = hotspotCandidates
    .sort((a, b) => {
      if (b.intensityScore !== a.intensityScore) return b.intensityScore - a.intensityScore;
      if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
      if (a.centroidLat !== b.centroidLat) return a.centroidLat - b.centroidLat;
      if (a.centroidLng !== b.centroidLng) return a.centroidLng - b.centroidLng;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, request.params.topK);

  let response: StkdeResponse = {
    meta: {
      eventCount: boundedEvents.length,
      computeMs: 0,
      truncated: truncatedByEvents,
      fallbackApplied: metaNotes.length > 0 ? metaNotes.join(',') : null,
    },
    heatmap: {
      cells,
      maxIntensity: 1,
    },
    hotspots,
    contracts: {
      scoreVersion: 'stkde-v1',
    },
  };

  let payloadBytes = new TextEncoder().encode(JSON.stringify(response)).length;
  if (payloadBytes > STKDE_RESPONSE_SIZE_LIMIT_BYTES && response.heatmap.cells.length > 1) {
    const sortedCells = [...response.heatmap.cells].sort((a, b) => {
      if (b.intensity !== a.intensity) return b.intensity - a.intensity;
      return b.support - a.support;
    });
    let keep = sortedCells.length;
    while (payloadBytes > STKDE_RESPONSE_SIZE_LIMIT_BYTES && keep > 1) {
      keep = Math.max(1, Math.floor(keep * 0.85));
      response = {
        ...response,
        meta: {
          ...response.meta,
          truncated: true,
          fallbackApplied: response.meta.fallbackApplied
            ? `${response.meta.fallbackApplied},response-size-guard`
            : 'response-size-guard',
        },
        heatmap: {
          ...response.heatmap,
          cells: sortedCells.slice(0, keep),
        },
      };
      payloadBytes = new TextEncoder().encode(JSON.stringify(response)).length;
    }
  }

  response.meta.computeMs = Math.max(0, Math.round((performance.now() - computeStart) * 100) / 100);
  return { response, metaNotes };
}
