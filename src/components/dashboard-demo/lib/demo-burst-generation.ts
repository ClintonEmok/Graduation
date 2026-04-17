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

const BURSTINESS_FORMULA = 'B = (σ - μ) / (σ + μ)';

const formatInterval = (milliseconds: number): string => {
  if (milliseconds >= HOUR_MS) {
    return `${roundToTwoDecimals(milliseconds / HOUR_MS)}h`;
  }

  if (milliseconds >= 60 * 1000) {
    return `${roundToTwoDecimals(milliseconds / (60 * 1000))}m`;
  }

  return `${roundToTwoDecimals(milliseconds / 1000)}s`;
};

const calculateMean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

interface PartitionBurstinessAnalysis {
  coefficient: number;
  normalizedScore: number;
  formula: string;
  calculation: string;
  intervals: number[];
}

const calculatePartitionBurstiness = (eventTimes: number[]): PartitionBurstinessAnalysis => {
  if (eventTimes.length < 2) {
    return {
      coefficient: 0,
      normalizedScore: 50,
      formula: BURSTINESS_FORMULA,
      calculation: 'fewer than 2 events -> no inter-event intervals; B = 0',
      intervals: [],
    };
  }

  const intervals = eventTimes.slice(1).map((eventTime, index) => eventTime - eventTimes[index]);
  const mean = calculateMean(intervals);
  const standardDeviation = calculateStandardDeviation(intervals, mean);
  const denominator = standardDeviation + mean;
  const coefficient = denominator === 0 ? 0 : (standardDeviation - mean) / denominator;
  const normalizedScore = Math.round(((coefficient + 1) / 2) * 100);
  const formattedMean = formatInterval(mean);
  const formattedStdDev = formatInterval(standardDeviation);

  return {
    coefficient,
    normalizedScore,
    formula: BURSTINESS_FORMULA,
    calculation: `intervals=[${intervals.map(formatInterval).join(', ')}], μ=${formattedMean}, σ=${formattedStdDev} -> B = (${formattedStdDev} - ${formattedMean}) / (${formattedStdDev} + ${formattedMean}) = ${coefficient.toFixed(2)}`,
    intervals,
  };
};

const groupEventsByPartition = (
  events: number[],
  partitions: DemoSelectionPartition[],
): number[][] => {
  const groupedEvents = partitions.map(() => [] as number[]);
  let partitionIndex = 0;

  events.forEach((eventTime) => {
    while (partitionIndex < partitions.length - 1 && eventTime >= partitions[partitionIndex].endTime) {
      partitionIndex += 1;
    }

    const partition = partitions[partitionIndex];
    if (!partition) {
      return;
    }

    const isLastPartition = partitionIndex === partitions.length - 1;
    const withinPartition = eventTime >= partition.startTime && (isLastPartition ? eventTime <= partition.endTime : eventTime < partition.endTime);
    if (withinPartition) {
      groupedEvents[partitionIndex].push(eventTime);
    }
  });

  return groupedEvents;
};

const buildNeutralPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  events: number[],
  analysis: PartitionBurstinessAnalysis,
): TimeBin => ({
  id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
  startTime: partition.startTime,
  endTime: partition.endTime,
  count: events.length,
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: (partition.startTime + partition.endTime) / 2,
  warpWeight: 1,
  burstClass: 'neutral',
  burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
  burstScore: analysis.normalizedScore,
  burstinessCoefficient: analysis.coefficient,
  burstinessFormula: analysis.formula,
  burstinessCalculation: analysis.calculation,
  burstConfidence: 0,
  burstProvenance: analysis.intervals.length > 0 ? `intervals=${analysis.intervals.length}; coefficient=${analysis.coefficient.toFixed(2)}` : 'neutral-partition',
  tieBreakReason: 'no bin stands out; keep the brushed selection evenly partitioned',
  thresholdSource: `granularity:${generationInputs.granularity}`,
  neighborhoodSummary: `count=${events.length}; partition=${index + 1}`,
  isNeutralPartition: true,
});

