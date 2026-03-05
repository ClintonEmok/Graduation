import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import type { WarpProposal } from './warpProposalEngine';

const DEFAULT_BIN_COUNT = 120;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveDomain = (range: [number, number], fallback: [number, number]): [number, number] => {
  const [fallbackStart, fallbackEnd] = fallback;
  const [rawStart, rawEnd] = range[0] <= range[1] ? range : [range[1], range[0]];

  if (!Number.isFinite(fallbackStart) || !Number.isFinite(fallbackEnd) || fallbackEnd <= fallbackStart) {
    return [rawStart, rawEnd];
  }

  return [Math.min(fallbackStart, rawStart), Math.max(fallbackEnd, rawEnd)];
};

const buildProposalMaps = (
  domain: [number, number],
  proposalRange: [number, number],
  binCount: number
): {
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
} => {
  const safeBinCount = Math.max(16, binCount);
  const [domainStart, domainEnd] = domain;
  const [rangeStart, rangeEnd] = proposalRange[0] <= proposalRange[1]
    ? proposalRange
    : [proposalRange[1], proposalRange[0]];
  const span = Math.max(0.0001, domainEnd - domainStart);
  const center = (rangeStart + rangeEnd) / 2;
  const sigma = Math.max(0.001, (rangeEnd - rangeStart) / 2.8);

  const densityMap = new Float32Array(safeBinCount);
  const burstinessMap = new Float32Array(safeBinCount);
  const warpMap = new Float32Array(safeBinCount);
  const weighted = new Float32Array(safeBinCount);

  let totalWeight = 0;
  for (let index = 0; index < safeBinCount; index += 1) {
    const t = domainStart + (span * index) / Math.max(1, safeBinCount - 1);
    const distance = (t - center) / sigma;
    const gaussian = Math.exp(-0.5 * distance * distance);
    const inRangeBoost = t >= rangeStart && t <= rangeEnd ? 0.45 : 0;

    const density = clamp(gaussian + inRangeBoost, 0, 1.6);
    const burstiness = clamp(density * 0.85 + 0.1, 0, 1.6);
    const weight = clamp(0.25 + density * 0.75, 0.1, 2.2);

    densityMap[index] = density;
    burstinessMap[index] = burstiness;
    weighted[index] = weight;
    totalWeight += weight;
  }

  let accumulated = 0;
  for (let index = 0; index < safeBinCount; index += 1) {
    accumulated += weighted[index] ?? 0;
    const normalized = totalWeight > 0 ? accumulated / totalWeight : index / Math.max(1, safeBinCount - 1);
    warpMap[index] = domainStart + normalized * span;
  }

  return { densityMap, burstinessMap, warpMap };
};

export const applyWarpProposal = (proposal: WarpProposal): void => {
  const adaptiveState = useAdaptiveStore.getState();
  const nextDomain = resolveDomain(proposal.payload.range, adaptiveState.mapDomain);
  const nextBinCount = adaptiveState.warpMap?.length ?? DEFAULT_BIN_COUNT;
  const { densityMap, burstinessMap, warpMap } = buildProposalMaps(
    nextDomain,
    proposal.payload.range,
    nextBinCount
  );

  adaptiveState.setWarpSource('proposal-applied');
  adaptiveState.setWarpFactor(proposal.payload.warpFactor);
  adaptiveState.setPrecomputedMaps(densityMap, burstinessMap, warpMap, nextDomain);
};
