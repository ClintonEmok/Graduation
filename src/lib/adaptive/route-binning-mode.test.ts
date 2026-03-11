import { describe, expect, test } from 'vitest';
import { resolveRouteBinningMode } from './route-binning-mode';

describe('resolveRouteBinningMode', () => {
  test('maps /timeslicing to uniform-time by default', () => {
    expect(resolveRouteBinningMode('/timeslicing', null)).toBe('uniform-time');
  });

  test('maps /timeslicing-algos to uniform-events by default', () => {
    expect(resolveRouteBinningMode('/timeslicing-algos', null)).toBe('uniform-events');
  });

  test('uses explicit override when provided', () => {
    expect(resolveRouteBinningMode('/timeslicing-algos', 'uniform-time')).toBe('uniform-time');
    expect(resolveRouteBinningMode('/timeslicing', 'uniform-events')).toBe('uniform-events');
  });

  test('falls back safely to uniform-time for unrelated or empty paths', () => {
    expect(resolveRouteBinningMode('/dashboard', null)).toBe('uniform-time');
    expect(resolveRouteBinningMode('', null)).toBe('uniform-time');
    expect(resolveRouteBinningMode(undefined, null)).toBe('uniform-time');
    expect(resolveRouteBinningMode(null, null)).toBe('uniform-time');
  });
});
