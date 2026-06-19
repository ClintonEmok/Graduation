/**
 * Legacy study store — kept as a thin shim so the existing `LoggerService`
 * (and any other consumer that reads `sessionId` / `participantId` from
 * `useStudyStore`) keeps working while Phase 80 introduces
 * `useEvaluationStudyStore` as the canonical evaluation flow.
 *
 * Phase 80 evaluation flow is driven by `useEvaluationStudyStore`. That
 * store mirrors its session state into this legacy store via
 * `startSession` / `endSession` so logger writes can identify the
 * participant without a migration. The reset checklist in
 * `src/lib/study/resetTargets.ts` clears the persisted `study-storage`
 * key as part of `useEvaluationStudyStore.resetForNewSession`.
 *
 * New evaluation surfaces should NOT read from this store directly —
 * consume `useEvaluationStudyStore` instead. This file is intentionally
 * minimal and will be deleted once the existing `LoggerService` is
 * updated to read from the evaluation store.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StudyState {
  sessionId: string;
  participantId: string | null;
  startTime: number;

  startSession: (participantId?: string) => void;
  endSession: () => void;
  /**
   * Explicitly clear the persisted localStorage entry (`study-storage`).
   * Called by `useEvaluationStudyStore.resetForNewSession` as part of
   * the audited reset checklist; safe to invoke from non-browser contexts
   * (no-ops when `window` is undefined).
   */
  clearPersistedData: () => void;
}

const clearPersistedStorageKey = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('study-storage');
  } catch {
    // Storage may be unavailable (private mode, quota errors, SSR). The
    // reset report will surface the failure for the researcher's review.
  }
};

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      sessionId: '',
      participantId: null,
      startTime: 0,

      startSession: (participantId) => {
        const id = crypto.randomUUID();
        set({
          sessionId: id,
          participantId: participantId || `anon-${id.slice(0, 8)}`,
          startTime: Date.now(),
        });
      },

      endSession: () => {
        set({
          sessionId: '',
          participantId: null,
          startTime: 0,
        });
      },

      clearPersistedData: () => {
        clearPersistedStorageKey();
        set({
          sessionId: '',
          participantId: null,
          startTime: 0,
        });
      },
    }),
    {
      name: 'study-storage',
    },
  ),
);
