import { describe, expect, it } from 'vitest';
import { buildSpanAwareTicks, formatSpanAwareTickLabel, resolveTickUnitByVisibleSpan } from '@/components/timeline/lib/tick-ux';

describe('tick-ux', () => {
  describe('resolveTickUnitByVisibleSpan', () => {
    it('uses minute ticks for sub-day ranges', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2026, 0, 1, 0, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1, 6, 0, 0) / 1000,
        axisWidth: 660,
      });

      expect(spec.unit).toBe('minute');
      expect(spec.step).toBe(60);
    });

    it('switches to hour ticks after the sub-day boundary', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2026, 0, 1, 0, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 2, 12, 0, 0) / 1000,
        axisWidth: 660,
      });

      expect(spec.unit).toBe('hour');
      expect(spec.step).toBe(6);
    });

    it('uses day ticks for multi-day spans before month-scale handoff', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2026, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 1, 15) / 1000,
        axisWidth: 660,
      });

      expect(spec.unit).toBe('day');
      expect(spec.step).toBe(14);
    });

    it('uses month ticks once visible span reaches long multi-month ranges', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2026, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 7, 1) / 1000,
        axisWidth: 440,
      });

      expect(spec.unit).toBe('month');
      expect(spec.step).toBe(2);
    });

    it('uses year ticks for multi-year ranges', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2020, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1) / 1000,
        axisWidth: 440,
      });

      expect(spec.unit).toBe('year');
      expect(spec.step).toBe(2);
    });
  });

  describe('formatSpanAwareTickLabel', () => {
    it('keeps time for sub-day labels', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2026, 0, 1, 9, 30, 0)), {
        rangeStartSec: Date.UTC(2026, 0, 1, 0, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1, 6, 0, 0) / 1000,
        axisWidth: 660,
      });

      expect(label).toBe('Jan 1, 9:30 AM');
    });

    it('disambiguates long day-scale labels by adding the year', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2026, 0, 5)), {
        rangeStartSec: Date.UTC(2026, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 3, 5) / 1000,
        axisWidth: 660,
      });

      expect(label).toBe('Jan 5, 2026');
    });

    it('adds year to cross-year sub-day labels without dropping time', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2026, 0, 1, 1, 0, 0)), {
        rangeStartSec: Date.UTC(2025, 11, 31, 18, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1, 6, 0, 0) / 1000,
        axisWidth: 660,
      });

      expect(label).toBe('Jan 1, 2026, 1:00 AM');
    });

    it('uses month plus year for month-scale labels', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2026, 3, 1)), {
        rangeStartSec: Date.UTC(2026, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 9, 1) / 1000,
        axisWidth: 660,
      });

      expect(label).toBe('Apr 2026');
    });

    it('uses year-only labels for year-scale ranges', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2024, 0, 1)), {
        rangeStartSec: Date.UTC(2020, 0, 1) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1) / 1000,
        axisWidth: 660,
      });

      expect(label).toBe('2024');
    });
  });

  describe('buildSpanAwareTicks', () => {
    it('uses the resolved interval for deterministic tick generation', () => {
      const ticks = buildSpanAwareTicks(
        {
          ticks: (interval) => interval.range(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 0, 5))),
        },
        {
          rangeStartSec: Date.UTC(2026, 0, 1) / 1000,
          rangeEndSec: Date.UTC(2026, 0, 5) / 1000,
          axisWidth: 220,
        }
      );

      expect(ticks).toEqual([
        new Date(Date.UTC(2026, 0, 1)),
        new Date(Date.UTC(2026, 0, 3)),
      ]);
    });
  });
});
