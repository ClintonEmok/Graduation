import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 01 monthly binning contract', () => {
  test('keeps monthly across store, UI, rules, and engine', () => {
    const storeSource = readFileSync(new URL('../../store/useTimeslicingModeStore.ts', import.meta.url), 'utf8');
    const controlsSource = readFileSync(new URL('../../components/binning/BinningControls.tsx', import.meta.url), 'utf8');
    const rulesSource = readFileSync(new URL('./rules.ts', import.meta.url), 'utf8');
    const engineSource = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');

    expect(storeSource).toMatch(/TimeslicingGranularity = .*monthly/);
    expect(controlsSource).toMatch(/value: 'monthly'/);
    expect(controlsSource).toMatch(/label: 'Monthly'/);
    expect(rulesSource).toMatch(/'monthly'/);
    expect(rulesSource).toMatch(/Calendar monthly intervals/);
    expect(engineSource).toMatch(/case 'monthly'/);
    expect(engineSource).toMatch(/generateMonthlyBins/);
  });
});
