import { describe, expect, it } from 'vitest';
import {
  buildSelectionDetailDataset,
  selectionDetailDiagnosticsMaxPoints,
  selectionDetailRenderMaxPoints,
  selectionDetailSafetyThreshold,
} from './selection-detail-dataset';

const buildCrimeRows = (count: number, start = 1_000_000) =>
  Array.from({ length: count }, (_, index) => ({
    timestamp: start + index,
    lat: 41.8,
    lon: -87.6,
    x: 1,
    z: 2,
    type: 'THEFT',
    district: '1',
    year: 2001,
    iucr: '0820',
  }));

describe('buildSelectionDetailDataset', () => {
  it('uses full selection dataset without fallback when unsampled', () => {
    const selectionData = buildCrimeRows(3);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_000_100,
      selectionData,
      selectionMeta: {
        returned: 3,
        totalMatches: 3,
        limit: 200000,
        sampled: false,
      },
      selectionError: null,
      contextTimestamps: [1_000_001, 1_000_020],
    });

    expect(dataset.diagnosticsSource).toBe('selection');
    expect(dataset.fallbackToContextReason).toBeNull();
    expect(dataset.selectionPopulation.fullPopulation).toBe(true);
    expect(dataset.selectionPopulation.sampled).toBe(false);
    expect(dataset.renderTimestamps).toEqual([1_000_000, 1_000_001, 1_000_002]);
    expect(dataset.diagnosticsTimestamps).toEqual([1_000_000, 1_000_001, 1_000_002]);
  });

  it('encodes sampled selection provenance from API meta', () => {
    const selectionData = buildCrimeRows(100);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_001_000,
      selectionData,
      selectionMeta: {
        returned: 100,
        totalMatches: 500,
        limit: 100,
        sampled: true,
        sampleStride: 5,
      },
      selectionError: null,
      contextTimestamps: [],
    });

    expect(dataset.selectionPopulation.rawSelectionCount).toBe(500);
    expect(dataset.selectionPopulation.returnedCount).toBe(100);
    expect(dataset.selectionPopulation.totalMatches).toBe(500);
    expect(dataset.selectionPopulation.sampled).toBe(true);
    expect(dataset.selectionPopulation.sampleStride).toBe(5);
    expect(dataset.selectionPopulation.fullPopulation).toBe(false);
    expect(dataset.diagnosticsSource).toBe('selection');
  });

  it('downsamples render timestamps to max points', () => {
    const selectionData = buildCrimeRows(selectionDetailRenderMaxPoints + 2500);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_010_000,
      selectionData,
      selectionMeta: {
        returned: selectionData.length,
        totalMatches: selectionData.length,
        limit: 200000,
      },
      selectionError: null,
      contextTimestamps: [],
    });

    expect(dataset.renderDownsampled).toBe(true);
    expect(dataset.renderDownsampleStride).toBeGreaterThan(1);
    expect(dataset.renderTimestamps.length).toBeLessThanOrEqual(selectionDetailRenderMaxPoints);
    expect(dataset.diagnosticsSource).toBe('selection');
  });

  it('falls back to context dataset with explicit reason on fetch error', () => {
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_000_100,
      selectionData: [],
      selectionMeta: null,
      selectionError: new Error('boom'),
      contextTimestamps: [999_000, 1_000_001, 1_000_030, 1_100_000],
    });

    expect(dataset.diagnosticsSource).toBe('context');
    expect(dataset.fallbackToContextReason).toBe('selection-fetch-error');
    expect(dataset.renderTimestamps).toEqual([1_000_001, 1_000_030]);
  });

  it('falls back to context when returned selection exceeds safety threshold', () => {
    const oversizedCount = selectionDetailSafetyThreshold + 1;
    const selectionData = buildCrimeRows(oversizedCount);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_300_000,
      selectionData,
      selectionMeta: {
        returned: oversizedCount,
        totalMatches: oversizedCount,
        limit: 250000,
      },
      selectionError: null,
      contextTimestamps: [1_000_005, 1_000_006],
    });

    expect(dataset.diagnosticsSource).toBe('context');
    expect(dataset.fallbackToContextReason).toBe('selection-exceeded-safety-threshold');
    expect(dataset.renderTimestamps).toEqual([1_000_005, 1_000_006]);
  });

  it('caps diagnostics timestamps independently from render downsampling', () => {
    const count = Math.max(selectionDetailRenderMaxPoints + 100, selectionDetailDiagnosticsMaxPoints + 1000);
    const selectionData = buildCrimeRows(count);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 2_000_000,
      selectionData,
      selectionMeta: {
        returned: count,
        totalMatches: count,
        limit: 250000,
      },
      selectionError: null,
      contextTimestamps: [],
    });

    expect(dataset.diagnosticsSource).toBe('selection');
    expect(dataset.diagnosticsCapped).toBe(true);
    expect(dataset.diagnosticsCapReason).toBe('diagnostics-max-points');
    expect(dataset.diagnosticsTimestamps.length).toBeLessThanOrEqual(selectionDetailDiagnosticsMaxPoints);
  });

  it('treats non-finite meta counts as invalid and falls back to inferred selection size', () => {
    const selectionData = buildCrimeRows(4);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_001_000,
      selectionData,
      selectionMeta: {
        returned: Number.NaN,
        totalMatches: Number.NaN,
        limit: 200000,
      },
      selectionError: null,
      contextTimestamps: [],
    });

    expect(dataset.selectionPopulation.returnedCount).toBe(4);
    expect(dataset.selectionPopulation.totalMatches).toBe(4);
    expect(dataset.fallbackToContextReason).toBeNull();
    expect(dataset.diagnosticsSource).toBe('selection');
  });

  it('keeps totalMatches at least returnedCount when metadata drifts lower', () => {
    const selectionData = buildCrimeRows(6);
    const dataset = buildSelectionDetailDataset({
      rangeStartSec: 1_000_000,
      rangeEndSec: 1_001_000,
      selectionData,
      selectionMeta: {
        returned: 6,
        totalMatches: 2,
        limit: 200000,
      },
      selectionError: null,
      contextTimestamps: [],
    });

    expect(dataset.selectionPopulation.returnedCount).toBe(6);
    expect(dataset.selectionPopulation.totalMatches).toBe(6);
    expect(dataset.selectionPopulation.fullPopulation).toBe(true);
  });
});
