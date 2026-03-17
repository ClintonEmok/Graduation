import { describe, expect, test } from 'vitest';
import type { CrimeRecord } from '@/types/crime';
import {
  buildContextDiagnostics,
  buildProfileComparison,
  buildSpatialSummary,
  buildTemporalSummary,
  resolveDynamicProfile,
} from './index';

const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_000_100, type: 'THEFT', lat: 41.8801, lon: -87.6301, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_000_200, type: 'THEFT', lat: 41.8802, lon: -87.6302, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_000_300, type: 'BATTERY', lat: 41.8803, lon: -87.6303, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
  { timestamp: 1_700_080_000, type: 'ROBBERY', lat: 41.7501, lon: -87.6701, x: 0, z: 0, district: '6', year: 2023, iucr: '0320' },
  { timestamp: 1_700_080_400, type: 'ROBBERY', lat: 41.7502, lon: -87.6702, x: 0, z: 0, district: '6', year: 2023, iucr: '0320' },
  { timestamp: 1_700_160_000, type: 'ASSAULT', lat: 41.9001, lon: -87.6001, x: 0, z: 0, district: '18', year: 2023, iucr: '051A' },
];

describe('context diagnostics engine', () => {
  test('builds compact temporal summary with dominant window and activity text', () => {
    const temporal = buildTemporalSummary({
      timestamps: baseCrimes.map((crime) => crime.timestamp),
      dominantWindowHours: 24,
    });

    expect(temporal.status).toBe('available');
    if (temporal.status !== 'available') {
      throw new Error('expected available temporal summary');
    }
    expect(temporal.rangeSpanSec).toBe(159900);
    expect(temporal.dominantWindow.eventCount).toBe(5);
    expect(temporal.activitySummary).toMatch(/events in dominant 24h window/);
    expect(temporal.activitySummary).toMatch(/across 2d range/);
  });

  test('adapts dominant temporal window label for wider ranges', () => {
    const temporal = buildTemporalSummary({
      timestamps: [
        1_700_000_000,
        1_700_200_000,
        1_700_400_000,
        1_700_800_000,
        1_701_000_000,
        1_701_200_000,
      ],
    });

    expect(temporal.status).toBe('available');
    if (temporal.status !== 'available') {
      throw new Error('expected available temporal summary');
    }

    expect(temporal.activitySummary).toMatch(/dominant (3d|7d|14d) window/);
  });

  test('caps spatial hotspot summary to top 3 and uses deterministic dominant-signal tie-break', () => {
    const crimesWithTie: CrimeRecord[] = [
      { timestamp: 1, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
      { timestamp: 2, type: 'BATTERY', lat: 41.88001, lon: -87.63001, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
      { timestamp: 3, type: 'ROBBERY', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0320' },
      { timestamp: 4, type: 'ROBBERY', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0320' },
      { timestamp: 5, type: 'THEFT', lat: 41.70, lon: -87.80, x: 0, z: 0, district: '11', year: 2023, iucr: '0820' },
      { timestamp: 6, type: 'THEFT', lat: 41.70, lon: -87.80, x: 0, z: 0, district: '11', year: 2023, iucr: '0820' },
      { timestamp: 7, type: 'BATTERY', lat: 41.95, lon: -87.50, x: 0, z: 0, district: '20', year: 2023, iucr: '0460' },
      { timestamp: 8, type: 'ASSAULT', lat: 41.66, lon: -87.58, x: 0, z: 0, district: '5', year: 2023, iucr: '051A' },
      { timestamp: 9, type: 'BURGLARY', lat: 41.99, lon: -87.90, x: 0, z: 0, district: '24', year: 2023, iucr: '0610' },
    ];

    const spatial = buildSpatialSummary({ crimes: crimesWithTie, hotspotPrecisionDegrees: 0.05 });
    expect(spatial.status).toBe('available');
    if (spatial.status !== 'available') {
      throw new Error('expected available spatial summary');
    }

    expect(spatial.hotspots).toHaveLength(3);
    expect(spatial.hotspots[0]?.dominantCrimeType).toBe('Robbery');
    expect(spatial.summary).toContain('#1');
  });

  test('supports partial missing-section diagnostics with explicit notices', () => {
    const temporal = buildTemporalSummary({ timestamps: [] });
    const spatial = buildSpatialSummary({ crimes: [] });

    expect(temporal).toEqual({
      status: 'missing',
      notice: 'Temporal diagnostics missing: no timestamp data available.',
    });
    expect(spatial).toEqual({
      status: 'missing',
      notice: 'Spatial diagnostics missing: no geolocated events available.',
    });
  });

  test('produces deterministic strong/weak/no-strong dynamic profile states', () => {
    const strong = resolveDynamicProfile({
      temporal: {
        status: 'available',
        rangeSpanSec: 100,
        totalEvents: 10,
        dominantWindow: { startEpochSec: 0, endEpochSec: 100, eventCount: 9 },
        activitySummary: '9/10 events in dominant window',
      },
      spatial: {
        status: 'available',
        totalEvents: 10,
        hotspots: [{ key: 'a', centroidLat: 1, centroidLon: 1, supportCount: 8, density: 0.8, dominantCrimeType: 'Theft' }],
        summary: 'Strong hotspot',
      },
    });

    const weak = resolveDynamicProfile({
      temporal: {
        status: 'available',
        rangeSpanSec: 100,
        totalEvents: 10,
        dominantWindow: { startEpochSec: 0, endEpochSec: 100, eventCount: 6 },
        activitySummary: '6/10 events in dominant window',
      },
      spatial: {
        status: 'missing',
        notice: 'Spatial diagnostics missing: no geolocated events available.',
      },
    });

    const noStrong = resolveDynamicProfile({
      temporal: {
        status: 'missing',
        notice: 'Temporal diagnostics missing: no timestamp data available.',
      },
      spatial: {
        status: 'missing',
        notice: 'Spatial diagnostics missing: no geolocated events available.',
      },
    });

    expect(strong.state).toBe('strong');
    expect(weak.state).toBe('weak-signal');
    expect(weak.warning).toBe('Signal is weak');
    expect(noStrong.state).toBe('no-strong');
    expect(noStrong.label).toBe('No strong profile');
  });

  test('builds deterministic comparison reasons with stable precedence', () => {
    const strongDynamic = {
      label: 'Concentrated Burst Pattern' as const,
      state: 'strong' as const,
      warning: null,
      confidence: 0.82,
      scoreBreakdown: {
        concentration: 0.8,
        hotspotDominance: 0.7,
        dataCoverage: 1,
        finalScore: 0.82,
      },
    };

    const weakDynamic = {
      ...strongDynamic,
      state: 'weak-signal' as const,
      warning: 'Signal is weak',
      confidence: 0.61,
    };

    const noStrongDynamic = {
      ...strongDynamic,
      label: 'No strong profile' as const,
      state: 'no-strong' as const,
      warning: 'No strong profile',
      confidence: 0.41,
    };

    const same = buildProfileComparison('Concentrated Burst Pattern', strongDynamic);
    const weakDifferent = buildProfileComparison('Violent Crime', weakDynamic);
    const noStrongDifferent = buildProfileComparison('Violent Crime', noStrongDynamic);

    expect(same.matches).toBe(true);
    expect(same.reason).toBe('Static and dynamic diagnostics both indicate Concentrated Burst Pattern.');
    expect(weakDifferent.reason).toBe(
      'Static profile differs because dynamic diagnostics detect Concentrated Burst Pattern with a weak signal.',
    );
    expect(noStrongDifferent.reason).toBe(
      'Static profile differs because the current context has no strong profile signal.',
    );
  });

  test('returns byte-for-byte stable diagnostics for identical input', () => {
    const input = {
      timestamps: baseCrimes.map((crime) => crime.timestamp),
      crimes: baseCrimes,
      staticProfileName: 'Violent Crime',
    };

    const runOne = buildContextDiagnostics(input);
    const runTwo = buildContextDiagnostics(input);

    expect(JSON.stringify(runOne)).toBe(JSON.stringify(runTwo));
  });
});
