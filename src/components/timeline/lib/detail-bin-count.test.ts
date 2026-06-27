import { describe, expect, it } from 'vitest';
import { resolveAdaptiveDetailBinCount } from './detail-bin-count';

describe('resolveAdaptiveDetailBinCount', () => {
  it('keeps short brushes detailed and caps long brushes cheaply', () => {
    expect(resolveAdaptiveDetailBinCount(7 * 86_400)).toBe(7);
    expect(resolveAdaptiveDetailBinCount(90 * 86_400)).toBe(90);
    expect(resolveAdaptiveDetailBinCount(330 * 86_400)).toBe(180);
    expect(resolveAdaptiveDetailBinCount(730 * 86_400)).toBe(180);
  });

  it('honors explicit overrides', () => {
    expect(resolveAdaptiveDetailBinCount(330 * 86_400, 72)).toBe(72);
  });

  it('falls back to a small floor for degenerate spans', () => {
    expect(resolveAdaptiveDetailBinCount(0)).toBe(2);
    expect(resolveAdaptiveDetailBinCount(Number.NaN)).toBe(2);
  });
});
