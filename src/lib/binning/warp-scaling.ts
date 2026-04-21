const MIN_WARP_WEIGHT = 0.25;
const MAX_WARP_WEIGHT = 4;
const DEFAULT_MINIMUM_WIDTH_SHARE = 0.08;
const EPSILON = 1e-9;

export type ComparableWarpGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ComparableWarpBinInput {
  id: string;
  startTime: number;
  endTime: number;
  count: number;
  granularity: ComparableWarpGranularity;
  hintWeight?: number;
}

export interface ComparableWarpScore extends ComparableWarpBinInput {
  peerRelativeScore: number;
  normalizedScore: number;
  warpWeight: number;
  widthShare: number;
  isNeutralPartition: boolean;
}

export interface ComparableWarpScoreResult {
  bins: ComparableWarpScore[];
  neutralFallback: boolean;
  granularity: ComparableWarpGranularity | null;
}

export interface ComparableWarpMapResult extends ComparableWarpScoreResult {
  boundaries: Float32Array;
  minimumWidthShare: number;
}

export interface ComparableWarpMapOptions {
  minimumWidthShare?: number;
  minWarpWeight?: number;
  maxWarpWeight?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const isComparableWarpGranularity = (value: string): value is ComparableWarpGranularity =>
  value === 'hourly' || value === 'daily' || value === 'weekly' || value === 'monthly';

const normalizeGranularity = (value: unknown): ComparableWarpGranularity | null =>
  typeof value === 'string' && isComparableWarpGranularity(value) ? value : null;

const isValidComparableWarpBin = (bin: ComparableWarpBinInput): boolean =>
  Boolean(
    bin
    && typeof bin.id === 'string'
    && Number.isFinite(bin.startTime)
    && Number.isFinite(bin.endTime)
    && bin.endTime > bin.startTime
    && Number.isFinite(bin.count)
    && bin.count >= 0
    && normalizeGranularity(bin.granularity) !== null
  );

const clampMinimumWidthShare = (value: number, binCount: number): number => {
  const finite = Number.isFinite(value) ? value : DEFAULT_MINIMUM_WIDTH_SHARE;
  const positive = Math.max(0, finite);
  const upperBound = binCount > 0 ? Math.min(0.45, 1 / (binCount * 2)) : DEFAULT_MINIMUM_WIDTH_SHARE;
  return Math.min(upperBound, positive || DEFAULT_MINIMUM_WIDTH_SHARE);
};

export const clampComparableWarpWeight = (
  value: number,
  min = MIN_WARP_WEIGHT,
  max = MAX_WARP_WEIGHT,
): number => {
  const finite = Number.isFinite(value) ? value : 1;
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return Math.min(normalizedMax, Math.max(normalizedMin, finite));
};

const createNeutralScore = (bin: ComparableWarpBinInput): ComparableWarpScore => ({
  ...bin,
  peerRelativeScore: 1,
  normalizedScore: 0.5,
  warpWeight: 1,
  widthShare: 0,
  isNeutralPartition: true,
});

const toComparableScore = (
  bin: ComparableWarpBinInput,
  peerRelativeScore: number,
  minimumWarpWeight: number,
  maximumWarpWeight: number,
  hintWeight: number,
): ComparableWarpScore => {
  const warpWeight = clampComparableWarpWeight(peerRelativeScore * hintWeight, minimumWarpWeight, maximumWarpWeight);
  return {
    ...bin,
    hintWeight: Number.isFinite(bin.hintWeight) ? bin.hintWeight : undefined,
    peerRelativeScore,
    normalizedScore: clamp01(0.5 + ((peerRelativeScore - 1) * 0.5)),
    warpWeight,
    widthShare: 0,
    isNeutralPartition: Math.abs(peerRelativeScore - 1) < 1e-6 && Math.abs(hintWeight - 1) < 1e-6,
  };
};

export const scoreComparableWarpBins = (
  bins: ComparableWarpBinInput[],
  options: ComparableWarpMapOptions = {},
): ComparableWarpScoreResult => {
  if (!Array.isArray(bins) || bins.length === 0) {
    return {
      bins: [],
      neutralFallback: true,
      granularity: null,
    };
  }

  const normalizedGranularity = normalizeGranularity(bins[0]?.granularity);
  const valid = normalizedGranularity !== null && bins.every((bin) => isValidComparableWarpBin(bin) && bin.granularity === normalizedGranularity);
  if (!valid || normalizedGranularity === null) {
    return {
      bins: bins.map(createNeutralScore),
      neutralFallback: true,
      granularity: normalizedGranularity,
    };
  }

  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return {
      bins: bins.map(createNeutralScore),
      neutralFallback: true,
      granularity: normalizedGranularity,
    };
  }

