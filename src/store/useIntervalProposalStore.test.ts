/* @vitest-environment node */
import { beforeEach, describe, expect, test } from 'vitest';
import type { CubeSpatialConstraint } from './useCubeSpatialConstraintsStore';
import type { TemporalBurstWindow } from '@/app/cube-sandbox/lib/intervalProposalEngine';
import { useIntervalProposalStore } from './useIntervalProposalStore';
import { useSliceStore } from './useSliceStore';

const constraints: CubeSpatialConstraint[] = [
  {
    id: 'constraint-loop',
    label: 'The Loop',
    geometry: {
      shape: 'axis-aligned-cube',
      bounds: {
        minX: 0,
        maxX: 8,
        minY: 0,
        maxY: 6,
        minZ: 0,
        maxZ: 7,
      },
    },
    enabled: true,
    createdAt: 10,
    updatedAt: 10,
  },
];

const burstWindows: TemporalBurstWindow[] = [
  { id: 'burst-1', start: 20, end: 28, peak: 0.94 },
  { id: 'burst-2', start: 40, end: 48, peak: 0.7 },
];

beforeEach(() => {
  useIntervalProposalStore.getState().clear();
  useSliceStore.getState().clearSlices();
});

describe('useIntervalProposalStore editable proposal workflow', () => {
  test('recomputes deterministic confidence and keeps source linkage after edits', () => {
    const store = useIntervalProposalStore.getState();
    const generated = store.generate({ constraints, burstWindows });
    const proposalId = generated[0]?.id;
    expect(proposalId).toBeTruthy();
    if (!proposalId) {
      return;
    }

    const baseline = useIntervalProposalStore.getState().proposals.find((proposal) => proposal.id === proposalId);
    expect(baseline).toBeDefined();
    if (!baseline) {
      return;
    }

    useIntervalProposalStore.getState().updateProposalRange(proposalId, [21.5, 31]);

    const edited = useIntervalProposalStore.getState().proposals.find((proposal) => proposal.id === proposalId);
    expect(edited).toBeDefined();
    if (!edited) {
      return;
    }

    expect(edited.sourceProposalId).toBe(proposalId);
    expect(edited.constraintId).toBe(baseline.constraintId);
    expect(edited.sourceRange).toEqual(baseline.sourceRange);
    expect(edited.editedRange).toEqual([21.5, 31]);
    expect(edited.isEdited).toBe(true);
    expect(edited.qualityState).toBe('valid');
    expect(edited.confidence.score).not.toBe(baseline.confidence.score);

    useIntervalProposalStore.getState().clear();
    useIntervalProposalStore.getState().generate({ constraints, burstWindows });
    useIntervalProposalStore.getState().updateProposalRange(proposalId, [21.5, 31]);
    const rerun = useIntervalProposalStore.getState().proposals.find((proposal) => proposal.id === proposalId);

    expect(rerun).toBeDefined();
    expect(rerun?.confidence.score).toBe(edited.confidence.score);
    expect(rerun?.confidence.band).toBe(edited.confidence.band);
    expect(rerun?.quality).toEqual(edited.quality);
  });

  test('keeps invalid edits as downgraded proposals instead of removing them', () => {
    const generated = useIntervalProposalStore.getState().generate({ constraints, burstWindows });
    const proposalId = generated[0]?.id;
    expect(proposalId).toBeTruthy();
    if (!proposalId) {
      return;
    }

    useIntervalProposalStore.getState().updateProposalRange(proposalId, [70, 120]);

    const proposal = useIntervalProposalStore.getState().proposals.find((candidate) => candidate.id === proposalId);
    expect(proposal).toBeDefined();
    expect(useIntervalProposalStore.getState().proposals.some((candidate) => candidate.id === proposalId)).toBe(true);
    expect(proposal?.qualityState).toBe('downgraded');
    expect(proposal?.confidence.band).toBe('Low');
    expect(proposal?.editedRange).toEqual([70, 120]);
  });

  test('supports preview, apply, and undo with slice provenance', () => {
    const generated = useIntervalProposalStore.getState().generate({ constraints, burstWindows });
    const proposalId = generated[0]?.id;
    expect(proposalId).toBeTruthy();
    if (!proposalId) {
      return;
    }

    useIntervalProposalStore.getState().select(proposalId);
    const preview = useIntervalProposalStore.getState().previewSelected();
    expect(preview?.id).toBe(proposalId);
    expect(useIntervalProposalStore.getState().previewProposalId).toBe(proposalId);

    const applied = useIntervalProposalStore.getState().applySelected();
    expect(applied?.id).toBe(proposalId);
    expect(useIntervalProposalStore.getState().appliedProposalId).toBe(proposalId);
    expect(useSliceStore.getState().slices).toHaveLength(1);
    expect(useSliceStore.getState().slices[0]?.notes).toContain(`interval-proposal:${proposalId}`);

    const undone = useIntervalProposalStore.getState().undoLastApply();
    expect(undone).toBe(true);
    expect(useSliceStore.getState().slices).toHaveLength(0);
    expect(useIntervalProposalStore.getState().appliedProposalId).toBeNull();
  });
});
