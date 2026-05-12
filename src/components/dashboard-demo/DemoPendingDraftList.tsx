"use client";

import { useCallback, useEffect, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimeBin } from '@/lib/binning/types';
import type { GenerationStatus } from '@/store/useDashboardDemoTimeslicingModeStore';
import { Check, Trash2 } from 'lucide-react';

const formatBurstCoefficient = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(2);
};

const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }
  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCompactDate = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

interface DemoPendingDraftListProps {
  pendingGeneratedBins: TimeBin[];
  selectedDraftId: string | null;
  generationStatus: GenerationStatus;
  onOpenDraftDetails: (binId: string) => void;
  onMergeDraft: (index: number) => void;
  onSplitDraft: (binId: string) => void;
  onDeleteDraft: (binId: string) => void;
  onComputeManualDraft: (binId: string) => void;
  onUpdatePendingBinRange: (binId: string, startMs: number, endMs: number) => void;
  onApplySingleDraft: (binId: string) => void;
}

export function DemoPendingDraftList({
  pendingGeneratedBins,
  selectedDraftId,
  generationStatus,
  onOpenDraftDetails,
  onMergeDraft,
  onSplitDraft,
  onDeleteDraft,
  onComputeManualDraft,
  onUpdatePendingBinRange,
  onApplySingleDraft,
}: DemoPendingDraftListProps) {
  const computeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (computeDebounceRef.current) {
        clearTimeout(computeDebounceRef.current);
      }
    };
  }, []);

  const scheduleManualRecompute = useCallback(
    (binId: string) => {
      if (computeDebounceRef.current) {
        clearTimeout(computeDebounceRef.current);
      }
      computeDebounceRef.current = setTimeout(() => onComputeManualDraft(binId), 800);
    },
    [onComputeManualDraft]
  );

  if (pendingGeneratedBins.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 px-3 py-3 text-xs text-slate-500">
        No pending drafts. Generate from a brushed selection to create draft bins.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
          Pending drafts ({pendingGeneratedBins.length})
        </div>
      </div>

      <div className="space-y-1">
        {pendingGeneratedBins.map((bin, index) => {
          const isManualDraft = bin.id.startsWith('manual-range-');
          const isSelected = selectedDraftId === bin.id;
          const burstScore = formatBurstCoefficient(bin.burstinessCoefficient ?? bin.burstScore) ?? '—';
          const label = isManualDraft ? `Manual ${index + 1}` : `Draft ${index + 1}`;

          return (
            <div
              key={bin.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                isSelected
                  ? 'border-sky-400/40 bg-sky-950/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <span className="font-medium text-sky-100">{label}</span>
                {!isManualDraft && (
                  <Badge variant="outline" className="rounded-full border-sky-400/20 bg-sky-500/10 px-2 py-0 text-[10px] text-sky-100">
                    {burstScore}
                  </Badge>
                )}
              </div>

              <div className="hidden text-[11px] text-slate-500 sm:block">·</div>
              <div className="hidden text-[11px] text-slate-400 sm:block">
                {formatCompactDate(bin.startTime)} → {formatCompactDate(bin.endTime)}
              </div>

              {bin.count > 0 && (
                <span className="text-[11px] text-slate-500">
                  {bin.count.toLocaleString()} crimes
                </span>
              )}

              {isManualDraft && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    type="datetime-local"
                    value={toDateTimeLocalValue(bin.startTime)}
                    onChange={(event) => {
                      const ms = parseDateTimeLocalValue(event.target.value);
                      if (ms !== null) {
                        onUpdatePendingBinRange(bin.id, ms, bin.endTime);
                        scheduleManualRecompute(bin.id);
                      }
                    }}
                    className="h-6 w-auto max-w-[11rem] border-slate-700 bg-slate-950 px-1.5 text-[10px] text-slate-100"
                  />
                  <span className="text-[10px] text-slate-600">→</span>
                  <Input
                    type="datetime-local"
                    value={toDateTimeLocalValue(bin.endTime)}
                    onChange={(event) => {
                      const ms = parseDateTimeLocalValue(event.target.value);
                      if (ms !== null) {
                        onUpdatePendingBinRange(bin.id, bin.startTime, ms);
                        scheduleManualRecompute(bin.id);
                      }
                    }}
                    className="h-6 w-auto max-w-[11rem] border-slate-700 bg-slate-950 px-1.5 text-[10px] text-slate-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onComputeManualDraft(bin.id)}
                    disabled={generationStatus === 'generating'}
                    className="h-6 border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-100 hover:border-cyan-400 hover:bg-cyan-500/20"
                  >
                    {generationStatus === 'generating' ? '…' : 'Calc'}
                  </Button>
                </div>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="default"
                  size="xs"
                  onClick={() => onApplySingleDraft(bin.id)}
                  className="h-6 gap-1 bg-emerald-600 text-[10px] text-emerald-50 hover:bg-emerald-500"
                >
                  <Check className="h-3 w-3" />
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onOpenDraftDetails(bin.id)}
                  className="h-6 border-slate-700 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  Details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onMergeDraft(index)}
                  disabled={pendingGeneratedBins.length <= 1}
                  className="h-6 border-slate-700 text-[10px] text-slate-400 hover:bg-slate-800"
                >
                  Merge
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onSplitDraft(bin.id)}
                  disabled={bin.endTime <= bin.startTime}
                  className="h-6 border-slate-700 text-[10px] text-slate-400 hover:bg-slate-800"
                >
                  Split
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onDeleteDraft(bin.id)}
                  className="h-6 border-rose-500/30 text-[10px] text-rose-300 hover:border-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
