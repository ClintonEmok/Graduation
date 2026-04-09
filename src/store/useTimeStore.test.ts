/* @vitest-environment node */
import { beforeEach, describe, expect, it } from 'vitest';
import { useTimeStore } from './useTimeStore';

describe('useTimeStore range clamping', () => {
  beforeEach(() => {
    useTimeStore.setState({
      currentTime: 50,
      isPlaying: false,
      timeRange: [0, 100],
    });
  });

  it('clamps current time when the active range shrinks', () => {
    useTimeStore.setState({ currentTime: 90 });

    useTimeStore.getState().setRange([10, 20]);

    expect(useTimeStore.getState().timeRange).toEqual([10, 20]);
    expect(useTimeStore.getState().currentTime).toBe(20);
  });

  it('normalizes reversed ranges before storing them', () => {
    useTimeStore.getState().setRange([30, 10]);

    expect(useTimeStore.getState().timeRange).toEqual([10, 30]);
  });

  it('keeps stepTime bounded by the current range', () => {
    useTimeStore.setState({ currentTime: 20, timeRange: [10, 20] });

    useTimeStore.getState().stepTime(1);

    expect(useTimeStore.getState().currentTime).toBe(20);
  });
});
