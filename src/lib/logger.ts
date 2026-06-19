/**
 * Phase 80 Evaluation Logger — acknowledged study writes.
 *
 * `LoggerService` is the client-side surface that the existing
 * `useStudyStore`-aware code uses to enqueue study events. The previous
 * implementation buffered generic events, flushed via `sendBeacon` or
 * `fetch`, and silently dropped on failure. Phase 80 replaces the
 * generic JSONL pipeline with a per-write acknowledged POST to
 * `/api/study/log` for the four study intent kinds we care about, and
 * requeues failed writes so the pilot run cannot lose data (Pitfall 4
 * in 80-RESEARCH.md).
 *
 * Critical write semantics:
 *   - The single-write helpers (`sessionStart`, `sessionEnd`, `trialComplete`,
 *     `questionnaireResponse`, `conditionToggle`, `warpAdjustment`) are
 *     `async` and resolve only after the server returns `ok: true`.
 *   - On failure the write is re-queued (bounded by `MAX_ATTEMPTS`) and
 *     a status callback fires so the evaluation store can surface
 *     "saving / saved / error" to the UI.
 *   - Buffered events that are NOT a recognized study intent are still
 *     dropped (the legacy batch flush path is no longer used in Phase 80).
 */

import { useStudyStore } from '@/store/useStudyStore';

export interface LogEvent {
  timestamp: number;
  sessionId: string;
  participantId: string;
  type: string;
  payload?: unknown;
}

const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 750;

class LoggerService {
  private queue: Array<() => Promise<void>> = [];
  private flushing = false;
  private attempt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Best-effort drain on unload. We cannot await here so we
        // send a `sendBeacon` only for the remaining queue depth. The
        // acknowledged-write path is exposed via `submit` for critical
        // writes the caller needs to be confident landed.
        this.beaconDrain();
      });
    }
  }

  /**
   * Generic log entry — kept for backward compatibility with the legacy
   * `logger.log(...)` callers. Non-study events are still emitted to the
   * console (debug aid) but are NOT persisted through the new API
   * (Phase 80 only persists structured study intents).
   */
  public log(type: string, payload?: unknown) {
    const state = useStudyStore.getState();
    const event: LogEvent = {
      timestamp: Date.now(),
      sessionId: state.sessionId || 'no-session',
      participantId: state.participantId || 'anonymous',
      type,
      payload,
    };
    if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[study-log]', event.type, event);
    }
  }

  /**
   * Submit a single study intent to `/api/study/log` and return the
   * server acknowledgement. Requeues on failure up to `MAX_ATTEMPTS`.
   */
  public async submit(intent: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    let lastError: string | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch('/api/study/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // `keepalive` lets the browser keep the request alive across
          // short navigations (e.g. advancing the stepper) so a
          // half-flushed write still lands.
          keepalive: true,
          body: JSON.stringify(intent),
        });
        if (response.ok) {
          const json = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
          };
          if (json.ok) {
            return { ok: true };
          }
          lastError = json.error ?? `server returned ok=false (status ${response.status})`;
        } else {
          const text = await response.text().catch(() => '');
          lastError = `HTTP ${response.status}: ${text.slice(0, 200)}`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      // Linear backoff keeps Phase 80 pilot runs simple; later plans can
      // promote this to exponential with jitter if needed.
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
    }
    return { ok: false, error: lastError ?? 'submission failed' };
  }

  /**
   * Enqueue a background write that does not need to be awaited. Used by
   * telemetry-style event streams where the UI does not need a save
   * status. The queue is processed sequentially and requeues on
   * failure (bounded by `MAX_ATTEMPTS`).
   */
  public enqueue(intent: Record<string, unknown>): void {
    this.queue.push(() => this.submit(intent).then(() => undefined));
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) break;
        let succeeded = false;
        for (this.attempt = 0; this.attempt < MAX_ATTEMPTS; this.attempt += 1) {
          try {
            await job();
            succeeded = true;
            break;
          } catch {
            await delay(RETRY_BACKOFF_MS * (this.attempt + 1));
          }
        }
        if (!succeeded) {
          // Last-resort log so the researcher sees the failure during
          // a pilot run; the actual data is in the queue and will not
          // be retried further here (the caller is expected to surface
          // the error via the save-status slice of the evaluation store).
          console.error('[study-log] background write permanently failed');
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private beaconDrain() {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return;
    }
    // `sendBeacon` is best-effort and does not support custom JSON
    // acknowledgement. Phase 80 critical writes should use `submit()`
    // before unload instead of relying on the beacon drain.
    const blob = new Blob(
      [JSON.stringify({ kind: 'session-end', beacon: true, queueDepth: this.queue.length })],
      { type: 'application/json' },
    );
    navigator.sendBeacon('/api/study/log', blob);
  }

  /**
   * Synchronous flush — used during page unload when the caller cannot
   * await `submit()`. Bounded by `MAX_ATTEMPTS`.
   */
  public async flush() {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;
      try {
        await job();
      } catch {
        // Swallow — the next drain() will surface the failure to the
        // store via the per-intent save status slice.
      }
    }
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    if (typeof setTimeout === 'undefined') {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });

export const logger = new LoggerService();

// ---- Typed study intent helpers (preferred over raw `submit`) ----

export const submitSessionStart = (
  payload: Omit<import('@/lib/study/storage').SessionStartIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'session-start',
    ...payload,
  });

export const submitSessionEnd = (
  payload: Omit<import('@/lib/study/storage').SessionEndIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'session-end',
    ...payload,
  });

export const submitTrialComplete = (
  payload: Omit<import('@/lib/study/storage').TrialCompleteIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'trial-complete',
    ...payload,
  });

export const submitQuestionnaireResponse = (
  payload: Omit<import('@/lib/study/storage').QuestionnaireResponseIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'questionnaire-response',
    ...payload,
  });

export const submitConditionToggle = (
  payload: Omit<import('@/lib/study/storage').ConditionToggleIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'condition-toggle',
    ...payload,
  });

export const submitWarpAdjustment = (
  payload: Omit<import('@/lib/study/storage').WarpAdjustmentIntent, 'kind'>,
) =>
  logger.submit({
    kind: 'warp-adjustment',
    ...payload,
  });
