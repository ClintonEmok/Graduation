'use client';

import { ArrowLeftRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComparisonTimelineBar, type ComparisonTimelineRange } from '@/components/dashboard-demo/ComparisonTimelineBar';
import { ComparisonDeltaBar } from '@/components/dashboard-demo/ComparisonDeltaBar';
import { useDemoCompareData, type DemoComparableSlice } from './lib/useDemoCompareData';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(epoch: number): string {
  return DATE_FORMATTER.format(new Date(epoch * 1000));
}

function formatComparisonSpan(seconds: number): string {
  const absolute = Math.abs(seconds);
  if (absolute >= 86_400) {
    const days = absolute / 86_400;
    return `${days >= 10 ? Math.round(days) : days.toFixed(1)} days`;
  }
  if (absolute >= 3_600) {
    const hours = absolute / 3_600;
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hours`;
  }
  if (absolute >= 60) {
    const minutes = absolute / 60;
    return `${minutes >= 10 ? Math.round(minutes) : minutes.toFixed(1)} minutes`;
  }
  return `${Math.round(absolute)} seconds`;
}

export function DemoComparePanel() {
  const {
    comparableSlices,
    leftId,
    rightId,
    leftSlice,
    rightSlice,
    leftDuration,
    rightDuration,
    leftBurstPercent,
    rightBurstPercent,
    leftCellCount,
    rightCellCount,
    setLeft,
    setRight,
    swap,
    clear,
  } = useDemoCompareData();

  const leftTimelineRange: ComparisonTimelineRange | null = leftSlice
    ? { label: leftSlice.label, startEpoch: leftSlice.startEpoch, endEpoch: leftSlice.endEpoch, color: 'blue' }
    : null;
  const rightTimelineRange: ComparisonTimelineRange | null = rightSlice
    ? { label: rightSlice.label, startEpoch: rightSlice.startEpoch, endEpoch: rightSlice.endEpoch, color: 'orange' }
    : null;

  return (
    <div className="space-y-2">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            Compare slices
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Pick two slices. Heatmaps render in the main viewport.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={swap}
            disabled={!leftSlice || !rightSlice}
            className="h-7 gap-1 px-2 text-[10px]"
          >
            <ArrowLeftRight className="size-3" />
            Swap
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={!leftSlice && !rightSlice}
            className="h-7 gap-1 px-2 text-[10px]"
          >
            <X className="size-3" />
            Clear
          </Button>
        </div>
      </header>

      <div className="space-y-1.5">
        <SlotPicker
          slot="left"
          slices={comparableSlices}
          value={leftId}
          onChange={setLeft}
          activeSlice={leftSlice}
        />
        <SlotPicker
          slot="right"
          slices={comparableSlices}
          value={rightId}
          onChange={setRight}
          activeSlice={rightSlice}
        />
      </div>

      <ComparisonTimelineBar left={leftTimelineRange} right={rightTimelineRange} />

      {leftSlice && rightSlice ? (
        <div className="space-y-1.5">
          <ComparisonDeltaBar
            label="Event count"
            leftValue={leftSlice.crimeCount}
            rightValue={rightSlice.crimeCount}
            leftFormatted={leftSlice.crimeCount.toLocaleString()}
            rightFormatted={rightSlice.crimeCount.toLocaleString()}
          />
          <ComparisonDeltaBar
            label="Burst intensity"
            leftValue={leftBurstPercent}
            rightValue={rightBurstPercent}
            leftFormatted={`${Math.round(leftBurstPercent)}%`}
            rightFormatted={`${Math.round(rightBurstPercent)}%`}
          />
          <ComparisonDeltaBar
            label="Duration"
            leftValue={leftDuration}
            rightValue={rightDuration}
            leftFormatted={formatComparisonSpan(leftDuration)}
            rightFormatted={formatComparisonSpan(rightDuration)}
          />
          <ComparisonDeltaBar
            label="KDE cells"
            leftValue={leftCellCount}
            rightValue={rightCellCount}
            leftFormatted={leftCellCount.toLocaleString()}
            rightFormatted={rightCellCount.toLocaleString()}
          />
        </div>
      ) : null}
    </div>
  );
}

function SlotPicker({
  slot,
  slices,
  value,
  onChange,
  activeSlice,
}: {
  slot: 'left' | 'right';
  slices: DemoComparableSlice[];
  value: string | null;
  onChange: (id: string | null) => void;
  activeSlice: DemoComparableSlice | null;
}) {
  const palette = slot === 'left'
    ? { border: 'border-sky-400/40', bg: 'bg-sky-500/10', text: 'text-sky-200', label: 'Left' }
    : { border: 'border-orange-400/40', bg: 'bg-orange-500/10', text: 'text-orange-200', label: 'Right' };

  return (
    <div className={`flex flex-col gap-1.5 rounded-md border ${palette.border} ${palette.bg} p-2`}>
      <span className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${palette.text}`}>
        {palette.label} slot
      </span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100 outline-none transition focus:border-sky-400/60"
      >
        <option value="">— Pick a slice —</option>
        {slices.map((slice) => (
          <option key={slice.id} value={slice.id}>
            {slice.label} · {formatDate(slice.startEpoch)} → {formatDate(slice.endEpoch)}
          </option>
        ))}
      </select>
      {activeSlice ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-slate-400">
          <span className="text-slate-200">{activeSlice.crimeCount.toLocaleString()} events</span>
          <span className="text-slate-500">·</span>
          <span>{formatComparisonSpan(activeSlice.endEpoch - activeSlice.startEpoch)}</span>
        </div>
      ) : (
        <p className="text-[10px] text-slate-500">No slice selected.</p>
      )}
    </div>
  );
}
