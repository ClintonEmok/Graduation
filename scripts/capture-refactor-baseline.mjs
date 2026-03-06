#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const baselinePath = path.join(repoRoot, '.planning', 'baselines', '46-guardrails-baseline.json');
const trackedFiles = [
  'src/components/timeline/DualTimeline.tsx',
  'src/hooks/useCrimeData.ts',
  'src/lib/queries.ts',
];

const epochSecondsToNormalized = (epochSeconds, minEpochSeconds, maxEpochSeconds) => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return ((epochSeconds - minEpochSeconds) / span) * 100;
};

const normalizedToEpochSeconds = (normalized, minEpochSeconds, maxEpochSeconds) => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return minEpochSeconds + (normalized / 100) * span;
};

const findNearestIndexByTime = (timestampsSec, targetSec) => {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < timestampsSec.length; i += 1) {
    const distance = Math.abs(timestampsSec[i] - targetSec);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const benchmark = (name, iterations, execute) => {
  const runCount = 7;
  const runDurationsMs = [];

  execute(-1);

  for (let run = 0; run < runCount; run += 1) {
    const startNs = process.hrtime.bigint();
    for (let i = 0; i < iterations; i += 1) {
      execute(i);
    }
    const elapsedNs = Number(process.hrtime.bigint() - startNs);
    runDurationsMs.push(elapsedNs / 1e6);
  }

  const medianMs = median(runDurationsMs);
  return {
    name,
    iterations,
    runs: runCount,
    medianMs: Number(medianMs.toFixed(3)),
    minMs: Number(Math.min(...runDurationsMs).toFixed(3)),
    maxMs: Number(Math.max(...runDurationsMs).toFixed(3)),
    nsPerIteration: Number(((medianMs * 1e6) / iterations).toFixed(2)),
  };
};

const formatDelta = (current, previous) => {
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff}`;
};

const collectFileMetrics = async () => {
  const result = {};
  for (const relPath of trackedFiles) {
    const absPath = path.join(repoRoot, relPath);
    const content = await readFile(absPath, 'utf8');
    const lineCount = content.split(/\r?\n/).length;
    const bytes = Buffer.byteLength(content, 'utf8');
    result[relPath] = { lines: lineCount, bytes };
  }
  return result;
};

const collectTimingMetrics = () => {
  const totalPoints = 50000;
  const startEpoch = 978307200;
  const endEpoch = 1767225600;
  const span = endEpoch - startEpoch;
  const timestamps = new Float64Array(totalPoints);
  for (let i = 0; i < totalPoints; i += 1) {
    timestamps[i] = startEpoch + (i / (totalPoints - 1)) * span;
  }

  const targetCount = 1200;
  const targets = new Float64Array(targetCount);
  for (let i = 0; i < targetCount; i += 1) {
    const ratio = ((i * 7919) % 10000) / 9999;
    targets[i] = startEpoch + ratio * span;
  }

  const selectionLookup = benchmark('selection.nearestIndexByTime.linearScan', targetCount, (iteration) => {
    const idx = iteration < 0 ? 0 : iteration % targetCount;
    return findNearestIndexByTime(timestamps, targets[idx]);
  });

  const toNormalized = benchmark('timeDomain.epochSecondsToNormalized', 250000, (iteration) => {
    const value = startEpoch + ((iteration % 50000) / 50000) * span;
    return epochSecondsToNormalized(value, startEpoch, endEpoch);
  });

  const toEpoch = benchmark('timeDomain.normalizedToEpochSeconds', 250000, (iteration) => {
    const value = (iteration % 10000) / 100;
    return normalizedToEpochSeconds(value, startEpoch, endEpoch);
  });

  return {
    selectionLookup,
    epochSecondsToNormalized: toNormalized,
    normalizedToEpochSeconds: toEpoch,
    dataset: {
      selectionPoints: totalPoints,
      selectionTargets: targetCount,
      domainStartEpoch: startEpoch,
      domainEndEpoch: endEpoch,
    },
  };
};

const loadExistingSnapshot = async () => {
  try {
    const raw = await readFile(baselinePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const printSummary = (snapshot, previous) => {
  console.log(`Refactor baseline for ${snapshot.planId}`);
  console.log(`Captured at: ${snapshot.capturedAt}`);
  console.log('');
  console.log('File metrics:');
  for (const relPath of trackedFiles) {
    const metrics = snapshot.fileMetrics[relPath];
    const prev = previous?.fileMetrics?.[relPath];
    const lineDelta = prev ? ` (${formatDelta(metrics.lines, prev.lines)} vs previous)` : '';
    const byteDelta = prev ? ` (${formatDelta(metrics.bytes, prev.bytes)} vs previous)` : '';
    console.log(`- ${relPath}: ${metrics.lines} lines${lineDelta}, ${metrics.bytes} bytes${byteDelta}`);
  }
  console.log('');
  console.log('Timing metrics (median):');
  for (const [key, metric] of Object.entries(snapshot.timingMetrics)) {
    if (key === 'dataset') continue;
    const prev = previous?.timingMetrics?.[key];
    const delta = prev ? ` (${formatDelta(metric.medianMs, prev.medianMs)} ms vs previous)` : '';
    console.log(`- ${metric.name}: ${metric.medianMs} ms${delta}, ${metric.nsPerIteration} ns/iter`);
  }
  console.log('');
  console.log('Run with --write to persist this snapshot.');
};

const main = async () => {
  const shouldWrite = process.argv.includes('--write');
  const previous = await loadExistingSnapshot();
  const fileMetrics = await collectFileMetrics();
  const timingMetrics = collectTimingMetrics();

  const snapshot = {
    planId: '46-01',
    capturedAt: new Date().toISOString(),
    command: 'node scripts/capture-refactor-baseline.mjs --write',
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    fileMetrics,
    timingMetrics,
  };

  if (shouldWrite) {
    await writeFile(baselinePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`Wrote baseline snapshot to ${path.relative(repoRoot, baselinePath)}`);
  }

  printSummary(snapshot, previous);
};

main().catch((error) => {
  console.error('Failed to capture baseline:', error);
  process.exitCode = 1;
});
