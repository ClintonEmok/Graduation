import type {
  AxisAlignedCubeBounds,
  CubeSpatialConstraint,
} from '@/store/useCubeSpatialConstraintsStore';

export interface OverlayBox {
  id: string;
  label: string;
  colorToken?: string;
  enabled: boolean;
  center: [number, number, number];
  size: [number, number, number];
  labelAnchor: [number, number, number];
  hadSwappedBounds: boolean;
  hadDegenerateBounds: boolean;
}

const MIN_AXIS_SIZE = 0.5;

const normalizeAxis = (a: number, b: number) => {
  if (a <= b) {
    return { min: a, max: b, swapped: false };
  }

  return { min: b, max: a, swapped: true };
};

const normalizeBounds = (bounds: AxisAlignedCubeBounds) => {
  const x = normalizeAxis(bounds.minX, bounds.maxX);
  const y = normalizeAxis(bounds.minY, bounds.maxY);
  const z = normalizeAxis(bounds.minZ, bounds.maxZ);

  return {
    minX: x.min,
    maxX: x.max,
    minY: y.min,
    maxY: y.max,
    minZ: z.min,
    maxZ: z.max,
    hadSwappedBounds: x.swapped || y.swapped || z.swapped,
  };
};

const toAxisSize = (min: number, max: number) => {
  const raw = max - min;
  if (raw >= MIN_AXIS_SIZE) {
    return { size: raw, degenerate: false };
  }

  return { size: MIN_AXIS_SIZE, degenerate: true };
};

export const toOverlayBox = (constraint: CubeSpatialConstraint): OverlayBox => {
  const normalized = normalizeBounds(constraint.geometry.bounds);

  const x = toAxisSize(normalized.minX, normalized.maxX);
  const y = toAxisSize(normalized.minY, normalized.maxY);
  const z = toAxisSize(normalized.minZ, normalized.maxZ);

  const centerX = (normalized.minX + normalized.maxX) / 2;
  const centerY = (normalized.minY + normalized.maxY) / 2;
  const centerZ = (normalized.minZ + normalized.maxZ) / 2;

  const halfY = y.size / 2;

  return {
    id: constraint.id,
    label: constraint.label,
    colorToken: constraint.colorToken,
    enabled: constraint.enabled,
    center: [centerX, centerY, centerZ],
    size: [x.size, y.size, z.size],
    labelAnchor: [centerX, centerY + halfY + 1.5, centerZ],
    hadSwappedBounds: normalized.hadSwappedBounds,
    hadDegenerateBounds: x.degenerate || y.degenerate || z.degenerate,
  };
};
