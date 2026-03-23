/**
 * Binning Types
 */

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

import { BinningConfig } from './rules';