import { describe, expect, test } from 'vitest';
import {
  ALL_BLOCK_ORDERS,
  ALL_CONDITION_IDS,
  assignConditionOrder,
  blockForStep,
  conditionForBlock,
  conditionForStep,
  isBlockOrder,
  isConditionId,
  stepsForBlock,
} from './condition-order';

describe('condition-order: assignments', () => {
  test('A->B pairs uniform with A and adaptive with B', () => {
    const assignment = assignConditionOrder('A->B');
    expect(assignment.order).toBe('A->B');
    expect(assignment.blockA).toBe('uniform');
    expect(assignment.blockB).toBe('adaptive');
  });

  test('B->A counterbalances: uniform runs in B, adaptive runs in A', () => {
    const assignment = assignConditionOrder('B->A');
    expect(assignment.order).toBe('B->A');
    expect(assignment.blockA).toBe('adaptive');
    expect(assignment.blockB).toBe('uniform');
  });

  test('both orders always cover the full condition set', () => {
    for (const order of ALL_BLOCK_ORDERS) {
      const assignment = assignConditionOrder(order);
      const set = new Set([assignment.blockA, assignment.blockB]);
      expect(set.size).toBe(2);
      expect(set.has('uniform')).toBe(true);
      expect(set.has('adaptive')).toBe(true);
    }
  });
});

describe('condition-order: block helpers', () => {
  test('conditionForBlock returns the correct condition under each order', () => {
    const aFirst = assignConditionOrder('A->B');
    expect(conditionForBlock(aFirst, 'A')).toBe('uniform');
    expect(conditionForBlock(aFirst, 'B')).toBe('adaptive');

    const bFirst = assignConditionOrder('B->A');
    expect(conditionForBlock(bFirst, 'A')).toBe('adaptive');
    expect(conditionForBlock(bFirst, 'B')).toBe('uniform');
  });

  test('blockForStep returns A for tasks-A/questionnaire-A and B for tasks-B/questionnaire-B', () => {
    expect(blockForStep('tasks-a')).toBe('A');
    expect(blockForStep('questionnaire-a')).toBe('A');
    expect(blockForStep('tasks-b')).toBe('B');
    expect(blockForStep('questionnaire-b')).toBe('B');
    expect(blockForStep('welcome')).toBeNull();
    expect(blockForStep('training')).toBeNull();
    expect(blockForStep('interview')).toBeNull();
    expect(blockForStep('done')).toBeNull();
  });

  test('stepsForBlock returns the canonical pair of step ids per block', () => {
    expect(stepsForBlock('A')).toEqual(['tasks-a', 'questionnaire-a']);
    expect(stepsForBlock('B')).toEqual(['tasks-b', 'questionnaire-b']);
  });
});

describe('condition-order: conditionForStep', () => {
  test('resolves condition for tasks/questionnaire steps under A->B', () => {
    const assignment = assignConditionOrder('A->B');
    expect(conditionForStep(assignment, 'tasks-a')).toBe('uniform');
    expect(conditionForStep(assignment, 'questionnaire-a')).toBe('uniform');
    expect(conditionForStep(assignment, 'tasks-b')).toBe('adaptive');
    expect(conditionForStep(assignment, 'questionnaire-b')).toBe('adaptive');
  });

  test('resolves condition for tasks/questionnaire steps under B->A', () => {
    const assignment = assignConditionOrder('B->A');
    expect(conditionForStep(assignment, 'tasks-a')).toBe('adaptive');
    expect(conditionForStep(assignment, 'questionnaire-a')).toBe('adaptive');
    expect(conditionForStep(assignment, 'tasks-b')).toBe('uniform');
    expect(conditionForStep(assignment, 'questionnaire-b')).toBe('uniform');
  });

  test('returns null for non-block steps regardless of order', () => {
    for (const order of ALL_BLOCK_ORDERS) {
      const assignment = assignConditionOrder(order);
      expect(conditionForStep(assignment, 'welcome')).toBeNull();
      expect(conditionForStep(assignment, 'training')).toBeNull();
      expect(conditionForStep(assignment, 'interview')).toBeNull();
      expect(conditionForStep(assignment, 'done')).toBeNull();
    }
  });
});

describe('condition-order: type guards', () => {
  test('isBlockOrder accepts canonical values only', () => {
    expect(isBlockOrder('A->B')).toBe(true);
    expect(isBlockOrder('B->A')).toBe(true);
    expect(isBlockOrder('a->b')).toBe(false);
    expect(isBlockOrder('A')).toBe(false);
    expect(isBlockOrder(null)).toBe(false);
  });

  test('isConditionId accepts canonical values only', () => {
    for (const value of ALL_CONDITION_IDS) {
      expect(isConditionId(value)).toBe(true);
    }
    expect(isConditionId('A')).toBe(false);
    expect(isConditionId('adaptive-x')).toBe(false);
    expect(isConditionId(undefined)).toBe(false);
  });
});
