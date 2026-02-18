import { useMemo } from 'react';
import type { ScaleTime } from 'd3-scale';
import { useSliceStore } from '@/store/useSliceStore';

interface CommittedSliceLayerProps {
  scale: ScaleTime<number, number>;
  height: number;
}

interface SliceGeometry {
  id: string;
  left: number;
  width: number;
  isActive: boolean;
  isPoint: boolean;
}

const clampNormalized = (value: number) => Math.max(0, Math.min(100, value));

export function CommittedSliceLayer({ scale, height }: CommittedSliceLayerProps) {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);

  const geometries = useMemo<SliceGeometry[]>(() => {
    const [domainStartDate, domainEndDate] = scale.domain();
    const domainStartMs = domainStartDate.getTime();
    const domainEndMs = domainEndDate.getTime();
    const spanMs = Math.max(1, domainEndMs - domainStartMs);

    const toDate = (normalized: number) =>
      new Date(domainStartMs + (clampNormalized(normalized) / 100) * spanMs);

    return slices
      .filter((slice) => slice.isVisible)
      .map((slice) => {
        if (slice.type === 'range' && slice.range) {
          const [rawStart, rawEnd] = slice.range;
          const startNorm = clampNormalized(Math.min(rawStart, rawEnd));
          const endNorm = clampNormalized(Math.max(rawStart, rawEnd));
          const startX = scale(toDate(startNorm));
          const endX = scale(toDate(endNorm));
          const left = Math.min(startX, endX);
          const width = Math.max(2, Math.abs(endX - startX));

          return {
            id: slice.id,
            left,
            width,
            isActive: activeSliceId === slice.id,
            isPoint: false,
          };
        }

        const pointNorm = clampNormalized(slice.time);
        const x = scale(toDate(pointNorm));
        const width = 2;

        return {
          id: slice.id,
          left: x - width / 2,
          width,
          isActive: activeSliceId === slice.id,
          isPoint: true,
        };
      });
  }, [activeSliceId, scale, slices]);

  if (geometries.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {geometries.map((geometry) => (
        <div
          key={geometry.id}
          className={`absolute top-0 rounded-sm border transition-colors ${
            geometry.isActive
              ? 'border-amber-300/95 bg-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]'
              : geometry.isPoint
                ? 'border-cyan-200/70 bg-cyan-300/50'
                : 'border-cyan-300/45 bg-cyan-400/20'
          }`}
          style={{
            left: geometry.left,
            width: geometry.width,
            height,
          }}
        />
      ))}
    </div>
  );
}
