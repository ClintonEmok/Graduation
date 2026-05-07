export const STKDE_HEATMAP_COLOR_STOPS = [
  [0, 'rgba(30, 64, 175, 0)'],
  [0.2, 'rgba(59, 130, 246, 0.35)'],
  [0.4, 'rgba(16, 185, 129, 0.5)'],
  [0.6, 'rgba(234, 179, 8, 0.7)'],
  [0.8, 'rgba(249, 115, 22, 0.8)'],
  [1, 'rgba(239, 68, 68, 0.9)'],
] as const;

type Rgba = { r: number; g: number; b: number; a: number };

const parseRgba = (color: string): Rgba => {
  const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) {
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: Number(match[4]),
  };
};

const lerp = (start: number, end: number, value: number) => start + (end - start) * value;

export function sampleStkdeHeatmapColor(intensity: number): string {
  const value = Math.min(1, Math.max(0, intensity));
  for (let i = 0; i < STKDE_HEATMAP_COLOR_STOPS.length - 1; i += 1) {
    const [leftStop, leftColor] = STKDE_HEATMAP_COLOR_STOPS[i];
    const [rightStop, rightColor] = STKDE_HEATMAP_COLOR_STOPS[i + 1];
    if (value < leftStop || value > rightStop) continue;

    const span = rightStop - leftStop || 1;
    const t = (value - leftStop) / span;
    const left = parseRgba(leftColor);
    const right = parseRgba(rightColor);
    return `rgba(${Math.round(lerp(left.r, right.r, t))}, ${Math.round(lerp(left.g, right.g, t))}, ${Math.round(
      lerp(left.b, right.b, t),
    )}, ${Number(lerp(left.a, right.a, t).toFixed(3))})`;
  }

  return STKDE_HEATMAP_COLOR_STOPS[STKDE_HEATMAP_COLOR_STOPS.length - 1][1];
}

export function buildStkdeHeatmapColorExpression() {
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    ...STKDE_HEATMAP_COLOR_STOPS.flatMap(([stop, color]) => [stop, color]),
  ];
}
