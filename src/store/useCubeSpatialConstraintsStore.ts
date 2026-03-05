import { create } from 'zustand';

export interface AxisAlignedCubeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface AxisAlignedCubeGeometry {
  shape: 'axis-aligned-cube';
  bounds: AxisAlignedCubeBounds;
}

export type CubeSpatialConstraintGeometry = AxisAlignedCubeGeometry;

export interface CubeSpatialConstraint {
  id: string;
  label: string;
  geometry: CubeSpatialConstraintGeometry;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  colorToken?: string;
}

export interface CreateCubeSpatialConstraintInput {
  label: string;
  geometry: CubeSpatialConstraintGeometry;
  enabled?: boolean;
  colorToken?: string;
}

export interface UpdateCubeSpatialConstraintInput {
  label?: string;
  geometry?: CubeSpatialConstraintGeometry;
  colorToken?: string;
}

interface CubeSpatialConstraintsState {
  constraints: CubeSpatialConstraint[];
  activeConstraintId: string | null;
  createConstraint: (input: CreateCubeSpatialConstraintInput) => CubeSpatialConstraint;
  updateConstraint: (id: string, updates: UpdateCubeSpatialConstraintInput) => void;
  removeConstraint: (id: string) => void;
  toggleConstraintEnabled: (id: string, nextEnabled?: boolean) => void;
  setActiveConstraint: (id: string | null) => void;
  clearActiveConstraint: () => void;
}

const now = () => Date.now();

export const useCubeSpatialConstraintsStore = create<CubeSpatialConstraintsState>((set, get) => ({
  constraints: [],
  activeConstraintId: null,

  createConstraint: (input) => {
    const timestamp = now();
    const constraint: CubeSpatialConstraint = {
      id: crypto.randomUUID(),
      label: input.label,
      geometry: input.geometry,
      enabled: input.enabled ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
      colorToken: input.colorToken,
    };

    set((state) => ({
      constraints: [...state.constraints, constraint],
      activeConstraintId: state.activeConstraintId ?? constraint.id,
    }));

    return constraint;
  },

  updateConstraint: (id, updates) => {
    set((state) => ({
      constraints: state.constraints.map((constraint) => {
        if (constraint.id !== id) {
          return constraint;
        }

        return {
          ...constraint,
          ...updates,
          updatedAt: now(),
        };
      }),
    }));
  },

  removeConstraint: (id) => {
    set((state) => ({
      constraints: state.constraints.filter((constraint) => constraint.id !== id),
      activeConstraintId: state.activeConstraintId === id ? null : state.activeConstraintId,
    }));
  },

  toggleConstraintEnabled: (id, nextEnabled) => {
    set((state) => ({
      constraints: state.constraints.map((constraint) => {
        if (constraint.id !== id) {
          return constraint;
        }

        return {
          ...constraint,
          enabled: nextEnabled ?? !constraint.enabled,
          updatedAt: now(),
        };
      }),
    }));
  },

  setActiveConstraint: (id) => {
    if (id === null) {
      set({ activeConstraintId: null });
      return;
    }

    const exists = get().constraints.some((constraint) => constraint.id === id);
    if (!exists) {
      return;
    }

    set({ activeConstraintId: id });
  },

  clearActiveConstraint: () => {
    set({ activeConstraintId: null });
  },
}));
