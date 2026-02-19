import { describe, expect, test } from 'vitest';
import {
  adjustBoundary,
  pickNearest,
  resolveNeighborCandidates,
  resolveSnap,
  type SnapCandidate,
} from './slice-adjustment';

const domainStartSec = 0;
const domainEndSec = 1000;
const minDurationSec = 100;

describe('adjustBoundary', () => {
  test('clamps start handle at domain start with explicit cue', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: -50,
      fixedBoundarySec: 300,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(0);
    expect(result.endSec).toBe(300);
    expect(result.limitCue).toBe('domainStart');
  });

  test('clamps end handle at domain end with explicit cue', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 1200,
      fixedBoundarySec: 700,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(700);
    expect(result.endSec).toBe(1000);
    expect(result.limitCue).toBe('domainEnd');
  });

  test('enforces minimum duration when start drag crosses fixed boundary', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: 550,
      fixedBoundarySec: 600,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(500);
    expect(result.endSec).toBe(600);
    expect(result.limitCue).toBe('minDuration');
  });

  test('enforces minimum duration when end drag crosses fixed boundary', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 280,
      fixedBoundarySec: 300,
      domainStartSec,
      domainEndSec,
      minDurationSec,
    });

    expect(result.startSec).toBe(300);
    expect(result.endSec).toBe(400);
    expect(result.limitCue).toBe('minDuration');
  });

  test('selects nearest snap winner within tolerance', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 418,
      fixedBoundarySec: 200,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        toleranceSec: 10,
        gridCandidatesSec: [400, 420],
      },
    });

    expect(result.startSec).toBe(200);
    expect(result.endSec).toBe(420);
    expect(result.appliedSec).toBe(420);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('grid');
  });

  test('bypasses snap candidates while modifier bypass is active', () => {
    const result = adjustBoundary({
      handle: 'end',
      rawPointerSec: 418,
      fixedBoundarySec: 200,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        bypass: true,
        toleranceSec: 10,
        gridCandidatesSec: [420],
      },
    });

    expect(result.startSec).toBe(200);
    expect(result.endSec).toBe(418);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('none');
  });

  test('falls back to unclamped raw sec when candidate list is empty', () => {
    const result = adjustBoundary({
      handle: 'start',
      rawPointerSec: 222,
      fixedBoundarySec: 600,
      domainStartSec,
      domainEndSec,
      minDurationSec,
      snap: {
        enabled: true,
        toleranceSec: 10,
        gridCandidatesSec: [],
        neighborCandidatesSec: [],
      },
    });

    expect(result.startSec).toBe(222);
    expect(result.endSec).toBe(600);
    expect(result.limitCue).toBe('none');
    expect(result.snapSource).toBe('none');
  });
});

describe('snap helpers', () => {
  test('prefers neighbor candidate over grid on equal distance tie', () => {
    const candidates: SnapCandidate[] = [
      { valueSec: 490, source: 'grid' },
      { valueSec: 510, source: 'neighbor' },
    ];

    const winner = pickNearest(500, candidates, 20);
    expect(winner).toEqual({ valueSec: 510, source: 'neighbor' });
  });

  test('resolveSnap returns none when no candidate passes tolerance', () => {
    const result = resolveSnap(500, {
      enabled: true,
      toleranceSec: 5,
      gridCandidatesSec: [520],
      neighborCandidatesSec: [480],
    });

    expect(result).toEqual({ snappedSec: 500, source: 'none' });
  });

  test('collects deterministic neighbor candidates excluding active and fixed boundary', () => {
    const candidates = resolveNeighborCandidates({
      boundaries: [
        { id: 'active', startSec: 100, endSec: 200, isVisible: true },
        { id: 's1', startSec: 320, endSec: 480, isVisible: true },
        { id: 's2', startSec: 260, endSec: 420, isVisible: false },
        { id: 's3', startSec: 50, endSec: 160, isVisible: true },
      ],
      activeSliceId: 'active',
      handle: 'start',
      domainStartSec,
      domainEndSec,
      fixedBoundarySec: 200,
    });

    expect(candidates).toEqual([0, 50, 160, 320, 480]);
  });
});
