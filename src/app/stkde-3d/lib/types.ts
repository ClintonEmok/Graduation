export interface KdeCell {
  x: number;
  z: number;
  intensity: number;
  support: number;
}

export interface EvolvingSlice {
  index: number;
  label: string;
  startPercent: number;
  endPercent: number;
  burstScore: number;
  crimeCount: number;
}

export interface Stkde3dHotspot {
  name: string;
  type: string;
  evolution: Array<{
    centerX: number;
    centerZ: number;
    radius: number;
    weight: number;
  } | null>;
}

export interface MockCrimeEvent {
  x: number;
  z: number;
  type: string;
}
