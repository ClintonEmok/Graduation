export interface KdeCell {
  x: number;
  z: number;
  intensity: number;
  support: number;
}

export interface SliceKdeResult {
  cells: KdeCell[];
  maxIntensity: number;
}
