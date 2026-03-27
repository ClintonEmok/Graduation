import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('useDashboardStkde', () => {
  const source = readFileSync(new URL('./useDashboardStkde.ts', import.meta.url), 'utf8');

  test('posts STKDE payload with manual run action', () => {
    expect(source).toMatch(/fetch\('\/api\/stkde\/hotspots'/);
    expect(source).toMatch(/callerIntent: 'stkde'/);
    expect(source).toMatch(/runStkde = useCallback\(async \(\)/);
  });

  test('handles cancellation with AbortController before rerun', () => {
    expect(source).toMatch(/AbortController/);
    expect(source).toMatch(/abortRef\.current\?\.abort\(\)/);
    expect(source).toMatch(/finishRunCancelled/);
  });

  test('uses worker projection and stale marking on applied-slice changes', () => {
    expect(source).toMatch(/new Worker\(new URL\([^)]*stkdeHotspot\.worker\.ts/);
    expect(source).toMatch(/markStale\('applied-slices-updated'\)/);
  });

  test('remains manual-triggered instead of auto-running on param edits', () => {
    expect(source).not.toMatch(/void runStkde\(/);
    expect(source).not.toMatch(/useEffect\([^)]*params/);
  });
});
