import type { AutoProposalSet } from '@/types/autoProposalSet';

export interface FullAutoAcceptanceArtifactPlan {
  warpIntervals: AutoProposalSet['warp']['intervals'];
  intervalBoundaries: number[] | null;
  warning: string | null;
}

export function planFullAutoAcceptanceArtifacts(
  proposalSet: AutoProposalSet
): FullAutoAcceptanceArtifactPlan {
  const normalizedBoundaries = normalizeIntervalBoundaries(proposalSet.intervals?.boundaries);

  if (!normalizedBoundaries) {
    return {
      warpIntervals: proposalSet.warp.intervals,
      intervalBoundaries: null,
      warning:
        'Accepted full-auto package is missing valid interval boundaries. Applied warp slices only (legacy/degraded payload).',
    };
  }

  return {
    warpIntervals: proposalSet.warp.intervals,
    intervalBoundaries: normalizedBoundaries,
    warning: null,
  };
}

function normalizeIntervalBoundaries(boundaries?: number[]): number[] | null {
  if (!Array.isArray(boundaries)) {
    return null;
  }

  const normalized = Array.from(new Set(boundaries.filter((boundary) => Number.isFinite(boundary))))
    .map((boundary) => Number(boundary))
    .sort((a, b) => a - b);

  return normalized.length >= 2 ? normalized : null;
}
