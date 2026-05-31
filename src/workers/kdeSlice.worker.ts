import { computeSliceKde } from '@/lib/kde/compute-slice-kde';
import type { KdeParams } from '@/lib/kde/types';

export interface KdeWorkerInput {
  requestId: number;
  sliceGroups: Array<{ points: Array<{ x: number; z: number }> }>;
  params?: Partial<KdeParams>;
}

export interface KdeWorkerOutput {
  requestId: number;
  results: Array<{
    cells: Float32Array;
    maxIntensity: number;
    meanIntensity: number;
    cellCount: number;
  }>;
}

self.onmessage = (event: MessageEvent<KdeWorkerInput>) => {
  const { requestId, sliceGroups, params } = event.data;

  const results = sliceGroups.map((group) => {
    if (group.points.length === 0) {
      const empty = new Float32Array(0);
      return { cells: empty, maxIntensity: 0, meanIntensity: 0, cellCount: 0 };
    }

    const result = computeSliceKde(group.points, params);
    const flat = new Float32Array(result.cells.length * 4);
    for (let i = 0; i < result.cells.length; i++) {
      const cell = result.cells[i];
      flat[i * 4] = cell.x;
      flat[i * 4 + 1] = cell.z;
      flat[i * 4 + 2] = cell.intensity;
      flat[i * 4 + 3] = cell.support;
    }
    return { cells: flat, maxIntensity: result.maxIntensity, meanIntensity: result.meanIntensity, cellCount: result.cells.length };
  });

  self.postMessage({ requestId, results } satisfies KdeWorkerOutput);
};
