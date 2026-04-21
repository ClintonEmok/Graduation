// Crime visualization types
export type CrimeType = 'Theft' | 'Assault' | 'Burglary' | 'Robbery' | 'Vandalism' | string;

export interface CrimeEvent {
  id: string;
  type: CrimeType;
  x: number;
  y: number; // Represents time in the 3D visualization (Y-up)
  z: number;
  timestamp: Date;
  district?: string;
  districtId?: number;
  block?: string;
}

export interface Bin {
  x: number;
  y: number;
  z: number;
  count: number;
  dominantType: string;
}

// Re-export crime types from canonical location
export type { CrimeRecord, CrimeRecordInput, CrimeViewport, UseCrimeDataOptions, CrimeDataMeta } from './crime';

// Re-export data types from canonical location
export type { ColumnarData } from './data';

// Re-export adaptive types from canonical location
export type { AdaptiveBinningMode } from './adaptive';
