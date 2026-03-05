const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export const buildSliceAuthoredWarpMap = (
  slices: Array<{ enabled: boolean; range: [number, number]; weight: number }>,
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.enabled);
  if (enabledSlices.length === 0 || sampleCount < 2) return null;

  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);
  const density = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const percent = ratio * 100;
    let boost = 0;

    for (const slice of enabledSlices) {
      const start = Math.min(slice.range[0], slice.range[1]);
      const end = Math.max(slice.range[0], slice.range[1]);
      if (percent < start || percent > end) continue;

      const center = (start + end) / 2;
      const halfWidth = Math.max(0.5, (end - start) / 2);
      const normalizedDistance = Math.abs((percent - center) / halfWidth);
      const falloff = Math.max(0, 1 - normalizedDistance);
      boost += Math.max(0, slice.weight) * (0.35 + 0.65 * falloff);
    }

    density[i] = 1 + boost;
  }

  const cumulative = new Float32Array(sampleCount);
  cumulative[0] = 0;
  for (let i = 1; i < sampleCount; i += 1) {
    const prev = density[i - 1] ?? 1;
    const curr = density[i] ?? 1;
    cumulative[i] = cumulative[i - 1] + (prev + curr) * 0.5;
  }

  const total = cumulative[sampleCount - 1] ?? 0;
  if (!Number.isFinite(total) || total <= 0) return null;

  const warpMap = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const progress = (cumulative[i] ?? 0) / total;
    warpMap[i] = domainStart + progress * domainSpan;
  }

  return warpMap;
};

export const remapSelectionPercentToDomainPercent = (
  percent: number,
  selectionDomain: [number, number],
  fullDomain: [number, number]
) => {
  const [selectionStart, selectionEnd] = selectionDomain;
  const [fullStart, fullEnd] = fullDomain;
  const selectionSpan = Math.max(1e-9, selectionEnd - selectionStart);
  const fullSpan = Math.max(1e-9, fullEnd - fullStart);
  const epoch = selectionStart + (clampPercent(percent) / 100) * selectionSpan;
  return ((epoch - fullStart) / fullSpan) * 100;
};
