"use client";

import { Plus, Trash2 } from 'lucide-react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const DATA_MIN_TIMESTAMP = 978307200; // 2001-01-01
const DATA_MAX_TIMESTAMP = 1767571200; // 2026-01-01

const percentToEpochSec = (percent: number, domain: [number, number]) => {
  const [start, end] = domain;
  return start + (percent / 100) * (end - start);
};

const epochSecToPercent = (epochSec: number, domain: [number, number]) => {
  const [start, end] = domain;
  const span = Math.max(1e-9, end - start);
  return ((epochSec - start) / span) * 100;
};

const toDateTimeLocalInput = (epochSec: number) => {
  const date = new Date(epochSec * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toDateInput = (epochSec: number) => toDateTimeLocalInput(epochSec).slice(0, 10);

const toTimeInput = (epochSec: number) => toDateTimeLocalInput(epochSec).slice(11, 16);

const parseDateTimeLocalInput = (value: string) => {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return parsed / 1000;
};

const parseDateAndTimeInput = (dateValue: string, timeValue: string) => {
  if (!dateValue || !timeValue) return null;
  return parseDateTimeLocalInput(`${dateValue}T${timeValue}`);
};

export function WarpSliceEditor() {
  const warpSource = useAdaptiveStore((state) => state.warpSource);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const slices = useWarpSliceStore((state) => state.slices);
  const selectedSliceId = useWarpSliceStore((state) => state.selectedSliceId);
  const setSelectedSliceId = useWarpSliceStore((state) => state.setSelectedSliceId);
  const addSlice = useWarpSliceStore((state) => state.addSlice);
  const updateSlice = useWarpSliceStore((state) => state.updateSlice);
  const removeSlice = useWarpSliceStore((state) => state.removeSlice);
  const clearSlices = useWarpSliceStore((state) => state.clearSlices);
  const editableDomain: [number, number] =
    mapDomain[0] === 0 && mapDomain[1] === 100 ? [DATA_MIN_TIMESTAMP, DATA_MAX_TIMESTAMP] : mapDomain;

  return (
    <div className="space-y-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">User-authored warp slices</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Separate from timeline annotation slices. Defines non-uniform scaling intervals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextId = addSlice();
              setSelectedSliceId(nextId);
            }}
            className="inline-flex items-center gap-1 rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-400"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add warp slice</span>
          </button>
          {slices.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                clearSlices();
                setSelectedSliceId(null);
              }}
              className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded border border-slate-700/80 bg-slate-900/65 px-2 py-1 text-[11px] text-slate-400">
        Source mode: <strong className="text-slate-100">{warpSource === 'slice-authored' ? 'user slices active' : 'density active'}</strong>
      </div>

      {slices.length === 0 ? (
        <p className="rounded border border-dashed border-slate-700 px-2 py-2 text-[11px] text-slate-400">
          No warp slices yet. Add one to manually define expanded timeline regions.
        </p>
      ) : (
        <div className="space-y-2">
          {slices.map((slice) => (
            <div
              key={slice.id}
              onClick={() => setSelectedSliceId(slice.id)}
              className={`space-y-2 rounded border bg-slate-900/70 p-2 transition ${
                selectedSliceId === slice.id
                  ? 'border-cyan-400/80 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]'
                  : 'border-slate-700/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSlice(slice.id, { enabled: !slice.enabled })}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                    slice.enabled
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {slice.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <input
                  type="text"
                  value={slice.label}
                  onChange={(event) => updateSlice(slice.id, { label: event.target.value })}
                  className="min-w-[7rem] rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none ring-0 transition focus:border-cyan-500"
                  placeholder="Slice label"
                />
                  <button
                    type="button"
                    onClick={() => {
                      removeSlice(slice.id);
                      if (selectedSliceId === slice.id) {
                        setSelectedSliceId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-100 transition hover:border-red-400"
                  >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1">
                  <span className="text-[11px] text-slate-400">Start</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={toDateInput(percentToEpochSec(slice.range[0], editableDomain))}
                      onChange={(event) => {
                        const nextEpoch = parseDateAndTimeInput(
                          event.target.value,
                          toTimeInput(percentToEpochSec(slice.range[0], editableDomain))
                        );
                        if (nextEpoch === null) return;
                        const nextStart = epochSecToPercent(nextEpoch, editableDomain);
                        updateSlice(slice.id, { range: [nextStart, slice.range[1]] });
                      }}
                      className="w-32 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100"
                    />
                    <input
                      type="time"
                      step={60}
                      value={toTimeInput(percentToEpochSec(slice.range[0], editableDomain))}
                      onChange={(event) => {
                        const nextEpoch = parseDateAndTimeInput(
                          toDateInput(percentToEpochSec(slice.range[0], editableDomain)),
                          event.target.value
                        );
                        if (nextEpoch === null) return;
                        const nextStart = epochSecToPercent(nextEpoch, editableDomain);
                        updateSlice(slice.id, { range: [nextStart, slice.range[1]] });
                      }}
                      className="w-20 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1">
                  <span className="text-[11px] text-slate-400">End</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={toDateInput(percentToEpochSec(slice.range[1], editableDomain))}
                      onChange={(event) => {
                        const nextEpoch = parseDateAndTimeInput(
                          event.target.value,
                          toTimeInput(percentToEpochSec(slice.range[1], editableDomain))
                        );
                        if (nextEpoch === null) return;
                        const nextEnd = epochSecToPercent(nextEpoch, editableDomain);
                        updateSlice(slice.id, { range: [slice.range[0], nextEnd] });
                      }}
                      className="w-32 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100"
                    />
                    <input
                      type="time"
                      step={60}
                      value={toTimeInput(percentToEpochSec(slice.range[1], editableDomain))}
                      onChange={(event) => {
                        const nextEpoch = parseDateAndTimeInput(
                          toDateInput(percentToEpochSec(slice.range[1], editableDomain)),
                          event.target.value
                        );
                        if (nextEpoch === null) return;
                        const nextEnd = epochSecToPercent(nextEpoch, editableDomain);
                        updateSlice(slice.id, { range: [slice.range[0], nextEnd] });
                      }}
                      className="w-20 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1">
                  <span className="text-[11px] text-slate-400">Strength</span>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    step={0.1}
                    value={slice.weight.toFixed(1)}
                    onChange={(event) => updateSlice(slice.id, { weight: clamp(Number(event.target.value), 0, 3) })}
                    className="w-20 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-right text-[11px] text-slate-100"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
