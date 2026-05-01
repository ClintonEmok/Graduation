import { describe, expect, test } from 'vitest';
import { stripTransientTimeslicingState } from './useDashboardDemoTimeslicingModeStore';

describe('useDashboardDemoTimeslicingModeStore persistence', () => {
  test('drops persisted pending draft slices and other transient state on reload', () => {
    const migrated = stripTransientTimeslicingState({
      mode: 'manual',
      customIntervals: [{ name: 'night', startHour: 0, endHour: 6 }],
      autoConfig: {
        minBurstEvents: 12,
        burstThreshold: 0.75,
        maxSlices: 16,
      },
      sliceTemplates: [{ id: 'demo', name: 'Demo', duration: 60 * 60 * 1000, color: '#3b82f6' }],
      generationInputs: {
        crimeTypes: ['THEFT'],
        neighbourhood: '001',
        timeWindow: { start: 100, end: 200 },
        granularity: 'weekly',
      },
      generationStatus: 'ready',
      generationError: 'stale draft',
      pendingGeneratedBins: [
        {
          id: 'draft-1',
          startTime: 100,
          endTime: 200,
          count: 10,
          crimeTypes: ['THEFT'],
          avgTimestamp: 150,
          burstClass: 'isolated-spike',
        },
      ],
      lastGeneratedMetadata: {
        generatedAt: 123,
        binCount: 1,
        eventCount: 10,
        warning: null,
        inputs: {
          crimeTypes: ['THEFT'],
          neighbourhood: '001',
          timeWindow: { start: 100, end: 200 },
          granularity: 'weekly',
        },
      },
      lastAppliedAt: 456,
    });

    expect(migrated).toEqual({
      mode: 'manual',
      customIntervals: [{ name: 'night', startHour: 0, endHour: 6 }],
      autoConfig: { minBurstEvents: 12, burstThreshold: 0.75, maxSlices: 16 },
      sliceTemplates: [{ id: 'demo', name: 'Demo', duration: 60 * 60 * 1000, color: '#3b82f6' }],
      generationInputs: {
        crimeTypes: ['THEFT'],
        neighbourhood: '001',
        timeWindow: { start: 100, end: 200 },
        granularity: 'weekly',
      },
    });
    expect(migrated).not.toHaveProperty('generationStatus');
    expect(migrated).not.toHaveProperty('generationError');
    expect(migrated).not.toHaveProperty('pendingGeneratedBins');
    expect(migrated).not.toHaveProperty('lastGeneratedMetadata');
    expect(migrated).not.toHaveProperty('lastAppliedAt');
  });
});
