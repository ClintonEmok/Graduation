import { useMemo } from 'react';
import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';
import { computeBinningStrategyStats } from './strategy-stats';

interface TimeslicingAlgosStrategyStatsProps {
  timestamps: number[];
  domain: [number, number];
  selectedStrategy: AdaptiveBinningMode;
}

const formatSeconds = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0s';
  if (value < 60) return `${value.toFixed(1)}s`;
  if (value < 3600) return `${(value / 60).toFixed(1)}m`;
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`;
  return `${(value / 86400).toFixed(1)}d`;
};

const STRATEGY_LABEL: Record<AdaptiveBinningMode, string> = {
  'uniform-time': 'Uniform Time',
  'uniform-events': 'Uniform Events',
};

export function TimeslicingAlgosStrategyStats({
  timestamps,
  domain,
  selectedStrategy,
}: TimeslicingAlgosStrategyStatsProps) {
  const stats = useMemo(
    () => computeBinningStrategyStats(timestamps, domain),
    [domain[0], domain[1], timestamps],
  );

  return (
    <section className="mt-4 rounded-lg border border-slate-700/70 bg-slate-950/50 p-4" data-testid="strategy-stats-widget">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Binning strategy stats</h3>
        <span className="text-[11px] text-slate-500">96 bins per strategy</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {stats.map((entry) => {
          const isSelected = entry.strategy === selectedStrategy;
          return (
            <article
              key={entry.strategy}
              className={`rounded-md border p-3 ${
                isSelected
                  ? 'border-emerald-400/60 bg-emerald-500/10'
                  : 'border-slate-700/80 bg-slate-900/60'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-100">{STRATEGY_LABEL[entry.strategy]}</h4>
                {isSelected ? (
                  <span className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                    Active
                  </span>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-400">Events</dt>
                  <dd className="font-medium text-slate-100">{entry.totalEvents.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Max/bin</dt>
                  <dd className="font-medium text-slate-100">{entry.maxBinEvents.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Mean/bin</dt>
                  <dd className="font-medium text-slate-100">{entry.meanBinEvents.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Variance/bin</dt>
                  <dd className="font-medium text-slate-100">{entry.varianceBinEvents.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Empty bins</dt>
                  <dd className="font-medium text-slate-100">
                    {entry.emptyBins} / {entry.emptyBins + entry.nonEmptyBins}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Median width</dt>
                  <dd className="font-medium text-slate-100">{formatSeconds(entry.medianBinWidthSec)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Width range</dt>
                  <dd className="font-medium text-slate-100">
                    {formatSeconds(entry.minBinWidthSec)} - {formatSeconds(entry.maxBinWidthSec)}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
