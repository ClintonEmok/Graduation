import { create } from 'zustand';
import type { CubeSpatialConstraint } from './useCubeSpatialConstraintsStore';
import {
  generateIntervalProposals,
  type IntervalProposal,
  type TemporalBurstWindow,
} from '@/app/cube-sandbox/lib/intervalProposalEngine';
import {
  applyIntervalProposal,
  type IntervalApplyReceipt,
  undoIntervalProposalApply,
} from '@/app/cube-sandbox/lib/applyIntervalProposal';

export interface IntervalProposalGenerationMeta {
  generatedAt: number | null;
  sourceConstraintIds: string[];
}

interface GenerateIntervalProposalsInput {
  constraints: CubeSpatialConstraint[];
  burstWindows: TemporalBurstWindow[];
}

type ProposalQualityState = 'valid' | 'downgraded';

export interface EditableIntervalProposal extends IntervalProposal {
  sourceProposalId: string;
  sourceRange: [number, number];
  editedRange: [number, number] | null;
  isEdited: boolean;
  qualityState: ProposalQualityState;
}

interface AppliedIntervalMeta {
  proposalId: string;
  receipt: IntervalApplyReceipt;
  previousAppliedProposalId: string | null;
}

interface IntervalProposalState {
  proposals: EditableIntervalProposal[];
  selectedProposalId: string | null;
  previewProposalId: string | null;
  appliedProposalId: string | null;
  lastApplied: AppliedIntervalMeta | null;
  generation: IntervalProposalGenerationMeta;
  generate: (input: GenerateIntervalProposalsInput) => EditableIntervalProposal[];
  clear: () => void;
  select: (proposalId: string | null) => void;
  updateProposalRange: (proposalId: string, range: [number, number]) => void;
  resetProposalRange: (proposalId: string) => void;
  previewSelected: () => EditableIntervalProposal | null;
  clearPreview: () => void;
  applySelected: () => EditableIntervalProposal | null;
  undoLastApply: () => boolean;
}

