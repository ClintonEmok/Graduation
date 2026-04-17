"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Gauge, Orbit, TimerReset } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { toEpochSeconds } from '@/lib/time-domain';
import {
  buildNonUniformDraftBinsFromSelection,
  partitionSelectionByGranularity,
  type DemoSelectionGranularity,
} from '@/components/dashboard-demo/lib/demo-burst-generation';
import {
  buildSelectionRangeFromDateHourInputs,
  formatSelectionDateInput,
  formatSelectionHourInput,
} from './selection';

type ScenarioKey = 'clustered' | 'balanced' | 'sparse';
type SelectionMode = 'auto' | 'manual';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SCENARIOS: Record<ScenarioKey, { label: string; description: string }> = {
  clustered: {
    label: 'Clustered peak',
    description: 'The route locks onto the densest real-data window and expands it more aggressively.',
  },
  balanced: {
    label: 'Even spread',
    description: 'The selected window stays close to the dataset’s median inter-event spacing, so the coefficient stays mostly neutral.',
  },
  sparse: {
    label: 'Sparse brush',
    description: 'The helper finds a lighter real-data window and still preserves exact coverage.',
  },
};

const granularityLabels: Record<DemoSelectionGranularity, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
};

const padHour = (hour: number): string => String(hour).padStart(2, '0');

const hourOptions = Array.from({ length: 24 }, (_, hour) => padHour(hour));

const formatDateTime = (value: number): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatDuration = (milliseconds: number): string => {
  const hours = milliseconds / (60 * 60 * 1000);
  if (hours >= 24) {
    return `${Math.round(hours / 24)}d`;
  }
  if (hours >= 1) {
    return `${hours.toFixed(hours >= 4 ? 0 : 1)}h`;
  }
  return `${Math.round(milliseconds / (60 * 1000))}m`;
};

const formatWarpWeight = (value: number | undefined): string => (typeof value === 'number' ? value.toFixed(2) : '1.00');

const formatBurstinessCoefficient = (value: number | undefined): string => (typeof value === 'number' ? value.toFixed(2) : '0.00');

const formatBurstinessState = (value: number | undefined): string => {
  if (!Number.isFinite(value)) {
    return 'neutral';
  }

  if ((value ?? 0) > 0) {
    return 'bursty';
  }

  if ((value ?? 0) < 0) {
    return 'regular';
  }

  return 'neutral';
};

const formatBurstCalculation = (value: string | undefined): string => value ?? 'No calculation available';

const buildTimestampSeconds = (
  timestamps: Float32Array | null,
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
): number[] => {
  if (!timestamps || minTimestampSec === null || maxTimestampSec === null || timestamps.length === 0) {
    return [];
  }

  const result = new Array<number>(timestamps.length);
  for (let i = 0; i < timestamps.length; i += 1) {
    result[i] = toEpochSeconds(timestamps[i]) * 1000;
  }

  return result.sort((left, right) => left - right);
};

