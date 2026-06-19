/**
 * Phase 80 Evaluation Study Store — single bound store for the entire
 * evaluation flow. All evaluation-specific state lives here so the route UI
 * and the API can share one event vocabulary.
 *
 * Slices (kept flat for simplicity in 80-01; later plans can refactor into
 * Zustand slice helpers if/when the surface grows):
 *   - Session: sessionId, participantId, start time, block order, conditions
 *   - Phase flow: current step id (with `nextStep` / `previousStep` helpers)
 *   - Tasks: per-block progress through the 4-task fixed order
 *   - Questionnaire: per-block capture of NASA-RTLX + interpretability items
 *   - Training: marker that the researcher-triggered tour has been run
 *   - Save status: per-write status for the structured /api/study/log
 *     calls (idle | pending | saved | error)
 *
 * Persisted to `sessionStorage` (NOT `localStorage`) under the
 * `evaluation-study-v1` key so a closed tab discards state. Only crash
 * recovery essentials are persisted via `partialize`; in-progress answers
 * and save-status flags live in memory only.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { usePathname } from 'next/navigation';

import {
  STUDY_PROTOCOL_VERSION,
  STUDY_STEP_IDS,
  STUDY_TASK_ORDER,
  isValidStepId,
  isValidTaskId,
  nextStep,
  stepIndex,
  type StudyStepId,
  type StudyTaskId,
} from '@/lib/study/protocol';
import {
  assignConditionOrder,
  blockForStep,
  conditionForBlock,
  conditionForStep,
  isBlockOrder,
  type BlockOrder,
  type ConditionAssignment,
  type ConditionId,
} from '@/lib/study/condition-order';
import {
  RESET_TARGETS,
  executeResetChecklist,
  isResetSuccessful,
  type ResetOutcome,
} from '@/lib/study/resetTargets';
import { logger } from '@/lib/logger';
import type { StudyIntent } from '@/lib/study/storage';
import {
  useDashboardDemoCoordinationStore,
} from '@/store/useDashboardDemoCoordinationStore';
import { useStudyStore } from '@/store/useStudyStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';

export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export type TaskLifecycleState = 'not-started' | 'in-progress' | 'completed';

export interface TaskProgress {
  state: TaskLifecycleState;
  startedAt: number | null;
  completedAt: number | null;
  answerText: string | null;
  /** Researcher-graded accuracy (0/1 integer) once the participant answers. */
  accuracy: 0 | 1 | null;
  /** Participant self-reported confidence on the 1-5 slider. */
  confidence: number | null;
}

export interface QuestionnaireProgress {
  /** 6 NASA-RTLX items, 1-20. Null when not yet answered. */
  nasaRtlx: Record<string, number | null>;
  /** 6 interpretability Likert items, 1-5. Null when not yet answered. */
  interpretability: Record<string, number | null>;
  completedAt: number | null;
}

const initialTaskProgress = (): Record<StudyTaskId, TaskProgress> => {
  const empty: Partial<Record<StudyTaskId, TaskProgress>> = {};
  for (const taskId of STUDY_TASK_ORDER) {
    empty[taskId] = {
      state: 'not-started',
      startedAt: null,
      completedAt: null,
      answerText: null,
      accuracy: null,
      confidence: null,
    };
  }
  return empty as Record<StudyTaskId, TaskProgress>;
};

const initialQuestionnaireProgress = (): QuestionnaireProgress => ({
  nasaRtlx: {},
  interpretability: {},
  completedAt: null,
});

export type BlockQuestionnaireMap = Partial<Record<'A' | 'B', QuestionnaireProgress>>;

export type BlockTaskProgressMap = Partial<
  Record<'A' | 'B', Record<StudyTaskId, TaskProgress>>
>;

