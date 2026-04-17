/**
 * Binning Types
 */

import type { BinningConfig, BinningStrategy, BinningConstraint, BinningRule, BinningRuleParams, BinningResult } from './rules';

export type { BinningStrategy, BinningConstraint, BinningRule, BinningRuleParams, BinningResult };

export interface TimeBin {
  /** Unique identifier */
  id: string;
  /** Start timestamp (epoch ms) */
  startTime: number;
  /** End timestamp (epoch ms) */
  endTime: number;
  /** Event count */
  count: number;
  /** Crime types in this bin */
  crimeTypes: string[];
  /** Districts in this bin */
  districts?: string[];
  /** Average timestamp (for positioning) */
  avgTimestamp: number;
  /** Is user-modified */
  isModified?: boolean;
  /** Merge source bin IDs */
  mergedFrom?: string[];
  /** Deterministic burst taxonomy label */
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  /** Burst taxonomy rule version */
  burstRuleVersion?: string;
  /** Burst taxonomy score */
  burstScore?: number;
  /** Inter-event burstiness coefficient */
  burstinessCoefficient?: number;
  /** Human-readable burstiness formula */
  burstinessFormula?: string;
  /** Human-readable burstiness calculation */
  burstinessCalculation?: string;
  /** Per-type burstiness breakdown for generalized event analysis */
  burstinessByType?: Array<{
    type: string;
    count: number;
    coefficient: number;
    normalizedScore: number;
    formula: string;
    calculation: string;
  }>;
  /** Burst taxonomy confidence */
  burstConfidence?: number;
  /** Warp weight used by non-uniform slicing */
  warpWeight?: number;
  /** True when the bin is a neutral fallback partition */
  isNeutralPartition?: boolean;
  /** Burst taxonomy provenance */
  burstProvenance?: string;
  /** Tie-break explanation */
  tieBreakReason?: string;
  /** Threshold source note */
  thresholdSource?: string;
  /** Neighborhood summary for the taxonomy decision */
  neighborhoodSummary?: string;
}

export interface BinGroup {
  id: string;
  name: string;
  bins: TimeBin[];
  color: string;
}

export interface BinModification {
  type: 'merge' | 'split' | 'delete' | 'resize' | 'create';
  binIds: string[];
  newBinIds?: string[];
  timestamp: number;
}

export interface BinningState {
  config: BinningConfig;
  bins: TimeBin[];
  selectedBinId: string | null;
  isComputing: boolean;
  modificationHistory: BinModification[];
  savedConfigurations: SavedConfiguration[];
}

export interface SavedConfiguration {
  id: string;
  name: string;
  config: BinningConfig;
  createdAt: number;
  modifiedAt: number;
}

// Export BinningConfig type for convenience
export type { BinningConfig };
