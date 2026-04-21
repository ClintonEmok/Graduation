/**
 * Point reduction/limiting utilities for large datasets
 */
import type { ColumnarData } from '@/types/data';

/** Downsample an array of numbers to maxPoints using stride-based sampling */
export function downsampleArray<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const stride = Math.ceil(arr.length / maxPoints);
  const result: T[] = [];
  for (let i = 0; i < arr.length; i += stride) {
    result.push(arr[i]);
  }
  return result;
}

/** Downsample a number array to maxPoints using stride sampling (optimized) */
export function downsampleNumbers(data: number[], maxPoints: number): number[] {
  if (data.length <= maxPoints) return data;
  const stride = Math.ceil(data.length / maxPoints);
  const newLength = Math.ceil(data.length / stride);
  const result = new Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = data[i * stride];
  }
  return result;
}

/** Limit points to maximum count using simple stride-based sampling (ColumnarData) */
export function downsampleByStride(data: ColumnarData, maxPoints: number): ColumnarData {
  if (data.length <= maxPoints) return data;

  const stride = Math.ceil(data.length / maxPoints);
  const newLength = Math.ceil(data.length / stride);

  return {
    x: downsampleFloat32(data.x, stride, newLength),
    z: downsampleFloat32(data.z, stride, newLength),
    timestampSec: downsampleFloat64(data.timestampSec, stride, newLength),
    timestamp: downsampleFloat32(data.timestamp, stride, newLength),
    type: downsampleUint8(data.type, stride, newLength),
    district: downsampleUint8(data.district, stride, newLength),
    block: downsampleStrings(data.block, stride, newLength),
    length: newLength,
  };
}

function downsampleFloat32(arr: Float32Array, stride: number, newLen: number): Float32Array {
  const result = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) result[i] = arr[i * stride];
  return result;
}

function downsampleFloat64(arr: Float64Array, stride: number, newLen: number): Float64Array {
  const result = new Float64Array(newLen);
  for (let i = 0; i < newLen; i++) result[i] = arr[i * stride];
  return result;
}

function downsampleUint8(arr: Uint8Array, stride: number, newLen: number): Uint8Array {
  const result = new Uint8Array(newLen);
  for (let i = 0; i < newLen; i++) result[i] = arr[i * stride];
  return result;
}

function downsampleStrings(arr: string[], stride: number, newLen: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < newLen; i++) result.push(arr[i * stride]);
  return result;
}