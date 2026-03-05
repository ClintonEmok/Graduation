import { create } from 'zustand';
import type { CubeSpatialConstraint } from './useCubeSpatialConstraintsStore';
import {
  generateWarpProposals,
  type WarpProposal,
  type WarpProposalTemporalContext,
} from '@/app/cube-sandbox/lib/warpProposalEngine';

export interface WarpProposalGenerationMeta {
  generatedAt: number | null;
  sourceConstraintIds: string[];
}

interface GenerateWarpProposalsInput {
  constraints: CubeSpatialConstraint[];
  temporalContext: WarpProposalTemporalContext;
}

interface WarpProposalState {
  proposals: WarpProposal[];
  selectedProposalId: string | null;
  appliedProposalId: string | null;
  generation: WarpProposalGenerationMeta;
  generate: (input: GenerateWarpProposalsInput) => WarpProposal[];
  clear: () => void;
  select: (proposalId: string | null) => void;
  markApplied: (proposalId: string | null) => void;
}

const emptyGenerationMeta: WarpProposalGenerationMeta = {
  generatedAt: null,
  sourceConstraintIds: [],
};

export const useWarpProposalStore = create<WarpProposalState>((set, get) => ({
  proposals: [],
  selectedProposalId: null,
  appliedProposalId: null,
  generation: emptyGenerationMeta,

  generate: ({ constraints, temporalContext }) => {
    const proposals = generateWarpProposals(constraints, temporalContext);
    const sourceConstraintIds = constraints
      .filter((constraint) => constraint.enabled)
      .map((constraint) => constraint.id)
      .sort((left, right) => left.localeCompare(right));

    const generatedAt = Date.now();
    const previousSelected = get().selectedProposalId;
    const nextSelected =
      previousSelected !== null && proposals.some((proposal) => proposal.id === previousSelected)
        ? previousSelected
        : (proposals[0]?.id ?? null);

    set((state) => ({
      proposals,
      selectedProposalId: nextSelected,
      appliedProposalId:
        state.appliedProposalId !== null && proposals.some((proposal) => proposal.id === state.appliedProposalId)
          ? state.appliedProposalId
          : null,
      generation: {
        generatedAt,
        sourceConstraintIds,
      },
    }));

    return proposals;
  },

  clear: () => {
    set({
      proposals: [],
      selectedProposalId: null,
      appliedProposalId: null,
      generation: emptyGenerationMeta,
    });
  },

  select: (proposalId) => {
    if (proposalId === null) {
      set({ selectedProposalId: null });
      return;
    }

    const exists = get().proposals.some((proposal) => proposal.id === proposalId);
    if (!exists) {
      return;
    }

    set({ selectedProposalId: proposalId });
  },

  markApplied: (proposalId) => {
    if (proposalId === null) {
      set({ appliedProposalId: null });
      return;
    }

    const exists = get().proposals.some((proposal) => proposal.id === proposalId);
    if (!exists) {
      return;
    }

    set({ appliedProposalId: proposalId });
  },
}));
