// @vitest-environment jsdom
import React, { act, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { scaleUtc } from 'd3-scale';
import { useBrushZoomSync, withSyncGuard } from '@/components/timeline/hooks/useBrushZoomSync';

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

describe('useBrushZoomSync DOM wiring', () => {
  const Harness = () => {
    const brushRef = useRef<SVGGElement | null>(null);
    const overviewSvgRef = useRef<SVGSVGElement | null>(null);
    const detailSvgRef = useRef<SVGSVGElement | null>(null);
    const zoomRef = useRef<SVGRectElement | null>(null);
    const isSyncingRef = useRef(false);
    const overviewInteractionScale = useMemo(
      () => scaleUtc().domain([new Date(0), new Date(100_000)]).range([0, 240]),
      []
    );

    useBrushZoomSync({
      interactive: true,
      detailInnerWidth: 320,
      detailRangeSec: [10, 60],
      overviewInnerWidth: 240,
      overviewInteractionScale,
      isSyncingRef,
      brushRef,
      overviewSvgRef,
      detailSvgRef,
      zoomRef,
      setBrushRange: vi.fn(),
      applyRangeToStores: vi.fn(),
    });

    return (
      <>
        <svg ref={overviewSvgRef}>
          <g ref={brushRef} data-testid="brush-node" />
        </svg>
        <svg ref={detailSvgRef}>
          <rect ref={zoomRef} data-testid="zoom-node" />
        </svg>
      </>
    );
  };

  it('registers and cleans up brush/zoom listeners', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
    });

    const brushNode = container.querySelector('[data-testid="brush-node"]') as SVGGElement & {
      __on?: Array<{ name?: string }>;
    };
    const zoomNode = container.querySelector('[data-testid="zoom-node"]') as SVGRectElement & {
      __on?: Array<{ name?: string }>;
    };

    expect(brushNode).toBeTruthy();
    expect(zoomNode).toBeTruthy();
    expect((brushNode.__on ?? []).some((entry) => entry.name === 'brush')).toBe(true);
    expect((zoomNode.__on ?? []).some((entry) => entry.name === 'zoom')).toBe(true);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });

    expect((brushNode.__on ?? []).some((entry) => entry.name === 'brush')).toBe(false);
    expect((zoomNode.__on ?? []).some((entry) => entry.name === 'zoom')).toBe(false);

    container.remove();
  });
});
