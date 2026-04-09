import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('DashboardHeader flow consolidation', () => {
  test('stays informational and does not expose route links', () => {
    const headerSource = readFileSync(new URL('./DashboardHeader.tsx', import.meta.url), 'utf8');

    expect(headerSource).not.toMatch(/next\/link/);
    expect(headerSource).not.toMatch(/href="\/dashboard-v2"/);
    expect(headerSource).not.toMatch(/href="\/timeslicing"/);
    expect(headerSource).not.toMatch(/href="\/stkde"/);
    expect(headerSource).toMatch(/overview and pattern summaries/);
    expect(headerSource).toMatch(/overview · pattern summaries/);
    expect(headerSource).toMatch(/Map-first overview surface/);
    expect(headerSource).not.toMatch(/go to|open|navigate/i);
    expect(headerSource).toMatch(/workflow/);
    expect(headerSource).toMatch(/sync status/);
    expect(headerSource).toMatch(/slice summary/);
  });
});
