import type { EvolvingSlice } from './types';

export type DurationVolumeNormalizationMode = 'window' | 'reference';

export interface DurationVolumeSettings {
  scaleSeconds: number;
  exaggeration: number;
  normalizationMode: DurationVolumeNormalizationMode;
}

export interface DurationVolumeSourceSlice {
  index: number;
  startEpoch: number;
  endEpoch: number;
}

export interface DurationVolumeProfileEntry {
  index: number;
  durationSeconds: number;
  normalizedDuration: number;
  thickness: number;
  opacity: number;
  falloff: number;
}

export const DEFAULT_DURATION_VOLUME_SETTINGS: DurationVolumeSettings = {
  scaleSeconds: 12 * 60 * 60,
  exaggeration: 1.15,
  normalizationMode: 'window',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function resolveDuration(slice: Pick<DurationVolumeSourceSlice, 'startEpoch' | 'endEpoch'>): number {
  return Math.max(0, slice.endEpoch - slice.startEpoch);
}

export function buildDurationVolumeProfile(
  slices: Array<DurationVolumeSourceSlice | EvolvingSlice>,
  settings: Partial<DurationVolumeSettings> = {},
): DurationVolumeProfileEntry[] {
  if (slices.length === 0) return [];

  const resolvedSettings: DurationVolumeSettings = {
    scaleSeconds: Math.max(1, Math.floor(settings.scaleSeconds ?? DEFAULT_DURATION_VOLUME_SETTINGS.scaleSeconds)),
    exaggeration: clamp(settings.exaggeration ?? DEFAULT_DURATION_VOLUME_SETTINGS.exaggeration, 0.1, 4),
    normalizationMode: settings.normalizationMode ?? DEFAULT_DURATION_VOLUME_SETTINGS.normalizationMode,
  };

  const durations = slices.map((slice) => resolveDuration(slice));
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const durationSpan = Math.max(1, maxDuration - minDuration);
  const countCompensation = clamp(1 - Math.log2(slices.length + 1) * 0.04, 0.72, 1);

  return slices.map((slice, index) => {
    const durationSeconds = durations[index] ?? 0;
    const referenceRatio = clamp(durationSeconds / resolvedSettings.scaleSeconds, 0, 1);
    const windowRatio = durationSpan === 0 ? (durationSeconds > 0 ? 1 : 0) : clamp((durationSeconds - minDuration) / durationSpan, 0, 1);
    const normalizedDuration = clamp(
      ((resolvedSettings.normalizationMode === 'reference' ? referenceRatio : referenceRatio * 0.65 + windowRatio * 0.35) * countCompensation),
      0,
      1,
    );
    const eased = normalizedDuration ** 0.9;
    const thickness = clamp(lerp(0.85, 5.8, eased) * resolvedSettings.exaggeration, 0.6, 8.5);
    const opacity = clamp(lerp(0.28, 0.12, eased), 0.08, 0.34);
    const falloff = clamp(lerp(0.1, 0.28, 1 - eased), 0.06, 0.28);

    return {
      index: slice.index,
      durationSeconds,
      normalizedDuration,
      thickness,
      opacity,
      falloff,
    } satisfies DurationVolumeProfileEntry;
  });
}
