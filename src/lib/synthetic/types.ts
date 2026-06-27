/**
 * Type definitions for the Goh-Barabási bursty synthetic data generator.
 *
 * The generator produces a sequence of crime events with two complementary
 * burstiness mechanisms:
 *  1. A priority queue selects the event TYPE (creates type clustering).
 *  2. Inter-event TIMESTAMPS follow a power-law distribution (creates
 *     temporal burstiness in the global event stream).
 *
 * This is the "hybrid" approach: both dimensions are bursty.
 */
import type { CrimeRecord } from '@/types/crime';

/**
 * Configuration for `generateBurstySequence`.
 *
 * Defaults are tuned for a moderate-burstiness crime stream over a
 * calendar year. Pass `seed` to reproduce an exact sequence.
 */
export interface BurstyGeneratorConfig {
  /** Base power-law exponent for inter-event times. Must be > 1. */
  alpha: number;
  /** Priority increment added to the firing task after each event. */
  delta: number;
  /** Total number of events to generate. */
  numEvents: number;
  /** Time range start, Unix epoch seconds. */
  startTime: number;
  /** Time range end, Unix epoch seconds. Must be > startTime. */
  endTime: number;
  /** How to seed initial per-type priorities. */
  typeStrategy: 'weighted' | 'uniform';
  /** Optional per-type alpha override. Keys are crime type names. */
  perTypeAlpha?: Record<string, number>;
  /** Rolling window length in seconds for B(t) calculation. */
  rollingWindowSec: number;
  /** Optional seed for the PRNG. Same seed = same sequence. */
  seed?: number;
}

/** Fully-resolved config with all defaults applied. */
export type ResolvedBurstyConfig = Required<BurstyGeneratorConfig>;

/** Global burstiness summary across the entire sequence. */
export interface BurstinessMetrics {
  /** B = (σ - μ) / (σ + μ), range [-1, 1]. B→1 is maximally bursty. */
  burstinessParam: number;
  /** Pearson correlation between consecutive IETs. */
  memoryCoefficient: number;
  /** Mean inter-event time in seconds. */
  meanIET: number;
  /** Standard deviation of inter-event times in seconds. */
  stdIET: number;
  /** Fitted power-law exponent (max-likelihood estimate from IETs). */
  fittedAlpha: number;
}

/** Per-window burstiness point used as ground truth for adaptive scaling. */
export interface RollingBurstinessPoint {
  /** Window start, Unix epoch seconds. */
  startEpoch: number;
  /** Window end, Unix epoch seconds. */
  endEpoch: number;
  /** Burstiness parameter B computed over events in this window. */
  burstinessParam: number;
  /** Number of events in this window. */
  eventCount: number;
  /** Per-type event counts within this window. */
  typeBreakdown: Record<string, number>;
}

/** Output of `generateBurstySequence`. */
export interface BurstySequence {
  /** Crime records conforming to the canonical CrimeRecord type. */
  events: CrimeRecord[];
  /** Global burstiness metrics for the whole sequence. */
  metrics: BurstinessMetrics;
  /** Per-window B(t) — the ground-truth signal for adaptive scaling. */
  rollingBurstiness: RollingBurstinessPoint[];
  /** The resolved config (all defaults applied). */
  config: ResolvedBurstyConfig;
}

/** Per-type burstiness descriptor used in defaults. */
export interface TypeBurstinessProfile {
  /** Real Chicago frequency weight used to seed priorities. */
  baseWeight: number;
  /** Default power-law exponent for this type. */
  defaultAlpha: number;
}
