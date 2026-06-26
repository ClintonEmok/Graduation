'use client';

export interface ComparisonTimelineRange {
  label: string;
  startEpoch: number;
  endEpoch: number;
  color: 'blue' | 'orange';
}

export interface ComparisonTimelineBarProps {
  left: ComparisonTimelineRange | null;
  right: ComparisonTimelineRange | null;
  paddingEpoch?: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(epoch: number): string {
  return DATE_FORMATTER.format(new Date(epoch * 1000));
}

function epochToPercent(epoch: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((epoch - min) / (max - min)) * 100));
}

const COLOR_MAP = {
  blue: { fill: 'rgba(96, 165, 250, 0.45)', stroke: '#60a5fa' },
  orange: { fill: 'rgba(251, 146, 60, 0.45)', stroke: '#fb923c' },
};

const OVERLAP_FILL = 'rgba(244, 114, 182, 0.45)';

export function ComparisonTimelineBar({
  left,
  right,
  paddingEpoch = 86400,
}: ComparisonTimelineBarProps) {
  if (!left && !right) {
    return (
      <div className="rounded-lg border border-border/70 bg-slate-950/40 p-2 text-[10px] text-slate-500">
        Select two slices to compare
      </div>
    );
  }

  const min = Math.min(
    left ? left.startEpoch : Number.POSITIVE_INFINITY,
    right ? right.startEpoch : Number.POSITIVE_INFINITY,
  ) - paddingEpoch;
  const max = Math.max(
    left ? left.endEpoch : Number.NEGATIVE_INFINITY,
    right ? right.endEpoch : Number.NEGATIVE_INFINITY,
  ) + paddingEpoch;

  const overlapStart = left && right ? Math.max(left.startEpoch, right.startEpoch) : null;
  const overlapEnd = left && right ? Math.min(left.endEpoch, right.endEpoch) : null;
  const overlapExists = overlapStart !== null && overlapEnd !== null && overlapEnd > overlapStart;

  return (
    <div className="rounded-lg border border-border/70 bg-slate-950/40 p-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
        Timeline overlap
      </div>

      <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-[10px]">
        {left ? (
          <>
            <span className="truncate text-slate-300">{left.label}</span>
            <Bar
              startPct={epochToPercent(left.startEpoch, min, max)}
              endPct={epochToPercent(left.endEpoch, min, max)}
              color={COLOR_MAP[left.color]}
            />
          </>
        ) : (
          <>
            <span className="text-slate-500">—</span>
            <div className="h-2 rounded-full bg-slate-800/40" />
          </>
        )}

        {right ? (
          <>
            <span className="truncate text-slate-300">{right.label}</span>
            <Bar
              startPct={epochToPercent(right.startEpoch, min, max)}
              endPct={epochToPercent(right.endEpoch, min, max)}
              color={COLOR_MAP[right.color]}
            />
          </>
        ) : (
          <>
            <span className="text-slate-500">—</span>
            <div className="h-2 rounded-full bg-slate-800/40" />
          </>
        )}

        {overlapExists && overlapStart !== null && overlapEnd !== null ? (
          <>
            <span className="text-pink-300">Overlap</span>
            <Bar
              startPct={epochToPercent(overlapStart, min, max)}
              endPct={epochToPercent(overlapEnd, min, max)}
              color={{ fill: OVERLAP_FILL, stroke: '#f472b6' }}
            />
          </>
        ) : (
          <>
            <span className="text-slate-500">Overlap</span>
            <div className="h-2 rounded-full bg-slate-800/30" />
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[9px] text-slate-500 tabular-nums">
        <span>{formatDate(min)}</span>
        <span>{formatDate(max)}</span>
      </div>
    </div>
  );
}

function Bar({
  startPct,
  endPct,
  color,
}: {
  startPct: number;
  endPct: number;
  color: { fill: string; stroke: string };
}) {
  const left = Math.min(startPct, endPct);
  const width = Math.max(0, endPct - startPct);
  return (
    <div className="relative h-2 rounded-full bg-slate-800/40">
      <div
        className="absolute top-0 h-2 rounded-full"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: color.fill,
          borderTop: `1px solid ${color.stroke}`,
          borderBottom: `1px solid ${color.stroke}`,
        }}
      />
    </div>
  );
}
