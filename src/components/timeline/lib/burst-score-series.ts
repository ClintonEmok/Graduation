export interface BurstScoreGeometryInput {
  id: string;
  label: string;
  left: number;
  width: number;
  isActive: boolean;
  isBurst: boolean;
  burstScore?: number | null;
}

export interface BurstScoreSeriesEntry extends BurstScoreGeometryInput {
  score: number;
  normalizedScore: number;
}

export function buildBurstScoreSeries(geometries: BurstScoreGeometryInput[]): BurstScoreSeriesEntry[] {
  const visibleGeometries = geometries
    .filter((geometry) => Number.isFinite(geometry.left) && Number.isFinite(geometry.width) && geometry.width > 0)
    .slice()
    .sort((left, right) => left.left - right.left || left.id.localeCompare(right.id));

  if (visibleGeometries.length === 0) {
    return [];
  }

  const scores = visibleGeometries.map((geometry) => Math.max(0, geometry.burstScore ?? 0));
  const strongestScore = Math.max(...scores, 0);
  const scoreBase = Math.max(1, strongestScore);

  return visibleGeometries.map((geometry, index) => {
    const score = scores[index] ?? 0;

    return {
      ...geometry,
      score,
      normalizedScore: score / scoreBase,
    };
  });
}
