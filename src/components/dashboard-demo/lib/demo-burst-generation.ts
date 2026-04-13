import type { BurstWindow } from '@/components/viz/BurstList';
import type { TimeBin } from '@/lib/binning/types';

export type BurstDraftGenerationSource = 'burst-windows' | 'preset-bias';

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
  shouldFallbackToPresetBias: boolean;
  generationSource: BurstDraftGenerationSource;
}

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const isValidNumber = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

const hasOverlap = (left: [number, number], right: [number, number]): boolean => left[0] < right[1] && right[0] < left[1];

const buildDraftBin = (
  burstWindow: BurstWindow,
  startTime: number,
  endTime: number,
  generationInputs: BurstDraftGenerationInputs,
  index: number,
): TimeBin => ({
  id: `burst-draft-${burstWindow.id}-${index}`,
  startTime,
  endTime,
  count: Math.max(1, Math.round(burstWindow.count)),
  crimeTypes: generationInputs.crimeTypes.length > 0 ? generationInputs.crimeTypes : ['all-crime-types'],
  districts: generationInputs.neighbourhood ? [generationInputs.neighbourhood] : undefined,
  avgTimestamp: (startTime + endTime) / 2,
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
      shouldFallbackToPresetBias: true,
      generationSource: 'burst-windows',
    };
  }

  const activeSelection = normalizeRange(activeStart, activeEnd);
  if (activeSelection[1] <= activeSelection[0]) {
    return {
      bins: [],
      eventCount: 0,
      warning: 'Choose a valid time window before generating burst drafts.',
      shouldFallbackToPresetBias: true,
      generationSource: 'burst-windows',
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
      warning: 'No burst windows overlap the selected range. Falling back to preset-bias generation.',
      shouldFallbackToPresetBias: true,
      generationSource: 'burst-windows',
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
      warning: 'No burst windows overlap the selected range. Falling back to preset-bias generation.',
      shouldFallbackToPresetBias: true,
      generationSource: 'burst-windows',
    };
  }

  return {
    bins,
    eventCount: bins.reduce((sum, bin) => sum + bin.count, 0),
    warning: null,
    shouldFallbackToPresetBias: false,
    generationSource: 'burst-windows',
  };
};
