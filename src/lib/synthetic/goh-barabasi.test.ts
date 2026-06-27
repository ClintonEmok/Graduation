import { describe, expect, it } from 'vitest';
import {
  computeBurstinessMetrics,
  computeRollingBurstiness,
  generateBurstySequence,
  resolveConfig,
} from './goh-barabasi';
import { eventsToCsv, burstinessToCsv } from './csv-export';
import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';
import { getActiveTypes } from './goh-barabasi';

const HOUR_SEC = 3600;
const DAY_SEC = 24 * HOUR_SEC;
const YEAR_SEC = 365 * DAY_SEC;

const DEFAULT_START = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
const DEFAULT_END = DEFAULT_START + YEAR_SEC;

describe('resolveConfig', () => {
  it('applies defaults for omitted fields', () => {
    const c = resolveConfig({});
    expect(c.alpha).toBe(1.5);
    expect(c.delta).toBe(1);
    expect(c.numEvents).toBe(10000);
    expect(c.typeStrategy).toBe('weighted');
    expect(c.rollingWindowSec).toBe(7 * DAY_SEC);
    expect(c.seed).toBe(42);
  });

  it('rejects alpha <= 1', () => {
    expect(() => resolveConfig({ alpha: 1 })).toThrow();
    expect(() => resolveConfig({ alpha: 0.5 })).toThrow();
  });

  it('rejects delta <= 0', () => {
    expect(() => resolveConfig({ delta: 0 })).toThrow();
    expect(() => resolveConfig({ delta: -1 })).toThrow();
  });

  it('rejects numEvents < 1', () => {
    expect(() => resolveConfig({ numEvents: 0 })).toThrow();
  });

  it('rejects endTime <= startTime', () => {
    expect(() => resolveConfig({ startTime: 100, endTime: 100 })).toThrow();
    expect(() => resolveConfig({ startTime: 200, endTime: 100 })).toThrow();
  });

  it('preserves explicit values', () => {
    const c = resolveConfig({
      alpha: 2.0,
      delta: 2,
      numEvents: 500,
      startTime: 0,
      endTime: 1000,
      typeStrategy: 'uniform',
      seed: 7,
    });
    expect(c.alpha).toBe(2.0);
    expect(c.delta).toBe(2);
    expect(c.numEvents).toBe(500);
    expect(c.typeStrategy).toBe('uniform');
    expect(c.seed).toBe(7);
  });
});

describe('computeBurstinessMetrics', () => {
  it('returns zeros for degenerate input', () => {
    const m = computeBurstinessMetrics([]);
    expect(m.burstinessParam).toBe(0);
    expect(m.meanIET).toBe(0);
  });

  it('produces B > 0.5 for highly bursty input', () => {
    const bursty: number[] = [];
    for (let i = 0; i < 2000; i += 1) {
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1);
      bursty.push(1000000);
    }
    const m = computeBurstinessMetrics(bursty);
    expect(m.burstinessParam).toBeGreaterThan(0.5);
  });

  it('produces B near -1 for regular uniform input', () => {
    const uniform = Array.from({ length: 1000 }, (_, i) => 50);
    const m = computeBurstinessMetrics(uniform);
    expect(m.burstinessParam).toBeLessThan(-0.5);
  });

  it('estimates fitted alpha for power-law input', () => {
    const rng = (() => {
      let s = 12345;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
    })();
    const samples: number[] = [];
    for (let i = 0; i < 5000; i += 1) {
      const u = rng();
      samples.push(Math.pow(1 - u, -1 / 0.5));
    }
    const m = computeBurstinessMetrics(samples);
    expect(m.fittedAlpha).toBeGreaterThan(1);
    expect(m.fittedAlpha).toBeLessThan(2.5);
  });
});

