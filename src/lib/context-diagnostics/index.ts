import type { CrimeRecord } from '@/types/crime';
import type { NeighbourhoodSummaryResult } from '../neighbourhood';
import { buildProfileComparison, type ProfileComparison } from './compare';
import { resolveDynamicProfile, type DynamicProfileResult } from './profile';
import { buildSpatialSummary, type SpatialSummaryResult } from './spatial';
import { buildTemporalSummary, type TemporalSummaryResult } from './temporal';

export interface ContextDiagnosticsInput {
  timestamps: ArrayLike<number>;
  crimes: ArrayLike<CrimeRecord>;
  staticProfileName?: string | null;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

export interface ContextDiagnosticsResult {
  temporal: TemporalSummaryResult;
  spatial: SpatialSummaryResult;
  neighbourhood: NeighbourhoodSummaryResult;
  dynamicProfile: DynamicProfileResult;
  comparison: ProfileComparison;
}

export async function buildContextDiagnostics(input: ContextDiagnosticsInput): Promise<ContextDiagnosticsResult> {
  const temporal = buildTemporalSummary({ timestamps: input.timestamps });
  const spatial = buildSpatialSummary({ crimes: input.crimes });

  let neighbourhood: NeighbourhoodSummaryResult = { status: 'missing', notice: 'Neighbourhood data requires bounds' };
  if (input.bounds) {
    const { buildNeighbourhoodSummary } = await import('../neighbourhood');
    neighbourhood = await buildNeighbourhoodSummary({ bounds: input.bounds });
  }

  const dynamicProfile = resolveDynamicProfile({ temporal, spatial });
  const comparison = buildProfileComparison(input.staticProfileName ?? null, dynamicProfile);

  return {
    temporal,
    spatial,
    neighbourhood,
    dynamicProfile,
    comparison,
  };
}

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
  NeighbourhoodSummaryResult,
};
