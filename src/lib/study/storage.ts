/**
 * Phase 80 Study Storage — DuckDB-backed fact tables for the evaluation
 * study (D-15, D-16, D-14). All study data is written as flat rows so the
 * thesis analysis step can run SQL-based descriptive statistics
 * (medians, ranges, paired deltas) directly against DuckDB.
 *
 * Tables:
 *   - study_sessions                  one row per session start (and end)
 *   - study_trials                    one row per completed task
 *   - study_questionnaire_responses   one row per (block, scale, item)
 *   - study_condition_events          one row per condition toggle OR warp
 *                                     factor adjustment (event_type)
 *
 * IMPORTANT: This module is server-only. The companion API route
 * (`src/app/api/study/log/route.ts`) is the only consumer; client code
 * must POST intents and read the acknowledgement, never call DuckDB
 * directly.
 */

import { getDb } from '@/lib/db';
import { STUDY_PROTOCOL_VERSION } from './protocol';

type DuckDbInstance = Awaited<ReturnType<typeof getDb>>;

const STUDY_TABLES: readonly string[] = [
  'study_sessions',
  'study_trials',
  'study_questionnaire_responses',
  'study_condition_events',
] as const;

export type StudyIntentKind =
  | 'session-start'
  | 'session-end'
  | 'trial-complete'
  | 'questionnaire-response'
  | 'condition-toggle'
  | 'warp-adjustment';

export interface SessionStartIntent {
  kind: 'session-start';
  sessionId: string;
  participantId: string;
  blockOrder: 'A->B' | 'B->A';
  conditionA: 'uniform' | 'adaptive';
  conditionB: 'uniform' | 'adaptive';
  startedAt: number;
}

export interface SessionEndIntent {
  kind: 'session-end';
  sessionId: string;
  participantId: string;
  endedAt: number;
  currentStep: string;
}

export interface TrialCompleteIntent {
  kind: 'trial-complete';
  sessionId: string;
  participantId: string;
  block: 'A' | 'B';
  condition: 'uniform' | 'adaptive';
  blockOrder: number;
  trialOrder: number;
  taskId: 'T1' | 'T2' | 'T3' | 'T4';
  answerText: string;
  accuracy: 0 | 1;
  completionTimeMs: number;
  confidence: number;
  warpFactor: number;
  startedAt: number;
  completedAt: number;
}

export interface QuestionnaireResponseIntent {
  kind: 'questionnaire-response';
  sessionId: string;
  participantId: string;
  block: 'A' | 'B';
  condition: 'uniform' | 'adaptive';
  scale: 'nasa-rtlx' | 'interpretability';
  itemId: string;
  value: number;
  completedAt: number;
}

export interface ConditionToggleIntent {
  kind: 'condition-toggle';
  sessionId: string;
  participantId: string;
  block: 'A' | 'B';
  fromCondition: 'uniform' | 'adaptive';
  toCondition: 'uniform' | 'adaptive';
  warpFactorAtEvent: number;
  occurredAt: number;
}

export interface WarpAdjustmentIntent {
  kind: 'warp-adjustment';
  sessionId: string;
  participantId: string;
  block: 'A' | 'B';
  condition: 'uniform' | 'adaptive';
  warpFactorBefore: number;
  warpFactorAfter: number;
  occurredAt: number;
}

export type StudyIntent =
  | SessionStartIntent
  | SessionEndIntent
  | TrialCompleteIntent
  | QuestionnaireResponseIntent
  | ConditionToggleIntent
  | WarpAdjustmentIntent;

export interface StudyWriteResult {
  ok: boolean;
  /** Per-intent error message when `ok` is false. */
  error?: string;
  /** Echoes the intent kind for caller correlation. */
  kind: StudyIntentKind;
}

const escapeLiteral = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return String(value);
  // Escape single quotes for safe insertion into a SQL string literal.
  return `'${String(value).replace(/'/g, "''")}'`;
};

