"use client";

import { Badge } from '@/components/ui/badge';
import type { BurstScoreSeriesEntry } from './lib/burst-score-series';

const formatScore = (value: number) => value.toFixed(0);

export function BurstScoreRail({
  series,
  width,
}: {
  series: BurstScoreSeriesEntry[];
  width: number;
}) {
  if (series.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        No burst scores yet.
      </div>
    );
  }

  const strongest = series.reduce((best, entry) => (entry.score > best.score ? entry : best), series[0]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Burst score rail</span>
        <Badge variant="outline" className="rounded-full">
          Peak {strongest.label} · {formatScore(strongest.score)}
        </Badge>
      </div>

      <div className="relative h-16 overflow-hidden rounded-md border border-border/60 bg-muted/10" style={{ width }}>
        <div className="absolute inset-x-0 bottom-0 h-px bg-border/80" />
        {series.map((entry) => {
          const isStrongest = entry.id === strongest.id;
          const barHeight = Math.max(10, 8 + entry.normalizedScore * 42);

          return (
            <div
              key={entry.id}
              className="absolute bottom-0 flex h-full flex-col justify-end px-[1px]"
              style={{ left: entry.left, width: Math.max(2, entry.width) }}
            >
              <div className="flex items-end justify-center pb-1">
                <div
                  className={`w-full rounded-t-sm transition-all ${entry.isActive ? 'bg-sky-400/90' : entry.isBurst ? 'bg-amber-400/80' : 'bg-slate-500/55'} ${isStrongest ? 'ring-1 ring-white/40' : ''}`}
                  style={{ height: `${barHeight}px` }}
                  title={`${entry.label}: ${formatScore(entry.score)}`}
                />
              </div>
              {entry.width > 24 ? (
                <div className="pb-1 text-center text-[10px] leading-none text-muted-foreground">
                  {entry.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