const buildBurstPartitionBin = (
  partition: DemoSelectionPartition,
  generationInputs: NonUniformDraftGenerationInputs,
  index: number,
  events: number[],
  analysis: PartitionBurstinessAnalysis,
  maxCoefficient: number,
  secondMaxCoefficient: number,
  averageCoefficient: number,
): TimeBin => {
  const coefficient = analysis.coefficient;

  return {
    id: `non-uniform-draft-${generationInputs.granularity}-${index}`,
    startTime: partition.startTime,
    endTime: partition.endTime,
    count: events.length,
    crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
    districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
    avgTimestamp: (partition.startTime + partition.endTime) / 2,
    warpWeight: roundToTwoDecimals(1 + Math.max(0, coefficient)),
    burstClass: coefficient === maxCoefficient && coefficient > secondMaxCoefficient ? 'isolated-spike' : 'prolonged-peak',
    burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
    burstScore: analysis.normalizedScore,
    burstinessCoefficient: coefficient,
    burstinessFormula: analysis.formula,
    burstinessCalculation: analysis.calculation,
    burstConfidence: Math.round(clamp01(Math.max(0, coefficient)) * 100),
    burstProvenance: `coefficient=${coefficient.toFixed(2)}; avgCoefficient=${averageCoefficient.toFixed(2)}`,
    tieBreakReason: coefficient === maxCoefficient
      ? 'highest burstiness coefficient gets the warp lead'
      : 'lower burstiness stays near-neutral',
    thresholdSource: `granularity:${generationInputs.granularity}; contrast:${Math.round(Math.max(0, coefficient - secondMaxCoefficient) * 100)}%`,
    neighborhoodSummary: `count=${events.length}; partition=${index + 1}; coefficient=${coefficient.toFixed(2)}`,
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
  const groupedEvents = groupEventsByPartition(events, partitions);
  const analyses = groupedEvents.map(calculatePartitionBurstiness);
  const totalCount = groupedEvents.reduce((sum: number, partitionEvents: number[]) => sum + partitionEvents.length, 0);

  if (totalCount === 0) {
    return {
      bins: partitions.map((partition, index) => buildNeutralPartitionBin(
        partition,
        generationInputs,
        index,
        groupedEvents[index] ?? [],
        analyses[index] ?? calculatePartitionBurstiness([]),
      )),
      eventCount: 0,
      warning: null,
    };
  }

  const coefficientValues = analyses.map((analysis) => analysis.coefficient);
  const maxCoefficient = Math.max(...coefficientValues);
  const sortedCoefficients = [...coefficientValues].sort((left, right) => right - left);
  const secondMaxCoefficient = sortedCoefficients[1] ?? 0;
  const averageCoefficient = coefficientValues.reduce((sum, value) => sum + value, 0) / coefficientValues.length;
  const noStandout = maxCoefficient <= 0
    || maxCoefficient <= averageCoefficient + 0.05
    || (maxCoefficient - secondMaxCoefficient) < 0.15;

  if (noStandout) {
    return {
      bins: partitions.map((partition, index) => buildNeutralPartitionBin(
        partition,
        generationInputs,
        index,
        groupedEvents[index] ?? [],
        analyses[index] ?? calculatePartitionBurstiness([]),
      )),
      eventCount: totalCount,
      warning: null,
    };
  }

  return {
    bins: partitions.map((partition, index) => {
      const partitionEvents = groupedEvents[index] ?? [];
      const analysis = analyses[index] ?? calculatePartitionBurstiness(partitionEvents);

      if (analysis.coefficient === maxCoefficient) {
        return buildBurstPartitionBin(
          partition,
          generationInputs,
          index,
          partitionEvents,
          analysis,
          maxCoefficient,
          secondMaxCoefficient,
          averageCoefficient,
        );
      }

      return {
        ...buildNeutralPartitionBin(partition, generationInputs, index, partitionEvents, analysis),
        warpWeight: roundToTwoDecimals(1 + Math.max(0, analysis.coefficient) * 0.25),
      };
    }),
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
