import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('dashboard-v2 STKDE integration wiring', () => {
  test('mounts STKDE panel and exposes STKDE toggle', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/DashboardStkdePanel/);
    expect(pageSource).toMatch(/togglePanel\('stkde'\)/);
    expect(pageSource).toMatch(/>\s*STKDE\s*</);
  });

  test('wires map STKDE mode and layer integration', () => {
    const mapSource = readFileSync(new URL('../../components/map/MapVisualization.tsx', import.meta.url), 'utf8');
    expect(mapSource).toMatch(/MapStkdeHeatmapLayer/);
    expect(mapSource).toMatch(/visibility\.stkde/);
    expect(mapSource).toMatch(/opacity\.stkde/);
    expect(mapSource).toMatch(/Mode: Standard/);
    expect(mapSource).toMatch(/Mode: STKDE Enhanced/);
  });

  test('renders stale warning phrase in STKDE panel copy', () => {
    const panelSource = readFileSync(new URL('../../components/stkde/DashboardStkdePanel.tsx', import.meta.url), 'utf8');
    expect(panelSource).toMatch(/applied slices changed — rerun STKDE/);
    expect(panelSource).toMatch(/STKDE Investigation/);
    expect(panelSource).toMatch(/Run STKDE/);
    expect(panelSource).toMatch(/Applied Slices/);
    expect(panelSource).toMatch(/Full Viewport/);
  });
});
