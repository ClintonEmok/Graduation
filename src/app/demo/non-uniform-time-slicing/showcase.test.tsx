import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/demo/non-uniform-time-slicing showcase', () => {
  test('wires the shared comparable warp helper into the route contract', () => {
    const showcaseSource = readFileSync(new URL('./showcase.tsx', import.meta.url), 'utf8');
    const helperSource = readFileSync(new URL('../../../lib/binning/warp-scaling.ts', import.meta.url), 'utf8');

    expect(showcaseSource).toMatch(/scoreComparableWarpBins/);
    expect(showcaseSource).toMatch(/buildComparableWarpMap/);
    expect(showcaseSource).toMatch(/ComparableWarpBinInput/);
    expect(showcaseSource).toMatch(/peer-relative scoring/);
    expect(showcaseSource).toMatch(/minimumWidthShare/);
    expect(showcaseSource).toMatch(/neutralFallback/);
    expect(showcaseSource).toMatch(/Order preserved/);
    expect(showcaseSource).toMatch(/score /);
    expect(showcaseSource).toMatch(/warp /);
    expect(showcaseSource).toMatch(/floor /);
    expect(showcaseSource).toMatch(/Hourly, daily, weekly, monthly, and quarterly bins/);
    expect(showcaseSource).toMatch(/quarterly/);

    expect(helperSource).toMatch(/'hourly' \| 'daily' \| 'weekly' \| 'monthly' \| 'quarterly'/);
    expect(helperSource).toMatch(/peerRelativeScore/);
    expect(helperSource).toMatch(/widthShare/);
    expect(helperSource).toMatch(/neutralFallback/);
  });
});
