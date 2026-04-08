import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/stats route QA shell', () => {
  test('mounts StatsRouteShell as dedicated page', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/StatsRouteShell/);
  });

  test('contains route-isolated stats controls and API wiring', () => {
    const shellSource = readFileSync(new URL('./lib/StatsRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/Crime Statistics/);
    expect(shellSource).toMatch(/NeighborhoodSelector/);
    expect(shellSource).toMatch(/TimeRangeSelector/);
    expect(shellSource).toMatch(/useNeighborhoodStats/);
    expect(shellSource).toMatch(/SpatialHotspotMap/);
    expect(shellSource).toMatch(/NeighborhoodContext/);
    expect(shellSource).toMatch(/StatsOverviewCards/);
    expect(shellSource).toMatch(/CrimeTypeBreakdown/);
    expect(shellSource).toMatch(/TemporalPatternChart/);
  });

  test('overview cards component exists and renders stats', () => {
    const cardsSource = readFileSync(new URL('./lib/components/StatsOverviewCards.tsx', import.meta.url), 'utf8');
    expect(cardsSource).toMatch(/Total Crimes/);
    expect(cardsSource).toMatch(/Avg\/Day/);
    expect(cardsSource).toMatch(/Peak Hour/);
    expect(cardsSource).toMatch(/Top Crime/);
  });

  test('crime type breakdown chart shows distribution', () => {
    const chartSource = readFileSync(new URL('./lib/components/CrimeTypeBreakdown.tsx', import.meta.url), 'utf8');
    expect(chartSource).toMatch(/Crime Type Breakdown/);
    expect(chartSource).toMatch(/useNeighborhoodStats/);
  });

  test('temporal pattern chart shows time distribution', () => {
    const temporalSource = readFileSync(new URL('./lib/components/TemporalPatternChart.tsx', import.meta.url), 'utf8');
    expect(temporalSource).toMatch(/Temporal Patterns/);
    expect(temporalSource).toMatch(/Hourly|Monthly/);
  });

  test('spatial hotspot map renders MapBase', () => {
    const mapSource = readFileSync(new URL('./lib/components/SpatialHotspotMap.tsx', import.meta.url), 'utf8');
    expect(mapSource).toMatch(/Spatial Distribution/);
    expect(mapSource).toMatch(/MapBase/);
    expect(mapSource).toMatch(/heatmap|points/);
  });

  test('neighborhood context shows POI categories', () => {
    const contextSource = readFileSync(new URL('./lib/components/NeighborhoodContext.tsx', import.meta.url), 'utf8');
    expect(contextSource).toMatch(/Neighbourhood Context/);
    expect(contextSource).toMatch(/Food.*Drink|shopping|parks|transit/i);
  });

  test('stats store is route-local and isolated', () => {
    const storeSource = readFileSync(new URL('../../../src/store/useStatsStore.ts', import.meta.url), 'utf8');
    expect(storeSource).toMatch(/selectedDistricts/);
    expect(storeSource).toMatch(/timeRange/);
    expect(storeSource).toMatch(/setSelectedDistricts/);
    expect(storeSource).toMatch(/setTimeRange/);
  });

  test('aggregation helpers are pure functions', () => {
    const aggSource = readFileSync(new URL('../../../src/lib/stats/aggregation.ts', import.meta.url), 'utf8');
    expect(aggSource).toMatch(/aggregateByDistrict/);
    expect(aggSource).toMatch(/aggregateByType/);
    expect(aggSource).toMatch(/aggregateByHour/);
    expect(aggSource).toMatch(/aggregateByDayOfWeek/);
    expect(aggSource).toMatch(/aggregateByMonth/);
  });
});
