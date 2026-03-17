import type { CrimeRecord } from '@/types/crime';
import { buildSpatialSummary, type SpatialSummaryResult } from './spatial';
import { buildTemporalSummary, type TemporalSummaryResult } from './temporal';

export interface ContextDiagnosticsInput {
  timestamps: ArrayLike<number>;
  crimes: ArrayLike<CrimeRecord>;
}

export interface ContextDiagnosticsResult {
  temporal: TemporalSummaryResult;
  spatial: SpatialSummaryResult;
}

export const buildContextDiagnostics = (input: ContextDiagnosticsInput): ContextDiagnosticsResult => {
  const temporal = buildTemporalSummary({ timestamps: input.timestamps });
  const spatial = buildSpatialSummary({ crimes: input.crimes });

  return {
    temporal,
    spatial,
  };
};

export {
  buildTemporalSummary,
  buildSpatialSummary,
};

export type {
  TemporalSummaryResult,
  SpatialSummaryResult,
};
