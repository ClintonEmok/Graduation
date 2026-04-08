import { describe, expect, test } from 'vitest';
import {
  parseLegacyTimeslicingAlgosMode,
  parseTimeslicingAlgosStrategy,
  parseTimeslicingAlgosTimeScale,
  resolveTimeslicingAlgosSelection,
  serializeTimeslicingAlgosSelection,
} from './mode-selection';

describe('timeslicing algos strategy + timescale selection', () => {
  test('parses explicit strategy and timescale values', () => {
    expect(parseTimeslicingAlgosStrategy('uniform-time')).toBe('uniform-time');
    expect(parseTimeslicingAlgosStrategy('uniform-events')).toBe('uniform-events');
    expect(parseTimeslicingAlgosTimeScale('linear')).toBe('linear');
    expect(parseTimeslicingAlgosTimeScale('adaptive')).toBe('adaptive');
  });

  test('rejects invalid strategy and timescale values', () => {
    expect(parseTimeslicingAlgosStrategy('adaptive')).toBeNull();
    expect(parseTimeslicingAlgosStrategy('unknown')).toBeNull();
    expect(parseTimeslicingAlgosTimeScale('uniform-events')).toBeNull();
    expect(parseTimeslicingAlgosTimeScale('unknown')).toBeNull();
  });

  test('maps legacy mode values into deterministic selection', () => {
    expect(parseLegacyTimeslicingAlgosMode('uniform-time')).toEqual({
      strategy: 'uniform-time',
      timescale: 'linear',
    });
    expect(parseLegacyTimeslicingAlgosMode('uniform-events')).toEqual({
      strategy: 'uniform-events',
      timescale: 'linear',
    });
    expect(parseLegacyTimeslicingAlgosMode('adaptive')).toEqual({
      strategy: 'uniform-events',
      timescale: 'adaptive',
    });
    expect(parseLegacyTimeslicingAlgosMode('unknown')).toBeNull();
  });

  test('resolves new query params and falls back to defaults when missing', () => {
    expect(resolveTimeslicingAlgosSelection('strategy=uniform-time&timescale=adaptive')).toEqual({
      strategy: 'uniform-time',
      timescale: 'adaptive',
    });
    expect(resolveTimeslicingAlgosSelection('')).toEqual({
      strategy: 'uniform-events',
      timescale: 'linear',
    });
  });

  test('uses legacy mode as fallback when new params are missing or invalid', () => {
    expect(resolveTimeslicingAlgosSelection('mode=adaptive')).toEqual({
      strategy: 'uniform-events',
      timescale: 'adaptive',
    });
    expect(resolveTimeslicingAlgosSelection('strategy=invalid&timescale=invalid&mode=uniform-time')).toEqual({
      strategy: 'uniform-time',
      timescale: 'linear',
    });
  });

  test('keeps valid new params and only falls back legacy for missing fields', () => {
    expect(resolveTimeslicingAlgosSelection('strategy=uniform-time&mode=adaptive')).toEqual({
      strategy: 'uniform-time',
      timescale: 'adaptive',
    });
    expect(resolveTimeslicingAlgosSelection('timescale=linear&mode=uniform-time')).toEqual({
      strategy: 'uniform-time',
      timescale: 'linear',
    });
  });

  test('serializes canonical strategy/timescale query params and removes legacy mode', () => {
    const serialized = serializeTimeslicingAlgosSelection('mode=adaptive&foo=bar', {
      strategy: 'uniform-time',
      timescale: 'linear',
    });

    expect(serialized.get('strategy')).toBe('uniform-time');
    expect(serialized.get('timescale')).toBe('linear');
    expect(serialized.get('mode')).toBeNull();
    expect(serialized.get('foo')).toBe('bar');
  });
});
