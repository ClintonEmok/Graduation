import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';
import type { AdaptiveBinDiagnosticRow } from './adaptive-bin-diagnostics';
import type { SelectionDetailFallbackReason } from './selection-detail-dataset';

interface AdaptiveBinDiagnosticsPanelProps {
  rows: AdaptiveBinDiagnosticRow[];
  selectedStrategy: AdaptiveBinningMode;
  selectedTimeScale: 'linear' | 'adaptive';
  domain: [number, number];
  diagnosticsSource: 'selection' | 'context';
  diagnosticsSourcePreference: 'selection' | 'context';
  onDiagnosticsSourcePreferenceChange: (source: 'selection' | 'context') => void;
  selectionUsed: boolean;
  fallbackToContextReason: SelectionDetailFallbackReason | null;
  selectionPopulation: {
    rawSelectionCount: number;
    returnedCount: number;
    totalMatches: number;
    sampled: boolean;
    sampleStride: number | null;
    fullPopulation: boolean;
  };
}

const fallbackReasonLabel: Record<SelectionDetailFallbackReason, string> = {
  'selection-fetch-error': 'selection fetch failed',
  'selection-empty': 'selection returned no records',
  'selection-exceeded-safety-threshold': 'selection exceeded safety threshold',
};

const formatDateTime = (value: number): string => new Date(value * 1000).toLocaleString();

const formatSeconds = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0s';
  if (value < 60) return `${value.toFixed(1)}s`;
  if (value < 3600) return `${(value / 60).toFixed(1)}m`;
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`;
  return `${(value / 86400).toFixed(2)}d`;
};

const formatRatio = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function AdaptiveBinDiagnosticsPanel({
  rows,
  selectedStrategy,
  selectedTimeScale,
  domain,
  diagnosticsSource,
  diagnosticsSourcePreference,
  onDiagnosticsSourcePreferenceChange,
  selectionUsed,
  fallbackToContextReason,
  selectionPopulation,
}: AdaptiveBinDiagnosticsPanelProps) {
  const totalEvents = rows.reduce((sum, row) => sum + row.rawCount, 0);
  const domainSpanSec = Math.max(0, domain[1] - domain[0]);
  const selectionPopulationLabel = selectionPopulation.fullPopulation ? 'full' : 'sampled';

  return (
    <section
      className="mt-4 rounded-lg border border-slate-700/70 bg-slate-950/50 p-4"
      data-testid="adaptive-bin-diagnostics-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Adaptive bin diagnostics
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Passive QA view of current bin boundaries, normalized density, adaptiveMultiplier, and warp impact.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5">
            Strategy: {selectedStrategy}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5">
            Interaction: {selectedTimeScale}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5">
            Domain span: {formatSeconds(domainSpanSec)}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5">
            Events: {totalEvents.toLocaleString()}
          </span>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-950/30 px-2 py-0.5 text-indigo-100">
            Diagnostics source: {diagnosticsSource}
          </span>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-950/30 px-2 py-0.5 text-indigo-100">
            Selection usage: {selectionUsed ? 'selection dataset' : 'context fallback'}
          </span>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-950/30 px-2 py-0.5 text-indigo-100">
            Selection dataset: {selectionPopulationLabel} ({selectionPopulation.returnedCount.toLocaleString()}/{selectionPopulation.totalMatches.toLocaleString()})
          </span>
          {selectionPopulation.sampleStride ? (
            <span className="rounded-full border border-indigo-500/40 bg-indigo-950/30 px-2 py-0.5 text-indigo-100">
              Selection stride: {selectionPopulation.sampleStride}
            </span>
          ) : null}
          {fallbackToContextReason ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-amber-100">
              Fallback: {fallbackReasonLabel[fallbackToContextReason]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span className="text-slate-400">Diagnostics source preference:</span>
        <button
          type="button"
          onClick={() => onDiagnosticsSourcePreferenceChange('selection')}
          className={`rounded-full border px-2 py-0.5 ${diagnosticsSourcePreference === 'selection' ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}
        >
          selection dataset
        </button>
        <button
          type="button"
          onClick={() => onDiagnosticsSourcePreferenceChange('context')}
          className={`rounded-full border px-2 py-0.5 ${diagnosticsSourcePreference === 'context' ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}
        >
          context dataset
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700/80 px-3 py-4 text-sm text-slate-400">
          Adaptive maps are not ready yet.
        </div>
      ) : (
        <div className="overflow-x-auto" data-testid="adaptive-bin-diagnostics-table-wrapper">
          <table className="min-w-full border-collapse text-left text-xs text-slate-200">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-2 py-2">Bin</th>
                <th className="px-2 py-2">Boundaries</th>
                <th className="px-2 py-2">Width</th>
                <th className="px-2 py-2">Count</th>
                <th className="px-2 py-2">Density/s</th>
                <th className="px-2 py-2">Normalized</th>
                <th className="px-2 py-2">Multiplier</th>
                <th className="px-2 py-2">Warp share</th>
                <th className="px-2 py-2">Warp offset</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.binIndex} className="border-b border-slate-900/80 align-top">
                  <td className="px-2 py-2 font-medium text-slate-100">{row.binIndex}</td>
                  <td className="px-2 py-2 text-slate-300">
                    <div>{formatDateTime(row.startSec)}</div>
                    <div className="text-slate-500">to {formatDateTime(row.endSec)}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{formatSeconds(row.widthSec)}</td>
                  <td className="px-2 py-2 text-slate-300">{row.rawCount.toLocaleString()}</td>
                  <td className="px-2 py-2 text-slate-300">{row.densityPerSecond.toFixed(4)}</td>
                  <td className="px-2 py-2 text-slate-300">{row.normalizedDensity.toFixed(3)}</td>
                  <td className="px-2 py-2 text-emerald-200">{row.adaptiveMultiplier.toFixed(3)}x</td>
                  <td className="px-2 py-2 text-slate-300">
                    <div>{formatRatio(row.warpedSpanShare)}</div>
                    <div className="text-slate-500">{formatSeconds(row.warpedSpanSec)}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{formatSeconds(row.cumulativeWarpOffsetSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
