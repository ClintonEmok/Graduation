import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('dashboard-v2 flow consolidation', () => {
  test('locks the guided workflow shell and hidden advanced panels contract', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const binningSource = readFileSync(new URL('../../components/binning/BinningControls.tsx', import.meta.url), 'utf8');
    const layoutSource = readFileSync(new URL('../../store/useLayoutStore.ts', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/Generate Draft Slices/);
    expect(pageSource).toMatch(/workflow rail/);
    expect(pageSource).toMatch(/Guided generation and review stay in one surface/);
    expect(pageSource).toMatch(/showAnalysisPanel/);
    expect(pageSource).toMatch(/DashboardStkdePanel/);
    expect(pageSource).toMatch(/MapLayerManager/);

    expect(binningSource).toMatch(/Generate Draft Slices/);

    expect(layoutSource).toMatch(/refinement: false/);
    expect(layoutSource).toMatch(/layers: false/);
    expect(layoutSource).toMatch(/stkde: false/);
  });
});
