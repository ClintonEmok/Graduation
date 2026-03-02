import { describe, expect, test } from 'vitest';
import { generateRankedAutoProposalSets } from './full-auto-orchestrator';
import type { CrimeRecord } from '@/types/crime';

function buildCrime(id: number, timestamp: number): CrimeRecord {
  return {
    id: `crime-${id}`,
    timestamp,
    lat: 41.88,
    lon: -87.63,
    x: 0,
    z: 0,
    type: id % 2 === 0 ? 'THEFT' : 'BATTERY',
    district: '001',
    year: 2024,
    iucr: '0000',
  };
}

describe('generateRankedAutoProposalSets', () => {
  test('returns top 3 ranked complete sets with recommendation marker', () => {
    const start = 1704067200;
    const end = 1735689600;
    const crimes = Array.from({ length: 180 }, (_, index) => {
      const t = start + (index % 60) * 86400;
      return buildCrime(index + 1, t);
    });

    const result = generateRankedAutoProposalSets({
      crimes,
      context: {
        crimeTypes: ['THEFT'],
        timeRange: { start, end },
        isFullDataset: false,
      },
      params: {
        warpCount: 3,
        intervalCount: 3,
        boundaryMethod: 'peak',
        snapToUnit: 'none',
      },
    });

    expect(result.sets.length).toBe(3);
    expect(result.recommendedId).toBe(result.sets[0].id);
    expect(result.sets[0].isRecommended).toBe(true);
    expect(result.sets[0].rank).toBe(1);
    expect(result.sets[0].score.total).toBeGreaterThanOrEqual(result.sets[1].score.total);
    expect(result.sets[1].score.total).toBeGreaterThanOrEqual(result.sets[2].score.total);
    expect(result.sets[0].warp.intervals.length).toBeGreaterThan(0);
    expect(result.sets[0].intervals.boundaries.length).toBeGreaterThan(0);
  });

  test('keeps deterministic ordering for same input', () => {
    const start = 1704067200;
    const end = 1735689600;
    const crimes = Array.from({ length: 120 }, (_, index) => {
      const t = start + (index % 40) * 86400;
      return buildCrime(index + 1, t);
    });

    const first = generateRankedAutoProposalSets({
      crimes,
      context: {
        crimeTypes: [],
        timeRange: { start, end },
        isFullDataset: true,
      },
      params: {
        warpCount: 3,
        intervalCount: 3,
        boundaryMethod: 'change-point',
        snapToUnit: 'day',
      },
    });

    const second = generateRankedAutoProposalSets({
      crimes,
      context: {
        crimeTypes: [],
        timeRange: { start, end },
        isFullDataset: true,
      },
      params: {
        warpCount: 3,
        intervalCount: 3,
        boundaryMethod: 'change-point',
        snapToUnit: 'day',
      },
    });

    const firstPairs = first.sets.map((set) => `${set.rank}:${set.id}:${set.score.total}`);
    const secondPairs = second.sets.map((set) => `${set.rank}:${set.id}:${set.score.total}`);
    expect(firstPairs).toEqual(secondPairs);
  });

  test('returns no-result metadata when no data exists', () => {
    const result = generateRankedAutoProposalSets({
      crimes: [],
      context: {
        crimeTypes: [],
        timeRange: { start: 1704067200, end: 1735689600 },
        isFullDataset: true,
      },
      params: {
        warpCount: 3,
        intervalCount: 3,
        boundaryMethod: 'rule-based',
        snapToUnit: 'none',
      },
    });

    expect(result.sets).toEqual([]);
    expect(result.recommendedId).toBeNull();
    expect(result.reasonMetadata?.noResultReason).toBeTruthy();
  });

  test('adds low-confidence metadata for sparse data', () => {
    const start = 1704067200;
    const end = 1767225600;
    const crimes = [buildCrime(1, start + 86400), buildCrime(2, end - 86400)];

    const result = generateRankedAutoProposalSets({
      crimes,
      context: {
        crimeTypes: ['BATTERY'],
        timeRange: { start, end },
        isFullDataset: false,
      },
      params: {
        warpCount: 2,
        intervalCount: 3,
        boundaryMethod: 'peak',
        snapToUnit: 'none',
      },
    });

    expect(result.sets.length).toBeGreaterThan(0);
    expect(result.reasonMetadata?.lowConfidenceReason).toBeTruthy();
    expect(result.sets[0].reasonMetadata?.lowConfidenceReason).toBeTruthy();
  });
});
