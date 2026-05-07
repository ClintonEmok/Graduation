"use client";

import { useMemo, useState } from 'react';
import {
  useCubeSpatialConstraintsStore,
} from '@/store/useCubeSpatialConstraintsStore';
import { getDistrictName } from '@/lib/category-maps';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';

const DEFAULT_TEMPORAL_BOUNDS = { minY: 0, maxY: 10 };

type DistrictConstraintSeed = {
  districtId: number;
  districtCode: string;
  count: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function SpatialConstraintManager() {
  const columns = useTimelineDataStore((state) => state.columns);
  const constraints = useCubeSpatialConstraintsStore((state) => state.constraints);
  const activeConstraintId = useCubeSpatialConstraintsStore((state) => state.activeConstraintId);
  const createConstraint = useCubeSpatialConstraintsStore((state) => state.createConstraint);
  const updateConstraint = useCubeSpatialConstraintsStore((state) => state.updateConstraint);
  const removeConstraint = useCubeSpatialConstraintsStore((state) => state.removeConstraint);
  const toggleConstraintEnabled = useCubeSpatialConstraintsStore((state) => state.toggleConstraintEnabled);
  const setActiveConstraint = useCubeSpatialConstraintsStore((state) => state.setActiveConstraint);

  const [draftDistrictId, setDraftDistrictId] = useState('');

  const sortedConstraints = useMemo(
    () => [...constraints].sort((a, b) => b.updatedAt - a.updatedAt),
    [constraints]
  );

  const districtSeeds = useMemo<DistrictConstraintSeed[]>(() => {
    if (!columns || columns.length === 0) {
      return [];
    }

    const buckets = new Map<number, DistrictConstraintSeed>();
    const { district, x, z, length } = columns;

    for (let index = 0; index < length; index += 1) {
      const districtId = district[index] ?? 0;
      if (districtId <= 0) {
        continue;
      }

      const pointX = x[index];
      const pointZ = z[index];

      if (!Number.isFinite(pointX) || !Number.isFinite(pointZ)) {
        continue;
      }

      const existing = buckets.get(districtId);
      if (existing) {
        existing.count += 1;
        existing.minX = Math.min(existing.minX, pointX);
        existing.maxX = Math.max(existing.maxX, pointX);
        existing.minZ = Math.min(existing.minZ, pointZ);
        existing.maxZ = Math.max(existing.maxZ, pointZ);
        continue;
      }

      buckets.set(districtId, {
        districtId,
        districtCode: getDistrictName(districtId),
        count: 1,
        minX: pointX,
        maxX: pointX,
        minZ: pointZ,
        maxZ: pointZ,
      });
    }

    return [...buckets.values()].sort((left, right) => left.districtId - right.districtId);
  }, [columns]);

  const temporalBounds = useMemo(() => {
    if (!columns || columns.length === 0) {
      return DEFAULT_TEMPORAL_BOUNDS;
    }

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < columns.length; index += 1) {
      const value = columns.timestamp[index];
      if (!Number.isFinite(value)) {
        continue;
      }
      minY = Math.min(minY, value);
      maxY = Math.max(maxY, value);
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return DEFAULT_TEMPORAL_BOUNDS;
    }

    return { minY, maxY };
  }, [columns]);

  const availableDistrictIds = useMemo(() => {
    return new Set(
      constraints
        .map((constraint) => {
          const match = constraint.label.match(/^District\s+(\d{3})$/i);
          return match?.[1] ? Number(match[1]) : null;
        })
        .filter((value): value is number => value !== null)
    );
  }, [constraints]);

  const handleCreateFromDistrict = () => {
    const districtId = Number(draftDistrictId);
    if (!Number.isFinite(districtId) || districtId <= 0) {
      return;
    }

    const seed = districtSeeds.find((item) => item.districtId === districtId);
    if (!seed) {
      return;
    }

    createConstraint({
      label: `District ${seed.districtCode}`,
      geometry: {
        shape: 'axis-aligned-cube',
        bounds: {
          minX: seed.minX,
          maxX: seed.maxX,
          minY: temporalBounds.minY,
          maxY: temporalBounds.maxY,
          minZ: seed.minZ,
          maxZ: seed.maxZ,
        },
      },
    });

    setDraftDistrictId('');
  };

  return (
    <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3" aria-label="Spatial constraint manager">
      <header className="space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Spatial constraints</h2>
        <p className="text-[11px] text-slate-400">Create and manage multiple cube regions inline.</p>
      </header>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <div className="space-y-1 rounded-md border border-slate-700/70 bg-slate-950/70 p-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Quick add by district</p>
          <p className="text-[11px] text-slate-500">
            Pick a Chicago district to create a spatial constraint automatically.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={draftDistrictId}
              onChange={(event) => setDraftDistrictId(event.target.value)}
              className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
            >
              <option value="">Select district</option>
              {districtSeeds.map((seed) => {
                const alreadyAdded = availableDistrictIds.has(seed.districtId);
                return (
                  <option key={seed.districtId} value={seed.districtId} disabled={alreadyAdded}>
                    District {seed.districtCode} ({seed.count.toLocaleString()} events)
                    {alreadyAdded ? ' - already added' : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={handleCreateFromDistrict}
              disabled={!draftDistrictId}
              className="inline-flex h-8 items-center justify-center rounded-md border border-cyan-400/70 bg-cyan-500/10 px-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sortedConstraints.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-2 py-3 text-[11px] text-slate-500">
            No constraints yet. Add one to anchor the sandbox region workflow.
          </p>
        ) : null}

        {sortedConstraints.map((constraint) => {
          const isActive = activeConstraintId === constraint.id;

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
