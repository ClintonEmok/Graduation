/**
 * Binning Rules System
 * 
 * Defines rules for dynamic bin generation based on constraints.
 * Rules determine how bins are created from time-series crime data.
 */

import { TimeBin } from './types';

/**
 * Strategy types for binning
 */
export type BinningStrategy = 
  | 'daytime-heavy'      // Focus on daytime hours (6am-6pm)
  | 'nighttime-heavy'    // Focus on nighttime hours (6pm-6am)
  | 'crime-type-specific' // Group by crime type clusters
  | 'burstiness'         // Split based on burst detection
  | 'uniform-distribution' // Equal events per bin
  | 'uniform-time'       // Equal time spans
  | 'weekday-weekend'    // Separate weekday from weekend
  | 'quarter-hourly'     // 15-minute intervals
  | 'hourly'             // Hourly intervals
  | 'daily'              // Daily intervals
  | 'weekly'             // Weekly intervals
  | 'custom'             // User-defined custom rule
  | 'auto-adaptive';     // Automatically detect best strategy

/**
 * Constraint definition for bin generation
 */
export interface BinningConstraint {
  /** Minimum events per bin */
  minEvents?: number;
  /** Maximum events per bin */
  maxEvents?: number;
  /** Minimum time span in milliseconds */
  minTimeSpan?: number;
  /** Maximum time span in milliseconds */
  maxTimeSpan?: number;
  /** Require contiguous time coverage */
  contiguous?: boolean;
  /** Maximum number of bins (0 = unlimited) */
  maxBins?: number;
}

/**
 * A single binning rule definition
 */
export interface BinningRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Strategy type */
  strategy: BinningStrategy;
  /** Parameters for the rule */
  params: BinningRuleParams;
  /** Whether this rule is enabled */
  enabled: boolean;
}

/**
 * Parameters for a binning rule
 */
export interface BinningRuleParams {
  /** For time-based rules: start hour (0-23) */
  startHour?: number;
  /** For time-based rules: end hour (0-23) */
  endHour?: number;
  /** Crime types to focus on (empty = all) */
  crimeTypes?: string[];
  /** Districts to focus on (empty = all) */
  districts?: string[];
  /** Burstiness threshold (0-1) */
  burstThreshold?: number;
  /** Events per bin for uniform-distribution */
  eventsPerBin?: number;
  /** Custom hour intervals */
  hourIntervals?: number[];
  /** Day-of-week filters (0=Sunday, 6=Saturday) */
  daysOfWeek?: number[];
}

/**
 * Full binning configuration
 */
export interface BinningConfig {
  /** Primary strategy */
  strategy: BinningStrategy;
  /** Fallback strategy if primary fails */
  fallbackStrategy?: BinningStrategy;
  /** Constraints to apply */
  constraints: BinningConstraint;
  /** Custom rules */
  customRules?: BinningRule[];
  /** Time domain */
  domain: [number, number];
  /** Crime types filter */
  crimeTypes?: string[];
  /** Districts filter */
  districts?: string[];
}

/**
 * Result of applying binning rules
 */
export interface BinningResult {
  bins: TimeBin[];
  strategy: BinningStrategy;
  ruleApplied: string;
  metadata: {
    totalEvents: number;
    binCount: number;
    timeSpan: number;
    avgEventsPerBin: number;
  };
}

/**
 * Preset rule configurations
 */
