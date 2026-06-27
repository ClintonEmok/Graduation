export const buildDensityWarpMap = (
  densityMap: Float32Array | null,
  domain: [number, number]
): Float32Array | null => {
  if (!densityMap || densityMap.length < 2) {
    return null;
  }

  const [start, end] = domain;
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0) {
    return null;
  }

  let maxDensity = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    const value = densityMap[i] ?? 0;
    if (Number.isFinite(value) && value > maxDensity) {
      maxDensity = value;
    }
  }
  if (maxDensity <= 0) {
    maxDensity = 1;
  }

  const weights = new Float32Array(densityMap.length);
  let totalWeight = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    const normalized = (densityMap[i] ?? 0) / maxDensity;
    const safeNormalized = Number.isFinite(normalized) ? normalized : 0;
    const weight = 1 + safeNormalized * 5;
    weights[i] = weight;
    totalWeight += weight;
  }

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return null;
  }

  const warpMap = new Float32Array(densityMap.length);
  let accumulated = 0;
  for (let i = 0; i < densityMap.length; i += 1) {
    warpMap[i] = start + (accumulated / totalWeight) * span;
    accumulated += weights[i] ?? 1;
  }

  return warpMap;
};
