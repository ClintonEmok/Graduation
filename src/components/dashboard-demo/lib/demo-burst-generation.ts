import { buildBurstWindowsFromSeries, type BurstWindow } from '@/components/viz/BurstList';
import { BURST_TAXONOMY_RULE_VERSION } from '@/lib/binning/burst-taxonomy';
import type { TimeBin } from '@/lib/binning/types';

export interface BurstDraftGenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: 'hourly' | 'daily' | 'weekly';
}

export interface BurstDraftGenerationResult {
  bins: TimeBin[];
  eventCount: number;
  warning: string | null;
}

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const isValidNumber = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

const hasOverlap = (left: [number, number], right: [number, number]): boolean => left[0] < right[1] && right[0] < left[1];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type DemoSelectionGranularity = 'hourly' | 'daily';

export interface DemoSelectionPartition {
  startTime: number;
  endTime: number;
}

export interface NonUniformDraftGenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: DemoSelectionGranularity;
  eventTimestamps?: number[];
}

const getGranularityStepMs = (granularity: DemoSelectionGranularity): number =>
  granularity === 'hourly' ? HOUR_MS : DAY_MS;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

export const partitionSelectionByGranularity = (
  selectionRange: [number, number],
  granularity: DemoSelectionGranularity,
): DemoSelectionPartition[] => {
  const [start, end] = normalizeRange(selectionRange[0], selectionRange[1]);
  if (!isValidNumber(start) || !isValidNumber(end) || end <= start) {
    return [];
  }

  const stepMs = getGranularityStepMs(granularity);
  const partitions: DemoSelectionPartition[] = [];
  let cursor = start;

  while (cursor < end) {
    const nextEnd = Math.min(end, cursor + stepMs);
    partitions.push({
      startTime: cursor,
      endTime: nextEnd,
    });
    cursor = nextEnd;
  }

  return partitions;
};

const filterAndSortEventsWithinSelection = (events: number[], selectionRange: [number, number]): number[] => {
  const [selectionStart, selectionEnd] = selectionRange;
  const sortedEvents = [...events]
    .filter((eventTime) => isValidNumber(eventTime) && eventTime >= selectionStart && eventTime <= selectionEnd)
    .sort((left, right) => left - right);

  return sortedEvents;
};

const countEventsPerPartition = (
  events: number[],
  partitions: DemoSelectionPartition[],
): number[] => {
  const counts = partitions.map(() => 0);
  let eventIndex = 0;

  partitions.forEach((partition, partitionIndex) => {
    while (eventIndex < events.length && events[eventIndex] < partition.startTime) {
      eventIndex += 1;
    }

    while (
      eventIndex < events.length
      && (partitionIndex === partitions.length - 1
        ? events[eventIndex] <= partition.endTime
        : events[eventIndex] < partition.endTime)
    ) {
      counts[partitionIndex] += 1;
      eventIndex += 1;
    }
  });

  return counts;
};

const buildNeutralPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  count: number,
): TimeBin => ({
  id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
  startTime: partition.startTime,
  endTime: partition.endTime,
  count,
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: (partition.startTime + partition.endTime) / 2,
  warpWeight: 1,
  burstClass: 'neutral',
  burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
  burstScore: 0,
  burstConfidence: 0,
  burstProvenance: 'neutral-partition',
  tieBreakReason: 'no bin stands out; keep the brushed selection evenly partitioned',
  thresholdSource: `granularity:${generationInputs.granularity}`,
  neighborhoodSummary: `count=${count}; partition=${index + 1}`,
  isNeutralPartition: true,
});

const buildBurstPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  count: number,
  maxCount: number,
  secondMaxCount: number,
  averageCount: number,
): TimeBin => {
  const normalizedStrength = maxCount === 0 ? 0 : count / maxCount;
  const relativeGap = maxCount === 0 ? 0 : (count - secondMaxCount) / Math.max(1, maxCount);
  const burstScore = Math.round(clamp01(normalizedStrength * 0.65 + Math.max(0, (count - averageCount) / Math.max(1, maxCount)) * 0.35) * 100);
  const warpWeight = count === maxCount
    ? roundToTwoDecimals(1 + clamp01(normalizedStrength * 0.85 + relativeGap * 0.65))
    : 1;

  return {
    id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
    startTime: partition.startTime,
    endTime: partition.endTime,
    count,
    crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
    districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
    avgTimestamp: (partition.startTime + partition.endTime) / 2,
    warpWeight,
    burstClass: count === maxCount && count > secondMaxCount ? 'isolated-spike' : 'prolonged-peak',
    burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
    burstScore,
    burstConfidence: Math.round(clamp01(relativeGap + normalizedStrength * 0.25) * 100),
    burstProvenance: `count=${count}; max=${maxCount}; avg=${roundToTwoDecimals(averageCount)}`,
    tieBreakReason: count === maxCount
      ? 'highest-count partition gets the warp lead'
      : 'lower-count partition stays near-neutral',
    thresholdSource: `granularity:${generationInputs.granularity}; contrast:${Math.round(relativeGap * 100)}%`,
    neighborhoodSummary: `count=${count}; partition=${index + 1}; max=${maxCount}`,
  };
};

