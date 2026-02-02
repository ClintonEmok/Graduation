import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StudyState {
  sessionId: string;
  participantId: string | null;
  startTime: number;
  
  startSession: (participantId?: string) => void;
  endSession: () => void;
}

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
    }),
    {
      name: 'study-storage',
    }
  )
);
