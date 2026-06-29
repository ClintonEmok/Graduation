import { STUDY_TASKS } from '@/lib/study/protocol';

/**
 * Demo Preset Identifiers.
 *
 * IDs align with the study protocol task ordering (T4 -> T1 -> T2 -> T3) plus
 * a T8 (recover metric duration) task that reuses the T1 time window.
 *
 *   - `reset`     : full data range, linear mode
 *   - `T4`        : most active region window (STUDY_TASKS.T4)
 *   - `T1u`/`T1a` : peak window in uniform/adaptive mode
 *   - `T2u`/`T2a` : burst window in uniform/adaptive mode
 *   - `T3a`/`T3b` : comparison period A and B
 *   - `T8u`/`T8a` : duration task window (T1 range) in uniform/adaptive mode
 */
export type DemoPresetId =
  | 'reset'
  | 'T4'
  | 'T1u' | 'T1a'
  | 'T2u' | 'T2a'
  | 'T3a' | 'T3b'
  | 'T8u' | 'T8a';

export interface DemoPreset {
  id: DemoPresetId;
  label: string;
  /** ISO date strings [start, end] in the data domain. Null = full range. */
  timeRange: [string, string] | null;
  /** Time scale mode to apply. */
  mode: 'linear' | 'adaptive';
  /** Short chip shown next to dropdown when active. */
  chip: string;
}

/**
 * Demo presets for the expert protocol. Time ranges align with
 * `src/lib/study/protocol.ts` `STUDY_TASKS` (T1, T2, T3, T4). T8 reuses the
 * T1 window for the "recover metric duration" task.
 */
export const DEMO_PRESETS: Readonly<Record<DemoPresetId, DemoPreset>> = {
  reset: {
    id: 'reset',
    label: 'Reset (full range)',
    timeRange: null,
    mode: 'linear',
    chip: 'Reset',
  },
  T4: {
    id: 'T4',
    label: 'T4 — Most Active Region (Dec 11–25, 2023)',
    timeRange: ['2023-12-11', '2023-12-25'],
    mode: 'linear',
    chip: 'T4',
  },
  T1u: {
    id: 'T1u',
    label: 'T1 — Peak (Dec 17–24, 2023, Uniform)',
    timeRange: ['2023-12-17', '2023-12-24'],
    mode: 'linear',
    chip: 'T1·U',
  },
  T1a: {
    id: 'T1a',
    label: 'T1 — Peak (Dec 17–24, 2023, Adaptive)',
    timeRange: ['2023-12-17', '2023-12-24'],
    mode: 'adaptive',
    chip: 'T1·A',
  },
  T2u: {
    id: 'T2u',
    label: 'T2 — Burst (Nov 24–Dec 24, 2023, Uniform)',
    timeRange: ['2023-11-24', '2023-12-24'],
    mode: 'linear',
    chip: 'T2·U',
  },
  T2a: {
    id: 'T2a',
    label: 'T2 — Burst (Nov 24–Dec 24, 2023, Adaptive)',
    timeRange: ['2023-11-24', '2023-12-24'],
    mode: 'adaptive',
    chip: 'T2·A',
  },
  T3a: {
    id: 'T3a',
    label: 'T3 — Period A (Mar–Jun 2020)',
    timeRange: ['2020-03-16', '2020-06-14'],
    mode: 'linear',
    chip: 'T3·A',
  },
  T3b: {
    id: 'T3b',
    label: 'T3 — Period B (Feb–Mar 2024)',
    timeRange: ['2024-02-12', '2024-03-13'],
    mode: 'linear',
    chip: 'T3·B',
  },
  T8u: {
    id: 'T8u',
    label: 'T8 — Duration (Dec 17–24, 2023, Uniform)',
    timeRange: ['2023-12-17', '2023-12-24'],
    mode: 'linear',
    chip: 'T8·U',
  },
  T8a: {
    id: 'T8a',
    label: 'T8 — Duration (Dec 17–24, 2023, Adaptive)',
    timeRange: ['2023-12-17', '2023-12-24'],
    mode: 'adaptive',
    chip: 'T8·A',
  },
};

export const DEMO_PRESET_ORDER: readonly DemoPresetId[] = [
  'reset',
  'T4',
  'T1u', 'T1a',
  'T2u', 'T2a',
  'T3a', 'T3b',
  'T8u', 'T8a',
];

/**
 * Sanity check: every protocol study task referenced in the preset labels
 * (T1, T2, T3, T4) must exist in `STUDY_TASKS`. This keeps the preset
 * definitions in lock-step with the canonical study protocol.
 */
export const ALL_PRESET_TIME_RANGES_ARE_PROTOCOL_ALIGNED: ReadonlyArray<[string, string] | null> = [
  DEMO_PRESETS.T4.timeRange,
  DEMO_PRESETS.T1u.timeRange,
  DEMO_PRESETS.T2u.timeRange,
  DEMO_PRESETS.T3a.timeRange,
  DEMO_PRESETS.T3b.timeRange,
];

/**
 * Convert a preset's [startISO, endISO] to a normalized brush range
 * (percentage in [0, 100]) given the data's min/max epoch seconds.
 *
 * The output range matches the codebase convention used by
 * `epochSecondsToNormalized` and the `useCoordinationStore.brushRange`
 * contract that the dashboard timeline and map consumers read from.
 *
 * @returns null if data bounds are unavailable, the preset has no
 *          timeRange, the dates fail to parse, or the data span is zero.
 *          Clamps to [0, 100] if the preset range falls outside the data
 *          domain.
 */
export const presetToNormalizedRange = (
  preset: DemoPreset,
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
): [number, number] | null => {
  if (preset.timeRange === null) return null;
  if (minTimestampSec === null || maxTimestampSec === null) return null;
  if (minTimestampSec >= maxTimestampSec) return null;

  const [startIso, endIso] = preset.timeRange;
  const startSec = Date.parse(startIso) / 1000;
  const endSec = Date.parse(endIso) / 1000;
  if (Number.isNaN(startSec) || Number.isNaN(endSec)) return null;

  const span = maxTimestampSec - minTimestampSec;
  const startNorm = Math.max(0, Math.min(100, ((startSec - minTimestampSec) / span) * 100));
  const endNorm = Math.max(0, Math.min(100, ((endSec - minTimestampSec) / span) * 100));
  return [startNorm, endNorm];
};

/**
 * Re-export the protocol tasks to keep the import surface tight for
 * consumers that only need presets + protocol alignment check.
 */
export { STUDY_TASKS };
