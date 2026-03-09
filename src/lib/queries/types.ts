export type QueryFragment = {
  sql: string;
  params: unknown[];
};

export interface CrimeRecord {
  timestamp: number;
  type: string;
  lat: number;
  lon: number;
  x: number;
  z: number;
  iucr: string;
  district: string;
  year: number;
}

export interface QueryCrimesOptions {
  limit?: number;
  sampleStride?: number;
  crimeTypes?: string[];
  districts?: string[];
}

export interface QueryFilters {
  crimeTypes?: string[];
  districts?: string[];
}

export interface GlobalAdaptiveMaps {
  binCount: number;
  kernelWidth: number;
  domain: [number, number];
  rowCount: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  generatedAt: string;
}

export interface DensityBin {
  x: number;
  y: number;
  z: number;
  count: number;
  dominantType: string;
}
