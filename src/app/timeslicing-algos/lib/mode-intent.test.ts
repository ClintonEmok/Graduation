import { describe, expect, test } from 'vitest';
import {
  parseTimeslicingAlgosModeIntent,
  resolveTimeslicingAlgosEffectiveMode,
  resolveTimeslicingAlgosTimeScaleMode,
} from './mode-intent';

describe('timeslicing algos mode intent helper', () => {
  test('parses valid explicit intents', () => {
    expect(parseTimeslicingAlgosModeIntent('uniform-time')).toBe('uniform-time');
    expect(parseTimeslicingAlgosModeIntent('uniform-events')).toBe('uniform-events');
    expect(parseTimeslicingAlgosModeIntent('adaptive')).toBe('adaptive');
  });

  test('falls back to uniform-events for invalid or missing intents', () => {
    expect(parseTimeslicingAlgosModeIntent(null)).toBe('uniform-events');
    expect(parseTimeslicingAlgosModeIntent(undefined)).toBe('uniform-events');
    expect(parseTimeslicingAlgosModeIntent('unknown-mode')).toBe('uniform-events');
  });

  test('resolves adaptive intent to route default effective mode on algos route', () => {
    expect(resolveTimeslicingAlgosEffectiveMode('/timeslicing-algos', 'adaptive')).toBe('uniform-events');
  });

  test('preserves explicit uniform mode behavior', () => {
    expect(resolveTimeslicingAlgosEffectiveMode('/timeslicing-algos', 'uniform-time')).toBe('uniform-time');
    expect(resolveTimeslicingAlgosEffectiveMode('/timeslicing-algos', 'uniform-events')).toBe('uniform-events');
  });

  test('keeps fallback safe on non-algos pathnames', () => {
    expect(resolveTimeslicingAlgosEffectiveMode('/dashboard', 'adaptive')).toBe('uniform-time');
  });

  test('maps adaptive intent to adaptive timescale and explicit modes to linear timescale', () => {
    expect(resolveTimeslicingAlgosTimeScaleMode('adaptive')).toBe('adaptive');
    expect(resolveTimeslicingAlgosTimeScaleMode('uniform-time')).toBe('linear');
    expect(resolveTimeslicingAlgosTimeScaleMode('uniform-events')).toBe('linear');
  });
});
