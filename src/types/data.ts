/**
 * Canonical ColumnarData type for crime data in columnar format.
 * Used by data processing pipeline for efficient memory layout.
 */
export interface ColumnarData {
  x: Float32Array;
  z: Float32Array;
  lat?: Float32Array;
  lon?: Float32Array;
  timestampSec: Float64Array;
  timestamp: Float32Array;
  type: Uint8Array;
  district: Uint8Array;
  block: string[];
  length: number;
}
