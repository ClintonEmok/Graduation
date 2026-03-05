import type { CubeSpatialConstraint } from '@/store/useCubeSpatialConstraintsStore';

export interface WarpProposalTemporalContext {
  domain: [number, number];
  focusTime: number;
  currentWarpFactor: number;
  hotspotIntensity?: number;
}

export interface WarpProposalPayload {
  warpFactor: number;
  range: [number, number];
}

export interface WarpProposalRationale {
  summary: string;
  densityConcentration: number;
  hotspotCoverage: number;
  confidenceBand: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
}

export interface WarpProposal {
  id: string;
  label: string;
  constraintId: string;
  payload: WarpProposalPayload;
  rationale: WarpProposalRationale;
  score: number;
}

interface RankableProposal {
  proposal: WarpProposal;
  constraint: CubeSpatialConstraint;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const round = (value: number, precision = 2): number => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const asRange = (domain: [number, number], focusTime: number, width: number): [number, number] => {
  const [domainStart, domainEnd] = domain;
  const center = clamp(focusTime, domainStart, domainEnd);
  const half = width / 2;
  const min = clamp(center - half, domainStart, domainEnd);
  const max = clamp(center + half, domainStart, domainEnd);

  if (max === min) {
    const epsilon = Math.min(1, Math.max(0, domainEnd - domainStart));
    return [round(clamp(min - epsilon, domainStart, domainEnd)), round(clamp(max + epsilon, domainStart, domainEnd))];
  }

  return [round(min), round(max)];
};

const confidenceBand = (score: number): WarpProposalRationale['confidenceBand'] => {
  if (score >= 75) {
    return 'High';
  }

  if (score >= 45) {
    return 'Medium';
  }

  return 'Low';
};

const normalizeConstraints = (constraints: CubeSpatialConstraint[]): CubeSpatialConstraint[] =>
  constraints
    .filter((constraint) => constraint.enabled)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

const scoreProposal = (
  constraint: CubeSpatialConstraint,
  temporalContext: WarpProposalTemporalContext
): RankableProposal => {
  const bounds = constraint.geometry.bounds;
  const spanX = Math.max(0.001, bounds.maxX - bounds.minX);
  const spanY = Math.max(0.001, bounds.maxY - bounds.minY);
  const spanZ = Math.max(0.001, bounds.maxZ - bounds.minZ);

  const footprint = spanX * spanZ;
  const volume = spanX * spanY * spanZ;
  const hotspotBase = temporalContext.hotspotIntensity ?? 0.65;

  const densityConcentration = round(clamp((1 / (1 + volume / 160)) * 100, 0, 100));
  const hotspotCoverage = round(clamp((footprint / (footprint + 60)) * hotspotBase * 130, 0, 100));

  const blendedScore = round(clamp(densityConcentration * 0.58 + hotspotCoverage * 0.42, 0, 100));
  const confidenceScore = round(clamp(blendedScore * 0.9 + 10, 0, 100));

  const warpFactor = round(
    clamp(
      temporalContext.currentWarpFactor * 0.45 +
        (densityConcentration / 100) * 0.35 +
        (hotspotCoverage / 100) * 0.2,
      0,
      1
    ),
    3
  );

  const temporalWidth = clamp(spanY * 6 + 8, 10, 48);
  const range = asRange(temporalContext.domain, temporalContext.focusTime, temporalWidth);

  const rationale: WarpProposalRationale = {
    summary: `Prioritize ${constraint.label}: concentrated events and hotspot overlap indicate stronger adaptive gain.`,
    densityConcentration,
    hotspotCoverage,
    confidenceBand: confidenceBand(confidenceScore),
    confidenceScore,
  };

  return {
    constraint,
    proposal: {
      id: `proposal-${constraint.id}`,
      label: `${constraint.label}`,
      constraintId: constraint.id,
      payload: {
        warpFactor,
        range,
      },
      rationale,
      score: blendedScore,
    },
  };
};

export const generateWarpProposals = (
  constraints: CubeSpatialConstraint[],
  temporalContext: WarpProposalTemporalContext
): WarpProposal[] => {
  const enabledConstraints = normalizeConstraints(constraints);

  if (!enabledConstraints.length) {
    return [];
  }

  return enabledConstraints
    .map((constraint) => scoreProposal(constraint, temporalContext))
    .sort((left, right) => {
      if (right.proposal.score !== left.proposal.score) {
        return right.proposal.score - left.proposal.score;
      }

      return left.constraint.id.localeCompare(right.constraint.id);
    })
    .map((entry) => entry.proposal);
};
