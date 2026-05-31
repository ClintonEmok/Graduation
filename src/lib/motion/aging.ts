export function getSliceOpacity(
  sliceIndex: number,
  activeIndex: number,
  totalSlices: number,
): number {
  const distance = Math.abs(sliceIndex - activeIndex);
  return Math.max(0.12, 1 - distance * 0.22);
}

export function computeTrailIntensity(
  distanceFromActive: number,
  decayRate: number = 0.35,
): number {
  return Math.exp(-distanceFromActive * decayRate);
}

export function buildAgingOpacityMap(
  activeIndex: number,
  totalSlices: number,
  decayRate: number = 0.35,
): Float32Array {
  const map = new Float32Array(totalSlices);
  for (let i = 0; i < totalSlices; i++) {
    map[i] = computeTrailIntensity(Math.abs(i - activeIndex), decayRate);
  }
  return map;
}
