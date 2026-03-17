export type DiagnosticsSectionStatus = 'available' | 'missing';

export interface TemporalSummaryInput {
  timestamps: ArrayLike<number>;
  dominantWindowHours?: number;
}

export interface TemporalWindowSummary {
  startEpochSec: number;
  endEpochSec: number;
  eventCount: number;
}

export interface TemporalSummaryAvailable {
  status: 'available';
  rangeSpanSec: number;
  totalEvents: number;
  dominantWindow: TemporalWindowSummary;
  activitySummary: string;
}

export interface TemporalSummaryMissing {
  status: 'missing';
  notice: string;
}

export type TemporalSummaryResult = TemporalSummaryAvailable | TemporalSummaryMissing;

const DEFAULT_WINDOW_HOURS = 24;

const toSortedFiniteTimestamps = (timestamps: ArrayLike<number>): number[] =>
  Array.from(timestamps)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

const findDominantWindow = (
  sortedTimestamps: number[],
  domainStart: number,
  domainEnd: number,
  windowSec: number,
): TemporalWindowSummary => {
  let bestStart = sortedTimestamps[0] ?? domainStart;
  let bestCount = 1;
  let startIndex = 0;

  for (let endIndex = 0; endIndex < sortedTimestamps.length; endIndex += 1) {
    const endValue = sortedTimestamps[endIndex] ?? bestStart;
    while (endValue - (sortedTimestamps[startIndex] ?? endValue) > windowSec) {
      startIndex += 1;
    }
    const count = endIndex - startIndex + 1;
    const candidateStart = sortedTimestamps[startIndex] ?? bestStart;
    if (count > bestCount || (count === bestCount && candidateStart < bestStart)) {
      bestCount = count;
      bestStart = candidateStart;
    }
  }

  const clampedStart = Math.min(domainEnd, Math.max(domainStart, bestStart));
  const clampedEnd = Math.min(domainEnd, clampedStart + windowSec);

  return {
    startEpochSec: Math.round(clampedStart),
    endEpochSec: Math.round(Math.max(clampedStart, clampedEnd)),
    eventCount: bestCount,
  };
};

export const buildTemporalSummary = (input: TemporalSummaryInput): TemporalSummaryResult => {
  const sorted = toSortedFiniteTimestamps(input.timestamps);
  if (sorted.length === 0) {
    return {
      status: 'missing',
      notice: 'Temporal diagnostics missing: no timestamp data available.',
    };
  }

  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? first;
  const rangeSpanSec = Math.max(0, Math.round(last - first));
  const windowHours = Number.isFinite(input.dominantWindowHours)
    ? Math.max(1, Math.round(input.dominantWindowHours ?? DEFAULT_WINDOW_HOURS))
    : DEFAULT_WINDOW_HOURS;
  const windowSec = windowHours * 3600;
  const dominantWindow = findDominantWindow(sorted, first, last, windowSec);
  const concentration = dominantWindow.eventCount / sorted.length;
  const concentrationPercent = (concentration * 100).toFixed(1);
  const activitySummary = `${dominantWindow.eventCount}/${sorted.length} events in dominant ${windowHours}h window (${concentrationPercent}%).`;

  return {
    status: 'available',
    rangeSpanSec,
    totalEvents: sorted.length,
    dominantWindow,
    activitySummary,
  };
};
