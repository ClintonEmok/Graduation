import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('SuggestionPanel diagnostics defaults', () => {
  test('keeps profile comparison collapsed by default and exposes a toggle', () => {
    const source = readFileSync(new URL('./SuggestionPanel.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/const \[comparisonExpanded, setComparisonExpanded\] = useState\(false\)/);
    expect(source).toMatch(/Comparison \(static vs dynamic\)/);
    expect(source).toMatch(/aria-expanded=\{comparisonExpanded\}/);
  });

  test('keeps confidence details hidden by default and revealable on demand', () => {
    const source = readFileSync(new URL('./SuggestionPanel.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/const \[showConfidenceDetails, setShowConfidenceDetails\] = useState\(false\)/);
    expect(source).toMatch(/Show confidence details/);
    expect(source).toMatch(/Hide confidence details/);
    expect(source).toMatch(/Confidence:/);
  });

  test('renders weak and no-strong fallback labels with explicit missing-section notices', () => {
    const source = readFileSync(new URL('./SuggestionPanel.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/No strong profile/);
    expect(source).toMatch(/Signal is weak/);
    expect(source).toMatch(/Temporal diagnostics missing/);
    expect(source).toMatch(/Spatial diagnostics missing/);
    expect(source).toMatch(/sections\.temporal\.status === 'missing'/);
    expect(source).toMatch(/sections\.spatial\.status === 'missing'/);
  });
});
