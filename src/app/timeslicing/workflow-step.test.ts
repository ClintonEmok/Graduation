import { describe, expect, test } from 'vitest';
import { deriveWorkflowStep, shouldAutoAdvanceToReview } from './workflow-step';

describe('timeslicing workflow-step helpers', () => {
  test('derives review when pending generated bins exist', () => {
    const step = deriveWorkflowStep({
      pendingGeneratedBinsCount: 3,
      generationStatus: 'ready',
      lastAppliedAt: null,
    });

    expect(step).toBe('review');
  });

  test('derives apply when applied state exists', () => {
    expect(
      deriveWorkflowStep({
        pendingGeneratedBinsCount: 0,
        generationStatus: 'applied',
        lastAppliedAt: null,
      })
    ).toBe('apply');

    expect(
      deriveWorkflowStep({
        pendingGeneratedBinsCount: 0,
        generationStatus: 'idle',
        lastAppliedAt: 1,
      })
    ).toBe('apply');
  });

  test('stays on generate when no pending or applied state exists', () => {
    const step = deriveWorkflowStep({
      pendingGeneratedBinsCount: 0,
      generationStatus: 'idle',
      lastAppliedAt: null,
    });

    expect(step).toBe('generate');
  });

  test('auto-advances to review only on fresh generation while user is on generate', () => {
    expect(
      shouldAutoAdvanceToReview({
        activeStep: 'generate',
        pendingGeneratedBinsCount: 2,
        generationStatus: 'ready',
        generatedAt: 200,
        lastAutoAdvancedGeneratedAt: null,
      })
    ).toBe(true);

    expect(
      shouldAutoAdvanceToReview({
        activeStep: 'review',
        pendingGeneratedBinsCount: 2,
        generationStatus: 'ready',
        generatedAt: 200,
        lastAutoAdvancedGeneratedAt: null,
      })
    ).toBe(false);

    expect(
      shouldAutoAdvanceToReview({
        activeStep: 'generate',
        pendingGeneratedBinsCount: 2,
        generationStatus: 'ready',
        generatedAt: 200,
        lastAutoAdvancedGeneratedAt: 200,
      })
    ).toBe(false);
  });
});
