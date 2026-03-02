import { detectBoundaries, type BoundaryMethod } from '@/lib/interval-detection';
import { generateWarpProfiles } from '@/lib/warp-generation';
import type { CrimeRecord } from '@/types/crime';
import type {
  AutoProposalBoundaryMethod,
  AutoProposalContext,
  AutoProposalIntervalSet,
  AutoProposalReasonMetadata,
  AutoProposalScoreBreakdown,
  AutoProposalSet,
  AutoProposalWarpProfile,
  RankedAutoProposalSets,
} from '@/types/autoProposalSet';

export interface FullAutoGenerationParams {
  warpCount: number;
  intervalCount: number;
  boundaryMethod: BoundaryMethod;
  snapToUnit: 'hour' | 'day' | 'none';
}

const SCORE_WEIGHTS = {
  coverage: 0.24,
  relevance: 0.2,
  overlap: 0.2,
  continuity: 0.18,
  contextFit: 0.18,
} as const;

const MIN_CONFIDENCE_THRESHOLD = 45;
const TOP_SET_LIMIT = 3;
const ORDERED_METHODS: BoundaryMethod[] = ['peak', 'change-point', 'rule-based'];

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

  const warpCandidates = generateWarpProfiles(crimes, context.timeRange, {
    profileCount: Math.max(1, Math.min(6, params.warpCount || 3)),
    intervalCount: Math.max(3, params.intervalCount || 3),
  }).map<AutoProposalWarpProfile>((profile) => ({
    name: profile.name,
    emphasis: profile.emphasis,
    confidence: profile.confidence,
    intervals: profile.intervals,
  }));

  const intervalCandidates = buildIntervalCandidates(crimes, context, params);

  if (!warpCandidates.length || !intervalCandidates.length) {
    return {
      generatedAt,
      sets: [],
      recommendedId: null,
      reasonMetadata: {
        noResultReason: 'Could not build complete warp + interval packages from current context.',
      },
    };
  }

  const ranked = pairAndRank(warpCandidates, intervalCandidates, context)
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

function buildIntervalCandidates(
  crimes: CrimeRecord[],
  context: AutoProposalContext,
  params: FullAutoGenerationParams
): AutoProposalIntervalSet[] {
  const requestedCount = Math.max(1, Math.min(6, params.intervalCount || 3));
  const methods = [
    params.boundaryMethod,
    ...ORDERED_METHODS.filter((method) => method !== params.boundaryMethod),
  ].slice(0, requestedCount);

  return methods
    .map((method) => {
      const suggestion = detectBoundaries(crimes, context.timeRange, {
        method,
        sensitivity: 'medium',
        snapToUnit: params.snapToUnit,
        boundaryCount: Math.max(3, params.intervalCount || 3),
      });

      return {
        method: suggestion.method as AutoProposalBoundaryMethod,
        boundaries: suggestion.boundaries,
        confidence: suggestion.confidence,
      } satisfies AutoProposalIntervalSet;
    })
    .filter((candidate) => candidate.boundaries.length > 0)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.method.localeCompare(b.method);
    });
}

function pairAndRank(
  warps: AutoProposalWarpProfile[],
  intervals: AutoProposalIntervalSet[],
  context: AutoProposalContext
): AutoProposalSet[] {
  const candidates: AutoProposalSet[] = [];

  for (const warp of warps) {
    for (const intervalSet of intervals) {
      const score = scoreProposalSet(warp, intervalSet, context);
      candidates.push({
        id: `${warp.emphasis}:${intervalSet.method}`,
        rank: 0,
        isRecommended: false,
        confidence: Math.round((warp.confidence + intervalSet.confidence + score.total) / 3),
        score,
        warp,
        intervals: intervalSet,
      });
    }
  }

  return candidates.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.warp.emphasis !== b.warp.emphasis) return a.warp.emphasis.localeCompare(b.warp.emphasis);
    return a.intervals.method.localeCompare(b.intervals.method);
  });
}

function scoreProposalSet(
  warp: AutoProposalWarpProfile,
  intervals: AutoProposalIntervalSet,
  context: AutoProposalContext
): AutoProposalScoreBreakdown {
  const coverage = scoreCoverage(warp, intervals);
  const relevance = scoreRelevance(warp, intervals);
  const overlap = scoreOverlap(warp, intervals, context);
  const continuity = scoreContinuity(warp, intervals);
  const contextFit = scoreContextFit(context);

  const total = Math.round(
    coverage * SCORE_WEIGHTS.coverage +
      relevance * SCORE_WEIGHTS.relevance +
      overlap * SCORE_WEIGHTS.overlap +
      continuity * SCORE_WEIGHTS.continuity +
      contextFit * SCORE_WEIGHTS.contextFit
  );

  return {
    coverage,
    relevance,
    overlap,
    continuity,
    contextFit,
    total,
  };
}

function scoreCoverage(warp: AutoProposalWarpProfile, intervals: AutoProposalIntervalSet): number {
  const hasDenseWarp = warp.intervals.length >= 3 ? 100 : 70;
  const intervalCoverage = Math.min(100, 60 + intervals.boundaries.length * 8);
  return Math.round((hasDenseWarp + intervalCoverage) / 2);
}

function scoreRelevance(warp: AutoProposalWarpProfile, intervals: AutoProposalIntervalSet): number {
  const emphasisMultiplier: Record<AutoProposalWarpProfile['emphasis'], number> = {
    aggressive: 0.95,
    balanced: 1,
    conservative: 1.05,
  };
  const raw = ((warp.confidence + intervals.confidence) / 2) * emphasisMultiplier[warp.emphasis];
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function scoreOverlap(
  warp: AutoProposalWarpProfile,
  intervals: AutoProposalIntervalSet,
  context: AutoProposalContext
): number {
  if (!intervals.boundaries.length || !warp.intervals.length) {
    return 0;
  }

  const range = Math.max(1, context.timeRange.end - context.timeRange.start);
  const boundaryPercents = intervals.boundaries.map((boundary) => ((boundary - context.timeRange.start) / range) * 100);

  let alignedCount = 0;
  for (const percent of boundaryPercents) {
    const nearEdge = warp.intervals.some((interval) => {
      return (
        Math.abs(percent - interval.startPercent) <= 7 ||
        Math.abs(percent - interval.endPercent) <= 7
      );
    });
    if (nearEdge) {
      alignedCount += 1;
    }
  }

  return Math.round((alignedCount / boundaryPercents.length) * 100);
}

function scoreContinuity(warp: AutoProposalWarpProfile, intervals: AutoProposalIntervalSet): number {
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

  const orderedBoundaries = [...intervals.boundaries].sort((a, b) => a - b);
  const monotonic = orderedBoundaries.every((boundary, index) => {
    return index === 0 || boundary > orderedBoundaries[index - 1];
  });

  return Math.round((smoothness + (monotonic ? 100 : 50)) / 2);
}

function scoreContextFit(context: AutoProposalContext): number {
  const hasCrimeTypeFocus = context.crimeTypes.length > 0;
  const range = Math.max(1, context.timeRange.end - context.timeRange.start);
  const twoYearsInSeconds = 60 * 60 * 24 * 365 * 2;

  let score = context.isFullDataset ? 70 : 80;
  if (hasCrimeTypeFocus) {
    score += 10;
  }
  if (range < twoYearsInSeconds) {
    score += 5;
  }

  return Math.min(100, score);
}
