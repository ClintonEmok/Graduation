import { useCallback, useMemo } from 'react';
import { useStore } from 'zustand';
import { useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';

export interface DemoEvolutionSliceInput {
  id: string;
  type: 'point' | 'range';
  time: number;
  range?: [number, number];
  isVisible: boolean;
  name?: string;
}

export interface DemoEvolutionFrame {
  id: string;
  label: string;
  center: number;
  isActive: boolean;
  index: number;
}

export interface DemoEvolutionSequence {
  orderedSliceIds: string[];
  frames: DemoEvolutionFrame[];
  activeSliceId: string | null;
  activeIndex: number;
  previousSliceId: string | null;
  nextSliceId: string | null;
  playbackLabel: string;
  isEmpty: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
}

export interface BuildDemoEvolutionSequenceInput {
  slices: DemoEvolutionSliceInput[];
  currentTime: number;
  isPlaying: boolean;
  speed: number;
}

const clampIndex = (index: number, length: number) => Math.min(Math.max(index, 0), Math.max(length - 1, 0));

const resolveCenter = (slice: DemoEvolutionSliceInput) => {
  if (slice.type === 'range' && slice.range) {
    const start = Math.min(slice.range[0], slice.range[1]);
    const end = Math.max(slice.range[0], slice.range[1]);
    return (start + end) / 2;
  }

  return slice.time;
};

const formatStepLabel = (index: number, total: number) => `step ${index + 1} of ${total}`;

export function buildDemoEvolutionSequence({
  slices,
  currentTime,
  isPlaying,
  speed,
}: BuildDemoEvolutionSequenceInput): DemoEvolutionSequence {
  const orderedSlices = slices
    .filter((slice) => slice.isVisible)
    .map((slice) => ({
      ...slice,
      center: resolveCenter(slice),
    }))
    .sort((left, right) => left.center - right.center || left.id.localeCompare(right.id));

  if (orderedSlices.length === 0) {
    return {
      orderedSliceIds: [],
      frames: [],
      activeSliceId: null,
      activeIndex: -1,
      previousSliceId: null,
      nextSliceId: null,
      playbackLabel: 'No slices available',
      isEmpty: true,
      canStepBackward: false,
      canStepForward: false,
    };
  }

  let activeIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  orderedSlices.forEach((slice, index) => {
    const distance = Math.abs(slice.center - currentTime);
    if (distance < smallestDistance || (distance === smallestDistance && index < activeIndex)) {
      smallestDistance = distance;
      activeIndex = index;
    }
  });

  const clampedIndex = clampIndex(activeIndex, orderedSlices.length);
  const frames = orderedSlices.map((slice, index) => ({
    id: slice.id,
    label: slice.name?.trim() || (slice.type === 'range' ? `Range ${index + 1}` : `Slice ${index + 1}`),
    center: slice.center,
    isActive: index === clampedIndex,
    index,
  }));

  const activeFrame = frames[clampedIndex] ?? null;
  const previousFrame = clampedIndex > 0 ? frames[clampedIndex - 1] ?? null : null;
  const nextFrame = clampedIndex < frames.length - 1 ? frames[clampedIndex + 1] ?? null : null;

  return {
    orderedSliceIds: frames.map((frame) => frame.id),
    frames,
    activeSliceId: activeFrame?.id ?? null,
    activeIndex: clampedIndex,
    previousSliceId: previousFrame?.id ?? null,
    nextSliceId: nextFrame?.id ?? null,
    playbackLabel: `${isPlaying ? 'Auto-play' : 'Paused'} · ${formatStepLabel(clampedIndex, frames.length)} · ${Math.max(0.25, speed).toFixed(2)}x`,
    isEmpty: false,
    canStepBackward: clampedIndex > 0,
    canStepForward: clampedIndex < frames.length - 1,
  };
}

export function useDemoEvolutionSequence() {
  const slices = useStore(useDashboardDemoSliceStore, (state) => state.slices);
  const currentTime = useDashboardDemoTimeStore((state) => state.currentTime);
  const isPlaying = useDashboardDemoTimeStore((state) => state.isPlaying);
  const speed = useDashboardDemoTimeStore((state) => state.speed);
  const setTime = useDashboardDemoTimeStore((state) => state.setTime);
  const setIsPlaying = useDashboardDemoTimeStore((state) => state.setIsPlaying);

  const sequence = useMemo(
    () =>
      buildDemoEvolutionSequence({
        slices,
        currentTime,
        isPlaying,
        speed,
      }),
    [currentTime, isPlaying, slices, speed]
  );

  const stepBackward = useCallback(() => {
    const previousFrame = sequence.activeIndex > 0 ? sequence.frames[sequence.activeIndex - 1] ?? null : null;
    if (previousFrame) {
      setTime(previousFrame.center);
    }
  }, [sequence, setTime]);

  const stepForward = useCallback(() => {
    const nextFrame = sequence.activeIndex < sequence.frames.length - 1 ? sequence.frames[sequence.activeIndex + 1] ?? null : null;
    if (nextFrame) {
      setTime(nextFrame.center);
      return;
    }

    setIsPlaying(false);
  }, [sequence, setIsPlaying, setTime]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const jumpToSliceId = useCallback((sliceId: string) => {
    const frame = sequence.frames.find((candidate) => candidate.id === sliceId) ?? null;
    if (!frame) {
      return;
    }

    setTime(frame.center);
  }, [sequence.frames, setTime]);

  return {
    ...sequence,
    isPlaying,
    speed,
    stepBackward,
    stepForward,
    jumpToSliceId,
    togglePlayback,
  };
}
