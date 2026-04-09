import type { GenerationStatus } from '@/store/useTimeslicingModeStore';

export type WorkflowStep = 'generate' | 'review' | 'apply';

interface DeriveWorkflowStepParams {
  pendingGeneratedBinsCount: number;
  generationStatus: GenerationStatus;
  lastAppliedAt: number | null;
}

interface ShouldAutoAdvanceToReviewParams {
  activeStep: WorkflowStep;
  pendingGeneratedBinsCount: number;
  generationStatus: GenerationStatus;
  generatedAt: number | null;
  lastAutoAdvancedGeneratedAt: number | null;
}

export const deriveWorkflowStep = ({
  pendingGeneratedBinsCount,
  generationStatus,
  lastAppliedAt,
}: DeriveWorkflowStepParams): WorkflowStep => {
  if (pendingGeneratedBinsCount > 0) {
    return 'review';
  }

  if (generationStatus === 'applied' || lastAppliedAt !== null) {
    return 'apply';
  }

  return 'generate';
};

export const shouldAutoAdvanceToReview = ({
  activeStep,
  pendingGeneratedBinsCount,
  generationStatus,
  generatedAt,
  lastAutoAdvancedGeneratedAt,
}: ShouldAutoAdvanceToReviewParams): boolean => {
  if (activeStep !== 'generate') {
    return false;
  }

  if (generationStatus !== 'ready' || pendingGeneratedBinsCount === 0 || generatedAt === null) {
    return false;
  }

  return generatedAt !== lastAutoAdvancedGeneratedAt;
};