const exec = (database: DuckDbInstance, sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    database.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const run = (database: DuckDbInstance, sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    database.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS study_sessions (
     session_id TEXT,
     participant_id TEXT,
     block_order TEXT,
     condition_a TEXT,
     condition_b TEXT,
     protocol_version TEXT,
     started_at TIMESTAMP,
     ended_at TIMESTAMP,
     final_step TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS study_trials (
     session_id TEXT,
     participant_id TEXT,
     condition TEXT,
     block TEXT,
     block_order INTEGER,
     trial_order INTEGER,
     task_id TEXT,
     answer_text TEXT,
     accuracy INTEGER,
     completion_time_ms BIGINT,
     confidence INTEGER,
     warp_factor DOUBLE,
     started_at TIMESTAMP,
     completed_at TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS study_questionnaire_responses (
     session_id TEXT,
     participant_id TEXT,
     condition TEXT,
     block TEXT,
     scale TEXT,
     item_id TEXT,
     value DOUBLE,
     completed_at TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS study_condition_events (
     session_id TEXT,
     participant_id TEXT,
     block TEXT,
     event_type TEXT,
     condition TEXT,
     from_value TEXT,
     to_value TEXT,
     warp_factor DOUBLE,
     occurred_at TIMESTAMP
   )`,
];

/**
 * Idempotently create the four study fact tables. Safe to call on every
 * request — DuckDB `IF NOT EXISTS` is a no-op when the table is present.
 */
export const ensureStudy = async (): Promise<void> => {
  const database = await getDb();
  for (const statement of STATEMENTS) {
    await exec(database, statement);
  }
};

const writeSessionStart = async (
  database: DuckDbInstance,
  intent: SessionStartIntent,
): Promise<void> => {
  const sql = `INSERT INTO study_sessions (
    session_id, participant_id, block_order, condition_a, condition_b,
    protocol_version, started_at, ended_at, final_step
  ) VALUES (
    ${escapeLiteral(intent.sessionId)},
    ${escapeLiteral(intent.participantId)},
    ${escapeLiteral(intent.blockOrder)},
    ${escapeLiteral(intent.conditionA)},
    ${escapeLiteral(intent.conditionB)},
    ${escapeLiteral(STUDY_PROTOCOL_VERSION)},
    to_timestamp(${Math.floor(intent.startedAt / 1000)}),
    NULL,
    NULL
  )`;
  await run(database, sql);
};

const writeSessionEnd = async (
  database: DuckDbInstance,
  intent: SessionEndIntent,
): Promise<void> => {
  const sql = `UPDATE study_sessions
     SET ended_at = to_timestamp(${Math.floor(intent.endedAt / 1000)}),
         final_step = ${escapeLiteral(intent.currentStep)}
   WHERE session_id = ${escapeLiteral(intent.sessionId)}`;
  await run(database, sql);
};

const writeTrialComplete = async (
  database: DuckDbInstance,
  intent: TrialCompleteIntent,
): Promise<void> => {
  const sql = `INSERT INTO study_trials (
    session_id, participant_id, condition, block, block_order, trial_order,
    task_id, answer_text, accuracy, completion_time_ms, confidence,
    warp_factor, started_at, completed_at
  ) VALUES (
    ${escapeLiteral(intent.sessionId)},
    ${escapeLiteral(intent.participantId)},
    ${escapeLiteral(intent.condition)},
    ${escapeLiteral(intent.block)},
    ${intent.blockOrder},
    ${intent.trialOrder},
    ${escapeLiteral(intent.taskId)},
    ${escapeLiteral(intent.answerText)},
    ${intent.accuracy},
    ${Math.max(0, Math.floor(intent.completionTimeMs))},
    ${intent.confidence},
    ${intent.warpFactor},
    to_timestamp(${Math.floor(intent.startedAt / 1000)}),
    to_timestamp(${Math.floor(intent.completedAt / 1000)})
  )`;
  await run(database, sql);
};

const writeQuestionnaireResponse = async (
  database: DuckDbInstance,
  intent: QuestionnaireResponseIntent,
): Promise<void> => {
  const sql = `INSERT INTO study_questionnaire_responses (
    session_id, participant_id, condition, block, scale, item_id, value, completed_at
  ) VALUES (
    ${escapeLiteral(intent.sessionId)},
    ${escapeLiteral(intent.participantId)},
    ${escapeLiteral(intent.condition)},
    ${escapeLiteral(intent.block)},
    ${escapeLiteral(intent.scale)},
    ${escapeLiteral(intent.itemId)},
    ${intent.value},
    to_timestamp(${Math.floor(intent.completedAt / 1000)})
  )`;
  await run(database, sql);
};

const writeConditionEvent = async (
  database: DuckDbInstance,
  intent: ConditionToggleIntent | WarpAdjustmentIntent,
): Promise<void> => {
  const eventType = intent.kind === 'condition-toggle' ? 'condition-toggle' : 'warp-adjustment';
  const fromValue =
    intent.kind === 'condition-toggle'
      ? escapeLiteral(intent.fromCondition)
      : String(intent.warpFactorBefore);
  const toValue =
    intent.kind === 'condition-toggle' ? escapeLiteral(intent.toCondition) : String(intent.warpFactorAfter);
  // `condition` is the column that records which condition the
  // participant is in AFTER the event. For a condition-toggle that is
  // the destination; for a warp-adjustment it is the active condition.
  const conditionValue =
    intent.kind === 'condition-toggle'
      ? escapeLiteral(intent.toCondition)
      : escapeLiteral(intent.condition);
  const warpFactorValue =
    intent.kind === 'condition-toggle' ? String(intent.warpFactorAtEvent) : String(intent.warpFactorAfter);

  const sql = `INSERT INTO study_condition_events (
    session_id, participant_id, block, event_type, condition, from_value,
    to_value, warp_factor, occurred_at
  ) VALUES (
    ${escapeLiteral(intent.sessionId)},
    ${escapeLiteral(intent.participantId)},
    ${escapeLiteral(intent.block)},
    ${escapeLiteral(eventType)},
    ${conditionValue},
    ${fromValue},
    ${toValue},
    ${warpFactorValue},
    to_timestamp(${Math.floor(intent.occurredAt / 1000)})
  )`;
  await run(database, sql);
};

/**
 * Persist a single validated study intent. Returns a `StudyWriteResult`
 * the API route can echo back to the client. The caller is expected to
 * have validated the intent shape; this function will surface DuckDB
 * failures so the UI can requeue the write.
 */
export const insertStudy = async (intent: StudyIntent): Promise<StudyWriteResult> => {
  try {
    const database = await getDb();
    await ensureStudy();
    switch (intent.kind) {
      case 'session-start':
        await writeSessionStart(database, intent);
        return { ok: true, kind: intent.kind };
      case 'session-end':
        await writeSessionEnd(database, intent);
        return { ok: true, kind: intent.kind };
      case 'trial-complete':
        await writeTrialComplete(database, intent);
        return { ok: true, kind: intent.kind };
      case 'questionnaire-response':
        await writeQuestionnaireResponse(database, intent);
        return { ok: true, kind: intent.kind };
      case 'condition-toggle':
      case 'warp-adjustment':
        await writeConditionEvent(database, intent);
        return { ok: true, kind: intent.kind };
      default: {
        // Exhaustiveness guard — if a new intent kind is added without
        // updating this switch, TypeScript fails to compile.
        const _exhaustive: never = intent;
        return {
          ok: false,
          kind: (_exhaustive as StudyIntent).kind ?? 'session-start',
          error: `unknown study intent: ${JSON.stringify(intent)}`,
        };
      }
    }
  } catch (error) {
    return {
      ok: false,
      kind: intent.kind,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const studyTableNames = (): readonly string[] => STUDY_TABLES;
