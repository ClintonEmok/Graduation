import { describe, expect, it } from 'vitest';
import {
  brushSelectionToEpochRange,
  buildZoomTransformFromBrush,
  clampToRange,
  computeRangeUpdate,
  normalizeEpochRange,
  resolveSelectionX,
  zoomDomainToEpochRange,
} from '@/components/timeline/lib/interaction-guards';

describe('interaction-guards', () => {
  describe('range normalization and clamping', () => {
    it('normalizes reversed epoch ranges', () => {
      expect(normalizeEpochRange(200, 100)).toEqual({ startSec: 100, endSec: 200 });
      expect(normalizeEpochRange(100, 200)).toEqual({ startSec: 100, endSec: 200 });
    });

    it('clamps range update to domain and keeps normalized ordering', () => {
      const result = computeRangeUpdate(-100, 1400, 0, 1000);

      expect(result.safeStartSec).toBe(0);
      expect(result.safeEndSec).toBe(1000);
      expect(result.normalizedRange).toEqual([0, 100]);
    });

    it('handles reversed inputs while preserving safeStart/safeEnd semantics', () => {
      const result = computeRangeUpdate(900, 100, 0, 1000);

      expect(result.safeStartSec).toBe(900);
      expect(result.safeEndSec).toBe(100);
      expect(result.normalizedRange[0]).toBeLessThan(result.normalizedRange[1]);
      expect(result.normalizedRange).toEqual([10, 90]);
    });

    it('clamps non-finite values defensively', () => {
      expect(clampToRange(Number.NaN, 10, 20)).toBe(10);
      expect(clampToRange(Number.POSITIVE_INFINITY, 10, 20)).toBe(20);
      expect(clampToRange(Number.NEGATIVE_INFINITY, 10, 20)).toBe(10);
    });
  });

  describe('brush and zoom synchronization mapping', () => {
    const invertLinear = (value: number) => new Date(value * 1000);

    it('maps brush selection pixels to epoch bounds', () => {
      const mapped = brushSelectionToEpochRange([120, 360], invertLinear);
      expect(mapped).toEqual({ startSec: 120, endSec: 360 });
    });

    it('builds zoom transform from brush span deterministically', () => {
      const transform = buildZoomTransformFromBrush(100, 300, 1000);
      expect(transform).toEqual({ scale: 5, translateX: -100 });
    });

    it('guards zoom transform against zero-width brush selections', () => {
      const transform = buildZoomTransformFromBrush(250, 250, 1000);
      expect(transform.scale).toBe(1000);
      expect(transform.translateX).toBe(-250);
    });

    it('maps zoom domain dates back to epoch seconds', () => {
      const range = zoomDomainToEpochRange([new Date(10_000), new Date(25_000)]);
      expect(range).toEqual({ startSec: 10, endSec: 25 });
    });

    it('round-trips brush -> zoom -> epoch conversion with explicit fixtures', () => {
      const brush = [200, 500] as [number, number];
      const overviewWidth = 1200;

      const epochRange = brushSelectionToEpochRange(brush, invertLinear);
      const transform = buildZoomTransformFromBrush(brush[0], brush[1], overviewWidth);

      expect(epochRange).toEqual({ startSec: 200, endSec: 500 });
      expect(transform).toEqual({ scale: 4, translateX: -200 });
    });
  });

  describe('selection x-position fallback handling', () => {
    const scale = (date: Date) => date.getTime() / 1000;

    it('returns null for invalid selection timestamp inputs', () => {
      expect(resolveSelectionX(null, scale, 500)).toBeNull();
      expect(resolveSelectionX(undefined, scale, 500)).toBeNull();
      expect(resolveSelectionX(Number.NaN, scale, 500)).toBeNull();
    });

    it('returns null when mapped x is outside visible bounds', () => {
      expect(resolveSelectionX(-10, scale, 500)).toBeNull();
      expect(resolveSelectionX(700, scale, 500)).toBeNull();
    });

    it('returns deterministic x value for valid in-domain selection points', () => {
      expect(resolveSelectionX(250, scale, 500)).toBe(250);
      expect(resolveSelectionX(0, scale, 500)).toBe(0);
      expect(resolveSelectionX(500, scale, 500)).toBe(500);
    });
  });
});
