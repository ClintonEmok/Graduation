"use client";

import { useMemo, useState } from 'react';
import { Check, Pencil, Sparkles, X } from 'lucide-react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceStore, type TimeSlice } from '@/store/useSliceStore';
import { BURST_CHIP_CLASSNAME, BURST_CHIP_ICON_CLASSNAME } from './SliceToolbar';

const toTimestampLabel = (timeValue: number, domain: [number, number]): string => {
  const [startSec, endSec] = domain;
  
  // Check if timeValue is already an epoch timestamp (large number) or normalized (0-100)
  // Epoch timestamps for 2024 are around 1.7 billion (seconds) or 1.7 trillion (milliseconds)
  const isEpochTimestamp = timeValue > 1000000000; // Greater than ~year 2000 in seconds
  
  let epochSec: number;
  
  if (isEpochTimestamp) {
    // Value is already an epoch timestamp
    epochSec = timeValue > 1000000000000 ? timeValue / 1000 : timeValue; // Convert ms to seconds if needed
  } else {
    // Value is normalized 0-100, convert using domain
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      return `${timeValue.toFixed(2)}%`;
    }
    epochSec = startSec + ((endSec - startSec) * timeValue) / 100;
  }
  
  const timestamp = new Date(epochSec * 1000);
  if (Number.isNaN(timestamp.getTime())) {
    return isEpochTimestamp ? String(timeValue) : `${timeValue.toFixed(2)}%`;
  }

  return timestamp.toLocaleString();
};

export function SliceList() {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const removeSlice = useSliceStore((state) => state.removeSlice);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const [editingSliceId, setEditingSliceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleActivate = (sliceId: string, isActive: boolean) => {
    setActiveSlice(isActive ? null : sliceId);
  };

  const sortedSlices = useMemo(() => {
    const getSliceStart = (slice: TimeSlice): number => {
      if (slice.type === 'range' && slice.range) {
        return Math.min(slice.range[0], slice.range[1]);
      }

      return slice.time;
    };

    return slices
      .map((slice, index) => ({ slice, index }))
      .sort((a, b) => {
        const startDelta = getSliceStart(a.slice) - getSliceStart(b.slice);
        if (startDelta !== 0) {
          return startDelta;
        }

        if (!a.slice.isBurst && b.slice.isBurst) {
          return -1;
        }

        if (a.slice.isBurst && !b.slice.isBurst) {
          return 1;
        }

        return a.index - b.index;
      })
      .map(({ slice }) => slice);
  }, [slices]);

  const getSliceDisplayName = (slice: TimeSlice): string => {
    if (slice.name) {
      return slice.name;
    }

    const peers = sortedSlices.filter((candidate) => candidate.isBurst === !!slice.isBurst);
    const ordinal = peers.findIndex((candidate) => candidate.id === slice.id) + 1;

    return slice.isBurst ? `Burst ${ordinal}` : `Slice ${ordinal}`;
  };

  const startEditing = (slice: TimeSlice) => {
    setEditingSliceId(slice.id);
    setEditingName(slice.name ?? getSliceDisplayName(slice));
  };

  const cancelEditing = () => {
    setEditingSliceId(null);
    setEditingName('');
  };

  const saveEditing = (slice: TimeSlice) => {
    const trimmedName = editingName.trim();
    updateSlice(slice.id, { name: trimmedName || undefined });
    cancelEditing();
  };

  if (slices.length === 0) {
    return (
      <p className="rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-400">
        No slices yet. Create one manually or from a burst.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-300">Created slices</h3>
      <ul className="space-y-2">
        {sortedSlices.map((slice) => {
          const isActive = activeSliceId === slice.id;
          const isEditing = editingSliceId === slice.id;
          const displayName = getSliceDisplayName(slice);
          const showsBurstChip = !!slice.isBurst && displayName.startsWith('Burst');
          const a11yLabel = showsBurstChip ? `${displayName} (burst-derived slice)` : `${displayName} (manual slice)`;
          const rangeLabel = slice.range
            ? `${toTimestampLabel(slice.range[0], mapDomain)} -> ${toTimestampLabel(slice.range[1], mapDomain)}`
            : toTimestampLabel(slice.time, mapDomain);
          const interactionLabel = `${a11yLabel}. ${rangeLabel}. ${isActive ? 'Selected.' : 'Not selected.'}`;

          return (
            <li key={slice.id}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={interactionLabel}
                onClick={() => handleActivate(slice.id, isActive)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleActivate(slice.id, isActive);
                  }
                }}
                className={`relative flex cursor-pointer items-start justify-between gap-3 rounded-md border px-3 py-2 pl-5 text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-900/90'
                }`}
              >
                <span
                  className={`absolute inset-y-1 left-1 w-1 rounded-full transition-colors ${
                    isActive ? 'bg-amber-300' : 'bg-transparent'
                  }`}
                />
                  <span className="min-w-0 space-y-1">
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={() => saveEditing(slice)}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveEditing(slice);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelEditing();
                            }
                          }}
                          aria-label={`Edit name for ${displayName}`}
                          className="h-6 min-w-0 flex-1 rounded border border-amber-300/70 bg-slate-950/80 px-2 text-xs text-slate-100 outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-amber-300/70"
                        />
                      ) : (
                        <span className="truncate" title={displayName}>{displayName}</span>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditing(slice);
                        }}
                        className={`rounded p-1 transition hover:bg-amber-500/10 hover:text-amber-200 ${
                          isActive ? 'text-amber-200/80' : 'text-slate-400'
                        }`}
                        aria-label={`Rename ${displayName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {showsBurstChip ? (
                        <span className={BURST_CHIP_CLASSNAME}>
                          <Sparkles className={BURST_CHIP_ICON_CLASSNAME} />
                        Burst
                      </span>
                    ) : null}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                        <Check className="h-2.5 w-2.5" />
                        Selected
                      </span>
                    ) : null}
                  </span>
                  <span className={`block ${isActive ? 'text-amber-100/90' : 'text-slate-300'}`}>{rangeLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSlice(slice.id);
                  }}
                  className={`rounded p-1 transition hover:bg-red-500/10 hover:text-red-300 ${
                    isActive ? 'text-amber-200/80' : 'text-slate-400'
                  }`}
                  aria-label={`Delete ${displayName}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
