export interface DataPoint {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  type: string;
  block?: string;
  [key: string]: any;
}

export interface ColumnarData {
  x: Float32Array;
  z: Float32Array;
  lat?: Float32Array;
  lon?: Float32Array;
  timestamp: Float32Array;
  type: Uint8Array;
  district: Uint8Array;
  block: string[];
  length: number;
}

export interface FilteredPoint {
  x: number;
  y: number;
  z: number;
  lat?: number;
  lon?: number;
  typeId: number;
  districtId: number;
  block?: string;
  originalIndex: number;
}
