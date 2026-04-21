export type SuggestionType = 'time-scale' | 'interval-boundary';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified';

export type BoundaryMethod = 'peak' | 'change-point' | 'rule-based';
export type SnapToUnit = 'hour' | 'day' | 'none';

export interface GenerationPreset {
  id: string;
  name: string;
  warpCount: number;
  intervalCount: number;
  snapToUnit: SnapToUnit;
  boundaryMethod: BoundaryMethod;
}

export interface TimeScaleData {
  name: string;
  intervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number;
  }>;
}

export interface IntervalBoundaryData {
  boundaries: number[]; // epoch seconds
}

export interface SuggestionContextMetadata {
  crimeTypes: string[];
  timeRange: {
    start: number;
    end: number;
  };
  isFullDataset: boolean;
  profileName?: string;
  contextDiagnostics?: {
    dynamicProfileLabel: string;
    signalState: 'strong' | 'weak-signal' | 'no-strong';
    isWeakSignal: boolean;
    hasNoStrongProfile: boolean;
    confidence?: number;
    temporalSummary?: string;
    spatialSummary?: string;
    neighbourhoodSummary?: string;
    spatialHotspots?: Array<{
      label: string;
      supportCount: number;
      density: number;
    }>;
    staticProfileLabel: string;
    profileComparison: {
      matches: boolean;
      outcome: 'same' | 'strong-different' | 'weak-signal' | 'no-strong';
      reason: string;
    };
    sections: {
      temporal: {
        status: 'available' | 'missing';
        notice?: string;
      };
      spatial: {
        status: 'available' | 'missing';
        notice?: string;
      };
      neighbourhood: {
        status: 'available' | 'missing';
        notice?: string;
      };
    };
  };
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  confidence: number; // 0-100
  data: TimeScaleData | IntervalBoundaryData;
  contextMetadata?: SuggestionContextMetadata;
  createdAt: number;
  status: SuggestionStatus;
}

export interface HistoryEntry {
  id: string;
  suggestion: Suggestion;
  acceptedAt: number;
  contextMetadata?: SuggestionContextMetadata;
}
