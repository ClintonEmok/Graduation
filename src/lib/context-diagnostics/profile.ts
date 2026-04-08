import type { SpatialSummaryResult } from './spatial';
import type { TemporalSummaryResult } from './temporal';

export type DynamicProfileLabel =
  | 'Concentrated Burst Pattern'
  | 'Steady Local Pattern'
  | 'Distributed Mixed Pattern'
  | 'Citywide Diffuse Pattern'
  | 'No strong profile';

export interface DynamicProfileInput {
  temporal: TemporalSummaryResult;
  spatial: SpatialSummaryResult;
}

export interface DynamicProfileResult {
  label: DynamicProfileLabel;
  state: 'strong' | 'weak-signal' | 'no-strong';
  warning: string | null;
  confidence: number;
  scoreBreakdown: {
    concentration: number;
    hotspotDominance: number;
    dataCoverage: number;
    finalScore: number;
  };
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getCoverageScore = (temporal: TemporalSummaryResult, spatial: SpatialSummaryResult): number => {
  let score = 0;
  if (temporal.status === 'available') score += 0.5;
  if (spatial.status === 'available') score += 0.5;
  return score;
};

const getConcentrationScore = (temporal: TemporalSummaryResult): number => {
  if (temporal.status !== 'available' || temporal.totalEvents <= 0) return 0;
  return clamp(temporal.dominantWindow.eventCount / temporal.totalEvents, 0, 1);
};

const getHotspotDominanceScore = (spatial: SpatialSummaryResult): number => {
  if (spatial.status !== 'available' || spatial.totalEvents <= 0 || spatial.hotspots.length === 0) return 0;
  return clamp(spatial.hotspots[0]?.supportCount / spatial.totalEvents, 0, 1);
};

const resolveLabel = (
  concentration: number,
  hotspotDominance: number,
  finalScore: number,
): DynamicProfileLabel => {
  if (finalScore < 0.35) return 'No strong profile';
  if (concentration < 0.4 && hotspotDominance < 0.4) return 'No strong profile';
  if (concentration >= 0.7 && hotspotDominance >= 0.5) return 'Concentrated Burst Pattern';
  if (concentration < 0.45 && hotspotDominance >= 0.45) return 'Steady Local Pattern';
  if (concentration >= 0.45 && hotspotDominance < 0.3) return 'Distributed Mixed Pattern';
  return 'Citywide Diffuse Pattern';
};

export const resolveDynamicProfile = (input: DynamicProfileInput): DynamicProfileResult => {
  const concentration = getConcentrationScore(input.temporal);
  const hotspotDominance = getHotspotDominanceScore(input.spatial);
  const dataCoverage = getCoverageScore(input.temporal, input.spatial);
  const finalScore = clamp(concentration * 0.45 + hotspotDominance * 0.35 + dataCoverage * 0.2, 0, 1);
  const label = resolveLabel(concentration, hotspotDominance, finalScore);

  if (label === 'No strong profile') {
    return {
      label,
      state: 'no-strong',
      warning: 'No strong profile',
      confidence: Number(finalScore.toFixed(3)),
      scoreBreakdown: {
        concentration: Number(concentration.toFixed(3)),
        hotspotDominance: Number(hotspotDominance.toFixed(3)),
        dataCoverage: Number(dataCoverage.toFixed(3)),
        finalScore: Number(finalScore.toFixed(3)),
      },
    };
  }

  if (finalScore < 0.65 || dataCoverage < 1) {
    return {
      label,
      state: 'weak-signal',
      warning: 'Signal is weak',
      confidence: Number(finalScore.toFixed(3)),
      scoreBreakdown: {
        concentration: Number(concentration.toFixed(3)),
        hotspotDominance: Number(hotspotDominance.toFixed(3)),
        dataCoverage: Number(dataCoverage.toFixed(3)),
        finalScore: Number(finalScore.toFixed(3)),
      },
    };
  }

  return {
    label,
    state: 'strong',
    warning: null,
    confidence: Number(finalScore.toFixed(3)),
    scoreBreakdown: {
      concentration: Number(concentration.toFixed(3)),
      hotspotDominance: Number(hotspotDominance.toFixed(3)),
      dataCoverage: Number(dataCoverage.toFixed(3)),
      finalScore: Number(finalScore.toFixed(3)),
    },
  };
};
