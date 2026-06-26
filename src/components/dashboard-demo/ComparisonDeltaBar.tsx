'use client';

export interface ComparisonDeltaBarProps {
  label: string;
  leftValue: number;
  rightValue: number;
  leftFormatted: string;
  rightFormatted: string;
  higherIsBetter?: boolean;
}

const BLUE = 'rgba(96, 165, 250, 0.85)';
const ORANGE = 'rgba(251, 146, 60, 0.85)';
const MUTED = 'rgba(71, 85, 105, 0.4)';

export function ComparisonDeltaBar({
  label,
  leftValue,
  rightValue,
  leftFormatted,
  rightFormatted,
  higherIsBetter = true,
}: ComparisonDeltaBarProps) {
  const max = Math.max(leftValue, rightValue, 1);
  const leftWidth = (leftValue / max) * 100;
  const rightWidth = (rightValue / max) * 100;

  const delta = rightValue - leftValue;
  const noDelta = Math.abs(delta) < 1e-6;

  let winner: 'left' | 'right' | 'tie' = 'tie';
  if (!noDelta) {
    if (higherIsBetter) {
      winner = delta > 0 ? 'right' : 'left';
    } else {
      winner = delta > 0 ? 'left' : 'right';
    }
  }

  const leftHighlight = winner === 'left';
  const rightHighlight = winner === 'right';
  const leftFill = leftHighlight ? BLUE : MUTED;
  const rightFill = rightHighlight ? ORANGE : MUTED;

  return (
    <div className="rounded-lg border border-border/70 bg-slate-950/40 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-medium uppercase tracking-[0.18em] text-slate-400">{label}</span>
        {noDelta ? (
          <span className="tabular-nums text-slate-500">Equal</span>
        ) : (
          <span
            className={`tabular-nums ${
              rightHighlight ? 'text-orange-300' : leftHighlight ? 'text-sky-300' : 'text-slate-400'
            }`}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-[10px]">
          <span className="text-slate-500">Left</span>
          <div className="relative h-2 rounded-full bg-slate-800/50">
            <div
              className="absolute left-0 top-0 h-2 rounded-full transition-all"
              style={{ width: `${leftWidth}%`, backgroundColor: leftFill }}
            />
          </div>
          <span className="tabular-nums text-slate-200">{leftFormatted}</span>
        </div>

        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-[10px]">
          <span className="text-slate-500">Right</span>
          <div className="relative h-2 rounded-full bg-slate-800/50">
            <div
              className="absolute left-0 top-0 h-2 rounded-full transition-all"
              style={{ width: `${rightWidth}%`, backgroundColor: rightFill }}
            />
          </div>
          <span className="tabular-nums text-slate-200">{rightFormatted}</span>
        </div>
      </div>
    </div>
  );
}