const pickScenarioWindow = (
  timestamps: number[],
  scenario: ScenarioKey,
  granularity: DemoSelectionGranularity,
): [number, number] | null => {
  if (timestamps.length === 0) {
    return null;
  }

  const spanMs = granularity === 'hourly' ? 48 * HOUR_MS : 10 * DAY_MS;
  const minTimestamp = timestamps[0];
  const maxTimestamp = timestamps[timestamps.length - 1];
  if (!Number.isFinite(minTimestamp) || !Number.isFinite(maxTimestamp)) {
    return null;
  }

  if (maxTimestamp <= minTimestamp) {
    return [minTimestamp, maxTimestamp + HOUR_MS];
  }

  const windows: Array<{ start: number; end: number; count: number }> = [];
  let endIndex = 0;

  for (let startIndex = 0; startIndex < timestamps.length; startIndex += 1) {
    const windowStart = timestamps[startIndex];
    const windowEnd = Math.min(windowStart + spanMs, maxTimestamp);

    while (endIndex < timestamps.length && timestamps[endIndex] <= windowEnd) {
      endIndex += 1;
    }

    const count = Math.max(0, endIndex - startIndex);
    if (windowEnd > windowStart) {
      windows.push({ start: windowStart, end: windowEnd, count });
    }
  }

  if (windows.length === 0) {
    return [minTimestamp, Math.min(maxTimestamp, minTimestamp + spanMs)];
  }

  const counts = windows.map((window) => window.count).sort((left, right) => left - right);
  const medianCount = counts[Math.floor(counts.length / 2)] ?? 0;

  const pickWindow = (compare: (window: { start: number; end: number; count: number }) => number) =>
    windows.reduce((best, current) => (compare(current) < compare(best) ? current : best), windows[0]);

  const selectedWindow = scenario === 'clustered'
    ? windows.reduce((best, current) => (current.count > best.count ? current : best), windows[0])
    : scenario === 'sparse'
      ? windows
        .filter((window) => window.count > 0)
        .reduce((best, current) => (current.count < best.count ? current : best), windows.find((window) => window.count > 0) ?? windows[0])
      : pickWindow((window) => Math.abs(window.count - medianCount));

  if (!selectedWindow) {
    return [minTimestamp, Math.min(maxTimestamp, minTimestamp + spanMs)];
  }

  return [selectedWindow.start, selectedWindow.end];
};

