import { describe, expect, test } from 'vitest';

import { QA_WORDING_SCOPE_NOTE, buildTimelineQaModel } from './timeline-qa-model';

describe('buildTimelineQaModel', () => {
  test('builds timeslicing QA / exploration labels with active selection wording', () => {
    const model = buildTimelineQaModel({
      routeRole: 'timeslicing',
      referenceDomainSec: [978307200, 981072000],
      fetchedDomainSec: [977443200, 981936000],
      detailDomainSec: [979084800, 980208000],
      hasActiveSelection: true,
    });

    expect(model.routeRoleTitle).toBe('QA / exploration');
    expect(model.routeRoleDescription).toContain('Richer workflow surface');
    expect(model.referenceTimelineLabel).toBe('Reference timeline');
    expect(model.selectionDetailLabel).toBe('Selection detail');
    expect(model.selectionDetailDescription).toContain('updates when the active selection/brush changes');
    expect(model.qaScopeNote).toBe(QA_WORDING_SCOPE_NOTE);
    expect(model.referenceRangeLabel).toContain('2001');
    expect(model.fetchedRangeLabel).toContain('2000');
    expect(model.detailRangeLabel).toContain('2001');
  });

  test('builds timeslicing-algos diagnostics labels with viewport fallback wording', () => {
    const model = buildTimelineQaModel({
      routeRole: 'timeslicing-algos',
      referenceDomainSec: [978307200, 981072000],
      fetchedDomainSec: [977443200, 981936000],
      detailDomainSec: [978307200, 981072000],
      hasActiveSelection: false,
      strategyLabel: 'uniform-events',
      timescaleLabel: 'adaptive',
    });

    expect(model.routeRoleTitle).toBe('Algorithm diagnostics');
    expect(model.routeRoleDescription).toContain('QA / exploration surface');
    expect(model.selectionDetailDescription).toContain('falls back to the viewport range');
    expect(model.strategyLabel).toBe('uniform-events');
    expect(model.timescaleLabel).toBe('adaptive');
  });

  test('normalizes reverse domains so labels are deterministic', () => {
    const model = buildTimelineQaModel({
      routeRole: 'timeslicing',
      referenceDomainSec: [981072000, 978307200],
      fetchedDomainSec: [981936000, 977443200],
      detailDomainSec: [980208000, 979084800],
      hasActiveSelection: true,
    });

    expect(model.referenceRangeLabel).toContain('2001');
    expect(model.fetchedRangeLabel).toContain('2000');
    expect(model.detailRangeLabel).toContain('2001');
  });
});
