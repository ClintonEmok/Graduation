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

const COLOR_CLASS_MAP: Record<'blue' | 'orange', string> = {
  blue: 'bg-chart-1/45 border-chart-1',
  orange: 'bg-chart-2/45 border-chart-2',
};

const OVERLAP_CLASS = 'bg-chart-3/45 border-chart-3';

export function ComparisonTimelineBar({
  left,
  right,
  paddingEpoch = 86400,
}: ComparisonTimelineBarProps) {
  if (!left && !right) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-2 text-[10px] text-muted-foreground">
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
    <div className="rounded-lg border border-border bg-muted/50 p-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Timeline overlap
      </div>

      <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-[10px]">
        {left ? (
          <>
            <span className="truncate text-foreground">{left.label}</span>
            <Bar
              startPct={epochToPercent(left.startEpoch, min, max)}
              endPct={epochToPercent(left.endEpoch, min, max)}
              barClassName={COLOR_CLASS_MAP[left.color]}
            />
          </>
        ) : (
          <>
            <span className="text-muted-foreground">—</span>
            <div className="h-2 rounded-full bg-muted" />
          </>
        )}

        {right ? (
          <>
            <span className="truncate text-foreground">{right.label}</span>
            <Bar
              startPct={epochToPercent(right.startEpoch, min, max)}
              endPct={epochToPercent(right.endEpoch, min, max)}
              barClassName={COLOR_CLASS_MAP[right.color]}
            />
          </>
        ) : (
          <>
            <span className="text-muted-foreground">—</span>
            <div className="h-2 rounded-full bg-muted" />
          </>
        )}

        {overlapExists && overlapStart !== null && overlapEnd !== null ? (
          <>
            <span className="text-muted-foreground">Overlap</span>
            <Bar
              startPct={epochToPercent(overlapStart, min, max)}
              endPct={epochToPercent(overlapEnd, min, max)}
              barClassName={OVERLAP_CLASS}
            />
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Overlap</span>
            <div className="h-2 rounded-full bg-muted/50" />
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[9px] text-muted-foreground tabular-nums">
        <span>{formatDate(min)}</span>
        <span>{formatDate(max)}</span>
      </div>
    </div>
  );
}

function Bar({
  startPct,
  endPct,
  barClassName,
}: {
  startPct: number;
  endPct: number;
  barClassName: string;
}) {
  const left = Math.min(startPct, endPct);
  const width = Math.max(0, endPct - startPct);
  return (
    <div className="relative h-2 rounded-full bg-muted">
      <div
        className={`absolute top-0 h-2 rounded-full border-y ${barClassName}`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
        }}
      />
    </div>
  );
}
