/**
 * Dynamic Binning Engine
 * 
 * Uses rules and constraints to generate bins dynamically from time-series data.
 */

import { TimeBin } from './types';
import { 
  BinningStrategy, 
  BinningConfig, 
  BinningConstraint, 
  BinningResult,
  validateConstraints,
  mergeSmallBins 
} from './rules';

export interface CrimeEventData {
  timestamp: number;
  type: string;
  district?: string;
}

/**
 * Generate bins using dynamic strategy
 */
export function generateBins(
  data: CrimeEventData[],
  config: BinningConfig
): BinningResult {
  const { strategy, constraints, domain } = config;
  
  // Ensure domain is valid
  let timeDomain: [number, number];
  if (domain[0] !== domain[1]) {
    timeDomain = domain;
  } else {
    const minTime = Math.min(...data.map(d => d.timestamp));
    const maxTime = Math.max(...data.map(d => d.timestamp));
    timeDomain = [minTime, maxTime];
  }
  
  let bins: TimeBin[];
  
  switch (strategy) {
    case 'daytime-heavy':
      bins = generateDaytimeHeavyBins(data, timeDomain, constraints);
      break;
    case 'nighttime-heavy':
      bins = generateNighttimeHeavyBins(data, timeDomain, constraints);
      break;
    case 'crime-type-specific':
      bins = generateCrimeTypeBins(data, timeDomain, constraints);
      break;
    case 'burstiness':
      bins = generateBurstinessBins(data, timeDomain, constraints);
      break;
    case 'uniform-distribution':
      bins = generateUniformDistributionBins(data, timeDomain, constraints);
      break;
    case 'uniform-time':
      bins = generateUniformTimeBins(data, timeDomain, constraints);
      break;
    case 'weekday-weekend':
      bins = generateWeekdayWeekendBins(data, timeDomain, constraints);
      break;
    case 'quarter-hourly':
      bins = generateIntervalBins(data, timeDomain, 15 * 60 * 1000);
      break;
    case 'hourly':
      bins = generateIntervalBins(data, timeDomain, 60 * 60 * 1000);
      break;
    case 'daily':
      bins = generateIntervalBins(data, timeDomain, 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      bins = generateIntervalBins(data, timeDomain, 7 * 24 * 60 * 60 * 1000);
      break;
    case 'auto-adaptive':
      bins = generateAutoAdaptiveBins(data, timeDomain, constraints);
      break;
    case 'custom':
    default:
      bins = generateUniformDistributionBins(data, timeDomain, constraints);
  }
  
  // Apply constraints and post-process
  bins = postProcessBins(bins, constraints);
  
  return {
    bins,
    strategy,
    ruleApplied: strategy,
    metadata: {
      totalEvents: data.length,
      binCount: bins.length,
      timeSpan: timeDomain[1] - timeDomain[0],
      avgEventsPerBin: data.length / bins.length,
    },
  };
}

/**
 * Daytime heavy: 6am-6pm bins split from nighttime
 */
function generateDaytimeHeavyBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const hourMs = 3600000;
  
  // Split by daytime (6am-6pm) vs nighttime
  const daytime: CrimeEventData[] = [];
  const nighttime: CrimeEventData[] = [];
  
  for (const event of data) {
    const hour = new Date(event.timestamp).getHours();
    if (hour >= 6 && hour < 18) {
      daytime.push(event);
    } else {
      nighttime.push(event);
    }
  }
  
  // Generate sub-bins for daytime
  const bins: TimeBin[] = [];
  if (daytime.length > 0) {
    const timeDomain: [number, number] = [domain[0], domain[1]];
    const dayBins = generateIntervalBins(daytime, timeDomain, hourMs * 3); // 3-hour blocks
    bins.push(...dayBins.map(b => ({ ...b, id: `day-${b.id}` })));
  }
  
  // Generate sub-bins for nighttime
  if (nighttime.length > 0) {
    const timeDomain: [number, number] = [domain[0], domain[1]];
    const nightBins = generateIntervalBins(nighttime, timeDomain, hourMs * 4); // 4-hour blocks
    bins.push(...nightBins.map(b => ({ ...b, id: `night-${b.id}` })));
  }
  
  return bins.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Nighttime heavy: 6pm-6am bins split from daytime
 */
function generateNighttimeHeavyBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const hourMs = 3600000;
  
  const daytime: CrimeEventData[] = [];
  const nighttime: CrimeEventData[] = [];
  
  for (const event of data) {
    const hour = new Date(event.timestamp).getHours();
    if (hour >= 6 && hour < 18) {
      daytime.push(event);
    } else {
      nighttime.push(event);
    }
  }
  
  const bins: TimeBin[] = [];
  const timeDomain: [number, number] = [domain[0], domain[1]];
  
  if (nighttime.length > 0) {
    const nightBins = generateIntervalBins(nighttime, timeDomain, hourMs * 3);
    bins.push(...nightBins.map(b => ({ ...b, id: `night-${b.id}` })));
  }
  
  if (daytime.length > 0) {
    const dayBins = generateIntervalBins(daytime, timeDomain, hourMs * 4);
    bins.push(...dayBins.map(b => ({ ...b, id: `day-${b.id}` })));
  }
  
  return bins.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Crime type specific: cluster by crime type
 */
function generateCrimeTypeBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const typeGroups = new Map<string, CrimeEventData[]>();
  
  for (const event of data) {
    const group = typeGroups.get(event.type) || [];
    group.push(event);
    typeGroups.set(event.type, group);
  }
  
  const bins: TimeBin[] = [];
  let binIndex = 0;
  
  for (const [type, events] of Array.from(typeGroups.entries())) {
    if (events.length < (constraints.minEvents || 1)) continue;
    
    const sorted = events.sort((a, b) => a.timestamp - b.timestamp);
    const startTime = sorted[0].timestamp;
    const endTime = sorted[sorted.length - 1].timestamp;
    const avgTimestamp = sorted.reduce((sum, e) => sum + e.timestamp, 0) / sorted.length;
    
    bins.push({
      id: `type-${binIndex++}`,
      startTime,
      endTime,
      count: events.length,
      crimeTypes: [type],
      districts: Array.from(new Set(events.map(e => e.district).filter(Boolean))) as string[],
      avgTimestamp,
    });
  }
  
  return bins.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Burstiness: split based on inter-arrival times
 */
function generateBurstinessBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const bins: TimeBin[] = [];
  
  if (sorted.length === 0) return [];
  
  let currentBin: CrimeEventData[] = [sorted[0]];
  const burstThreshold = constraints.maxEvents || 100;
  const minGap = constraints.minTimeSpan || 3600000; // 1 hour default
  
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    
    if (gap > minGap || currentBin.length >= burstThreshold) {
      // Start new bin
      bins.push(createBinFromEvents(currentBin, bins.length));
      currentBin = [sorted[i]];
    } else {
      currentBin.push(sorted[i]);
    }
  }
  
  // Don't forget last bin
  if (currentBin.length > 0) {
    bins.push(createBinFromEvents(currentBin, bins.length));
  }
  
  return bins;
}

