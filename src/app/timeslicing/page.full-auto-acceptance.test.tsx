import { describe, expect, test } from 'vitest';
import type { AutoProposalSet } from '@/types/autoProposalSet';
import { planFullAutoAcceptanceArtifacts } from './full-auto-acceptance';
import { transitionAutoRunLifecycle, type AutoRunStatus } from '@/hooks/useSuggestionGenerator';

function buildPackage(overrides?: Partial<AutoProposalSet>): AutoProposalSet {
  return {
    id: 'balanced',
    rank: 1,
    isRecommended: true,
    confidence: 88,
    score: {
      coverage: 90,
      relevance: 87,
      overlap: 92,
      continuity: 85,
      total: 88,
    },
    warp: {
      name: 'Balanced warp',
      emphasis: 'balanced',
      confidence: 86,
      intervals: [
        { startPercent: 0, endPercent: 45, strength: 1.2 },
        { startPercent: 45, endPercent: 100, strength: 0.9 },
      ],
    },
    intervals: {
      boundaries: [1705000000, 1710000000, 1715000000],
      method: 'peak',
      confidence: 81,
    },
    ...overrides,
  };
}

describe('full-auto package acceptance contract', () => {
  test('accepting a package with warp+interval artifacts plans both in one flow', () => {
    const proposalSet = buildPackage({
      intervals: {
        boundaries: [1715000000, 1705000000, 1710000000],
        method: 'peak',
        confidence: 81,
      },
    });

    const plan = planFullAutoAcceptanceArtifacts(proposalSet);

    expect(plan.warpIntervals).toHaveLength(2);
    expect(plan.intervalBoundaries).toEqual([1705000000, 1710000000, 1715000000]);
    expect(plan.warning).toBeNull();
  });

  test('legacy package without valid intervals keeps warp apply and returns degraded warning', () => {
    const proposalSet = buildPackage({ intervals: undefined });

    const plan = planFullAutoAcceptanceArtifacts(proposalSet);

    expect(plan.warpIntervals).toHaveLength(2);
    expect(plan.intervalBoundaries).toBeNull();
    expect(plan.warning).toContain('legacy/degraded payload');
  });
});

describe('manual rerun lifecycle invariants', () => {
  test('manual rerun preserves status semantics while keeping manual trigger source intent', () => {
    let status: AutoRunStatus = 'idle';

    status = transitionAutoRunLifecycle(status, 'auto', 'start');
    expect(status).toBe('running');

    status = transitionAutoRunLifecycle(status, 'auto', 'success');
    expect(status).toBe('fresh');

    status = transitionAutoRunLifecycle(status, 'manual', 'start');
    expect(status).toBe('fresh');

    status = transitionAutoRunLifecycle(status, 'manual', 'success');
    expect(status).toBe('fresh');

    status = transitionAutoRunLifecycle(status, 'auto', 'start');
    expect(status).toBe('running');

    status = transitionAutoRunLifecycle(status, 'auto', 'error');
    expect(status).toBe('error');
  });
});
