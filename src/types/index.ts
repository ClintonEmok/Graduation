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
}

export interface ColumnarData {
  x: Float32Array;
  z: Float32Array;
  timestamp: Float32Array;
  type: Uint8Array;
  district: Uint8Array;
  length: number;
}
