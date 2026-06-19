import { describe, expect, test } from 'vitest';
import {
  type ConditionToggleIntent,
  type QuestionnaireResponseIntent,
  type SessionEndIntent,
  type SessionStartIntent,
  type StudyIntent,
  type TrialCompleteIntent,
  type WarpAdjustmentIntent,
  studyTableNames,
} from './storage';

const baseSessionStart: SessionStartIntent = {
  kind: 'session-start',
  sessionId: 'sess-1',
  participantId: 'p-1',
  blockOrder: 'A->B',
  conditionA: 'uniform',
  conditionB: 'adaptive',
  startedAt: 1_700_000_000_000,
};

const baseSessionEnd: SessionEndIntent = {
  kind: 'session-end',
  sessionId: 'sess-1',
  participantId: 'p-1',
  endedAt: 1_700_000_500_000,
  currentStep: 'done',
};

const baseTrial: TrialCompleteIntent = {
  kind: 'trial-complete',
  sessionId: 'sess-1',
  participantId: 'p-1',
  block: 'A',
  condition: 'uniform',
  blockOrder: 1,
  trialOrder: 1,
  taskId: 'T4',
  answerText: 'District 8 had the highest count.',
  accuracy: 1,
  completionTimeMs: 12345,
  confidence: 4,
  warpFactor: 0,
  startedAt: 1_700_000_100_000,
  completedAt: 1_700_000_112_345,
};

const baseQuestionnaire: QuestionnaireResponseIntent = {
  kind: 'questionnaire-response',
  sessionId: 'sess-1',
  participantId: 'p-1',
  block: 'A',
  condition: 'uniform',
  scale: 'nasa-rtlx',
  itemId: 'mental-demand',
  value: 12,
  completedAt: 1_700_000_200_000,
};

const baseConditionToggle: ConditionToggleIntent = {
  kind: 'condition-toggle',
  sessionId: 'sess-1',
  participantId: 'p-1',
  block: 'A',
  fromCondition: 'uniform',
  toCondition: 'adaptive',
  warpFactorAtEvent: 0,
  occurredAt: 1_700_000_300_000,
};

const baseWarpAdjustment: WarpAdjustmentIntent = {
  kind: 'warp-adjustment',
  sessionId: 'sess-1',
  participantId: 'p-1',
  block: 'B',
  condition: 'adaptive',
  warpFactorBefore: 0,
  warpFactorAfter: 1.2,
  occurredAt: 1_700_000_350_000,
};

describe('study storage: intent shape', () => {
  test('exposes the four flat fact tables', () => {
    expect(studyTableNames()).toEqual([
      'study_sessions',
      'study_trials',
      'study_questionnaire_responses',
      'study_condition_events',
    ]);
  });

  test('encodes the six intent kinds as a discriminated union', () => {
    const intents: StudyIntent[] = [
      baseSessionStart,
      baseSessionEnd,
      baseTrial,
      baseQuestionnaire,
      baseConditionToggle,
      baseWarpAdjustment,
    ];
    const kinds = new Set(intents.map((intent) => intent.kind));
    expect(kinds).toEqual(
      new Set([
        'session-start',
        'session-end',
        'trial-complete',
        'questionnaire-response',
        'condition-toggle',
        'warp-adjustment',
      ]),
    );
  });

  test('trial-complete carries accuracy 0|1 and confidence 1..5 inputs', () => {
    // Re-type the intent inline so the test fails compile-time if the
    // shape drifts away from the agreed contract.
    const intent: TrialCompleteIntent = {
      ...baseTrial,
      accuracy: 0,
      confidence: 5,
    };
    expect(intent.accuracy).toBe(0);
    expect(intent.confidence).toBe(5);
  });

  test('warp-adjustment and condition-toggle are first-class events (not collapsed)', () => {
    expect(baseWarpAdjustment.kind).toBe('warp-adjustment');
    expect(baseConditionToggle.kind).toBe('condition-toggle');
    // They are distinct kinds so the table can store them as separate
    // event_type rows (`condition-toggle` vs `warp-adjustment`).
    expect(baseWarpAdjustment.kind).not.toBe(baseConditionToggle.kind);
  });
});
