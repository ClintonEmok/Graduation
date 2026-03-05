/* @vitest-environment node */
import { describe, expect, test } from 'vitest';
import { generateWarpProposals, type WarpProposalTemporalContext } from './warpProposalEngine';
import type { CubeSpatialConstraint } from '@/store/useCubeSpatialConstraintsStore';

const temporalContext: WarpProposalTemporalContext = {
  domain: [0, 100],
  focusTime: 48,
  currentWarpFactor: 0.3,
  hotspotIntensity: 0.7,
};

const constraints: CubeSpatialConstraint[] = [
  {
    id: 'constraint-englewood',
    label: 'Englewood (CA 68)',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 0,
        maxX: 8,
        minY: 2,
        maxY: 6,
        minZ: 1,
        maxZ: 7,
      },
    },
    enabled: true,
    createdAt: 10,
    updatedAt: 10,
  },
  {
    id: 'constraint-near-west',
    label: 'Near West Side (CA 28)',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 8,
        maxX: 20,
        minY: 1,
        maxY: 5,
        minZ: 10,
        maxZ: 20,
      },
    },
    enabled: true,
    createdAt: 20,
    updatedAt: 20,
  },
  {
    id: 'constraint-disabled',
    label: 'Disabled region',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 2,
        maxX: 14,
        minY: 3,
        maxY: 9,
        minZ: 2,
        maxZ: 11,
      },
    },
    enabled: false,
    createdAt: 30,
    updatedAt: 30,
  },
];

describe('generateWarpProposals', () => {
  test('generates proposals only for enabled constraints', () => {
    const proposals = generateWarpProposals(constraints, temporalContext);

    expect(proposals).toHaveLength(2);
    expect(proposals.map((proposal) => proposal.constraintId).sort()).toEqual([
      'constraint-englewood',
      'constraint-near-west',
    ]);
  });

  test('returns stable ordering for identical inputs', () => {
    const firstRun = generateWarpProposals(constraints, temporalContext);
    const secondRun = generateWarpProposals(constraints, temporalContext);

    expect(secondRun).toEqual(firstRun);
  });

  test('populates rationale fields with sentence and metrics', () => {
    const [firstProposal] = generateWarpProposals(constraints, temporalContext);

    expect(firstProposal).toBeDefined();
    expect(firstProposal.rationale.summary.length).toBeGreaterThan(10);
    expect(firstProposal.rationale.densityConcentration).toBeGreaterThanOrEqual(0);
    expect(firstProposal.rationale.densityConcentration).toBeLessThanOrEqual(100);
    expect(firstProposal.rationale.hotspotCoverage).toBeGreaterThanOrEqual(0);
    expect(firstProposal.rationale.hotspotCoverage).toBeLessThanOrEqual(100);
    expect(firstProposal.rationale.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(firstProposal.rationale.confidenceScore).toBeLessThanOrEqual(100);
    expect(['Low', 'Medium', 'High']).toContain(firstProposal.rationale.confidenceBand);
  });

  test('returns empty when no constraints are active', () => {
    const disabledOnly = constraints.map((constraint) => ({ ...constraint, enabled: false }));

    expect(generateWarpProposals(disabledOnly, temporalContext)).toEqual([]);
    expect(generateWarpProposals([], temporalContext)).toEqual([]);
  });
});