/**
 * Uniform distribution: equal events per bin
 */
function generateUniformDistributionBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const maxBins = constraints.maxBins || 40;
  const eventsPerBin = Math.max(1, Math.ceil(sorted.length / maxBins));
  
  const bins: TimeBin[] = [];
  
  for (let i = 0; i < sorted.length; i += eventsPerBin) {
    const chunk = sorted.slice(i, i + eventsPerBin);
    if (chunk.length > 0) {
      bins.push(createBinFromEvents(chunk, bins.length));
    }
  }
  
  return bins;
}

/**
 * Uniform time: equal time spans
 */
function generateUniformTimeBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const maxBins = constraints.maxBins || 40;
  const [start, end] = domain;
  const binSpan = (end - start) / maxBins;
  
  return generateIntervalBins(data, domain, binSpan);
}

/**
 * Weekday vs weekend separation
 */
function generateWeekdayWeekendBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const weekday: CrimeEventData[] = [];
  const weekend: CrimeEventData[] = [];
  
  for (const event of data) {
    const day = new Date(event.timestamp).getDay();
    if (day === 0 || day === 6) {
      weekend.push(event);
    } else {
      weekday.push(event);
    }
  }
  
  const bins: TimeBin[] = [];
  
  if (weekday.length > 0) {
    const dayBins = generateUniformDistributionBins(weekday, domain, constraints);
    bins.push(...dayBins.map(b => ({ ...b, id: `weekday-${b.id}` })));
  }
  
  if (weekend.length > 0) {
    const endBins = generateUniformDistributionBins(weekend, domain, constraints);
    bins.push(...endBins.map(b => ({ ...b, id: `weekend-${b.id}` })));
  }
  
  return bins.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Fixed interval bins (hourly, daily, etc)
 */
