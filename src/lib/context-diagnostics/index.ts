import type { CrimeRecord } from '@/types/crime';
import { buildProfileComparison, type ProfileComparison } from './compare';
import { resolveDynamicProfile, type DynamicProfileResult } from './profile';
import { buildSpatialSummary, type SpatialSummaryResult } from './spatial';
import { buildTemporalSummary, type TemporalSummaryResult } from './temporal';

export interface ContextDiagnosticsInput {
  timestamps: ArrayLike<number>;
  crimes: ArrayLike<CrimeRecord>;
  staticProfileName?: string | null;
}

export interface ContextDiagnosticsResult {
  temporal: TemporalSummaryResult;
  spatial: SpatialSummaryResult;
  dynamicProfile: DynamicProfileResult;
  comparison: ProfileComparison;
}

export const buildContextDiagnostics = (input: ContextDiagnosticsInput): ContextDiagnosticsResult => {
  const temporal = buildTemporalSummary({ timestamps: input.timestamps });
  const spatial = buildSpatialSummary({ crimes: input.crimes });
  const dynamicProfile = resolveDynamicProfile({ temporal, spatial });
  const comparison = buildProfileComparison(input.staticProfileName ?? null, dynamicProfile);

  return {
    temporal,
    spatial,
    dynamicProfile,
    comparison,
  };
};

export {
  buildTemporalSummary,
  buildSpatialSummary,
  resolveDynamicProfile,
  buildProfileComparison,
};

export type {
  TemporalSummaryResult,
  SpatialSummaryResult,
  DynamicProfileResult,
  ProfileComparison,
};
