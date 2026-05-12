"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import type { TimeSlice } from '@/store/useSliceDomainStore';

const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }

  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const clampWarpWeight = (value: number) => Math.min(3, Math.max(0, value));

const formatBurstScoreInterpretation = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  const interpretation = rounded === 50 ? 'neutral' : rounded > 50 ? 'mildly bursty' : 'more regular';

  return `${rounded} / 100 (${interpretation})`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

interface SliceComparisonCardProps {
  slice: TimeSlice;
  index: number;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  onUpdateSlice: (id: string, updates: Partial<TimeSlice>) => void;
  toNormalizedFromTimestampMs: (timestampMs: number | null) => number | null;
  formatSliceLabel: (slice: TimeSlice, index: number) => string;
}

export function SliceComparisonCard({
  slice,
  index,
  minTimestampSec,
  maxTimestampSec,
  onUpdateSlice,
  toNormalizedFromTimestampMs,
  formatSliceLabel,
}: SliceComparisonCardProps) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-100">
              {slice.name?.trim() || `Slice ${index + 1}`}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {formatSliceLabel(slice, index)}
            </span>
          </div>
          <div className="flex" />
          <div className="flex gap-2">
            <label className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
              <span>{slice.type === 'range' ? 'Start datetime' : 'Datetime'}</span>
              <Input
                type="datetime-local"
                value={toDateTimeLocalValue(slice.startDateTimeMs ?? null)}
                onChange={(event) => {
                  const nextStartMs = parseDateTimeLocalValue(event.target.value);

                  if (slice.type === 'point') {
                    const nextTime = toNormalizedFromTimestampMs(nextStartMs);
                    onUpdateSlice(slice.id, {
                      startDateTimeMs: nextStartMs,
                      ...(nextTime !== null ? { time: nextTime } : {}),
                    });
                    return;
                  }

                  const currentStartMs = slice.startDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                    ? normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec) * 1000
                    : null);
                  const currentEndMs = slice.endDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                    ? normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec) * 1000
                    : null);

                  const resolvedStartMs = nextStartMs ?? currentStartMs;
                  const resolvedEndMs = currentEndMs;
                  const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
                  const nextEndNorm = toNormalizedFromTimestampMs(resolvedEndMs);

                  if (nextStartNorm !== null && nextEndNorm !== null) {
                    const start = Math.min(nextStartNorm, nextEndNorm);
                    const end = Math.max(nextStartNorm, nextEndNorm);
                    onUpdateSlice(slice.id, {
                      startDateTimeMs: nextStartMs,
                      range: [start, end],
                      time: (start + end) / 2,
                    });
                    return;
                  }

                  onUpdateSlice(slice.id, { startDateTimeMs: nextStartMs });
                }}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </label>

            {slice.type === 'range' ? (
              <label className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
                <span>End datetime</span>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(slice.endDateTimeMs ?? null)}
                  onChange={(event) => {
                    const nextEndMs = parseDateTimeLocalValue(event.target.value);
                    const currentStartMs = slice.startDateTimeMs ?? (slice.range && minTimestampSec !== null && maxTimestampSec !== null
                      ? normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec) * 1000
                      : null);
                    const resolvedStartMs = currentStartMs;
                    const resolvedEndMs = nextEndMs;
                    const nextStartNorm = toNormalizedFromTimestampMs(resolvedStartMs);
                    const nextEndNorm = toNormalizedFromTimestampMs(resolvedEndMs);

                    if (nextStartNorm !== null && nextEndNorm !== null) {
                      const start = Math.min(nextStartNorm, nextEndNorm);
                      const end = Math.max(nextStartNorm, nextEndNorm);
                      onUpdateSlice(slice.id, {
                        endDateTimeMs: nextEndMs,
                        range: [start, end],
                        time: (start + end) / 2,
                      });
                      return;
                    }

                    onUpdateSlice(slice.id, { endDateTimeMs: nextEndMs });
                  }}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </label>
            ) : null}
          </div>
          <div className="flex gap-2">
            {slice.isBurst ? (
              <label className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
                <span>Warp factor</span>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  step={0.1}
                  value={(slice.warpWeight ?? 1).toFixed(1)}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    onUpdateSlice(slice.id, { warpWeight: clampWarpWeight(parsed) });
                  }}
                  className="h-8 border-slate-700 bg-slate-950 text-right text-slate-100"
                />
              </label>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Burstiness</span>
            <span className="text-sm font-medium text-slate-100">
              {slice.isBurst ? (formatBurstScoreInterpretation(slice.burstScore) ?? '—') : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
