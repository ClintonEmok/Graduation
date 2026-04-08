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
  test('returns top 3 ranked package-complete sets with recommendation marker', () => {
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

    result.sets.forEach((set) => {
      expect(set.intervals).toBeDefined();
      expect(set.intervals?.boundaries.length).toBeGreaterThanOrEqual(2);
      expect(set.intervals?.boundaries).toEqual([...set.intervals!.boundaries].sort((a, b) => a - b));
      expect(set.intervals?.boundaries[0]).toBeGreaterThanOrEqual(start);
      expect(set.intervals?.boundaries[set.intervals!.boundaries.length - 1]).toBeLessThanOrEqual(end);
    });

    expect(result.sets[0].reasonMetadata?.whyRecommended).toBeTruthy();
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
        snapToUnit: 'day',
      },
    });

    const firstPairs = first.sets.map((set) => `${set.rank}:${set.id}:${set.score.total}`);
    const secondPairs = second.sets.map((set) => `${set.rank}:${set.id}:${set.score.total}`);
    expect(firstPairs).toEqual(secondPairs);
    expect(first.recommendedId).toBe(first.sets[0].id);
    expect(second.recommendedId).toBe(second.sets[0].id);
    expect(first.sets[0].reasonMetadata?.whyRecommended).toBeTruthy();
    expect(second.sets[0].reasonMetadata?.whyRecommended).toBeTruthy();

    const firstBoundaryPairs = first.sets.map((set) => set.intervals?.boundaries.join(','));
    const secondBoundaryPairs = second.sets.map((set) => set.intervals?.boundaries.join(','));
    expect(firstBoundaryPairs).toEqual(secondBoundaryPairs);
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
        snapToUnit: 'none',
      },
    });

    expect(result.sets.length).toBeGreaterThan(0);
    expect(result.reasonMetadata?.lowConfidenceReason).toBeTruthy();
    expect(result.sets[0].reasonMetadata?.lowConfidenceReason).toBeTruthy();
  });

  test('normal generated sets never use legacy missing-interval contract', () => {
    const start = 1704067200;
    const end = 1735689600;
    const crimes = Array.from({ length: 90 }, (_, index) => {
      const t = start + (index % 30) * 86400;
      return buildCrime(index + 1, t);
    });

    const result = generateRankedAutoProposalSets({
      crimes,
      context: {
        crimeTypes: ['THEFT', 'BATTERY'],
        timeRange: { start, end },
        isFullDataset: false,
      },
      params: {
        warpCount: 3,
        snapToUnit: 'hour',
      },
    });

    expect(result.sets.length).toBeGreaterThan(0);
    expect(result.sets.every((set) => Boolean(set.intervals) && set.intervals!.boundaries.length >= 2)).toBe(true);
  });
});
