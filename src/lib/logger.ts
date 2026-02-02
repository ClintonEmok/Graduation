import { useStudyStore } from '@/store/useStudyStore';

export interface LogEvent {
  timestamp: number;
  sessionId: string;
  participantId: string;
  type: string;
  payload?: any;
}

const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 5000;

class LoggerService {
  private buffer: LogEvent[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  public log(type: string, payload?: any) {
    const state = useStudyStore.getState();
    
    // Only log if session is active? Or log everything with/without session?
    // Let's log everything, using 'anonymous' if no session.
    const event: LogEvent = {
      timestamp: Date.now(),
      sessionId: state.sessionId || 'no-session',
      participantId: state.participantId || 'anonymous',
      type,
      payload,
    };

    this.buffer.push(event);

    if (this.buffer.length >= BATCH_SIZE) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL);
    }
  }

  public async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      // Use navigator.sendBeacon if available for reliability during unload
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      const url = '/api/study/log';

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });
      }
    } catch (err) {
      console.error('Failed to flush logs', err);
      // Re-queue failed logs? Maybe risky if it causes loop. 
      // For now, just log error.
    }
  }
}

export const logger = new LoggerService();
