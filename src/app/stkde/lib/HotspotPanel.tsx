"use client";

import type { StkdeHotspotRowModel } from './stkde-view-model';

interface HotspotPanelProps {
  rows: StkdeHotspotRowModel[];
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  onSelectHotspot: (row: StkdeHotspotRowModel) => void;
  onHoverHotspot: (id: string | null) => void;
}

export function HotspotPanel({
  rows,
  selectedHotspotId,
  hoveredHotspotId,
  onSelectHotspot,
  onHoverHotspot,
}: HotspotPanelProps) {
  return (
    <aside className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4" data-testid="stkde-hotspot-panel">
      <header className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Hotspots</h2>
        <p className="text-xs text-slate-400">Top intensity clusters with location, intensity, support, and peak time window.</p>
      </header>
      <ul className="space-y-2">
        {rows.map((row) => {
          const selected = row.id === selectedHotspotId;
          const hovered = row.id === hoveredHotspotId;
          return (
            <li key={row.id}>
              <button
                type="button"
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selected
                    ? 'border-rose-400/80 bg-rose-500/10'
                    : hovered
                      ? 'border-slate-500 bg-slate-800/80'
                      : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                }`}
                onMouseEnter={() => onHoverHotspot(row.id)}
                onMouseLeave={() => onHoverHotspot(null)}
                onFocus={() => onHoverHotspot(row.id)}
                onBlur={() => onHoverHotspot(null)}
                onClick={() => onSelectHotspot(row)}
                data-testid={`stkde-hotspot-row-${row.id}`}
              >
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span className="font-medium">{row.title}</span>
                  <span>Intensity {row.intensityLabel}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Location: {row.location}</div>
                <div className="mt-1 text-[11px] text-slate-400">Support: {row.supportLabel}</div>
                <div className="mt-1 text-[11px] text-slate-400">Time window: {row.windowLabel}</div>
              </button>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="rounded-md border border-dashed border-slate-700 px-3 py-4 text-xs text-slate-500">
            No hotspots found for current parameters.
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
