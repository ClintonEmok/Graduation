/**
 * Phase 80 Condition Order helpers.
 *
 * Each participant is assigned a counterbalanced block order BEFORE any
 * task begins. Within a block, the 4 tasks run in fixed T4 -> T1 -> T2 -> T3
 * order (see `./protocol.ts`). This module centralizes the assignment logic
 * so the store, tests, and the route UI all agree on the same derivation.
 *
 * Why explicit order assignment: the researcher must confirm the order per
 * participant (see 80-RESEARCH.md Open Question #3). Auto-deriving from the
 * participant ID risks accidental wrong-order assignment when the
 * researcher types the wrong ID. The store records the researcher-chosen
 * order and uses these helpers to derive the `Tasks-A` / `Tasks-B` /
 * `Questionnaire-A` / `Questionnaire-B` step labels.
 */

import { STUDY_STEP_IDS, type StudyStepId } from './protocol';

export type ConditionId = 'uniform' | 'adaptive';
export type BlockId = 'A' | 'B';

export type BlockOrder = 'A->B' | 'B->A';

export interface ConditionAssignment {
  /** Researcher-chosen block order. */
  order: BlockOrder;
  /** Condition running in block A. */
  blockA: ConditionId;
  /** Condition running in block B. */
  blockB: ConditionId;
}

export const ALL_CONDITION_IDS: readonly ConditionId[] = ['uniform', 'adaptive'] as const;
export const ALL_BLOCK_ORDERS: readonly BlockOrder[] = ['A->B', 'B->A'] as const;

export const isConditionId = (value: unknown): value is ConditionId =>
  typeof value === 'string' && ALL_CONDITION_IDS.includes(value as ConditionId);

export const isBlockOrder = (value: unknown): value is BlockOrder =>
  typeof value === 'string' && ALL_BLOCK_ORDERS.includes(value as BlockOrder);

/**
 * Canonical mapping of block order to (blockA, blockB) condition pair.
 * - A->B: A is uniform (the simpler baseline), B is adaptive.
 * - B->A: B is uniform, A is adaptive (counterbalanced order).
 *
 * This is the ONLY place these pairings should be hard-coded.
 */
const ORDER_TO_CONDITIONS: Readonly<Record<BlockOrder, { blockA: ConditionId; blockB: ConditionId }>> = {
  'A->B': { blockA: 'uniform', blockB: 'adaptive' },
  'B->A': { blockA: 'adaptive', blockB: 'uniform' },
} as const;

export const assignConditionOrder = (order: BlockOrder): ConditionAssignment => {
  const mapping = ORDER_TO_CONDITIONS[order];
  return {
    order,
    blockA: mapping.blockA,
    blockB: mapping.blockB,
  };
};

/**
 * Return the condition running in the named block. Pure helper so the
 * researcher-facing UI and the analytics export agree on the same lookup.
 */
export const conditionForBlock = (
  assignment: ConditionAssignment,
  block: BlockId,
): ConditionId => (block === 'A' ? assignment.blockA : assignment.blockB);

/**
 * Map a fixed step id to the block label rendered on the stepper chip.
 * `Tasks-A` and `Questionnaire-A` share condition A; `Tasks-B` and
 * `Questionnaire-B` share condition B. Non-block steps resolve to null.
 */
export const blockForStep = (stepId: StudyStepId): BlockId | null => {
  if (stepId === 'tasks-a' || stepId === 'questionnaire-a') return 'A';
  if (stepId === 'tasks-b' || stepId === 'questionnaire-b') return 'B';
  return null;
};

/**
 * Inverse of `blockForStep`: given a block, return the step ids that
 * belong to it. Used for stepper chip activation checks and for
 * analytics exports that bucket writes by block.
 */
export const stepsForBlock = (block: BlockId): readonly StudyStepId[] => {
  if (block === 'A') return ['tasks-a', 'questionnaire-a'];
  return ['tasks-b', 'questionnaire-b'];
};

/**
 * Resolve the condition running during a given step under an assignment.
 * Returns null for non-block steps (welcome, training, interview, done).
 */
export const conditionForStep = (
  assignment: ConditionAssignment,
  stepId: StudyStepId,
): ConditionId | null => {
  const block = blockForStep(stepId);
  if (block === null) return null;
  return conditionForBlock(assignment, block);
};

/**
 * Validate that a step id is part of the canonical Phase 80 sequence.
 * Useful when the store hydrates persisted state that may predate a
 * protocol version bump.
 */
export const stepBelongsToSequence = (stepId: StudyStepId): boolean =>
  STUDY_STEP_IDS.includes(stepId);
