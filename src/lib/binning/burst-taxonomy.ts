export const BURST_TAXONOMY_RULE_VERSION = '1.0.0';

export type BurstTaxonomy = 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';

export interface BurstTaxonomyNeighbor {
  value: number;
  count: number;
  durationSec: number;
}

export interface BurstTaxonomyInput {
  value: number;
  count: number;
  durationSec: number;
  neighborhood?: BurstTaxonomyNeighbor[];
}

export interface BurstTaxonomyResult {
  burstClass: BurstTaxonomy;
  burstRuleVersion: string;
  burstScore: number;
  burstConfidence: number;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
  rationale: string;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const round = (value: number): number => Math.round(value * 100) / 100;

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const formatNeighborhoodSummary = (neighbors: BurstTaxonomyNeighbor[]): string => {
  if (neighbors.length === 0) return 'no-neighbors';
  return neighbors
    .map((neighbor) => `v=${round(neighbor.value)} c=${neighbor.count} d=${round(neighbor.durationSec)}`)
    .join(' | ');
};

const describeThresholdSource = (neighbors: BurstTaxonomyNeighbor[]): string => {
  if (neighbors.length === 0) return 'global-thresholds';
  return 'global-thresholds+neighborhood';
};

const normalizeScore = (value: number, count: number, durationSec: number, neighbors: BurstTaxonomyNeighbor[]): number => {
  const neighborValues = neighbors.map((neighbor) => clamp01(neighbor.value));
  const neighborCounts = neighbors.map((neighbor) => Math.max(0, neighbor.count));
  const neighborDurations = neighbors.map((neighbor) => Math.max(0, neighbor.durationSec));

  const valueMedian = median([value, ...neighborValues]);
  const countMedian = median([count, ...neighborCounts]);
  const durationMedian = median([durationSec, ...neighborDurations]);

  const signalScore = clamp01(valueMedian);
  const countScore = clamp01(countMedian / Math.max(1, countMedian + 2));
  const durationScore = clamp01(durationMedian / Math.max(1, durationMedian + 120));

  return Math.round(clamp01(signalScore * 0.6 + countScore * 0.2 + durationScore * 0.2) * 100);
};

export const deriveBurstConfidence = (
  input: BurstTaxonomyInput,
  burstClass: BurstTaxonomy,
  neighbors: BurstTaxonomyNeighbor[] = input.neighborhood ?? [],
): number => {
  const value = clamp01(Number.isFinite(input.value) ? input.value : 0);
  const neighborValues = neighbors.map((neighbor) => clamp01(neighbor.value));
  const neighborMedian = median(neighborValues);
  const neighborSpread = neighborValues.length > 0
    ? Math.max(...neighborValues) - Math.min(...neighborValues)
    : 0;

  const contrast = Math.min(1, Math.abs(value - neighborMedian) + neighborSpread * 0.35);
  const support = neighbors.length > 0
    ? clamp01(average(neighborValues) + 0.15)
    : 0.45;

  const shapeBonus = burstClass === 'prolonged-peak'
    ? 0.22
    : burstClass === 'isolated-spike'
      ? 0.18
      : burstClass === 'valley'
        ? 0.16
        : 0.08;

  return Math.round(clamp01(0.46 * contrast + 0.34 * support + shapeBonus) * 100);
};

export const classifyBurstWindow = (input: BurstTaxonomyInput): BurstTaxonomyResult => {
  const value = clamp01(Number.isFinite(input.value) ? input.value : 0);
  const count = Math.max(0, Math.round(Number.isFinite(input.count) ? input.count : 0));
  const durationSec = Math.max(0, Number.isFinite(input.durationSec) ? input.durationSec : 0);
  const neighbors = (input.neighborhood ?? []).filter((neighbor) => Number.isFinite(neighbor.value));
  const neighborValues = neighbors.map((neighbor) => clamp01(neighbor.value));
  const neighborCounts = neighbors.map((neighbor) => Math.max(0, neighbor.count));
  const neighborDurations = neighbors.map((neighbor) => Math.max(0, neighbor.durationSec));

  const neighborMedian = median(neighborValues);
  const neighborMax = neighbors.length > 0 ? Math.max(...neighborValues) : value;
  const neighborMin = neighbors.length > 0 ? Math.min(...neighborValues) : value;
  const neighborCountMedian = median(neighborCounts);
  const neighborDurationMedian = median(neighborDurations);
  const neighborAverage = average(neighborValues);

  const globalHigh = 0.72;
  const globalLow = 0.3;
  const highContrast = value >= globalHigh || value >= neighborMedian + 0.16;
  const lowContrast = value <= globalLow || value <= neighborMedian - 0.16;
  const hasNeighborSupport = neighbors.length > 0 && (neighborAverage >= value * 0.84 || neighborMax >= value * 0.92);
  const isolatedShape = durationSec <= Math.max(90, neighborDurationMedian > 0 ? neighborDurationMedian * 0.75 : 180);
  const sustainedShape = durationSec >= Math.max(180, neighborDurationMedian > 0 ? neighborDurationMedian : durationSec)
    || count >= Math.max(3, Math.ceil(neighborCountMedian || 0) + 1);
  const highNeighborContrast = neighborMax - value >= 0.12;
  const lowNeighborContrast = neighborMedian - value >= 0.12 || neighborMin > value + 0.08;

  let burstClass: BurstTaxonomy = 'neutral';
  let tieBreakReason = 'balanced window stays neutral';

  if (highContrast) {
    if (!sustainedShape && isolatedShape && !hasNeighborSupport) {
      burstClass = 'isolated-spike';
      tieBreakReason = neighbors.length === 0
        ? 'single window defaults to isolated spike when no supporting neighborhood is available'
        : 'short, sharp window wins isolated spike because neighbors do not sustain the peak';
    } else {
      burstClass = 'prolonged-peak';
      tieBreakReason = sustainedShape
        ? 'longer run and/or stronger count support makes the peak sustained'
        : 'high signal with supporting neighborhood evidence resolves as prolonged-peak';
    }
  } else if (lowContrast && (neighbors.length === 0 || lowNeighborContrast)) {
    burstClass = 'valley';
    tieBreakReason = neighbors.length === 0
      ? 'low signal stays valley when no stronger neighborhood evidence exists'
      : 'lower-than-neighborhood signal resolves to valley';
  } else if (value >= globalHigh - 0.04 && !sustainedShape && isolatedShape && !hasNeighborSupport) {
    burstClass = 'isolated-spike';
    tieBreakReason = 'tie-break favors isolated spike for a short near-threshold burst';
  } else if (value <= globalLow + 0.04 && (neighbors.length === 0 || lowNeighborContrast)) {
    burstClass = 'valley';
    tieBreakReason = 'tie-break favors valley for a near-threshold low window';
  }

  const burstScore = normalizeScore(value, count, durationSec, neighbors);
  const burstConfidence = deriveBurstConfidence(input, burstClass, neighbors);
  const thresholdSource = describeThresholdSource(neighbors);
  const neighborhoodSummary = formatNeighborhoodSummary(neighbors);
  const rationale = burstClass === 'prolonged-peak'
    ? 'Sustained high activity spans multiple adjacent windows.'
    : burstClass === 'isolated-spike'
      ? 'A brief high burst stands out without strong neighborhood support.'
      : burstClass === 'valley'
        ? 'A comparatively low window sits below its neighborhood.'
        : 'The window is not distinct enough to justify a stronger burst class.';

  return {
    burstClass,
    burstRuleVersion: BURST_TAXONOMY_RULE_VERSION,
    burstScore,
    burstConfidence,
    burstProvenance: `value=${round(value)}; count=${count}; duration=${round(durationSec)}; neighbors=${neighbors.length}`,
    tieBreakReason,
    thresholdSource,
    neighborhoodSummary,
    rationale,
  };
};