describe('generateBurstySequence', () => {
  it('produces the requested number of events', () => {
    const seq = generateBurstySequence({
      numEvents: 500,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      seed: 1,
    });
    expect(seq.events).toHaveLength(500);
  });

  it('returns events with valid CrimeRecord shape', () => {
    const seq = generateBurstySequence({ numEvents: 200, seed: 2 });
    for (const e of seq.events) {
      expect(typeof e.timestamp).toBe('number');
      expect(typeof e.type).toBe('string');
      expect(typeof e.lat).toBe('number');
      expect(typeof e.lon).toBe('number');
      expect(typeof e.x).toBe('number');
      expect(typeof e.z).toBe('number');
      expect(typeof e.district).toBe('string');
      expect(typeof e.year).toBe('number');
      expect(typeof e.iucr).toBe('string');
    }
  });

  it('keeps timestamps within the configured range', () => {
    const seq = generateBurstySequence({
      numEvents: 1000,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      seed: 3,
    });
    for (const e of seq.events) {
      expect(e.timestamp).toBeGreaterThanOrEqual(DEFAULT_START);
      expect(e.timestamp).toBeLessThanOrEqual(DEFAULT_END);
    }
  });

  it('keeps coordinates within Chicago bounds', () => {
    const seq = generateBurstySequence({ numEvents: 1000, seed: 4 });
    for (const e of seq.events) {
      expect(e.lon).toBeGreaterThanOrEqual(CHICAGO_BOUNDS.minLon);
      expect(e.lon).toBeLessThanOrEqual(CHICAGO_BOUNDS.maxLon);
      expect(e.lat).toBeGreaterThanOrEqual(CHICAGO_BOUNDS.minLat);
      expect(e.lat).toBeLessThanOrEqual(CHICAGO_BOUNDS.maxLat);
      expect(e.x).toBeGreaterThanOrEqual(-50);
      expect(e.x).toBeLessThanOrEqual(50);
      expect(e.z).toBeGreaterThanOrEqual(-50);
      expect(e.z).toBeLessThanOrEqual(50);
    }
  });

  it('uses only valid crime types', () => {
    const valid = new Set(getActiveTypes());
    const seq = generateBurstySequence({ numEvents: 500, seed: 5 });
    for (const e of seq.events) {
      expect(valid.has(e.type)).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = generateBurstySequence({ numEvents: 200, seed: 42 });
    const b = generateBurstySequence({ numEvents: 200, seed: 42 });
    expect(a.events.map((e) => e.timestamp)).toEqual(b.events.map((e) => e.timestamp));
    expect(a.events.map((e) => e.type)).toEqual(b.events.map((e) => e.type));
  });

  it('produces different sequences for different seeds', () => {
    const a = generateBurstySequence({ numEvents: 200, seed: 1 });
    const b = generateBurstySequence({ numEvents: 200, seed: 2 });
    const aTs = a.events.map((e) => e.timestamp);
    const bTs = b.events.map((e) => e.timestamp);
    expect(aTs).not.toEqual(bTs);
  });

  it('produces a clearly bursty global metric (B > 0.3) for default config', () => {
    const seq = generateBurstySequence({
      numEvents: 2000,
      alpha: 1.5,
      seed: 10,
    });
    expect(seq.metrics.burstinessParam).toBeGreaterThan(0.3);
  });

  it('produces higher B for lower alpha', () => {
    const samples = 3;
    const lowB: number[] = [];
    const highB: number[] = [];
    for (let i = 0; i < samples; i += 1) {
      lowB.push(generateBurstySequence({ numEvents: 2000, alpha: 1.2, seed: 100 + i }).metrics.burstinessParam);
      highB.push(generateBurstySequence({ numEvents: 2000, alpha: 2.5, seed: 200 + i }).metrics.burstinessParam);
    }
    const lowMedian = [...lowB].sort()[Math.floor(samples / 2)]!;
    const highMedian = [...highB].sort()[Math.floor(samples / 2)]!;
    expect(lowMedian).toBeGreaterThan(highMedian);
  });

  it('weighted strategy fires THEFT more than HOMICIDE', () => {
    const seq = generateBurstySequence({
      numEvents: 5000,
      typeStrategy: 'weighted',
      seed: 13,
    });
    const theftCount = seq.events.filter((e) => e.type === 'THEFT').length;
    const homicideCount = seq.events.filter((e) => e.type === 'HOMICIDE').length;
    expect(theftCount).toBeGreaterThan(homicideCount);
    expect(homicideCount).toBeLessThan(theftCount / 10);
  });

  it('produces a non-trivial rolling burstiness time series', () => {
    const seq = generateBurstySequence({
      numEvents: 2000,
      rollingWindowSec: 7 * DAY_SEC,
      seed: 14,
    });
    expect(seq.rollingBurstiness.length).toBeGreaterThan(0);
    const validB = seq.rollingBurstiness.filter((p) => p.eventCount >= 2);
    expect(validB.length).toBeGreaterThan(0);
    const bValues = validB.map((p) => p.burstinessParam);
    const bRange = Math.max(...bValues) - Math.min(...bValues);
    expect(bRange).toBeGreaterThan(0.1);
  });
});

describe('computeRollingBurstiness', () => {
  it('returns empty array for invalid window', () => {
    expect(computeRollingBurstiness([], 0, 100, 0)).toEqual([]);
    expect(computeRollingBurstiness([], 100, 50, 10)).toEqual([]);
  });

  it('produces one point per window covering the full range', () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      timestamp: DEFAULT_START + i * DAY_SEC,
      lat: 41.8,
      lon: -87.6,
      x: 0,
      z: 0,
      type: 'THEFT',
      district: '1',
      year: 2024,
      iucr: '0001',
    }));
    const points = computeRollingBurstiness(events, DEFAULT_START, DEFAULT_START + 10 * DAY_SEC, DAY_SEC);
    expect(points).toHaveLength(10);
    for (const p of points) {
      expect(p.endEpoch - p.startEpoch).toBe(DAY_SEC);
    }
  });
});

describe('CSV exports', () => {
  it('eventsToCsv produces header + N rows', () => {
    const seq = generateBurstySequence({ numEvents: 50, seed: 20 });
    const csv = eventsToCsv(seq.events);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(51);
    expect(lines[0]).toBe('timestamp,type,district,iucr,lat,lon,x,z,year');
  });

  it('eventsToCsv escapes commas in fields', () => {
    const csv = eventsToCsv([
      {
        timestamp: 1,
        type: 'A, B',
        district: '1',
        iucr: '0001',
        lat: 41.8,
        lon: -87.6,
        x: 0,
        z: 0,
        year: 2024,
      },
    ]);
    expect(csv).toContain('"A, B"');
  });

  it('burstinessToCsv produces header + N rows', () => {
    const seq = generateBurstySequence({ numEvents: 200, seed: 21, rollingWindowSec: DAY_SEC });
    const csv = burstinessToCsv(seq.rollingBurstiness);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('startEpoch,endEpoch,burstinessParam,eventCount,typeBreakdown');
    expect(lines.length).toBe(seq.rollingBurstiness.length + 1);
  });
});
