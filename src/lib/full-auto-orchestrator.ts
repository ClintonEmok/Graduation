import { generateWarpProfiles } from '@/lib/warp-generation';
import type { CrimeRecord } from '@/types/crime';
import type {
  AutoProposalContext,
  AutoProposalScoreBreakdown,
  AutoProposalSet,
  AutoProposalWarpProfile,
  RankedAutoProposalSets,
} from '@/types/autoProposalSet';

export interface FullAutoGenerationParams {
  warpCount: number;
  snapToUnit: 'hour' | 'day' | 'none';
}

const SCORE_WEIGHTS = {
  relevance: 0.4,
  continuity: 0.3,
  overlapMin: 0.2,
  coverage: 0.1,
} as const;

const OVERLAP_PENALTY_MULTIPLIER = 0.5;

const WEIGHT_SUM = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(WEIGHT_SUM - 1.0) > 0.001) {
  throw new Error(`Weights must sum to 1.0, got ${WEIGHT_SUM}`);
}

const MIN_CONFIDENCE_THRESHOLD = 45;
const TOP_SET_LIMIT = 3;

export function generateRankedAutoProposalSets(options: {
  crimes: CrimeRecord[];
  context: AutoProposalContext;
  params: FullAutoGenerationParams;
}): RankedAutoProposalSets {
  const { crimes, context, params } = options;
  const generatedAt = Date.now();

  if (!crimes.length || context.timeRange.end <= context.timeRange.start) {
    return {
      generatedAt,
      sets: [],
      recommendedId: null,
      reasonMetadata: {
        noResultReason: 'Insufficient data in selected range. Expand date range or relax filters.',
      },
    };
  }

  // Generate warp profiles - each becomes a standalone package
  const warpCandidates = generateWarpProfiles(crimes, context.timeRange, {
    profileCount: Math.max(1, Math.min(6, params.warpCount || 3)),
    intervalCount: Math.max(3, 3),
  }).map<AutoProposalWarpProfile>((profile) => ({
    name: profile.name,
    emphasis: profile.emphasis,
    confidence: profile.confidence,
    intervals: profile.intervals,
  }));

  if (!warpCandidates.length) {
    return {
      generatedAt,
      sets: [],
      recommendedId: null,
      reasonMetadata: {
        noResultReason: 'Could not build warp packages from current context.',
      },
    };
  }

  // Rank warp-only packages
  const ranked = warpCandidates
    .map((warp): AutoProposalSet => {
      const score = scoreWarpOnly(warp, context);
      return {
        id: warp.emphasis,
        rank: 0,
        isRecommended: false,
        confidence: Math.round((warp.confidence + score.total) / 2),
        score,
        warp,
      };
    })
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.warp.emphasis.localeCompare(b.warp.emphasis);
    })
    .slice(0, TOP_SET_LIMIT)
    .map((set, index) => ({
      ...set,
      rank: index + 1,
      isRecommended: index === 0,
    }));

  if (!ranked.length) {
    return {
      generatedAt,
      sets: [],
      recommendedId: null,
      reasonMetadata: {
        noResultReason: 'Ranking produced no valid proposal sets. Try broadening context filters.',
      },
    };
  }

  const hasLowConfidence = crimes.length < 25 || ranked[0].confidence < MIN_CONFIDENCE_THRESHOLD;

  return {
    generatedAt,
    sets: ranked.map((set) => ({
      ...set,
      reasonMetadata: {
        ...set.reasonMetadata,
        ...(hasLowConfidence
          ? { lowConfidenceReason: 'Signal is weak for this context; review score breakdown before accepting.' }
          : {}),
      },
    })),
    recommendedId: ranked[0]?.id ?? null,
    reasonMetadata: hasLowConfidence
      ? { lowConfidenceReason: 'Low confidence output. Consider expanding date range or reducing filters.' }
      : undefined,
  };
}

function scoreWarpOnly(warp: AutoProposalWarpProfile, context: AutoProposalContext): AutoProposalScoreBreakdown {
  const coverage = scoreWarpCoverage(warp);
  const relevance = scoreWarpRelevance(warp);
  const continuity = scoreWarpContinuity(warp);
  const overlapMin = 100;

  const total = Math.round(
    relevance * SCORE_WEIGHTS.relevance +
      continuity * SCORE_WEIGHTS.continuity +
      overlapMin * SCORE_WEIGHTS.overlapMin +
      coverage * SCORE_WEIGHTS.coverage
  );

  return {
    coverage,
    relevance,
    overlap: overlapMin,
    continuity,
    contextFit: 0,
    total,
  };
}

function scoreWarpCoverage(warp: AutoProposalWarpProfile): number {
  const hasDenseWarp = warp.intervals.length >= 3 ? 100 : 70;
  return hasDenseWarp;
}

function scoreWarpRelevance(warp: AutoProposalWarpProfile): number {
  const emphasisMultiplier: Record<AutoProposalWarpProfile['emphasis'], number> = {
    aggressive: 0.95,
    balanced: 1,
    conservative: 1.05,
  };
  const raw = warp.confidence * emphasisMultiplier[warp.emphasis];
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function scoreWarpContinuity(warp: AutoProposalWarpProfile): number {
  const strengths = warp.intervals.map((interval) => interval.strength);
  if (strengths.length < 2) {
    return 60;
  }

  let totalStep = 0;
  for (let i = 1; i < strengths.length; i += 1) {
    totalStep += Math.abs(strengths[i] - strengths[i - 1]);
  }
  const avgStep = totalStep / (strengths.length - 1);
  const smoothness = Math.max(0, 100 - avgStep * 50);

  return Math.round(smoothness);
}