export const buildNonUniformDraftBinsFromSelection = (
  generationInputs: NonUniformDraftGenerationInputs,
): BurstDraftGenerationResult => {
  const activeStart = generationInputs.timeWindow.start;
  const activeEnd = generationInputs.timeWindow.end;

  if (!isValidNumber(activeStart) || !isValidNumber(activeEnd)) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
    };
  }

  const activeSelection = normalizeRange(activeStart, activeEnd);
  if (activeSelection[1] <= activeSelection[0]) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
    };
  }

  const partitions = partitionSelectionByGranularity(activeSelection, generationInputs.granularity);
  if (partitions.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
    };
  }

  const events = filterAndSortEventsWithinSelection(generationInputs.eventTimestamps ?? [], activeSelection);
  const counts = countEventsPerPartition(events, partitions);
  const totalCount = counts.reduce((sum, count) => sum + count, 0);

  if (totalCount === 0) {
    const bins = partitions.map((partition, index) => buildNeutralPartitionBin(partition, generationInputs, index, counts[index] ?? 0));
    return {
      bins,
      eventCount: 0,
      warning: null,
    };
  }

  const maxCount = Math.max(...counts);
  const sortedCounts = [...counts].sort((left, right) => right - left);
  const secondMaxCount = sortedCounts[1] ?? 0;
  const averageCount = totalCount / counts.length;
  const noStandout = maxCount <= 0
    || maxCount <= averageCount * 1.25
    || (maxCount - secondMaxCount) < Math.max(1, Math.ceil(maxCount * 0.25));

  if (noStandout) {
    const bins = partitions.map((partition, index) => buildNeutralPartitionBin(partition, generationInputs, index, counts[index] ?? 0));
    return {
      bins,
      eventCount: totalCount,
      warning: null,
    };
  }

  const bins = partitions.map((partition, index) => {
    const count = counts[index] ?? 0;
    if (count === maxCount) {
      return buildBurstPartitionBin(partition, generationInputs, index, count, maxCount, secondMaxCount, averageCount);
    }

    return {
      ...buildNeutralPartitionBin(partition, generationInputs, index, count),
      warpWeight: roundToTwoDecimals(Math.max(0.9, 1 - clamp01((averageCount - count) / Math.max(1, maxCount)) * 0.1)),
    };
  });

  return {
    bins,
    eventCount: totalCount,
    warning: null,
  };
};

export interface DemoBurstWindowSelectionInputs {
  densityMap: Float32Array | null;
  burstThreshold: number;
  mapDomain: [number, number];
  selectionRange?: [number, number] | null;
}

export const buildDemoBurstWindowsFromSelection = ({
  densityMap,
  burstThreshold,
  mapDomain,
  selectionRange,
}: DemoBurstWindowSelectionInputs): BurstWindow[] => {
  if (!densityMap || densityMap.length === 0) {
    return [];
  }

  if (!Number.isFinite(mapDomain[0]) || !Number.isFinite(mapDomain[1]) || mapDomain[1] <= mapDomain[0]) {
    return [];
  }

  if (!Number.isFinite(burstThreshold)) {
    return [];
  }

  return buildBurstWindowsFromSeries({
    densityMap,
    burstinessMap: null,
    countMap: null,
    burstMetric: 'density',
    burstCutoff: Math.max(0, Math.min(1, burstThreshold)),
    mapDomain,
    selectionRange,
  });
};

const buildDraftBin = (
  burstWindow: BurstWindow,
  startTimeSec: number,
  endTimeSec: number,
  generationInputs: BurstDraftGenerationInputs,
  index: number,
): TimeBin => ({
  id: `burst-draft-${burstWindow.id}-${index}`,
  startTime: startTimeSec * 1000,
  endTime: endTimeSec * 1000,
  count: Math.max(1, Math.round(burstWindow.count)),
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: ((startTimeSec + endTimeSec) / 2) * 1000,
  burstClass: burstWindow.burstClass,
  burstRuleVersion: burstWindow.burstRuleVersion,
  burstScore: burstWindow.burstScore,
  burstConfidence: burstWindow.burstConfidence,
  burstProvenance: burstWindow.burstProvenance,
  tieBreakReason: burstWindow.tieBreakReason,
  thresholdSource: burstWindow.thresholdSource,
  neighborhoodSummary: burstWindow.neighborhoodSummary,
});

export const buildBurstDraftBinsFromWindows = (
  burstWindows: BurstWindow[],
  generationInputs: BurstDraftGenerationInputs,
): BurstDraftGenerationResult => {
  const activeStart = generationInputs.timeWindow.start;
  const activeEnd = generationInputs.timeWindow.end;

  if (!isValidNumber(activeStart) || !isValidNumber(activeEnd)) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
    };
  }

  // Demo selections are stored as epoch milliseconds; burst windows are tracked in seconds.
  const activeSelection = normalizeRange(activeStart / 1000, activeEnd / 1000);
  if (activeSelection[1] <= activeSelection[0]) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
    };
  }

  const overlappingWindows = burstWindows.filter((burstWindow) => {
    const burstRange = normalizeRange(burstWindow.start, burstWindow.end);
    return hasOverlap(burstRange, activeSelection);
  });

  if (overlappingWindows.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'No burst windows overlap the selected range.',
    };
  }

  const bins = overlappingWindows
    .map((burstWindow, index) => {
      const burstRange = normalizeRange(burstWindow.start, burstWindow.end);
      const clippedStart = Math.max(burstRange[0], activeSelection[0]);
      const clippedEnd = Math.min(burstRange[1], activeSelection[1]);

      if (!Number.isFinite(clippedStart) || !Number.isFinite(clippedEnd) || clippedEnd <= clippedStart) {
        return null;
      }

      return buildDraftBin(burstWindow, clippedStart, clippedEnd, generationInputs, index);
    })
    .filter((bin): bin is TimeBin => bin !== null)
    .sort((left, right) => left.startTime - right.startTime);

  if (bins.length === 0) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'No burst windows overlap the selected range.',
    };
  }

  return {
    bins,
    eventCount: bins.reduce((sum, bin) => sum + bin.count, 0),
    warning: null,
  };
};
