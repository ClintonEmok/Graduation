'use client';

export interface ComparisonDeltaBarProps {
  label: string;
  leftValue: number;
  rightValue: number;
  leftFormatted: string;
  rightFormatted: string;
  higherIsBetter?: boolean;
}

const HIGHLIGHT_LEFT = 'bg-chart-1';
const HIGHLIGHT_RIGHT = 'bg-chart-2';
const DIM = 'bg-muted-foreground/40';

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
  const leftFill = leftHighlight ? HIGHLIGHT_LEFT : DIM;
  const rightFill = rightHighlight ? HIGHLIGHT_RIGHT : DIM;

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        {noDelta ? (
          <span className="tabular-nums text-muted-foreground">Equal</span>
        ) : (
          <span
            className={`tabular-nums ${
              rightHighlight ? 'text-chart-2' : leftHighlight ? 'text-chart-1' : 'text-muted-foreground'
            }`}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">Left</span>
          <div className="relative h-2 rounded-full bg-muted">
            <div
              className={`absolute left-0 top-0 h-2 rounded-full transition-all ${leftFill}`}
              style={{ width: `${leftWidth}%` }}
            />
          </div>
          <span className="tabular-nums text-foreground">{leftFormatted}</span>
        </div>

        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">Right</span>
          <div className="relative h-2 rounded-full bg-muted">
            <div
              className={`absolute left-0 top-0 h-2 rounded-full transition-all ${rightFill}`}
              style={{ width: `${rightWidth}%` }}
            />
          </div>
          <span className="tabular-nums text-foreground">{rightFormatted}</span>
        </div>
      </div>
    </div>
  );
}
