import type { CubeSpatialConstraint } from '@/store/useCubeSpatialConstraintsStore';

export interface TemporalBurstWindow {
  id: string;
  start: number;
  end: number;
  peak: number;
}

export interface IntervalProposalRationale {
  summary: string;
  densityConcentration: number;
  hotspotCoverage: number;
  confidenceBand: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
}

export interface IntervalProposalQuality {
  densityConcentration: number;
  hotspotCoverage: number;
}

export interface IntervalProposal {
  id: string;
  label: string;
  constraintId: string;
  constraintLabel: string;
  range: [number, number];
  rationale: IntervalProposalRationale;
  confidence: {
    band: IntervalProposalRationale['confidenceBand'];
    score: number;
  };
  quality: IntervalProposalQuality;
  score: number;
}

interface RankableIntervalProposal {
  proposal: IntervalProposal;
  constraintId: string;
  burstId: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const round = (value: number, precision = 2): number => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const normalizeConstraints = (constraints: CubeSpatialConstraint[]): CubeSpatialConstraint[] =>
  constraints
    .filter((constraint) => constraint.enabled)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

const normalizeBurstWindows = (burstWindows: TemporalBurstWindow[]): TemporalBurstWindow[] =>
  burstWindows
    .filter((window) => window.end > window.start)
    .slice()
    .sort((left, right) => {
      if (right.peak !== left.peak) {
        return right.peak - left.peak;
      }

      if (left.start !== right.start) {
        return left.start - right.start;
      }

      return left.id.localeCompare(right.id);
    });

const confidenceBand = (score: number): IntervalProposalRationale['confidenceBand'] => {
  if (score >= 75) {
    return 'High';
  }

  if (score >= 45) {
    return 'Medium';
  }

  return 'Low';
};

const overlapRatio = (left: [number, number], right: [number, number]): number => {
  const start = Math.max(left[0], right[0]);
  const end = Math.min(left[1], right[1]);
  if (end <= start) {
    return 0;
  }

  const overlap = end - start;
  const leftSpan = Math.max(0.0001, left[1] - left[0]);
  const rightSpan = Math.max(0.0001, right[1] - right[0]);
  const base = Math.min(leftSpan, rightSpan);

  return overlap / base;
};

const shouldSuppress = (candidate: RankableIntervalProposal, accepted: RankableIntervalProposal[]): boolean =>
  accepted.some((existing) => {
    if (existing.constraintId !== candidate.constraintId) {
      return false;
    }

    return overlapRatio(existing.proposal.range, candidate.proposal.range) >= 0.55;
  });

const scoreProposal = (
  constraint: CubeSpatialConstraint,
  burstWindow: TemporalBurstWindow
): RankableIntervalProposal => {
  const bounds = constraint.geometry.bounds;
  const spanX = Math.max(0.001, bounds.maxX - bounds.minX);
  const spanY = Math.max(0.001, bounds.maxY - bounds.minY);
  const spanZ = Math.max(0.001, bounds.maxZ - bounds.minZ);

  const volume = spanX * spanY * spanZ;
  const footprint = spanX * spanZ;
  const intervalLength = Math.max(0.001, burstWindow.end - burstWindow.start);

  const peak = clamp(burstWindow.peak, 0, 1);
  const densityConcentration = round(clamp((peak * 72 + (1 / (1 + volume / 180)) * 28), 0, 100));
  const hotspotCoverage = round(clamp((peak * 55 + (footprint / (footprint + 70)) * 45), 0, 100));
  const intervalSharpness = clamp((16 / (16 + intervalLength)) * 100, 0, 100);

  const score = round(clamp(densityConcentration * 0.5 + hotspotCoverage * 0.35 + intervalSharpness * 0.15, 0, 100));
  const confidenceScore = round(clamp(score * 0.88 + peak * 12, 0, 100));
  const band = confidenceBand(confidenceScore);

  const range: [number, number] = [round(burstWindow.start, 3), round(burstWindow.end, 3)];
  const summary = `Focus ${constraint.label}: burst density and hotspot overlap indicate a high-value slice interval.`;

  const proposal: IntervalProposal = {
    id: `interval-${constraint.id}-${burstWindow.id}`,
    label: `${constraint.label} interval ${range[0]}-${range[1]}`,
    constraintId: constraint.id,
    constraintLabel: constraint.label,
    range,
    rationale: {
      summary,
      densityConcentration,
      hotspotCoverage,
      confidenceBand: band,
      confidenceScore,
    },
    confidence: {
      band,
      score: confidenceScore,
    },
    quality: {
      densityConcentration,
      hotspotCoverage,
    },
    score,
  };

  return {
    proposal,
    constraintId: constraint.id,
    burstId: burstWindow.id,
  };
};

export const generateIntervalProposals = (
  constraints: CubeSpatialConstraint[],
  burstWindows: TemporalBurstWindow[]
): IntervalProposal[] => {
  const enabledConstraints = normalizeConstraints(constraints);
  const normalizedBursts = normalizeBurstWindows(burstWindows);

  if (!enabledConstraints.length || !normalizedBursts.length) {
    return [];
  }

  const ranked = enabledConstraints.flatMap((constraint) =>
    normalizedBursts.map((burstWindow) => scoreProposal(constraint, burstWindow))
  );

  const sorted = ranked.sort((left, right) => {
    if (right.proposal.score !== left.proposal.score) {
      return right.proposal.score - left.proposal.score;
    }

    if (left.constraintId !== right.constraintId) {
      return left.constraintId.localeCompare(right.constraintId);
    }

    if (left.proposal.range[0] !== right.proposal.range[0]) {
      return left.proposal.range[0] - right.proposal.range[0];
    }

    return left.burstId.localeCompare(right.burstId);
  });

  const accepted: RankableIntervalProposal[] = [];
  for (const candidate of sorted) {
    if (shouldSuppress(candidate, accepted)) {
      continue;
    }

    accepted.push(candidate);
  }

  return accepted.map((entry) => entry.proposal);
};
