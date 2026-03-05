"use client";

import { useMemo, useState } from 'react';
import {
  type AxisAlignedCubeBounds,
  useCubeSpatialConstraintsStore,
} from '@/store/useCubeSpatialConstraintsStore';

type BoundsKey = keyof AxisAlignedCubeBounds;

const DEFAULT_BOUNDS: AxisAlignedCubeBounds = {
  minX: 0,
  maxX: 10,
  minY: 0,
  maxY: 10,
  minZ: 0,
  maxZ: 10,
};

const BOUNDS_FIELDS: Array<{ key: BoundsKey; label: string }> = [
  { key: 'minX', label: 'Min X' },
  { key: 'maxX', label: 'Max X' },
  { key: 'minY', label: 'Min Y' },
  { key: 'maxY', label: 'Max Y' },
  { key: 'minZ', label: 'Min Z' },
  { key: 'maxZ', label: 'Max Z' },
];

const formatNumber = (value: number) => Number.isFinite(value) ? value.toString() : '0';

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function SpatialConstraintManager() {
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const createConstraint = useCubeSpatialConstraintsStore((state) => state.createConstraint);
  const updateConstraint = useCubeSpatialConstraintsStore((state) => state.updateConstraint);
  const removeConstraint = useCubeSpatialConstraintsStore((state) => state.removeConstraint);
  const toggleConstraintEnabled = useCubeSpatialConstraintsStore((state) => state.toggleConstraintEnabled);
  const setActiveConstraint = useCubeSpatialConstraintsStore((state) => state.setActiveConstraint);

  const [draftLabel, setDraftLabel] = useState('');
  const [draftColorToken, setDraftColorToken] = useState('');
  const [draftBounds, setDraftBounds] = useState<Record<BoundsKey, string>>({
    minX: formatNumber(DEFAULT_BOUNDS.minX),
    maxX: formatNumber(DEFAULT_BOUNDS.maxX),
    minY: formatNumber(DEFAULT_BOUNDS.minY),
    maxY: formatNumber(DEFAULT_BOUNDS.maxY),
    minZ: formatNumber(DEFAULT_BOUNDS.minZ),
    maxZ: formatNumber(DEFAULT_BOUNDS.maxZ),
  });

  const sortedConstraints = useMemo(
    () => [...constraints].sort((a, b) => b.updatedAt - a.updatedAt),
    [constraints]
  );

  const resetDraft = () => {
    setDraftLabel('');
    setDraftColorToken('');
    setDraftBounds({
      minX: formatNumber(DEFAULT_BOUNDS.minX),
      maxX: formatNumber(DEFAULT_BOUNDS.maxX),
      minY: formatNumber(DEFAULT_BOUNDS.minY),
      maxY: formatNumber(DEFAULT_BOUNDS.maxY),
      minZ: formatNumber(DEFAULT_BOUNDS.minZ),
      maxZ: formatNumber(DEFAULT_BOUNDS.maxZ),
    });
  };

  const handleCreateConstraint = () => {
    const normalizedLabel = draftLabel.trim();
    if (!normalizedLabel) {
      return;
    }

    const bounds: AxisAlignedCubeBounds = {
      minX: toNumber(draftBounds.minX, DEFAULT_BOUNDS.minX),
      maxX: toNumber(draftBounds.maxX, DEFAULT_BOUNDS.maxX),
      minY: toNumber(draftBounds.minY, DEFAULT_BOUNDS.minY),
      maxY: toNumber(draftBounds.maxY, DEFAULT_BOUNDS.maxY),
      minZ: toNumber(draftBounds.minZ, DEFAULT_BOUNDS.minZ),
      maxZ: toNumber(draftBounds.maxZ, DEFAULT_BOUNDS.maxZ),
    };

    createConstraint({
      label: normalizedLabel,
      geometry: {
        shape: 'axis-aligned-cube',
        bounds,
      },
      colorToken: draftColorToken.trim() || undefined,
    });

    resetDraft();
  };

  const handleUpdateBounds = (constraintId: string, bounds: AxisAlignedCubeBounds, key: BoundsKey, value: string) => {
    updateConstraint(constraintId, {
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          ...bounds,
          [key]: toNumber(value, bounds[key]),
        },
      },
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3" aria-label="Spatial constraint manager">
      <header className="space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Spatial constraints</h2>
        <p className="text-[11px] text-slate-400">Create and manage multiple cube regions inline.</p>
      </header>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <input
          type="text"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          placeholder="Constraint label"
          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <input
          type="text"
          value={draftColorToken}
          onChange={(event) => setDraftColorToken(event.target.value)}
          placeholder="Color token (optional)"
          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 placeholder:text-slate-500"
        />

        <div className="grid grid-cols-2 gap-2">
          {BOUNDS_FIELDS.map((field) => (
            <label key={field.key} className="space-y-1 text-[10px] text-slate-400">
              <span>{field.label}</span>
              <input
                type="number"
                value={draftBounds[field.key]}
                onChange={(event) =>
                  setDraftBounds((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateConstraint}
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-cyan-400/70 bg-cyan-500/10 text-xs font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
        >
          Add constraint
        </button>
      </div>

      <div className="space-y-2">
        {sortedConstraints.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
            No constraints yet. Add one to anchor the sandbox region workflow.
          </p>
        ) : null}

        {sortedConstraints.map((constraint) => {
          const isActive = activeConstraintId === constraint.id;
          const bounds = constraint.geometry.bounds;

          return (
            <article key={constraint.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={constraint.label}
                  onChange={(event) => updateConstraint(constraint.id, { label: event.target.value })}
                  className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setActiveConstraint(isActive ? null : constraint.id)}
                  className={`h-8 rounded-md border px-2 text-[11px] font-medium transition ${
                    isActive
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isActive ? 'Active' : 'Set active'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {BOUNDS_FIELDS.map((field) => (
                  <label key={`${constraint.id}-${field.key}`} className="space-y-1 text-[10px] text-slate-400">
                    <span>{field.label}</span>
                    <input
                      type="number"
                      value={formatNumber(bounds[field.key])}
                      onChange={(event) => handleUpdateBounds(constraint.id, bounds, field.key, event.target.value)}
                      className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={constraint.colorToken ?? ''}
                  onChange={(event) => updateConstraint(constraint.id, { colorToken: event.target.value })}
                  placeholder="Color token"
                  className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={() => toggleConstraintEnabled(constraint.id)}
                  className={`h-8 rounded-md border px-2 text-[11px] font-medium transition ${
                    constraint.enabled
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300'
                      : 'border-amber-400/70 bg-amber-500/10 text-amber-100 hover:border-amber-300'
                  }`}
                >
                  {constraint.enabled ? 'Enabled' : 'Disabled'}
                </button>

                <button
                  type="button"
                  onClick={() => removeConstraint(constraint.id)}
                  className="h-8 rounded-md border border-rose-400/70 bg-rose-500/10 px-2 text-[11px] font-medium text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
