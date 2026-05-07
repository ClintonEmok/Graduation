import { DBSCAN } from 'density-clustering';
import type { FilteredPoint } from '@/lib/data/types';
import { getCrimeTypeName } from '@/lib/category-maps';

export interface ClusterBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export type ClusterScope =
  | { kind: 'global' }
  | { kind: 'slice'; sliceId: string };

export interface ClusterAnalysisCluster {
  id: string;
  scope: ClusterScope;
  memberIndexes: number[];
  count: number;
  dominantTypeId: number;
  dominantType: string;
  typeCounts: Record<number, number>;
  bounds: ClusterBounds;
  center: [number, number, number];
  size: [number, number, number];
  timeRange: [number, number];
}

export interface ClusterAnalysisResult {
  scope: ClusterScope;
  clusters: ClusterAnalysisCluster[];
  noiseIndexes: number[];
  epsilon: number;
  minPoints: number;
}

export interface SliceClusterAnalysis {
  sliceId: string;
  clusters: ClusterAnalysisCluster[];
}

const DEFAULT_MIN_POINTS = 5;

const createEmptyBounds = (): ClusterBounds => ({
  minX: Infinity,
  maxX: -Infinity,
  minY: Infinity,
  maxY: -Infinity,
  minZ: Infinity,
  maxZ: -Infinity,
  minLat: Infinity,
  maxLat: -Infinity,
  minLon: Infinity,
  maxLon: -Infinity,
});

const stabilizeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const resolveEpsilon = (sensitivity: number): number => {
  const bounded = Math.min(1, Math.max(0, sensitivity));
  return Math.max(2, 15 - bounded * 12);
};

const scopeLabel = (scope: ClusterScope): string => {
  if (scope.kind === 'slice') return `slice-${scope.sliceId}`;
  return 'global';
};

const readNoiseIndexes = (dbscan: DBSCAN): number[] => {
  const noise = (dbscan as unknown as { noise?: number[] }).noise;
  return Array.isArray(noise) ? [...noise] : [];
};

export function analyzeClusters(
  points: FilteredPoint[],
  sensitivity: number,
  scope: ClusterScope = { kind: 'global' }
): ClusterAnalysisResult {
  if (points.length === 0) {
    return {
      scope,
      clusters: [],
      noiseIndexes: [],
      epsilon: resolveEpsilon(sensitivity),
      minPoints: DEFAULT_MIN_POINTS,
    };
  }

  const dataset = points.map((point) => [point.x, point.y * 0.5, point.z]);
  const epsilon = resolveEpsilon(sensitivity);
  const minPoints = DEFAULT_MIN_POINTS;
  const dbscan = new DBSCAN();
  const clusterIndexes = dbscan.run(dataset, epsilon, minPoints) as number[][];

  const clusters = clusterIndexes.map((memberIndexes, index) => {
    const bounds = createEmptyBounds();
    const typeCounts: Record<number, number> = {};
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const memberIndex of memberIndexes) {
      const point = points[memberIndex];
      if (!point) continue;

      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxY = Math.max(bounds.maxY, point.y);
      bounds.minZ = Math.min(bounds.minZ, point.z);
      bounds.maxZ = Math.max(bounds.maxZ, point.z);
      bounds.minLat = Math.min(bounds.minLat, point.lat ?? bounds.minLat);
      bounds.maxLat = Math.max(bounds.maxLat, point.lat ?? bounds.maxLat);
      bounds.minLon = Math.min(bounds.minLon, point.lon ?? bounds.minLon);
      bounds.maxLon = Math.max(bounds.maxLon, point.lon ?? bounds.maxLon);

      minTime = Math.min(minTime, point.y);
      maxTime = Math.max(maxTime, point.y);
      typeCounts[point.typeId] = (typeCounts[point.typeId] || 0) + 1;
    }

    let dominantTypeId = 0;
    let dominantCount = -1;
    for (const [typeIdString, count] of Object.entries(typeCounts)) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantTypeId = Number(typeIdString);
      }
    }

    const clusterId = `${scopeLabel(scope)}-${index}`;
    const dominantType = getCrimeTypeName(dominantTypeId);
    const size: [number, number, number] = [
      stabilizeNumber(bounds.maxX - bounds.minX),
      stabilizeNumber(bounds.maxY - bounds.minY),
      stabilizeNumber(bounds.maxZ - bounds.minZ),
    ];
    const center: [number, number, number] = [
      stabilizeNumber((bounds.minX + bounds.maxX) / 2),
      stabilizeNumber((bounds.minY + bounds.maxY) / 2),
      stabilizeNumber((bounds.minZ + bounds.maxZ) / 2),
    ];
    const timeRange: [number, number] = [stabilizeNumber(minTime), stabilizeNumber(maxTime)];

    return {
      id: clusterId,
      scope,
      memberIndexes: [...memberIndexes],
      count: memberIndexes.length,
      dominantTypeId,
      dominantType,
      typeCounts,
      bounds: {
        minX: stabilizeNumber(bounds.minX),
        maxX: stabilizeNumber(bounds.maxX),
        minY: stabilizeNumber(bounds.minY),
        maxY: stabilizeNumber(bounds.maxY),
        minZ: stabilizeNumber(bounds.minZ),
        maxZ: stabilizeNumber(bounds.maxZ),
        minLat: stabilizeNumber(bounds.minLat),
        maxLat: stabilizeNumber(bounds.maxLat),
        minLon: stabilizeNumber(bounds.minLon),
        maxLon: stabilizeNumber(bounds.maxLon),
      },
      center,
      size,
      timeRange,
    };
  });

  return {
    scope,
    clusters,
    noiseIndexes: readNoiseIndexes(dbscan),
    epsilon,
    minPoints,
  };
}

export function groupClusterAnalysesBySlice(
  analyses: SliceClusterAnalysis[]
): Record<string, ClusterAnalysisCluster[]> {
  return analyses.reduce<Record<string, ClusterAnalysisCluster[]>>((acc, analysis) => {
    acc[analysis.sliceId] = analysis.clusters;
    return acc;
  }, {});
}