function generateIntervalBins(
  data: CrimeEventData[],
  domain: [number, number],
  intervalMs: number
): TimeBin[] {
  const bins: Map<number, CrimeEventData[]> = new Map();
  
  for (const event of data) {
    const binStart = Math.floor(event.timestamp / intervalMs) * intervalMs;
    const binEvents = bins.get(binStart) || [];
    binEvents.push(event);
    bins.set(binStart, binEvents);
  }
  
  const result: TimeBin[] = [];
  let index = 0;
  
  for (const [startTime, events] of Array.from(bins.entries())) {
    result.push(createBinFromEvents(events, index++));
  }
  
  return result.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Auto-adaptive: detect best strategy based on data
 */
function generateAutoAdaptiveBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  // Analyze data characteristics
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate burstiness (variance in inter-arrival times)
  let totalGap = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i].timestamp - sorted[i - 1].timestamp;
    gapCount++;
  }
  const avgGap = gapCount > 0 ? totalGap / gapCount : 0;
  
  // Calculate variance
  let variance = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    variance += Math.pow(gap - avgGap, 2);
  }
  variance = gapCount > 0 ? variance / gapCount : 0;
  const cv = avgGap > 0 ? Math.sqrt(variance) / avgGap : 0; // Coefficient of variation
  
  // Choose strategy based on characteristics
  if (cv > 2) {
    // High burstiness - use burstiness strategy
    return generateBurstinessBins(data, domain, constraints);
  } else if (sorted.length > 1000) {
    // Large dataset - use uniform distribution
    return generateUniformDistributionBins(data, domain, constraints);
  } else {
    // Default to uniform time
    return generateUniformTimeBins(data, domain, constraints);
  }
}

/**
 * Helper: create TimeBin from event array
 */
function createBinFromEvents(events: CrimeEventData[], index: number): TimeBin {
  const sorted = events.sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  
  return {
    id: `bin-${index}`,
    startTime,
    endTime,
    count: events.length,
    crimeTypes: Array.from(new Set(events.map(e => e.type))),
    districts: Array.from(new Set(events.map(e => e.district).filter(Boolean))) as string[],
    avgTimestamp: events.reduce((sum, e) => sum + e.timestamp, 0) / events.length,
  };
}

/**
 * Post-process bins: apply constraints and merge small bins
 */
function postProcessBins(bins: TimeBin[], constraints: BinningConstraint): TimeBin[] {
  let result = [...bins];
  
  // Validate constraints
  const validation = validateConstraints(result, constraints);
  if (!validation.valid && constraints.maxBins) {
    // Try to fix by merging small bins
    result = mergeSmallBins(result, constraints.minEvents || 1, constraints.maxBins);
  }
  
  // Remove bins that don't meet minEvents
  if (constraints.minEvents) {
    result = result.filter(b => b.count >= constraints.minEvents!);
  }
  
  // Ensure max bins
  if (constraints.maxBins && result.length > constraints.maxBins) {
    result = result.slice(0, constraints.maxBins);
  }
  
  return result;
}