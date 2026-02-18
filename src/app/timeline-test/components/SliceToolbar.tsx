"use client";

import { Scissors, Trash2 } from 'lucide-react';
import { useSliceCreationStore } from '@/store/useSliceCreationStore';
import { useSliceStore } from '@/store/useSliceStore';

export function SliceToolbar() {
  const isCreating = useSliceCreationStore((state) => state.isCreating);
  const startCreation = useSliceCreationStore((state) => state.startCreation);
  const cancelCreation = useSliceCreationStore((state) => state.cancelCreation);
  const slices = useSliceStore((state) => state.slices);
  const clearSlices = useSliceStore((state) => state.clearSlices);

  const handleToggle = () => {
    if (isCreating) {
      cancelCreation();
      return;
    }

    startCreation('click');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 p-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
          isCreating
            ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:border-amber-400/70 hover:bg-amber-500/25'
            : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
        }`}
      >
        <Scissors className="h-4 w-4" />
        <span>{isCreating ? 'Cancel' : 'Create Slice'}</span>
      </button>

      {isCreating ? (
        <div className="inline-flex flex-wrap items-center gap-2 text-xs text-amber-200">
          <span className="rounded-full border border-amber-500/50 bg-amber-500/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-300">
            Active
          </span>
          <span className="text-amber-100/90">Click or drag on timeline</span>
        </div>
      ) : null}

      {slices.length > 0 ? (
        <>
          <span className="text-xs text-slate-300">
            {slices.length} slice{slices.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={clearSlices}
            className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
            title="Clear all slices"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear all</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
