import type { TimeSlice } from '@/store/useDashboardDemoSliceStore';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const clampWeight = (value: number) => Math.min(3, Math.max(0, value));

const resolveSliceRange = (slice: TimeSlice): [number, number] | null => {
  if (slice.range) {
    const start = clampPercent(Math.min(slice.range[0], slice.range[1]));
    const end = clampPercent(Math.max(slice.range[0], slice.range[1]));
    return end > start ? [start, end] : null;
  }

  if (!Number.isFinite(slice.time)) {
    return null;
  }

  const center = clampPercent(slice.time);
  const halfWidth = slice.isBurst ? 2.5 : 1.5;
  return [clampPercent(center - halfWidth), clampPercent(center + halfWidth)];
};

export const buildDemoSliceAuthoredWarpMap = (
  slices: TimeSlice[],
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.isVisible && (slice.warpEnabled ?? true));
  if (enabledSlices.length === 0 || sampleCount < 2) {
    return null;
  }

  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);
  const density = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const percent = ratio * 100;
    let boost = 0;

    for (const slice of enabledSlices) {
      const range = resolveSliceRange(slice);
      if (!range) {
        continue;
      }

      const [start, end] = range;
      if (percent < start || percent > end) {
        continue;
      }

      const center = (start + end) / 2;
      const halfWidth = Math.max(0.5, (end - start) / 2);
      const normalizedDistance = Math.abs((percent - center) / halfWidth);
      const falloff = Math.max(0, 1 - normalizedDistance);
      const baseWeight = slice.isBurst ? 1.25 : slice.type === 'range' ? 1 : 0.85;
      const authoredWeight = clampWeight(slice.warpWeight ?? 1);
      boost += baseWeight * authoredWeight * (0.35 + 0.65 * falloff);
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
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const warpMap = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const progress = (cumulative[i] ?? 0) / total;
    warpMap[i] = domainStart + progress * domainSpan;
  }

  return warpMap;
};
