export type CrimeType = 'Theft' | 'Assault' | 'Burglary' | 'Robbery' | 'Vandalism';

export interface CrimeEvent {
  id: string;
  type: CrimeType;
  x: number;
  y: number; // Represents time in the 3D visualization (Y-up)
  z: number;
  timestamp: Date;
}
