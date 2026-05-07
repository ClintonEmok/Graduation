import type { AdaptiveBinningMode } from '@/types/adaptive';
import type { BinningStrategyStats } from './strategy-stats';

export interface StrategyComparisonDelta {
  id: 'empty-bins' | 'peak-bin' | 'width-spread';
  label: string;
  uniformTimeValue: string;
  uniformEventsValue: string;
  change: string;
}

export interface StrategyComparisonCard {
  strategy: AdaptiveBinningMode;
  title: string;
  summary: string;
  metrics: string[];
}

export interface StrategyComparisonInsight {
  preferredStrategy: AdaptiveBinningMode;
  title: string;
  detail: string;
}

export interface StrategyComparisonModel {
  headline: string;
  summary: string;
  readability: StrategyComparisonInsight;
  bursts: StrategyComparisonInsight;
  quickDeltas: StrategyComparisonDelta[];
  cards: StrategyComparisonCard[];
}

const STRATEGY_LABEL: Record<AdaptiveBinningMode, string> = {
  'uniform-time': 'Uniform Time',
  'uniform-events': 'Uniform Events',
};

const formatSeconds = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0s';
  if (value < 60) return `${value.toFixed(1)}s`;
  if (value < 3600) return `${(value / 60).toFixed(1)}m`;
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`;
  return `${(value / 86400).toFixed(1)}d`;
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatSignedCount = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

const getEntry = (
  stats: BinningStrategyStats[],
  strategy: AdaptiveBinningMode,
): BinningStrategyStats => {
  const entry = stats.find((candidate) => candidate.strategy === strategy);
  if (!entry) {
    throw new Error(`Missing ${strategy} strategy stats`);
  }
  return entry;
};

export const buildStrategyComparison = (stats: BinningStrategyStats[]): StrategyComparisonModel => {
  const uniformTime = getEntry(stats, 'uniform-time');
  const uniformEvents = getEntry(stats, 'uniform-events');

  const emptyBinDelta = uniformTime.emptyBins - uniformEvents.emptyBins;
  const peakBinDelta = uniformTime.maxBinEvents - uniformEvents.maxBinEvents;
  const peakShareDelta = uniformTime.peakBinShare - uniformEvents.peakBinShare;
  const widthSpreadDelta = uniformEvents.widthSpreadRatio - uniformTime.widthSpreadRatio;
  const occupiedShareDelta = uniformEvents.occupiedBinShare - uniformTime.occupiedBinShare;

  const burstRemapStrong = widthSpreadDelta >= 1.5 || emptyBinDelta >= 6 || peakShareDelta >= 0.08;
  const burstRemapVisible = widthSpreadDelta >= 0.5 || emptyBinDelta >= 3 || peakShareDelta >= 0.03;

  const headline = burstRemapStrong
    ? 'Uniform Time keeps the calendar legible; Uniform Events stretches bursty periods so hotspots stand out.'
    : burstRemapVisible
      ? 'Uniform Time stays easier to scan on a fixed clock, while Uniform Events gives busy periods a bit more room.'
      : 'Both strategies read similarly here, but Uniform Time still keeps fixed-width time bins while Uniform Events lightly remaps busy periods.';

  const summary = burstRemapStrong
    ? `Uniform Events cuts ${emptyBinDelta} empty bins, lowers the peak bin by ${formatSignedCount(peakBinDelta)}, and expands width spread to ${uniformEvents.widthSpreadRatio.toFixed(1)}x for burst inspection.`
    : burstRemapVisible
      ? `Uniform Events trims ${emptyBinDelta} empty bins and softens the peak bin by ${formatSignedCount(peakBinDelta)} while Uniform Time preserves equal-width bins for direct time comparison.`
      : `The current dataset is relatively even: peak share changes by only ${Math.round(Math.abs(peakShareDelta) * 100)} points and empty-bin count changes by ${Math.abs(emptyBinDelta)}.`;

  const readability: StrategyComparisonInsight = {
    preferredStrategy: 'uniform-time',
    title: 'Best for fixed-width readability',
    detail: `Uniform Time keeps every bin at the same width (${formatSeconds(uniformTime.medianBinWidthSec)} median), so side-by-side time spans stay directly comparable without remapping.`,
  };

  const bursts: StrategyComparisonInsight = {
    preferredStrategy: 'uniform-events',
    title: burstRemapVisible ? 'Best for burst identification' : 'Burst emphasis is subtle in this context',
    detail: burstRemapVisible
      ? `Uniform Events redistributes activity into more occupied bins (${formatPercent(uniformEvents.occupiedBinShare)} vs ${formatPercent(uniformTime.occupiedBinShare)}) and lowers the busiest-bin share from ${formatPercent(uniformTime.peakBinShare)} to ${formatPercent(uniformEvents.peakBinShare)}.`
      : `Uniform Events still remaps dense periods, but this dataset is already fairly even so the occupied-bin change is only ${Math.round(Math.abs(occupiedShareDelta) * 100)} points.`,
  };

  return {
    headline,
    summary,
    readability,
    bursts,
    quickDeltas: [
      {
        id: 'empty-bins',
        label: 'Empty bins',
        uniformTimeValue: `${uniformTime.emptyBins}/${uniformTime.binCount}`,
        uniformEventsValue: `${uniformEvents.emptyBins}/${uniformEvents.binCount}`,
        change:
          emptyBinDelta > 0
            ? `${emptyBinDelta} fewer empty bins with Uniform Events`
            : emptyBinDelta < 0
              ? `${Math.abs(emptyBinDelta)} more empty bins with Uniform Events`
              : 'No empty-bin change',
      },
      {
        id: 'peak-bin',
        label: 'Peak bin load',
        uniformTimeValue: `${uniformTime.maxBinEvents} (${formatPercent(uniformTime.peakBinShare)})`,
        uniformEventsValue: `${uniformEvents.maxBinEvents} (${formatPercent(uniformEvents.peakBinShare)})`,
        change:
          peakBinDelta > 0
            ? `${peakBinDelta} fewer events in the busiest bin`
            : peakBinDelta < 0
              ? `${Math.abs(peakBinDelta)} more events in the busiest bin`
              : 'Same busiest-bin load',
      },
      {
        id: 'width-spread',
        label: 'Width spread',
        uniformTimeValue: `${uniformTime.widthSpreadRatio.toFixed(1)}x`,
        uniformEventsValue: `${uniformEvents.widthSpreadRatio.toFixed(1)}x`,
        change:
          widthSpreadDelta > 0
            ? `${widthSpreadDelta.toFixed(1)}x more width remapping`
            : 'No additional remapping',
      },
    ],
    cards: [
      {
        strategy: 'uniform-time',
        title: STRATEGY_LABEL['uniform-time'],
        summary: 'Keeps a stable clock: every horizontal distance maps to the same amount of time.',
        metrics: [
          `${uniformTime.emptyBins} empty bins`,
          `peak ${uniformTime.maxBinEvents} events/bin`,
          `${formatSeconds(uniformTime.minBinWidthSec)}-${formatSeconds(uniformTime.maxBinWidthSec)} bin width`,
        ],
      },
      {
        strategy: 'uniform-events',
        title: STRATEGY_LABEL['uniform-events'],
        summary: burstRemapVisible
          ? 'Remaps dense periods into more inspectable bins, making concentrated bursts easier to pick out.'
          : 'Applies only light remapping here because activity is already spread fairly evenly across time.',
        metrics: [
          `${uniformEvents.emptyBins} empty bins`,
          `peak ${uniformEvents.maxBinEvents} events/bin`,
          `${formatSeconds(uniformEvents.minBinWidthSec)}-${formatSeconds(uniformEvents.maxBinWidthSec)} bin width`,
        ],
      },
    ],
  };
};
