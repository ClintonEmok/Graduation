export interface KdeCell {
  x: number;
  z: number;
  intensity: number;
  support: number;
}

export interface SliceKdeResult {
  cells: KdeCell[];
  maxIntensity: number;
  meanIntensity: number;
}

export interface KdeParams {
  gridSize: number;
  sigmaCells: number;
  kernelRadiusCells: number;
  threshold: number;
}

export const DEFAULT_KDE_PARAMS: KdeParams = {
  gridSize: 32,
  sigmaCells: 2,
  kernelRadiusCells: 6,
  threshold: 0.005,
};
