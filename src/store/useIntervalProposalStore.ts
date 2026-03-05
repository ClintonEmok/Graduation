import { create } from 'zustand';
import type { CubeSpatialConstraint } from './useCubeSpatialConstraintsStore';
import {
  generateIntervalProposals,
  type IntervalProposal,
  type TemporalBurstWindow,
} from '@/app/cube-sandbox/lib/intervalProposalEngine';

export interface IntervalProposalGenerationMeta {
  generatedAt: number | null;
  sourceConstraintIds: string[];
}

interface GenerateIntervalProposalsInput {
  constraints: CubeSpatialConstraint[];
  burstWindows: TemporalBurstWindow[];
}

interface IntervalProposalState {
  proposals: IntervalProposal[];
  selectedProposalId: string | null;
  generation: IntervalProposalGenerationMeta;
  generate: (input: GenerateIntervalProposalsInput) => IntervalProposal[];
  clear: () => void;
  select: (proposalId: string | null) => void;
}

const emptyGenerationMeta: IntervalProposalGenerationMeta = {
  generatedAt: null,
  sourceConstraintIds: [],
};

export const useIntervalProposalStore = create<IntervalProposalState>((set, get) => ({
  proposals: [],
  selectedProposalId: null,
  generation: emptyGenerationMeta,

  generate: ({ constraints, burstWindows }) => {
    const proposals = generateIntervalProposals(constraints, burstWindows);
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

    set({
      proposals,
      selectedProposalId: nextSelected,
      generation: {
        generatedAt,
        sourceConstraintIds,
      },
    });

    return proposals;
  },

  clear: () => {
    set({
      proposals: [],
      selectedProposalId: null,
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
}));
