import type { KdeCell, MockCrimeEvent } from './types';

const GRID_SIZE = 32;
const SIGMA_CELLS = 2;
const KERNEL_RADIUS_CELLS = 6;

export function computeSliceKde(
  points: MockCrimeEvent[],
): { cells: KdeCell[]; maxIntensity: number } {
  const gridRows = GRID_SIZE;
  const gridCols = GRID_SIZE;
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;

  const support = new Float32Array(gridRows * gridCols);

  for (const point of points) {
    const col = Math.min(
      gridCols - 1,
      Math.max(0, Math.floor((point.x + 50) / cellWidth)),
    );
    const row = Math.min(
      gridRows - 1,
      Math.max(0, Math.floor((point.z + 50) / cellHeight)),
    );
    support[row * gridCols + col] += 1;
  }

  const intensity = new Float32Array(gridRows * gridCols);
  let maxIntensity = 0;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const centerIdx = row * gridCols + col;
      let sum = 0;

      const rowStart = Math.max(0, row - KERNEL_RADIUS_CELLS);
      const rowEnd = Math.min(gridRows - 1, row + KERNEL_RADIUS_CELLS);
      const colStart = Math.max(0, col - KERNEL_RADIUS_CELLS);
      const colEnd = Math.min(gridCols - 1, col + KERNEL_RADIUS_CELLS);

      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          const neighborIdx = r * gridCols + c;
          const count = support[neighborIdx];
          if (count <= 0) continue;
          const dr = r - row;
          const dc = c - col;
          const dist = Math.sqrt(dr * dr + dc * dc);
          const weight = Math.exp(-0.5 * (dist / SIGMA_CELLS) ** 2);
          sum += count * weight;
        }
      }

      intensity[centerIdx] = sum;
      if (sum > maxIntensity) maxIntensity = sum;
    }
  }

  const safeMax = Math.max(1, maxIntensity);
  const cells: KdeCell[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const idx = row * gridCols + col;
      const x = -50 + (col + 0.5) * cellWidth;
      const z = -50 + (row + 0.5) * cellHeight;
      const normalized = intensity[idx] / safeMax;

      if (normalized > 0.005) {
        cells.push({
          x: Number(x.toFixed(2)),
          z: Number(z.toFixed(2)),
          intensity: Number(normalized.toFixed(4)),
          support: Math.round(support[idx]),
        });
      }
    }
  }

  return { cells, maxIntensity: safeMax };
}
