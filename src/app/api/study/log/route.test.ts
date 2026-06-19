// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  type ConditionToggleIntent,
  type QuestionnaireResponseIntent,
  type SessionEndIntent,
  type SessionStartIntent,
  type TrialCompleteIntent,
  type WarpAdjustmentIntent,
} from '@/lib/study/storage';

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

// Hoist mocks before the route module loads so the validators can use
// them. We replace `getDb` with an in-memory fake so the validation
// branch is exercised without opening a real DuckDB.
const insertStudy = vi.fn();
vi.mock('@/lib/study/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/study/storage')>();
  return {
    ...actual,
    insertStudy: (...args: unknown[]) => {
      insertStudy(...args);
      return Promise.resolve({ ok: true, kind: (args[0] as { kind: string }).kind });
    },
    ensureStudy: () => Promise.resolve(),
  };
});

// Bypass the real DuckDB module so the test does not try to open a file.
vi.mock('@/lib/db', () => ({
  getDb: () => Promise.resolve({}),
  isMockDataEnabled: () => false,
  getDataPath: () => '',
  getDbPath: () => '',
  parseDate: (input: string) => new Date(input),
  epochSeconds: (input: string) => Math.floor(new Date(input).getTime() / 1000),
}));

// Load after mocks so the route's `getDb` calls resolve to the fake.
const { POST } = await import('./route');

const buildRequest = (body: unknown): Request => {
  return new Request('http://localhost/api/study/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

beforeEach(() => {
  insertStudy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/study/log — validation', () => {
  test('rejects non-JSON bodies with HTTP 400', async () => {
    const req = new Request('http://localhost/api/study/log', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toContain('JSON');
  });

  test('rejects bodies without a recognized kind', async () => {
    const res = await POST(buildRequest({ kind: 'not-a-kind' }) as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.error).toContain('kind');
  });

  test('rejects bodies missing sessionId / participantId', async () => {
    const res = await POST(buildRequest({ kind: 'session-start' }) as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.error).toContain('sessionId');
  });

  test('accepts a session-start intent and returns ok: true', async () => {
    const res = await POST(buildRequest(baseSessionStart) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('session-start');
    expect(insertStudy).toHaveBeenCalledTimes(1);
  });

  test('accepts a session-end intent', async () => {
    const res = await POST(buildRequest(baseSessionEnd) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('session-end');
  });

  test('accepts a trial-complete intent', async () => {
    const res = await POST(buildRequest(baseTrial) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('trial-complete');
  });

  test('accepts a questionnaire-response intent', async () => {
    const res = await POST(buildRequest(baseQuestionnaire) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('questionnaire-response');
  });

  test('accepts a condition-toggle intent', async () => {
    const res = await POST(buildRequest(baseConditionToggle) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('condition-toggle');
  });

  test('accepts a warp-adjustment intent', async () => {
    const res = await POST(buildRequest(baseWarpAdjustment) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; kind: string };
    expect(json.ok).toBe(true);
    expect(json.kind).toBe('warp-adjustment');
  });

  test('rejects trial-complete with bad accuracy', async () => {
    const res = await POST(
      buildRequest({ ...baseTrial, accuracy: 7 }) as never,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.error).toContain('accuracy');
  });

  test('rejects trial-complete with bad taskId', async () => {
    const res = await POST(
      buildRequest({ ...baseTrial, taskId: 'T9' }) as never,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.error).toContain('taskId');
  });

  test('rejects questionnaire-response with bad scale', async () => {
    const res = await POST(
      buildRequest({ ...baseQuestionnaire, scale: 'unknown' }) as never,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.error).toContain('scale');
  });

  test('returns 500 when insertStudy reports a failure', async () => {
    vi.resetModules();
    vi.doMock('@/lib/study/storage', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/study/storage')>();
      return {
        ...actual,
        insertStudy: () =>
          Promise.resolve({
            ok: false,
            kind: 'session-start',
            error: 'synthetic failure',
          }),
        ensureStudy: () => Promise.resolve(),
      };
    });
    vi.doMock('@/lib/db', () => ({
      getDb: () => Promise.resolve({}),
      isMockDataEnabled: () => false,
      getDataPath: () => '',
      getDbPath: () => '',
      parseDate: (input: string) => new Date(input),
      epochSeconds: (input: string) => Math.floor(new Date(input).getTime() / 1000),
    }));
    const { POST: FailingPOST } = await import('./route');
    const res = await FailingPOST(buildRequest(baseSessionStart) as never);
    expect(res.status).toBe(500);
    const json = (await res.json()) as { ok: boolean; kind: string; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe('synthetic failure');
  });
});
