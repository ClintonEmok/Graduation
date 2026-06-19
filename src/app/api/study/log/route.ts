/**
 * Phase 80 Study Logging API — acknowledged structured writes.
 *
 * Accepts a single validated study intent (session lifecycle, trial,
 * questionnaire, condition toggle, or warp adjustment) and returns an
 * explicit `ok: true` acknowledgement once the DuckDB write completes.
 * Persisted as flat rows in `study_*` fact tables via
 * `src/lib/study/storage.ts` so the thesis analysis step can run SQL
 * descriptive statistics directly.
 *
 * The previous implementation appended arbitrary JSON batches to a
 * JSONL file. Phase 80 replaces that with a typed, acknowledged,
 * analytics-ready write path (D-15, D-16).
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  insertStudy,
  type StudyIntent,
  type StudyIntentKind,
  type StudyWriteResult,
} from '@/lib/study/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_INTENT_KINDS: readonly StudyIntentKind[] = [
  'session-start',
  'session-end',
  'trial-complete',
  'questionnaire-response',
  'condition-toggle',
  'warp-adjustment',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isKnownKind = (value: unknown): value is StudyIntentKind =>
  typeof value === 'string' && VALID_INTENT_KINDS.includes(value as StudyIntentKind);

const requireString = (obj: Record<string, unknown>, key: string): string | null => {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) return null;
  return value;
};

const requireNumber = (obj: Record<string, unknown>, key: string): number | null => {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const requireCondition = (
  obj: Record<string, unknown>,
  key: string,
): 'uniform' | 'adaptive' | null => {
  const value = obj[key];
  if (value === 'uniform' || value === 'adaptive') return value;
  return null;
};

const requireAccuracy = (obj: Record<string, unknown>, key: string): 0 | 1 | null => {
  const value = obj[key];
  if (value === 0 || value === 1) return value;
  return null;
};

const requireBlock = (obj: Record<string, unknown>, key: string): 'A' | 'B' | null => {
  const value = obj[key];
  if (value === 'A' || value === 'B') return value;
  return null;
};

const requireBlockOrder = (
  obj: Record<string, unknown>,
  key: string,
): 'A->B' | 'B->A' | null => {
  const value = obj[key];
  if (value === 'A->B' || value === 'B->A') return value;
  return null;
};

const requireTaskId = (obj: Record<string, unknown>, key: string): 'T1' | 'T2' | 'T3' | 'T4' | null => {
  const value = obj[key];
  if (value === 'T1' || value === 'T2' || value === 'T3' || value === 'T4') return value;
  return null;
};

const requireScale = (
  obj: Record<string, unknown>,
  key: string,
): 'nasa-rtlx' | 'interpretability' | null => {
  const value = obj[key];
  if (value === 'nasa-rtlx' || value === 'interpretability') return value;
  return null;
};

/**
 * Validate the request body shape. Returns a normalized `StudyIntent` on
 * success and an error message on failure. Pure function — no I/O.
 */
