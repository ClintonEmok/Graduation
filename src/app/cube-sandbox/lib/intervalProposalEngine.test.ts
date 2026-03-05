/* @vitest-environment node */
import { describe, expect, test } from 'vitest';
import { generateIntervalProposals, type TemporalBurstWindow } from './intervalProposalEngine';
import type { CubeSpatialConstraint } from '@/store/useCubeSpatialConstraintsStore';

const constraints: CubeSpatialConstraint[] = [
  {
    id: 'constraint-loop',
    label: 'The Loop',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 0,
        maxX: 7,
        minY: 1,
        maxY: 6,
        minZ: 0,
        maxZ: 6,
      },
    },
    enabled: true,
    createdAt: 10,
    updatedAt: 10,
  },
  {
    id: 'constraint-hyde-park',
    label: 'Hyde Park',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 5,
        maxX: 15,
        minY: 2,
        maxY: 9,
        minZ: 4,
        maxZ: 15,
      },
    },
    enabled: true,
    createdAt: 20,
    updatedAt: 20,
  },
  {
    id: 'constraint-disabled',
    label: 'Disabled',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 3,
        maxX: 8,
        minY: 2,
        maxY: 5,
        minZ: 2,
        maxZ: 7,
      },
    },
    enabled: false,
    createdAt: 30,
    updatedAt: 30,
  },
];

const burstWindows: TemporalBurstWindow[] = [
  { id: 'burst-a', start: 20, end: 28, peak: 0.95 },
  { id: 'burst-b', start: 22, end: 30, peak: 0.91 },
  { id: 'burst-c', start: 40, end: 46, peak: 0.72 },
];

describe('generateIntervalProposals', () => {
  test('generates proposals only for enabled constraints', () => {
    const proposals = generateIntervalProposals(constraints, burstWindows);

    expect(proposals.length).toBeGreaterThan(0);
    expect(new Set(proposals.map((proposal) => proposal.constraintId))).toEqual(
      new Set(['constraint-loop', 'constraint-hyde-park'])
    );
    expect(proposals.some((proposal) => proposal.constraintId === 'constraint-disabled')).toBe(false);
  });

  test('returns deterministic ordering across repeated runs', () => {
    const firstRun = generateIntervalProposals(constraints, burstWindows);
    const secondRun = generateIntervalProposals(constraints, burstWindows);

    expect(secondRun).toEqual(firstRun);
  });

  test('suppresses overlapping intervals within the same constraint', () => {
    const singleConstraint = constraints.filter((constraint) => constraint.id === 'constraint-loop');

    const proposals = generateIntervalProposals(singleConstraint, burstWindows);
    const ranges = proposals.map((proposal) => proposal.range);

    expect(ranges).toContainEqual([20, 28]);
    expect(ranges).toContainEqual([40, 46]);
    expect(ranges).not.toContainEqual([22, 30]);
  });

  test('includes rationale, confidence, and quality fields', () => {
    const [firstProposal] = generateIntervalProposals(constraints, burstWindows);

    expect(firstProposal).toBeDefined();
    expect(firstProposal.rationale.summary.length).toBeGreaterThan(10);
    expect(firstProposal.rationale.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(firstProposal.rationale.confidenceScore).toBeLessThanOrEqual(100);
    expect(['Low', 'Medium', 'High']).toContain(firstProposal.rationale.confidenceBand);

    expect(firstProposal.confidence.score).toBe(firstProposal.rationale.confidenceScore);
    expect(firstProposal.confidence.band).toBe(firstProposal.rationale.confidenceBand);

    expect(firstProposal.quality.densityConcentration).toBeGreaterThanOrEqual(0);
    expect(firstProposal.quality.densityConcentration).toBeLessThanOrEqual(100);
    expect(firstProposal.quality.hotspotCoverage).toBeGreaterThanOrEqual(0);
    expect(firstProposal.quality.hotspotCoverage).toBeLessThanOrEqual(100);
  });

  test('returns empty list for empty or inactive input', () => {
    const disabledOnly = constraints.map((constraint) => ({ ...constraint, enabled: false }));

    expect(generateIntervalProposals([], burstWindows)).toEqual([]);
    expect(generateIntervalProposals(constraints, [])).toEqual([]);
    expect(generateIntervalProposals(disabledOnly, burstWindows)).toEqual([]);
  });
});