export interface EvaluationStudyState {
  /** Protocol version this state was created under (drift detection). */
  protocolVersion: string;
  sessionId: string;
  participantId: string | null;
  startTime: number;
  /** Researcher-chosen block order. `null` until the session is started. */
  blockOrder: BlockOrder | null;
  /** Resolved condition assignment derived from `blockOrder`. */
  assignment: ConditionAssignment | null;
  currentStep: StudyStepId;
  /** Per-block task progress. Both blocks default to a fresh TaskProgress map. */
  taskProgress: BlockTaskProgressMap;
  /** Per-block questionnaire progress. */
  questionnaireProgress: BlockQuestionnaireMap;
  /** Training marker; set true once the researcher has run the tour. */
  trainingCompleted: boolean;
  /** Most recent reset report (per-target outcomes). */
  resetReport: ResetOutcome[] | null;
  /** Was the last `resetForNewSession` call fully successful (no failed targets). */
  lastResetSucceeded: boolean;
  /** Per-write save status for /api/study/log (keyed by intent id). */
  saveStatus: Record<string, SaveStatus>;
  /** Per-write error message keyed by intent id. */
  saveErrors: Record<string, string | null>;

  // ---- Actions ----
  startSession: (params: { participantId?: string; blockOrder: BlockOrder }) => string;
  endSession: () => void;
  setParticipantId: (participantId: string) => void;
  resetForNewSession: (params?: { blockOrder?: BlockOrder }) => ResetOutcome[];
  goToStep: (stepId: StudyStepId) => void;
  advanceStep: () => StudyStepId | null;
  previousStep: () => StudyStepId | null;
  markTrainingComplete: () => void;
  startTask: (block: 'A' | 'B', taskId: StudyTaskId) => void;
  completeTask: (params: {
    block: 'A' | 'B';
    taskId: StudyTaskId;
    answerText: string;
    accuracy: 0 | 1;
    confidence: number;
    completionTimeMs: number;
  }) => void;
  setNasaRtlxItem: (block: 'A' | 'B', itemId: string, value: number) => void;
  setInterpretabilityItem: (block: 'A' | 'B', itemId: string, value: number) => void;
  completeQuestionnaire: (block: 'A' | 'B') => void;
  setSaveStatus: (intentId: string, status: SaveStatus, error?: string | null) => void;
  clearSaveStatus: (intentId: string) => void;
  /**
   * Submit a study intent to the server with per-write save-status
   * tracking. The intent is mirrored through `logger.submit` (which
   * requeues on failure). Returns the server acknowledgement so later
   * UI plans can block unsafe advancement on persistence failure.
   */
  submitStudyIntent: <TIntent extends StudyIntent>(
    intentId: string,
    intent: TIntent,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const ensureBlockTaskProgress = (
  state: EvaluationStudyState,
  block: 'A' | 'B',
): Record<StudyTaskId, TaskProgress> => {
  const existing = state.taskProgress[block];
  if (existing) return existing;
  return initialTaskProgress();
};

const ensureBlockQuestionnaire = (
  state: EvaluationStudyState,
  block: 'A' | 'B',
): QuestionnaireProgress => {
  const existing = state.questionnaireProgress[block];
  if (existing) return existing;
  return initialQuestionnaireProgress();
};

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `study-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const initialState = (): Pick<
  EvaluationStudyState,
  | 'protocolVersion'
  | 'sessionId'
  | 'participantId'
  | 'startTime'
  | 'blockOrder'
  | 'assignment'
  | 'currentStep'
  | 'taskProgress'
  | 'questionnaireProgress'
  | 'trainingCompleted'
  | 'resetReport'
  | 'lastResetSucceeded'
  | 'saveStatus'
  | 'saveErrors'
> => ({
  protocolVersion: STUDY_PROTOCOL_VERSION,
  sessionId: '',
  participantId: null,
  startTime: 0,
  blockOrder: null,
  assignment: null,
  currentStep: 'welcome',
  taskProgress: {},
  questionnaireProgress: {},
  trainingCompleted: false,
  resetReport: null,
  lastResetSucceeded: false,
  saveStatus: {},
  saveErrors: {},
});

const noopSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const useEvaluationStudyStore = create<EvaluationStudyState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      startSession: ({ participantId, blockOrder }) => {
        if (!isBlockOrder(blockOrder)) {
          throw new Error(`useEvaluationStudyStore: invalid block order "${blockOrder}"`);
        }
        const sessionId = generateSessionId();
        const assignment = assignConditionOrder(blockOrder);
        const resolvedParticipantId =
          participantId && participantId.length > 0
            ? participantId
            : `anon-${sessionId.slice(0, 8)}`;

        // Keep the legacy store in sync so existing `useStudyStore` consumers
        // (e.g. legacy logger fallback) still see the active session.
        useStudyStore.getState().startSession(resolvedParticipantId);

        set({
          sessionId,
          participantId: resolvedParticipantId,
          startTime: Date.now(),
          blockOrder,
          assignment,
          currentStep: 'welcome',
          taskProgress: {
            A: initialTaskProgress(),
            B: initialTaskProgress(),
          },
          questionnaireProgress: {
            A: initialQuestionnaireProgress(),
            B: initialQuestionnaireProgress(),
          },
          trainingCompleted: false,
        });

        return sessionId;
      },

      endSession: () => {
        // Reset legacy store first, then clear our own session-scoped state.
        useStudyStore.getState().endSession();
        set({
          ...initialState(),
        });
      },

      setParticipantId: (participantId) => {
        set({ participantId });
      },

      resetForNewSession: ({ blockOrder } = {}) => {
        const outcomes = executeResetChecklist({
          coordination: useDashboardDemoCoordinationStore.getState(),
          sliceDomain: useSliceDomainStore.getState(),
        });

        const resetSucceeded = isResetSuccessful(outcomes);

        // Clear legacy store before reinitializing our own state. Order
        // matters: legacy store is localStorage-backed and the explicit
        // `study-storage` reset above only runs on the client.
        try {
          useStudyStore.getState().endSession();
        } catch {
          // Legacy store is best-effort; failures here are non-fatal
          // because the next startSession() will overwrite state.
        }

        set({
          ...initialState(),
          resetReport: outcomes,
          lastResetSucceeded: resetSucceeded,
        });

        // If a new block order was passed in alongside the reset, start
        // a fresh session immediately so callers can chain
        // `reset().startSession({ blockOrder })` without intermediate UI
        // flicker.
        if (blockOrder && isBlockOrder(blockOrder)) {
          get().startSession({ blockOrder });
        }

        return outcomes;
      },

      goToStep: (stepId) => {
        if (!isValidStepId(stepId)) return;
        if (!STUDY_STEP_IDS.includes(stepId)) return;
        set({ currentStep: stepId });
      },

      advanceStep: () => {
        const current = get().currentStep;
        const next = nextStep(current);
        if (next === null) return null;
        set({ currentStep: next });
        return next;
      },

      previousStep: () => {
        const current = get().currentStep;
        const index = stepIndex(current);
        if (index <= 0) return null;
        const previous = STUDY_STEP_IDS[index - 1] ?? null;
        if (previous === null) return null;
        set({ currentStep: previous });
        return previous;
      },

      markTrainingComplete: () => {
        set({ trainingCompleted: true });
      },

      startTask: (block, taskId) => {
        if (!isValidTaskId(taskId)) return;
        set((state) => {
          const blockProgress = ensureBlockTaskProgress(state, block);
          const current = blockProgress[taskId];
          if (current.state === 'in-progress' || current.state === 'completed') return state;
          return {
            taskProgress: {
              ...state.taskProgress,
              [block]: {
                ...blockProgress,
                [taskId]: {
                  ...current,
                  state: 'in-progress',
                  startedAt: Date.now(),
                },
              },
            },
          };
        });
      },

      completeTask: ({ block, taskId, answerText, accuracy, confidence, completionTimeMs }) => {
        if (!isValidTaskId(taskId)) return;
        set((state) => {
          const blockProgress = ensureBlockTaskProgress(state, block);
          const current = blockProgress[taskId];
          // Stamp the completion time but never overwrite an existing
          // `startedAt` if the caller forgot to invoke `startTask` first.
          const startedAt = current.startedAt ?? Date.now() - completionTimeMs;
          return {
            taskProgress: {
              ...state.taskProgress,
              [block]: {
                ...blockProgress,
                [taskId]: {
                  state: 'completed',
                  startedAt,
                  completedAt: Date.now(),
                  answerText,
                  accuracy,
                  confidence,
                },
              },
            },
          };
        });
      },

      setNasaRtlxItem: (block, itemId, value) => {
        set((state) => {
          const q = ensureBlockQuestionnaire(state, block);
          return {
            questionnaireProgress: {
              ...state.questionnaireProgress,
              [block]: {
                ...q,
                nasaRtlx: { ...q.nasaRtlx, [itemId]: value },
              },
            },
          };
        });
      },

      setInterpretabilityItem: (block, itemId, value) => {
        set((state) => {
          const q = ensureBlockQuestionnaire(state, block);
          return {
            questionnaireProgress: {
              ...state.questionnaireProgress,
              [block]: {
                ...q,
                interpretability: { ...q.interpretability, [itemId]: value },
              },
            },
          };
        });
      },

      completeQuestionnaire: (block) => {
        set((state) => {
          const q = ensureBlockQuestionnaire(state, block);
          return {
            questionnaireProgress: {
              ...state.questionnaireProgress,
              [block]: { ...q, completedAt: Date.now() },
            },
          };
        });
      },

      setSaveStatus: (intentId, status, error = null) => {
        set((state) => ({
          saveStatus: { ...state.saveStatus, [intentId]: status },
          saveErrors: { ...state.saveErrors, [intentId]: error },
        }));
      },

      clearSaveStatus: (intentId) => {
        set((state) => {
          const nextStatus = { ...state.saveStatus };
          const nextErrors = { ...state.saveErrors };
          delete nextStatus[intentId];
          delete nextErrors[intentId];
          return { saveStatus: nextStatus, saveErrors: nextErrors };
        });
      },

      submitStudyIntent: async (intentId, intent) => {
        get().setSaveStatus(intentId, 'pending');
        const result = await logger.submit(intent as unknown as Record<string, unknown>);
        if (result.ok) {
          get().setSaveStatus(intentId, 'saved', null);
        } else {
          get().setSaveStatus(intentId, 'error', result.error ?? 'submission failed');
        }
        return result;
      },
    }),
    {
      name: 'evaluation-study-v1',
      storage: createJSONStorage(() => noopSessionStorage() as Storage),
      // Persist only crash-recovery essentials. In-progress answers and
      // save-status flags live in memory only so a new tab starts clean.
      partialize: (state) => ({
        protocolVersion: state.protocolVersion,
        sessionId: state.sessionId,
        participantId: state.participantId,
        startTime: state.startTime,
        blockOrder: state.blockOrder,
        assignment: state.assignment,
        currentStep: state.currentStep,
        trainingCompleted: state.trainingCompleted,
      }),
    },
  ),
);

// ---- Selectors / helpers exported for UI code ----

export const selectActiveBlock = (state: EvaluationStudyState): 'A' | 'B' | null =>
  blockForStep(state.currentStep);

export const selectActiveCondition = (
  state: EvaluationStudyState,
): ConditionId | null => (state.assignment ? conditionForStep(state.assignment, state.currentStep) : null);

export const selectConditionForBlock = (
  state: EvaluationStudyState,
  block: 'A' | 'B',
): ConditionId | null => (state.assignment ? conditionForBlock(state.assignment, block) : null);

export const selectAllResetTargets = (): readonly ResetOutcome[] => RESET_TARGETS.map((target) => ({
  id: target.id,
  label: target.label,
  status: 'skipped',
  at: new Date(0).toISOString(),
}));

export const selectHasActiveSession = (state: EvaluationStudyState): boolean =>
  state.sessionId.length > 0 && state.participantId !== null;

/**
 * Hook used by shared dashboard-demo panels to determine whether the
 * current route is `/evaluation` and the participant-mode lock should be
 * applied to editing affordances. The lock is route-scoped so the standard
 * `/dashboard-demo` workspace remains fully interactive for Phase 79 work.
 */
export const useIsEvaluationLocked = (): boolean => {
  const pathname = usePathname() ?? '';
  return pathname.startsWith('/evaluation');
};
