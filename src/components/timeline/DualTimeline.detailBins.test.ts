import { describe, expect, it } from 'vitest';
import { bin } from 'd3-array';

const buildDetailBins = (values: number[], startSec: number, endSec: number, count: number) =>
  bin<number, number>()
    .value((d) => d)
    .domain([startSec + 0.001, endSec - 0.001])
    .thresholds(count)(values);

describe('detail histogram bins', () => {
  it('excludes edge values from the first and last buckets', () => {
    const values = [0, 0.001, 1, 2, 3, 4, 9.999, 10];
    const bins = buildDetailBins(values, 0, 10, 5);

    const lengths = bins.map((bucket) => bucket.length);
    expect(lengths.reduce((sum, value) => sum + value, 0)).toBe(6);
    expect(lengths[0]).toBeLessThanOrEqual(2);
    expect(lengths[lengths.length - 1]).toBeLessThanOrEqual(2);
  });

  it('keeps a long span cheap but detailed enough', () => {
    const spanSec = 330 * 86_400;
    const values = Array.from({ length: 1_000 }, (_, index) => index * (spanSec / 999));
    const bins = buildDetailBins(values, 0, spanSec, 180);

    expect(bins.length).toBeGreaterThanOrEqual(120);
    expect(bins.length).toBeLessThanOrEqual(180);
    const average = values.length / bins.length;
    expect(Math.max(...bins.map((bucket) => bucket.length))).toBeLessThanOrEqual(Math.ceil(average * 2));
  });
});
