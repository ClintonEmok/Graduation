import { useMemo } from 'react';
import type { ScaleTime } from 'd3-scale';
import { useSliceStore } from '@/store/useSliceStore';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';

interface CommittedSliceLayerProps {
  scale: ScaleTime<number, number>;
  height: number;
  domainSec: [number, number];
}

interface SliceGeometry {
  id: string;
  left: number;
  width: number;
  isActive: boolean;
  isPoint: boolean;
  isRange: boolean;
}

const clampNormalized = (value: number) => Math.max(0, Math.min(100, value));

export function CommittedSliceLayer({ scale, height, domainSec }: CommittedSliceLayerProps) {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const draggingSliceId = useSliceAdjustmentStore((state) => state.draggingSliceId);
  const setHover = useSliceAdjustmentStore((state) => state.setHover);
  const isAdjustmentDragActive = draggingSliceId !== null;

  const geometries = useMemo<SliceGeometry[]>(() => {
    const [domainStartSec, domainEndSec] = domainSec;
    const minDomainSec = Math.min(domainStartSec, domainEndSec);
    const maxDomainSec = Math.max(domainStartSec, domainEndSec);
    const spanSec = Math.max(1, maxDomainSec - minDomainSec);
    const [rangeStart, rangeEnd] = scale.range();
    const minRange = Math.min(rangeStart, rangeEnd);
    const maxRange = Math.max(rangeStart, rangeEnd);

    const clampRange = (value: number) => Math.max(minRange, Math.min(maxRange, value));

    const toDate = (normalized: number) =>
      new Date((minDomainSec + (clampNormalized(normalized) / 100) * spanSec) * 1000);

    return slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          const [rawStart, rawEnd] = slice.range;
          const startNorm = clampNormalized(Math.min(rawStart, rawEnd));
          const endNorm = clampNormalized(Math.max(rawStart, rawEnd));
          const startXRaw = scale(toDate(startNorm));
          const endXRaw = scale(toDate(endNorm));
          const leftRaw = Math.min(startXRaw, endXRaw);
          const rightRaw = Math.max(startXRaw, endXRaw);

          if (rightRaw < minRange || leftRaw > maxRange) {
            return null;
          }

          const left = clampRange(leftRaw);
          const right = clampRange(rightRaw);
          const width = Math.max(2, right - left);

          return {
            id: slice.id,
            left,
            width,
            isActive: activeSliceId === slice.id,
            isPoint: false,
            isRange: true,
          };
        }

        const pointNorm = clampNormalized(slice.time);
        const x = scale(toDate(pointNorm));
        if (x < minRange || x > maxRange) {
          return null;
        }
        const width = 2;

        return {
          id: slice.id,
          left: x - width / 2,
          width,
          isActive: activeSliceId === slice.id,
          isPoint: true,
          isRange: false,
        };
      })
      .filter((geometry): geometry is SliceGeometry => geometry !== null);
  }, [activeSliceId, domainSec, scale, slices]);

  const orderedGeometries = useMemo(
    () => [...geometries].sort((a, b) => Number(a.isActive) - Number(b.isActive)),
    [geometries]
  );

  if (orderedGeometries.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {orderedGeometries.map((geometry) => (
        <div
          key={geometry.id}
          className={`absolute top-0 rounded-sm border transition-[background-color,border-color,box-shadow,opacity] ${
            geometry.isRange ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            geometry.isActive
              ? 'border-amber-200 bg-amber-300/60 shadow-[0_0_0_2px_rgba(251,191,36,0.55)]'
              : geometry.isPoint
                ? 'border-cyan-200/70 bg-cyan-300/50'
                : 'border-cyan-300/45 bg-cyan-400/20'
          }`}
          style={{
            left: geometry.left,
            width: geometry.width,
            height,
            zIndex: geometry.isActive ? 2 : 1,
            opacity:
              isAdjustmentDragActive && draggingSliceId !== geometry.id
                ? geometry.isPoint
                  ? 0.25
                  : 0.2
                : 1,
          }}
          onPointerEnter={
            geometry.isRange
              ? () => {
                  setHover(geometry.id, null);
                }
              : undefined
          }
          onPointerLeave={
            geometry.isRange
              ? () => {
                  setHover(null, null);
                }
              : undefined
          }
          aria-hidden={geometry.isPoint}
          role={geometry.isRange ? 'presentation' : undefined}
          data-slice-id={geometry.id}
          data-slice-kind={geometry.isRange ? 'range' : 'point'}
          data-adjustment-dimmed={
            isAdjustmentDragActive && draggingSliceId !== geometry.id ? 'true' : 'false'
          }
          data-adjustment-active={draggingSliceId === geometry.id ? 'true' : 'false'}
          data-handle-hover-target={geometry.isRange ? 'true' : 'false'}
        />
      ))}
    </div>
  );
}
