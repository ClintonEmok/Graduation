import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('EvolutionFlowOverlay contract', () => {
  test('wires the flow helper into the cube scene', () => {
    const timeSlicesSource = readSource('./TimeSlices.tsx');
    const overlaySource = readSource('./EvolutionFlowOverlay.tsx');
    const slicePlaneSource = readSource('./SlicePlane.tsx');
    const railTabsSource = readSource('../dashboard-demo/DashboardDemoRailTabs.tsx');
    const helperSource = readSource('../../lib/evolution/evolution-flow.ts');

    expect(timeSlicesSource).toContain('EvolutionFlowOverlay');
    expect(timeSlicesSource).toContain('evolutionSequence.activeSliceId');
    expect(railTabsSource).toContain('TabsTrigger value="evolution"');
    expect(railTabsSource).toContain('DemoEvolutionPanel');
    expect(slicePlaneSource).toContain('evolutionState');
    expect(slicePlaneSource).toContain('opacity');
    expect(overlaySource).toContain('Pattern flow');
    expect(overlaySource).toContain('coneGeometry');
    expect(helperSource).toContain('flowSegments');
  });
});
