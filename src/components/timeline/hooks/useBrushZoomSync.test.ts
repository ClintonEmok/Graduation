import { describe, expect, it, vi } from 'vitest';
import { applyRangeToStoresContract } from '../DualTimeline';
import {
  applyBrushSelectionToRange,
  applyZoomDomainToRange,
  withSyncGuard,
} from './useBrushZoomSync';

const buildStoreContract = () => {
  const setTimeRange = vi.fn();
  const setRange = vi.fn();
  const setBrushRange = vi.fn();
  const setViewport = vi.fn();
  const setTime = vi.fn();

  const applyRangeToStores = (startSec: number, endSec: number) => {
    applyRangeToStoresContract({
      interactive: true,
      startSec,
      endSec,
      domainStart: 0,
      domainEnd: 100,
      currentTime: 50,
      setTimeRange,
      setRange,
      setBrushRange,
      setViewport,
      setTime,
    });
  };

  return {
    applyRangeToStores,
    setTimeRange,
    setRange,
    setBrushRange,
    setViewport,
    setTime,
  };
};

describe('useBrushZoomSync', () => {
  it('prevents recursive sync when isSyncingRef is already active', () => {
    const isSyncingRef = { current: true };
    const callback = vi.fn();

    const didRun = withSyncGuard(isSyncingRef, callback);

    expect(didRun).toBe(false);
    expect(callback).not.toHaveBeenCalled();
    expect(isSyncingRef.current).toBe(true);
  });

  it('resets isSyncingRef after guarded callback execution', () => {
    const isSyncingRef = { current: false };
    const callback = vi.fn();

    const didRun = withSyncGuard(isSyncingRef, callback);

    expect(didRun).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(isSyncingRef.current).toBe(false);
  });

  it('routes brush selection updates through applyRangeToStores unified contract', () => {
    const contract = buildStoreContract();

    const transform = applyBrushSelectionToRange({
      selection: [20, 80],
      invert: (value) => new Date(value * 1000),
      overviewInnerWidth: 100,
      setBrushRange: contract.setBrushRange,
      applyRangeToStores: contract.applyRangeToStores,
    });

    expect(transform).toEqual({ scale: 1.6666666666666667, translateX: -20 });
    expect(contract.setTimeRange).toHaveBeenCalledWith([20, 80]);
    expect(contract.setRange).toHaveBeenCalledWith([20, 80]);
    expect(contract.setBrushRange).toHaveBeenCalledWith([20, 80]);
    expect(contract.setViewport).toHaveBeenCalledWith(20, 80);
    expect(contract.setTime).not.toHaveBeenCalled();
  });

  it('routes zoom domain updates through applyRangeToStores unified contract', () => {
    const contract = buildStoreContract();

    const brushSelection = applyZoomDomainToRange({
      domain: [new Date(25_000), new Date(75_000)],
      overviewScale: (value) => value.getTime() / 1000,
      applyRangeToStores: contract.applyRangeToStores,
    });

    expect(brushSelection).toEqual([25, 75]);
    expect(contract.setTimeRange).toHaveBeenCalledWith([25, 75]);
    expect(contract.setRange).toHaveBeenCalledWith([25, 75]);
    expect(contract.setBrushRange).toHaveBeenCalledWith([25, 75]);
    expect(contract.setViewport).toHaveBeenCalledWith(25, 75);
    expect(contract.setTime).not.toHaveBeenCalled();
  });
});
