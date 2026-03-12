import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';
import type { TimeslicingAlgosTimeScale } from './mode-selection';
import { BINNING_STRATEGY_OPTIONS } from './algorithm-options';

interface TimeslicingAlgosInteractionControlsProps {
  selectedStrategy: AdaptiveBinningMode;
  selectedTimeScale: TimeslicingAlgosTimeScale;
  onStrategyChange: (strategy: AdaptiveBinningMode) => void;
  onTimeScaleChange: (timescale: TimeslicingAlgosTimeScale) => void;
}

export function TimeslicingAlgosInteractionControls({
  selectedStrategy,
  selectedTimeScale,
  onStrategyChange,
  onTimeScaleChange,
}: TimeslicingAlgosInteractionControlsProps) {
  return (
    <div className="space-y-3" data-testid="algo-mode-controls">
      <div className="space-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Binning strategy</h3>
        <div className="flex flex-wrap gap-2">
          {BINNING_STRATEGY_OPTIONS.map((option) => {
            const isActive = selectedStrategy === option.strategy;
            return (
              <button
                key={option.algorithmId}
                type="button"
                onClick={() => onStrategyChange(option.strategy)}
                aria-pressed={isActive}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                    : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-slate-500'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Timeline interaction mode</h3>
        <div className="inline-flex rounded-md border border-slate-700/80 bg-slate-900/70 p-0.5">
          {([
            { key: 'linear', label: 'Linear' },
            { key: 'adaptive', label: 'Adaptive' },
          ] as const).map((option) => {
            const isActive = selectedTimeScale === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onTimeScaleChange(option.key)}
                aria-pressed={isActive}
                className={`rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