const emptyGenerationMeta: IntervalProposalGenerationMeta = {
  generatedAt: null,
  sourceConstraintIds: [],
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const round = (value: number, precision = 2): number => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const confidenceBand = (score: number): 'Low' | 'Medium' | 'High' => {
  if (score >= 75) {
    return 'High';
  }

  if (score >= 45) {
    return 'Medium';
  }

  return 'Low';
};

const toEditableProposal = (proposal: IntervalProposal): EditableIntervalProposal => ({
  ...proposal,
  sourceProposalId: proposal.id,
  sourceRange: proposal.range,
  editedRange: null,
  isEdited: false,
  qualityState: 'valid',
});

const normalizeRange = (range: [number, number]): [number, number] =>
  range[0] <= range[1] ? range : [range[1], range[0]];

const isValidEditedRange = (range: [number, number]): boolean => {
  const [start, end] = range;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  if (start < 0 || end > 100 || end <= start) {
    return false;
  }

  return end - start >= 0.1;
};

const recomputeEditedProposal = (
  proposal: EditableIntervalProposal,
  nextRange: [number, number]
): EditableIntervalProposal => {
  const normalizedRange = normalizeRange(nextRange);
  const edited = normalizedRange[0] !== proposal.sourceRange[0] || normalizedRange[1] !== proposal.sourceRange[1];
  if (!edited) {
    return {
      ...proposal,
      range: proposal.sourceRange,
      editedRange: null,
      isEdited: false,
      qualityState: 'valid',
      rationale: {
        ...proposal.rationale,
        summary: `Focus ${proposal.constraintLabel}: burst density and hotspot overlap indicate a high-value slice interval.`,
      },
    };
  }

  const [sourceStart, sourceEnd] = proposal.sourceRange;
  const [editedStart, editedEnd] = normalizedRange;
  const sourceSpan = Math.max(0.001, sourceEnd - sourceStart);
  const editedSpan = Math.max(0.001, editedEnd - editedStart);
  const sourceMidpoint = (sourceStart + sourceEnd) / 2;
  const editedMidpoint = (editedStart + editedEnd) / 2;
  const spanPenalty = clamp(Math.abs(editedSpan - sourceSpan) / sourceSpan, 0, 1);
  const shiftPenalty = clamp(Math.abs(editedMidpoint - sourceMidpoint) / 30, 0, 1);
  const validRange = isValidEditedRange(normalizedRange);

  const densityConcentration = validRange
    ? round(
        clamp(
          proposal.quality.densityConcentration * (1 - spanPenalty * 0.35) * (1 - shiftPenalty * 0.25),
          0,
          100
        )
      )
    : round(clamp(proposal.quality.densityConcentration * 0.45, 0, 100));
  const hotspotCoverage = validRange
    ? round(
        clamp(
          proposal.quality.hotspotCoverage * (1 - spanPenalty * 0.25) * (1 - shiftPenalty * 0.35),
          0,
          100
        )
      )
    : round(clamp(proposal.quality.hotspotCoverage * 0.4, 0, 100));
  const intervalSharpness = validRange ? clamp((16 / (16 + editedSpan)) * 100, 0, 100) : 12;
  const score = round(clamp(densityConcentration * 0.5 + hotspotCoverage * 0.35 + intervalSharpness * 0.15, 0, 100));
  const confidenceScore = validRange
    ? round(clamp(score * 0.88 + (proposal.confidence.score / 100) * 12, 0, 100))
    : round(clamp(score * 0.55, 0, 34));
  const band = validRange ? confidenceBand(confidenceScore) : 'Low';

  return {
    ...proposal,
    range: normalizedRange,
    editedRange: normalizedRange,
    isEdited: true,
    qualityState: validRange ? 'valid' : 'downgraded',
    label: `${proposal.constraintLabel} interval ${normalizedRange[0]}-${normalizedRange[1]}`,
    rationale: {
      ...proposal.rationale,
      summary: validRange
        ? `Edited ${proposal.constraintLabel}: confidence recomputed from range shift and interval concentration.`
        : `Edited ${proposal.constraintLabel}: range is outside valid interval thresholds, confidence downgraded.`,
      densityConcentration,
      hotspotCoverage,
      confidenceBand: band,
      confidenceScore,
    },
    confidence: {
      band,
      score: confidenceScore,
    },
    quality: {
      densityConcentration,
      hotspotCoverage,
    },
    score,
  };
};

export const useIntervalProposalStore = create<IntervalProposalState>((set, get) => ({
  proposals: [],
  selectedProposalId: null,
  previewProposalId: null,
  appliedProposalId: null,
  lastApplied: null,
  generation: emptyGenerationMeta,

  generate: ({ constraints, burstWindows }) => {
    const proposals = generateIntervalProposals(constraints, burstWindows).map(toEditableProposal);
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
      previewProposalId:
        state.previewProposalId !== null && proposals.some((proposal) => proposal.id === state.previewProposalId)
          ? state.previewProposalId
          : null,
      appliedProposalId:
        state.appliedProposalId !== null && proposals.some((proposal) => proposal.id === state.appliedProposalId)
          ? state.appliedProposalId
          : null,
      lastApplied: null,
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
      previewProposalId: null,
      appliedProposalId: null,
      lastApplied: null,
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

  updateProposalRange: (proposalId, range) => {
    set((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.id === proposalId ? recomputeEditedProposal(proposal, range) : proposal
      ),
    }));
  },

  resetProposalRange: (proposalId) => {
    set((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.id === proposalId ? recomputeEditedProposal(proposal, proposal.sourceRange) : proposal
      ),
    }));
  },

  previewSelected: () => {
    const state = get();
    if (state.selectedProposalId === null) {
      return null;
    }

    const selected = state.proposals.find((proposal) => proposal.id === state.selectedProposalId) ?? null;
    if (!selected) {
      return null;
    }

    set({ previewProposalId: selected.id });
    return selected;
  },

  clearPreview: () => {
    set({ previewProposalId: null });
  },

  applySelected: () => {
    const state = get();
    if (state.selectedProposalId === null) {
      return null;
    }

    const selected = state.proposals.find((proposal) => proposal.id === state.selectedProposalId);
    if (!selected) {
      return null;
    }

    const receipt = applyIntervalProposal(selected);
    set({
      appliedProposalId: selected.id,
      previewProposalId: selected.id,
      lastApplied: {
        proposalId: selected.id,
        receipt,
        previousAppliedProposalId: state.appliedProposalId,
      },
    });

    return selected;
  },

  undoLastApply: () => {
    const state = get();
    if (!state.lastApplied) {
      return false;
    }

    undoIntervalProposalApply(state.lastApplied.receipt);
    set({
      appliedProposalId: state.lastApplied.previousAppliedProposalId,
      lastApplied: null,
    });
    return true;
  },
}));
