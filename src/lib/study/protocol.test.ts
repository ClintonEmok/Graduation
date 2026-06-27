import { describe, expect, test } from 'vitest';
import {
  INTERPRETABILITY_ITEM_COUNT,
  INTERPRETABILITY_ITEMS,
  NASA_RTLX_ITEM_COUNT,
  NASA_RTLX_ITEMS,
  STEP_COUNT,
  STUDY_PROTOCOL_VERSION,
  STUDY_STEP_IDS,
  STUDY_STEPS,
  STUDY_TASK_ORDER,
  STUDY_TASKS,
  TASK_COUNT,
  TOTAL_QUESTIONNAIRE_ITEMS,
  isValidStepId,
  isValidTaskId,
  nextStep,
  stepIndex,
} from './protocol';

describe('study protocol: metadata', () => {
  test('exposes a versioned protocol identifier', () => {
    expect(STUDY_PROTOCOL_VERSION).toMatch(/^phase-80-evaluation-readiness-v\d+$/);
  });

  test('locks questionnaire counts to NASA-RTLX 6 + interpretability 6', () => {
    expect(NASA_RTLX_ITEM_COUNT).toBe(6);
    expect(INTERPRETABILITY_ITEM_COUNT).toBe(6);
    expect(TOTAL_QUESTIONNAIRE_ITEMS).toBe(12);
    // Locked override over EVALUATION_PROTOCOL.md (D-07)
    expect(NASA_RTLX_ITEMS).toHaveLength(6);
    expect(INTERPRETABILITY_ITEMS).toHaveLength(6);
  });

  test('NASA-RTLX items use 1-20 scale and match the locked 6 dimensions', () => {
    const expectedIds = [
      'mental-demand',
      'physical-demand',
      'temporal-demand',
      'performance',
      'effort',
      'frustration',
    ];
    expect(NASA_RTLX_ITEMS.map((item) => item.id)).toEqual(expectedIds);
    for (const item of NASA_RTLX_ITEMS) {
      expect(item.scale).toBe('1-20');
    }
  });

  test('interpretability items use 1-5 scale and have stable ids', () => {
    const expectedIds = [
      'time-comprehension',
      'density-comprehension',
      'burst-comprehension',
      'condition-distinctness',
      'comparison-confidence',
      'representation-trust',
    ];
    expect(INTERPRETABILITY_ITEMS.map((item) => item.id)).toEqual(expectedIds);
    for (const item of INTERPRETABILITY_ITEMS) {
      expect(item.scale).toBe('1-5');
    }
  });
});

describe('study protocol: task order', () => {
  test('encodes the fixed within-condition order T4 -> T1 -> T2 -> T3', () => {
    expect(STUDY_TASK_ORDER).toEqual(['T4', 'T1', 'T2', 'T3']);
    expect(TASK_COUNT).toBe(4);
  });

  test('STUDY_TASKS provides a definition for every task id', () => {
    for (const id of STUDY_TASK_ORDER) {
      const def = STUDY_TASKS[id];
      expect(def).toBeDefined();
      expect(def.id).toBe(id);
      expect(def.prompt.length).toBeGreaterThan(0);
      expect(def.shortLabel.length).toBeGreaterThan(0);
      expect(def.timeRange.length).toBeGreaterThan(0);
    }
    expect(STUDY_TASKS.T3.comparisonRange).toBeDefined();
    expect(STUDY_TASKS.T3.comparisonRange?.length).toBeGreaterThan(0);
  });
});

describe('study protocol: 8-step researcher flow', () => {
  test('encodes Welcome -> Training -> Tasks-A -> Questionnaire-A -> Tasks-B -> Questionnaire-B -> Interview -> Done', () => {
    expect(STUDY_STEP_IDS).toEqual([
      'welcome',
      'training',
      'tasks-a',
      'questionnaire-a',
      'tasks-b',
      'questionnaire-b',
      'interview',
      'done',
    ]);
    expect(STEP_COUNT).toBe(8);
  });

  test('each step has a non-empty label and description', () => {
    for (const step of STUDY_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  test('only tasks/questionnaire steps have an active block', () => {
    for (const step of STUDY_STEPS) {
      if (step.id === 'tasks-a' || step.id === 'questionnaire-a') {
        expect(step.activeBlock).toBe('A');
      } else if (step.id === 'tasks-b' || step.id === 'questionnaire-b') {
        expect(step.activeBlock).toBe('B');
      } else {
        expect(step.activeBlock).toBeNull();
      }
    }
  });
});

describe('study protocol: step helpers', () => {
  test('stepIndex returns the canonical position for each step', () => {
    expect(stepIndex('welcome')).toBe(0);
    expect(stepIndex('training')).toBe(1);
    expect(stepIndex('tasks-a')).toBe(2);
    expect(stepIndex('questionnaire-a')).toBe(3);
    expect(stepIndex('tasks-b')).toBe(4);
    expect(stepIndex('questionnaire-b')).toBe(5);
    expect(stepIndex('interview')).toBe(6);
    expect(stepIndex('done')).toBe(7);
  });

  test('nextStep walks the fixed sequence and returns null at the end', () => {
    expect(nextStep('welcome')).toBe('training');
    expect(nextStep('training')).toBe('tasks-a');
    expect(nextStep('tasks-a')).toBe('questionnaire-a');
    expect(nextStep('questionnaire-a')).toBe('tasks-b');
    expect(nextStep('tasks-b')).toBe('questionnaire-b');
    expect(nextStep('questionnaire-b')).toBe('interview');
    expect(nextStep('interview')).toBe('done');
    expect(nextStep('done')).toBeNull();
  });

  test('isValidStepId type guard accepts known ids and rejects others', () => {
    expect(isValidStepId('welcome')).toBe(true);
    expect(isValidStepId('done')).toBe(true);
    expect(isValidStepId('not-a-step')).toBe(false);
    expect(isValidStepId(null)).toBe(false);
    expect(isValidStepId(7)).toBe(false);
  });

  test('isValidTaskId type guard accepts known ids and rejects others', () => {
    expect(isValidTaskId('T1')).toBe(true);
    expect(isValidTaskId('T4')).toBe(true);
    expect(isValidTaskId('T5')).toBe(false);
    expect(isValidTaskId('t1')).toBe(false);
    expect(isValidTaskId(undefined)).toBe(false);
  });
});
