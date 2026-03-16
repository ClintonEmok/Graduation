import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/stkde route QA shell', () => {
  test('mounts StkdeRouteShell as dedicated page', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/StkdeRouteShell/);
  });

  test('contains route-isolated STKDE controls and API wiring', () => {
    const shellSource = readFileSync(new URL('./lib/StkdeRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/fetch\('\/api\/stkde\/hotspots'/);
    expect(shellSource).toMatch(/STKDE QA Route/);
    expect(shellSource).toMatch(/Spatial BW \(m\)/);
    expect(shellSource).toMatch(/Temporal BW \(h\)/);
    expect(shellSource).toMatch(/setSelectedHotspot/);
    expect(shellSource).toMatch(/setSpatialFilter/);
    expect(shellSource).toMatch(/setTemporalFilter/);
    expect(shellSource).toMatch(/MapStkdeHeatmapLayer/);
    expect(shellSource).toMatch(/HotspotPanel/);
    expect(shellSource).toMatch(/requestIdRef/);
    expect(shellSource).toMatch(/abortRef/);
    expect(shellSource).toMatch(/isEnabled\('stkdeRoute'\)/);
    expect(shellSource).toMatch(/stkde-disabled-state/);
    expect(shellSource).not.toMatch(/SuggestionPanel/);
    expect(shellSource).not.toMatch(/SuggestionToolbar/);
    expect(shellSource).not.toMatch(/accept-full-auto-package/);
  });

  test('hotspot panel exposes required attributes and linked handlers', () => {
    const panelSource = readFileSync(new URL('./lib/HotspotPanel.tsx', import.meta.url), 'utf8');
    expect(panelSource).toMatch(/Location:/);
    expect(panelSource).toMatch(/Intensity/);
    expect(panelSource).toMatch(/Support:/);
    expect(panelSource).toMatch(/Time window:/);

    const shellSource = readFileSync(new URL('./lib/StkdeRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/handleMapClick/);
    expect(shellSource).toMatch(/handleMapHover/);
    expect(shellSource).toMatch(/selectHotspot/);
    expect(shellSource).toMatch(/flyTo/);
  });
});