export function NonUniformTimeSlicingShowcase() {
  const [granularity, setGranularity] = useState<DemoSelectionGranularity>('daily');
  const [scenario, setScenario] = useState<ScenarioKey>('clustered');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('auto');
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('00');
  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState('00');
  const loadRealData = useTimelineDataStore((state) => state.loadRealData);
  const columns = useTimelineDataStore((state) => state.columns);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const isLoading = useTimelineDataStore((state) => state.isLoading);
  const isMock = useTimelineDataStore((state) => state.isMock);
  const dataCount = useTimelineDataStore((state) => state.dataCount);

  useEffect(() => {
    void loadRealData();
  }, [loadRealData]);

  const eventTimestamps = useMemo(
    () => buildTimestampSeconds(columns?.timestamp ?? null, minTimestampSec, maxTimestampSec),
    [columns, maxTimestampSec, minTimestampSec]
  );

  const autoSelectionRange = useMemo(
    () => pickScenarioWindow(eventTimestamps, scenario, granularity),
    [eventTimestamps, granularity, scenario]
  );

  const manualSelectionRange = useMemo(
    () => buildSelectionRangeFromDateHourInputs(startDate, startHour, endDate, endHour),
    [endDate, endHour, startDate, startHour]
  );

  const selectionRange = selectionMode === 'manual' ? manualSelectionRange : autoSelectionRange;
  const selectionWarning = selectionMode === 'manual' && !manualSelectionRange
    ? 'Pick an end date/time after the start date/time.'
    : null;

  const result = useMemo(
    () =>
      selectionWarning
        ? {
            bins: [],
            eventCount: 0,
            warning: selectionWarning,
          }
        : selectionRange
        ? buildNonUniformDraftBinsFromSelection({
            crimeTypes: ['all-crime-types'],
            neighbourhood: 'Demo corridor',
            timeWindow: {
              start: selectionRange[0],
              end: selectionRange[1],
            },
            granularity,
            eventTimestamps,
          })
        : {
            bins: [],
            eventCount: 0,
            warning: 'Loading real crime data before building the demo route.',
          },
    [eventTimestamps, granularity, selectionRange, selectionWarning]
  );

  const partitions = useMemo(
    () => (selectionRange ? partitionSelectionByGranularity(selectionRange, granularity) : []),
    [granularity, selectionRange]
  );

  const coverageMs = result.bins.reduce((sum, bin) => sum + (bin.endTime - bin.startTime), 0);
  const selectionMs = selectionRange ? selectionRange[1] - selectionRange[0] : 0;
  const dominantBin = result.bins.reduce((best, bin) => {
    if (!best) return bin;
    return (bin.warpWeight ?? 1) > (best.warpWeight ?? 1) ? bin : best;
  }, result.bins[0] ?? null);
  const burstinessFormula = result.bins[0]?.burstinessFormula ?? 'B = (σ - μ) / (σ + μ)';
  const neutralFallback = result.bins.every((bin) => bin.isNeutralPartition);
  const datasetLabel = isLoading ? 'Loading real crime stream' : isMock ? 'Mock data fallback' : 'Real crime stream';
  const datasetCountLabel = typeof dataCount === 'number' ? `${dataCount.toLocaleString()} records` : 'Record count pending';
  const selectionLabel = selectionRange
    ? `${formatDateTime(selectionRange[0])} → ${formatDateTime(selectionRange[1])}`
    : 'Waiting for real data';
  const selectionSourceLabel = selectionMode === 'manual' ? 'Manual date/hour selection' : 'Auto-picked from real data';

  const useManualSelection = () => {
    if (autoSelectionRange) {
      setStartDate(formatSelectionDateInput(autoSelectionRange[0]));
      setStartHour(formatSelectionHourInput(autoSelectionRange[0]));
      setEndDate(formatSelectionDateInput(autoSelectionRange[1]));
      setEndHour(formatSelectionHourInput(autoSelectionRange[1]));
    }

    setSelectionMode('manual');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-12 pt-8 sm:px-10 lg:px-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit rounded-full border-white/10 bg-white/10 px-3 py-1 text-slate-50">
                Demo route
              </Badge>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Non-uniform time slicing</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">{datasetLabel} · {datasetCountLabel}</p>
            </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
              <Link href="/dashboard-demo">Open dashboard demo</Link>
            </Button>
            <Button asChild className="rounded-full bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400">
              <Link href="/docs">
                Route atlas
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.05em] text-slate-50 sm:text-6xl lg:text-7xl">
                Partition the brush, then let burstiness shape the warp.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This route showcases the new helper directly: a brushed interval is cut into fixed hourly or daily bins,
                scored per bin from inter-event timing, and expanded non-uniformly without dropping sparse coverage.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader className="space-y-2 pb-3">
                  <CardDescription className="text-slate-400">Selection span</CardDescription>
                  <CardTitle className="text-2xl text-slate-50">{formatDuration(selectionMs)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader className="space-y-2 pb-3">
                  <CardDescription className="text-slate-400">Partitions</CardDescription>
                  <CardTitle className="text-2xl text-slate-50">{partitions.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader className="space-y-2 pb-3">
                  <CardDescription className="text-slate-400">Neutral fallback</CardDescription>
                  <CardTitle className="text-2xl text-slate-50">{neutralFallback ? 'Yes' : 'No'}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-white/10 bg-[#07101c]/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <CardHeader className="space-y-3 border-b border-white/10 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardDescription className="text-slate-400">Live helper output</CardDescription>
                    <CardTitle className="mt-1 text-xl text-slate-50">{SCENARIOS[scenario].label}</CardTitle>
                  </div>
                  <Badge className="rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
                    {granularityLabels[granularity]} partitions
                  </Badge>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">{SCENARIOS[scenario].description}</p>
                <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="uppercase tracking-[0.24em] text-slate-500">Start date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => {
                        setSelectionMode('manual');
                        setStartDate(event.target.value);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="uppercase tracking-[0.24em] text-slate-500">Start hour</span>
                    <select
                      value={startHour}
                      onChange={(event) => {
                        setSelectionMode('manual');
                        setStartHour(event.target.value);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400/60"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="uppercase tracking-[0.24em] text-slate-500">End date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => {
                        setSelectionMode('manual');
                        setEndDate(event.target.value);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="uppercase tracking-[0.24em] text-slate-500">End hour</span>
                    <select
                      value={endHour}
                      onChange={(event) => {
                        setSelectionMode('manual');
                        setEndHour(event.target.value);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400/60"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={selectionMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => setSelectionMode('auto')}
                      className="rounded-full"
                    >
                      Auto-pick from data
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useManualSelection}
                      className="rounded-full"
                    >
                      Use date/hour selection
                    </Button>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-300">
                  <p className="uppercase tracking-[0.24em] text-slate-500">Burstiness formula</p>
                  <p className="mt-2 font-mono text-slate-100">{burstinessFormula}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="flex flex-wrap gap-2">
                  <Tabs value={granularity} onValueChange={(value) => setGranularity(value as DemoSelectionGranularity)}>
                    <TabsList className="grid w-fit grid-cols-2 rounded-full bg-white/5 p-1">
                      <TabsTrigger value="daily" className="rounded-full px-4">Daily</TabsTrigger>
                      <TabsTrigger value="hourly" className="rounded-full px-4">Hourly</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SCENARIOS).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setScenario(key as ScenarioKey)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          scenario === key
                            ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {result.bins.map((bin, index) => {
                    const duration = bin.endTime - bin.startTime;
                    const width = Math.max(18, Math.min(100, ((bin.warpWeight ?? 1) / 1.8) * 100));
                    return (
                      <div key={bin.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-100">
                              {index + 1}. {formatDateTime(bin.startTime)} → {formatDateTime(bin.endTime)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                              {formatDuration(duration)} · {bin.count} event{bin.count === 1 ? '' : 's'}
                            </p>
                          </div>
                          <Badge className={`rounded-full ${bin.isNeutralPartition ? 'bg-slate-500/15 text-slate-200' : 'bg-cyan-400/15 text-cyan-100'}`}>
                            {bin.burstClass ?? 'neutral'}
                          </Badge>
                        </div>

                        <div className="mt-4 h-3 rounded-full bg-slate-900/80">
                          <div
                            className={`h-full rounded-full ${bin.isNeutralPartition ? 'bg-slate-500' : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400'}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">warp {formatWarpWeight(bin.warpWeight)}</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">burstiness {formatBurstinessCoefficient(bin.burstinessCoefficient)}</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">state {formatBurstinessState(bin.burstinessCoefficient)}</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">confidence {bin.burstConfidence ?? 0}</span>
                          {bin.isNeutralPartition ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">neutral fallback</span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/15 p-3 text-xs text-slate-300">
                          <div className="flex items-start justify-between gap-3">
                            <span className="uppercase tracking-[0.24em] text-slate-500">Formula</span>
                            <span className="text-right font-mono text-slate-200">{bin.burstinessFormula ?? burstinessFormula}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="uppercase tracking-[0.24em] text-slate-500">Calculation</span>
                            <span className="text-right font-mono text-slate-200">{formatBurstCalculation(bin.burstinessCalculation)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader className="space-y-3 pb-4">
                <div className="flex items-center gap-2 text-cyan-100">
                  <Orbit className="size-4" />
                  <CardDescription className="text-cyan-100/80">What this shows</CardDescription>
                </div>
                <CardTitle className="text-xl text-slate-50">Coverage first, warp second</CardTitle>
                <CardDescription className="text-slate-300">
                  The brush is fully covered; burstiness only decides which partitions expand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                  <p>Hourly and daily bins are generated from the same brushed interval.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Gauge className="mt-0.5 size-4 shrink-0 text-fuchsia-300" />
                  <p>Positive burstiness means bursty, negative means regular, and the route shows the formula plus each bin’s calculation.</p>
                </div>
                <div className="flex items-start gap-3">
                  <TimerReset className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  <p>When no bin stands out, the route still returns a neutral partition set.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0a1220]/95 backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <CardDescription className="text-slate-400">Selection window</CardDescription>
                <CardTitle className="text-lg text-slate-50">{selectionLabel}</CardTitle>
                <CardDescription className="text-slate-400">{selectionSourceLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Events inside brush</span>
                  <span className="font-medium text-slate-50">{result.eventCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Covered duration</span>
                  <span className="font-medium text-slate-50">{formatDuration(coverageMs)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Exact coverage</span>
                  <span className="font-medium text-slate-50">{coverageMs === selectionMs ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Data source</span>
                  <span className="font-medium text-slate-50">{datasetLabel}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Dominant partition</p>
                  <p className="text-base font-medium text-slate-100">
                    {dominantBin ? `${formatDateTime(dominantBin.startTime)} → ${formatDateTime(dominantBin.endTime)}` : 'None'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400">
                <Link href="/dashboard-demo">
                  Open the demo shell
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
