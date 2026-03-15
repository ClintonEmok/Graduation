import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/timeslicing QA labeling', () => {
  test('derives route QA semantics from shared model and context card', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/buildTimelineQaModel/);
    expect(pageSource).toMatch(/TimelineQaContextCard/);
    expect(pageSource).toMatch(/routeRole:\s*'timeslicing'/);
  });

  test('keeps suggestion workflow while exposing explicit selection detail semantics', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/SuggestionToolbar/);
    expect(pageSource).toMatch(/SuggestionPanel/);
    expect(pageSource).toMatch(/hasActiveSelection/);
    expect(pageSource).toMatch(/detailDomainSec:\s*\[rangeStart, rangeEnd\]/);
  });

  test('renders QA\/exploration wording through shared model constants', () => {
    const modelSource = readFileSync(new URL('../../components/timeline/qa/timeline-qa-model.ts', import.meta.url), 'utf8');

    expect(modelSource).toMatch(/QA \/ exploration/);
    expect(modelSource).toMatch(/Reference timeline/);
    expect(modelSource).toMatch(/Selection detail/);
    expect(modelSource).toMatch(/general-user adaptation is deferred/i);
  });
});
