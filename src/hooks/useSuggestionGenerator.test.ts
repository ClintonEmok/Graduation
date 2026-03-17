import { describe, expect, test } from 'vitest';
import { buildContextDiagnostics } from '@/lib/context-diagnostics';
import { generateRankedAutoProposalSets } from '@/lib/full-auto-orchestrator';
import { detectSmartProfile } from '@/hooks/useSmartProfiles';
import type { FilterContext } from '@/hooks/useContextExtractor';
import type { CrimeRecord } from '@/types/crime';
import {
  buildSuggestionContextMetadata,
  buildSuggestionDiagnosticsMetadata,
} from './useSuggestionGenerator';

const crimesFixture: CrimeRecord[] = [
  { timestamp: 1_700_000_100, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_000_200, type: 'THEFT', lat: 41.881, lon: -87.631, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_000_300, type: 'BATTERY', lat: 41.882, lon: -87.632, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
  { timestamp: 1_700_080_100, type: 'ROBBERY', lat: 41.75, lon: -87.67, x: 0, z: 0, district: '6', year: 2023, iucr: '0320' },
  { timestamp: 1_700_080_200, type: 'ROBBERY', lat: 41.751, lon: -87.671, x: 0, z: 0, district: '6', year: 2023, iucr: '0320' },
  { timestamp: 1_700_080_250, type: 'ASSAULT', lat: 41.752, lon: -87.672, x: 0, z: 0, district: '6', year: 2023, iucr: '051A' },
  { timestamp: 1_700_160_000, type: 'BURGLARY', lat: 41.90, lon: -87.60, x: 0, z: 0, district: '18', year: 2023, iucr: '0610' },
  { timestamp: 1_700_160_060, type: 'BURGLARY', lat: 41.901, lon: -87.601, x: 0, z: 0, district: '18', year: 2023, iucr: '0610' },
];

const contextFixture: FilterContext = {
  crimeTypes: ['Burglary'],
  districts: ['18'],
  timeRange: { start: 1_700_000_000, end: 1_700_200_000 },
  isFullDataset: false,
};

describe('useSuggestionGenerator diagnostics metadata integration', () => {
  test('persists dynamic profile and backward-compatible profileName fields', () => {
    const staticProfile = detectSmartProfile(contextFixture);
    const diagnostics = buildContextDiagnostics({
      timestamps: crimesFixture.map((crime) => crime.timestamp),
      crimes: crimesFixture,
      staticProfileName: staticProfile?.name,
    });

    const metadata = buildSuggestionContextMetadata({
      context: contextFixture,
      diagnostics,
    });

    expect(metadata.profileName).toBe(diagnostics.dynamicProfile.label);
    expect(metadata.contextDiagnostics?.dynamicProfileLabel).toBe(diagnostics.dynamicProfile.label);
    expect(metadata.contextDiagnostics?.staticProfileLabel).toBe(diagnostics.comparison.staticProfileName);
    expect(metadata.contextDiagnostics?.profileComparison.reason).toBe(diagnostics.comparison.reason);
  });

  test('encodes weak-signal and no-strong semantics explicitly', () => {
    const weakDiagnostics = buildContextDiagnostics({
      timestamps: [1_700_000_000, 1_700_000_100, 1_700_000_200, 1_700_000_400],
      crimes: [],
      staticProfileName: 'All Crimes',
    });
    const noStrongDiagnostics = buildContextDiagnostics({
      timestamps: [],
      crimes: [],
      staticProfileName: 'Violent Crime',
    });

    const weak = buildSuggestionDiagnosticsMetadata(weakDiagnostics);
    const noStrong = buildSuggestionDiagnosticsMetadata(noStrongDiagnostics);

    expect(weak.signalState).toBe('weak-signal');
    expect(weak.isWeakSignal).toBe(true);
    expect(weak.hasNoStrongProfile).toBe(false);
    expect(weak.profileComparison.outcome).toBe('weak-signal');

    expect(noStrong.signalState).toBe('no-strong');
    expect(noStrong.isWeakSignal).toBe(false);
    expect(noStrong.hasNoStrongProfile).toBe(true);
    expect(noStrong.profileComparison.outcome).toBe('no-strong');
  });

  test('marks partial diagnostics sections as missing with explicit notices', () => {
    const partialDiagnostics = buildContextDiagnostics({
      timestamps: crimesFixture.map((crime) => crime.timestamp),
      crimes: [],
      staticProfileName: 'All Crimes',
    });

    const metadata = buildSuggestionDiagnosticsMetadata(partialDiagnostics);

    expect(metadata.sections.temporal.status).toBe('available');
    expect(metadata.sections.spatial.status).toBe('missing');
    expect(metadata.sections.spatial.notice).toContain('Spatial diagnostics missing');
  });

  test('keeps ranking/order parity for identical inputs with diagnostics wiring', () => {
    const staticProfile = detectSmartProfile(contextFixture);

    const baseline = generateRankedAutoProposalSets({
      crimes: crimesFixture,
      context: {
        crimeTypes: contextFixture.crimeTypes,
        timeRange: contextFixture.timeRange,
        isFullDataset: contextFixture.isFullDataset,
        profileName: staticProfile?.name,
      },
      params: { warpCount: 3, snapToUnit: 'none' },
    });

    const diagnostics = buildContextDiagnostics({
      timestamps: crimesFixture.map((crime) => crime.timestamp),
      crimes: crimesFixture,
      staticProfileName: staticProfile?.name,
    });

    const withDiagnostics = generateRankedAutoProposalSets({
      crimes: crimesFixture,
      context: {
        crimeTypes: contextFixture.crimeTypes,
        timeRange: contextFixture.timeRange,
        isFullDataset: contextFixture.isFullDataset,
        profileName: staticProfile?.name,
      },
      params: { warpCount: 3, snapToUnit: 'none' },
    });

    expect(diagnostics.dynamicProfile.label.length).toBeGreaterThan(0);
    expect(withDiagnostics.sets.map((set) => ({ id: set.id, score: set.score.total }))).toEqual(
      baseline.sets.map((set) => ({ id: set.id, score: set.score.total }))
    );
  });
});
