import { describe, expect, it } from 'vitest';
import { buildTemporalPulseSeries, formatHourLabel } from './temporal-pulses';

describe('formatHourLabel', () => {
  it('formats midnight, noon, and afternoon hours', () => {
    expect(formatHourLabel(0)).toBe('12 AM');
    expect(formatHourLabel(12)).toBe('12 PM');
    expect(formatHourLabel(17)).toBe('5 PM');
  });
});

describe('buildTemporalPulseSeries', () => {
  it('builds hourly, daily, and monthly trend series', () => {
    const pulses = buildTemporalPulseSeries({
      byHour: Array.from({ length: 24 }, (_, hour) => hour),
      byDayOfWeek: [10, 20, 30, 40, 50, 60, 70],
      byMonth: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });

    expect(pulses.hourly).toHaveLength(24);
    expect(pulses.hourly[0]).toEqual({ label: '12 AM', count: 0 });
    expect(pulses.hourly[12]).toEqual({ label: '12 PM', count: 12 });
    expect(pulses.daily).toEqual([
      { label: 'Sun', count: 10 },
      { label: 'Mon', count: 20 },
      { label: 'Tue', count: 30 },
      { label: 'Wed', count: 40 },
      { label: 'Thu', count: 50 },
      { label: 'Fri', count: 60 },
      { label: 'Sat', count: 70 },
    ]);
    expect(pulses.monthly[0]).toEqual({ label: 'Jan', count: 1 });
    expect(pulses.monthly[11]).toEqual({ label: 'Dec', count: 12 });
  });
});