const validateIntent = (
  body: unknown,
): { ok: true; intent: StudyIntent } | { ok: false; error: string } => {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'request body must be a JSON object' };
  }
  if (!isKnownKind(body.kind)) {
    return { ok: false, error: `unknown or missing intent kind: ${String(body.kind)}` };
  }

  const sessionId = requireString(body, 'sessionId');
  if (sessionId === null) {
    return { ok: false, error: 'sessionId is required' };
  }
  const participantId = requireString(body, 'participantId');
  if (participantId === null) {
    return { ok: false, error: 'participantId is required' };
  }

  switch (body.kind) {
    case 'session-start': {
      const blockOrder = requireBlockOrder(body, 'blockOrder');
      if (blockOrder === null) {
        return { ok: false, error: 'blockOrder must be "A->B" or "B->A"' };
      }
      const conditionA = requireCondition(body, 'conditionA');
      if (conditionA === null) {
        return { ok: false, error: 'conditionA must be "uniform" or "adaptive"' };
      }
      const conditionB = requireCondition(body, 'conditionB');
      if (conditionB === null) {
        return { ok: false, error: 'conditionB must be "uniform" or "adaptive"' };
      }
      const startedAt = requireNumber(body, 'startedAt');
      if (startedAt === null) {
        return { ok: false, error: 'startedAt is required (epoch ms)' };
      }
      return {
        ok: true,
        intent: {
          kind: 'session-start',
          sessionId,
          participantId,
          blockOrder,
          conditionA,
          conditionB,
          startedAt,
        },
      };
    }
    case 'session-end': {
      const endedAt = requireNumber(body, 'endedAt');
      if (endedAt === null) {
        return { ok: false, error: 'endedAt is required (epoch ms)' };
      }
      const currentStep = requireString(body, 'currentStep');
      if (currentStep === null) {
        return { ok: false, error: 'currentStep is required' };
      }
      return {
        ok: true,
        intent: {
          kind: 'session-end',
          sessionId,
          participantId,
          endedAt,
          currentStep,
        },
      };
    }
    case 'trial-complete': {
      const block = requireBlock(body, 'block');
      if (block === null) return { ok: false, error: 'block must be "A" or "B"' };
      const condition = requireCondition(body, 'condition');
      if (condition === null) {
        return { ok: false, error: 'condition must be "uniform" or "adaptive"' };
      }
      const blockOrderNum = requireNumber(body, 'blockOrder');
      if (blockOrderNum === null) {
        return { ok: false, error: 'blockOrder is required (1 or 2)' };
      }
      const trialOrder = requireNumber(body, 'trialOrder');
      if (trialOrder === null) {
        return { ok: false, error: 'trialOrder is required (1..4)' };
      }
      const taskId = requireTaskId(body, 'taskId');
      if (taskId === null) {
        return { ok: false, error: 'taskId must be one of T1, T2, T3, T4' };
      }
      const answerText = requireString(body, 'answerText');
      if (answerText === null) {
        return { ok: false, error: 'answerText is required' };
      }
      const accuracy = requireAccuracy(body, 'accuracy');
      if (accuracy === null) {
        return { ok: false, error: 'accuracy must be 0 or 1' };
      }
      const completionTimeMs = requireNumber(body, 'completionTimeMs');
      if (completionTimeMs === null) {
        return { ok: false, error: 'completionTimeMs is required' };
      }
      const confidence = requireNumber(body, 'confidence');
      if (confidence === null) {
        return { ok: false, error: 'confidence is required' };
      }
      const warpFactor = requireNumber(body, 'warpFactor');
      if (warpFactor === null) {
        return { ok: false, error: 'warpFactor is required' };
      }
      const startedAt = requireNumber(body, 'startedAt');
      if (startedAt === null) {
        return { ok: false, error: 'startedAt is required' };
      }
      const completedAt = requireNumber(body, 'completedAt');
      if (completedAt === null) {
        return { ok: false, error: 'completedAt is required' };
      }
      return {
        ok: true,
        intent: {
          kind: 'trial-complete',
          sessionId,
          participantId,
          block,
          condition,
          blockOrder: blockOrderNum,
          trialOrder,
          taskId,
          answerText,
          accuracy,
          completionTimeMs,
          confidence,
          warpFactor,
          startedAt,
          completedAt,
        },
      };
    }
    case 'questionnaire-response': {
      const block = requireBlock(body, 'block');
      if (block === null) return { ok: false, error: 'block must be "A" or "B"' };
      const condition = requireCondition(body, 'condition');
      if (condition === null) {
        return { ok: false, error: 'condition must be "uniform" or "adaptive"' };
      }
      const scale = requireScale(body, 'scale');
      if (scale === null) {
        return { ok: false, error: 'scale must be "nasa-rtlx" or "interpretability"' };
      }
      const itemId = requireString(body, 'itemId');
      if (itemId === null) {
        return { ok: false, error: 'itemId is required' };
      }
      const value = requireNumber(body, 'value');
      if (value === null) {
        return { ok: false, error: 'value is required' };
      }
      const completedAt = requireNumber(body, 'completedAt');
      if (completedAt === null) {
        return { ok: false, error: 'completedAt is required' };
      }
      return {
        ok: true,
        intent: {
          kind: 'questionnaire-response',
          sessionId,
          participantId,
          block,
          condition,
          scale,
          itemId,
          value,
          completedAt,
        },
      };
    }
    case 'condition-toggle': {
      const block = requireBlock(body, 'block');
      if (block === null) return { ok: false, error: 'block must be "A" or "B"' };
      const fromCondition = requireCondition(body, 'fromCondition');
      if (fromCondition === null) {
        return { ok: false, error: 'fromCondition must be "uniform" or "adaptive"' };
      }
      const toCondition = requireCondition(body, 'toCondition');
      if (toCondition === null) {
        return { ok: false, error: 'toCondition must be "uniform" or "adaptive"' };
      }
      const warpFactorAtEvent = requireNumber(body, 'warpFactorAtEvent');
      if (warpFactorAtEvent === null) {
        return { ok: false, error: 'warpFactorAtEvent is required' };
      }
      const occurredAt = requireNumber(body, 'occurredAt');
      if (occurredAt === null) {
        return { ok: false, error: 'occurredAt is required' };
      }
      return {
        ok: true,
        intent: {
          kind: 'condition-toggle',
          sessionId,
          participantId,
          block,
          fromCondition,
          toCondition,
          warpFactorAtEvent,
          occurredAt,
        },
      };
    }
    case 'warp-adjustment': {
      const block = requireBlock(body, 'block');
      if (block === null) return { ok: false, error: 'block must be "A" or "B"' };
      const condition = requireCondition(body, 'condition');
      if (condition === null) {
        return { ok: false, error: 'condition must be "uniform" or "adaptive"' };
      }
      const warpFactorBefore = requireNumber(body, 'warpFactorBefore');
      if (warpFactorBefore === null) {
        return { ok: false, error: 'warpFactorBefore is required' };
      }
      const warpFactorAfter = requireNumber(body, 'warpFactorAfter');
      if (warpFactorAfter === null) {
        return { ok: false, error: 'warpFactorAfter is required' };
      }
      const occurredAt = requireNumber(body, 'occurredAt');
      if (occurredAt === null) {
        return { ok: false, error: 'occurredAt is required' };
      }
      return {
        ok: true,
        intent: {
          kind: 'warp-adjustment',
          sessionId,
          participantId,
          block,
          condition,
          warpFactorBefore,
          warpFactorAfter,
          occurredAt,
        },
      };
    }
    default: {
      // Exhaustiveness guard — if a new kind is added without updating
      // the validator, TypeScript fails to compile.
      const _exhaustive: never = body.kind;
      return { ok: false, error: `unsupported intent kind: ${String(_exhaustive)}` };
    }
  }
};

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid JSON body' },
      { status: 400 },
    );
  }

  const validation = validateIntent(raw);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 },
    );
  }

  const result: StudyWriteResult = await insertStudy(validation.intent);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, kind: result.kind, error: result.error ?? 'unknown persistence error' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, kind: result.kind });
}
