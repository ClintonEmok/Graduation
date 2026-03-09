import { describe, expect, it, vi } from 'vitest';
import { withSyncGuard } from './useBrushZoomSync';

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
});