export const PRESET_RULES: Record<BinningStrategy, BinningConfig> = {
  'daytime-heavy': {
    strategy: 'daytime-heavy',
    constraints: {
      minEvents: 10,
      contiguous: true,
    },
    domain: [0, 0],
  },
  'nighttime-heavy': {
    strategy: 'nighttime-heavy',
    constraints: {
      minEvents: 10,
      contiguous: true,
    },
    domain: [0, 0],
  },
  'crime-type-specific': {
    strategy: 'crime-type-specific',
    constraints: {
      minEvents: 5,
      maxBins: 50,
    },
    domain: [0, 0],
  },
  'burstiness': {
    strategy: 'burstiness',
    constraints: {
      minEvents: 3,
      maxEvents: 100,
      maxBins: 100,
    },
    domain: [0, 0],
  },
  'uniform-distribution': {
    strategy: 'uniform-distribution',
    constraints: {
      minEvents: 1,
      maxEvents: 500,
    },
    domain: [0, 0],
  },
  'uniform-time': {
    strategy: 'uniform-time',
    constraints: {
      minTimeSpan: 3600000, // 1 hour
    },
    domain: [0, 0],
  },
  'weekday-weekend': {
    strategy: 'weekday-weekend',
    constraints: {
      minEvents: 10,
    },
    domain: [0, 0],
  },
  'quarter-hourly': {
    strategy: 'quarter-hourly',
    constraints: {
      minTimeSpan: 900000, // 15 min
      maxTimeSpan: 1800000,
    },
    domain: [0, 0],
  },
  'hourly': {
    strategy: 'hourly',
    constraints: {
      minTimeSpan: 1800000, // 30 min
      maxTimeSpan: 7200000, // 2 hours
    },
    domain: [0, 0],
  },
  'daily': {
    strategy: 'daily',
    constraints: {
      minTimeSpan: 82800000, // 23 hours
      maxTimeSpan: 90000000, // 25 hours
    },
    domain: [0, 0],
  },
  'weekly': {
    strategy: 'weekly',
    constraints: {
      minTimeSpan: 576000000, // ~6.7 days
      maxTimeSpan: 691200000, // 8 days
    },
    domain: [0, 0],
  },
  'custom': {
    strategy: 'custom',
    constraints: {
      minEvents: 1,
    },
    domain: [0, 0],
  },
  'auto-adaptive': {
    strategy: 'auto-adaptive',
    fallbackStrategy: 'uniform-time',
    constraints: {
      minEvents: 5,
      maxBins: 40,
    },
    domain: [0, 0],
  },
};

/**
 * Get preset configuration for a strategy
 */
export function getPresetConfig(strategy: BinningStrategy): BinningConfig {
  return { ...PRESET_RULES[strategy] };
}

/**
 * Validate binning constraints
 */
export function validateConstraints(
  bins: TimeBin[],
  constraints: BinningConstraint
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const bin of bins) {
    if (constraints.minEvents !== undefined && bin.count < constraints.minEvents) {
      errors.push(`Bin at ${bin.startTime} has ${bin.count} events, minimum is ${constraints.minEvents}`);
    }
    if (constraints.maxEvents !== undefined && bin.count > constraints.maxEvents) {
      errors.push(`Bin at ${bin.startTime} has ${bin.count} events, maximum is ${constraints.maxEvents}`);
    }
    if (constraints.minTimeSpan !== undefined) {
      const span = bin.endTime - bin.startTime;
      if (span < constraints.minTimeSpan) {
        errors.push(`Bin at ${bin.startTime} spans ${span}ms, minimum is ${constraints.minTimeSpan}`);
      }
    }
    if (constraints.maxTimeSpan !== undefined) {
      const span = bin.endTime - bin.startTime;
      if (span > constraints.maxTimeSpan) {
        errors.push(`Bin at ${bin.startTime} spans ${span}ms, maximum is ${constraints.maxTimeSpan}`);
      }
    }
  }
  
  if (constraints.maxBins !== undefined && bins.length > constraints.maxBins) {
    errors.push(`Too many bins: ${bins.length}, maximum is ${constraints.maxBins}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Merge adjacent bins that are too small
 */
export function mergeSmallBins(
  bins: TimeBin[],
  minEvents: number,
  maxBins: number
): TimeBin[] {
  if (bins.length <= maxBins) return bins;
  
  // Sort by event count (smallest first) and merge
  const sorted = [...bins].sort((a, b) => a.count - b.count);
  const result: TimeBin[] = [];
  let merged: TimeBin[] = [];
  let currentCount = 0;
  
  for (const bin of sorted) {
    if (currentCount + bin.count >= minEvents && result.length < maxBins - 1) {
      if (merged.length > 0) {
        result.push(mergeBinArray(merged));
        merged = [];
      }
      result.push(bin);
      currentCount = bin.count;
    } else {
      merged.push(bin);
      currentCount += bin.count;
    }
  }
  
  if (merged.length > 0) {
    result.push(mergeBinArray(merged));
  }
  
  return result.sort((a, b) => a.startTime - b.startTime);
}

function mergeBinArray(bins: TimeBin[]): TimeBin {
  return {
    id: `merged-${bins[0].id}`,
    startTime: Math.min(...bins.map(b => b.startTime)),
    endTime: Math.max(...bins.map(b => b.endTime)),
    count: bins.reduce((sum, b) => sum + b.count, 0),
    crimeTypes: Array.from(new Set(bins.flatMap(b => b.crimeTypes))),
    districts: Array.from(new Set(bins.flatMap(b => b.districts || []))),
    avgTimestamp: bins.reduce((sum, b) => sum + b.avgTimestamp * b.count, 0) / bins.reduce((sum, b) => sum + b.count, 0),
  };
}