  const peerAverage = totalCount / bins.length;
  if (!Number.isFinite(peerAverage) || peerAverage <= EPSILON) {
    return {
      bins: bins.map(createNeutralScore),
      neutralFallback: true,
      granularity: normalizedGranularity,
    };
  }

  const minimumWarpWeight = options.minWarpWeight ?? MIN_WARP_WEIGHT;
  const maximumWarpWeight = options.maxWarpWeight ?? MAX_WARP_WEIGHT;
  const scoredBins = bins.map((bin) => {
    const peerRelativeScore = bin.count / peerAverage;
    const hintWeight = Number.isFinite(bin.hintWeight) ? clampComparableWarpWeight(bin.hintWeight as number, minimumWarpWeight, maximumWarpWeight) : 1;
    return toComparableScore(bin, peerRelativeScore, minimumWarpWeight, maximumWarpWeight, hintWeight);
  });

  const neutralFallback = scoredBins.every((bin) => Math.abs(bin.peerRelativeScore - 1) < 1e-6 && Math.abs((bin.hintWeight ?? 1) - 1) < 1e-6);

  return {
    bins: scoredBins,
    neutralFallback,
    granularity: normalizedGranularity,
  };
};

export const buildComparableWarpMap = (
  bins: ComparableWarpBinInput[] | ComparableWarpScore[],
  domain: [number, number],
  options: ComparableWarpMapOptions = {},
): ComparableWarpMapResult | null => {
  if (!Array.isArray(bins) || bins.length === 0) {
    return null;
  }

  const scoredInput = bins as ComparableWarpScore[];
  const scored = 'peerRelativeScore' in (scoredInput[0] ?? {})
    ? scoredInput
    : scoreComparableWarpBins(bins as ComparableWarpBinInput[], options).bins;

  if (scored.length === 0) {
    return null;
  }

  const [domainStart, domainEnd] = domain[0] <= domain[1] ? domain : [domain[1], domain[0]];
  const domainSpan = Math.max(EPSILON, domainEnd - domainStart);
  const minimumWidthShare = clampMinimumWidthShare(options.minimumWidthShare ?? DEFAULT_MINIMUM_WIDTH_SHARE, scored.length);

  const weights = scored.map((bin) => Math.max(EPSILON, Number.isFinite(bin.warpWeight) ? bin.warpWeight : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const remainingShare = Math.max(0, 1 - (minimumWidthShare * scored.length));

  const widthShares = weights.map((weight) => {
    if (!Number.isFinite(totalWeight) || totalWeight <= EPSILON || remainingShare <= EPSILON) {
      return 1 / scored.length;
    }

    return minimumWidthShare + ((weight / totalWeight) * remainingShare);
  });

  const totalShare = widthShares.reduce((sum, share) => sum + share, 0);
  const normalizedShares = totalShare > EPSILON
    ? widthShares.map((share) => share / totalShare)
    : Array.from({ length: scored.length }, () => 1 / scored.length);

  const boundaries = new Float32Array(scored.length + 1);
  boundaries[0] = domainStart;

  let cursor = domainStart;
  for (let index = 0; index < scored.length; index += 1) {
    const share = normalizedShares[index] ?? 0;
    cursor += share * domainSpan;
    boundaries[index + 1] = index === scored.length - 1 ? domainEnd : cursor;
  }

  const withWidthShares = scored.map((bin, index) => ({
    ...bin,
    widthShare: normalizedShares[index] ?? 0,
  }));

  return {
    bins: withWidthShares,
    boundaries,
    neutralFallback: withWidthShares.every((bin) => bin.isNeutralPartition),
    granularity: withWidthShares[0]?.granularity ?? null,
    minimumWidthShare,
  };
};
