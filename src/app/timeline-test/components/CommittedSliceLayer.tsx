import { useMemo, type MouseEvent } from 'react';
import type { ScaleTime } from 'd3-scale';
import { useSliceStore } from '@/store/useSliceStore';
import { useSliceAdjustmentStore } from '@/store/useSliceAdjustmentStore';
import { useSliceSelectionStore } from '@/store/useSliceSelectionStore';

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
  isSelected: boolean;
  isBurst: boolean;
  isPoint: boolean;
  isRange: boolean;
  color: string | undefined;
}

const clampNormalized = (value: number) => Math.max(0, Math.min(100, value));

const getColorClasses = (color?: string): { bg: string; border: string } => {
  const colors: Record<string, { bg: string; border: string }> = {
    amber: { bg: 'bg-amber-400/50', border: 'border-amber-300' },
    blue: { bg: 'bg-blue-400/50', border: 'border-blue-300' },
    green: { bg: 'bg-green-400/50', border: 'border-green-300' },
    red: { bg: 'bg-red-400/50', border: 'border-red-300' },
    purple: { bg: 'bg-purple-400/50', border: 'border-purple-300' },
    cyan: { bg: 'bg-cyan-400/50', border: 'border-cyan-300' },
    pink: { bg: 'bg-pink-400/50', border: 'border-pink-300' },
    gray: { bg: 'bg-slate-400/50', border: 'border-slate-300' },
  };

  return colors[color || ''] || { bg: '', border: '' };
};

export function CommittedSliceLayer({ scale, height, domainSec }: CommittedSliceLayerProps) {
  const slices = useSliceStore((state) => state.slices);
  const activeSliceId = useSliceStore((state) => state.activeSliceId);
  const setActiveSlice = useSliceStore((state) => state.setActiveSlice);
  const draggingSliceId = useSliceAdjustmentStore((state) => state.draggingSliceId);
  const setHover = useSliceAdjustmentStore((state) => state.setHover);
  const selectedIds = useSliceSelectionStore((state) => state.selectedIds);
  const selectSlice = useSliceSelectionStore((state) => state.selectSlice);
  const toggleSlice = useSliceSelectionStore((state) => state.toggleSlice);
  const clearSelection = useSliceSelectionStore((state) => state.clearSelection);
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
            isSelected: selectedIds.has(slice.id),
            isBurst: !!slice.isBurst,
            isPoint: false,
            isRange: true,
            color: slice.color,
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
          left: clampRange(x - width / 2),
          width,
          isActive: activeSliceId === slice.id,
          isSelected: selectedIds.has(slice.id),
          isBurst: !!slice.isBurst,
          isPoint: true,
          isRange: false,
          color: slice.color,
        };
      })
      .filter((geometry): geometry is SliceGeometry => geometry !== null);
  }, [activeSliceId, domainSec, scale, selectedIds, slices]);

  const orderedGeometries = useMemo(() => {
    const stackWeight = (geometry: SliceGeometry) => {
      let weight = 0;
      if (geometry.isSelected) {
        weight += 1;
      }
      if (geometry.isActive) {
        weight += 2;
      }
      return weight;
    };

    return [...geometries].sort((a, b) => stackWeight(a) - stackWeight(b));
  }, [geometries]);

  const handleBackgroundClick = () => {
    clearSelection();
    setActiveSlice(null);
  };

  const handleSliceClick = (event: MouseEvent<HTMLDivElement>, sliceId: string) => {
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      const wasSelected = selectedIds.has(sliceId);
      toggleSlice(sliceId);
      setActiveSlice(wasSelected && activeSliceId === sliceId ? null : sliceId);
      return;
    }

    selectSlice(sliceId);
    setActiveSlice(sliceId);
  };

  if (orderedGeometries.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-10" onClick={handleBackgroundClick}>
      {orderedGeometries.map((geometry) => {
        const colorClasses = getColorClasses(geometry.color);
        const hasCustomColor = colorClasses.bg.length > 0;

        return (
          <div
          key={geometry.id}
          className={`absolute top-0 cursor-pointer rounded-sm border transition-[background-color,border-color,box-shadow,opacity] ${colorClasses.border} ${colorClasses.bg} ${
            geometry.isActive && geometry.isBurst
              ? 'border-orange-300 bg-orange-400/60 shadow-[0_0_0_2px_rgba(251,146,60,0.55)]'
              : geometry.isActive
                ? 'border-amber-200 bg-amber-300/60 shadow-[0_0_0_2px_rgba(251,191,36,0.55)]'
                : geometry.isSelected && geometry.isBurst
                  ? 'border-blue-300/80 bg-blue-500/40 shadow-[0_0_0_2px_rgba(96,165,250,0.4)]'
                  : geometry.isSelected
                    ? 'border-blue-300/80 bg-blue-500/35 shadow-[0_0_0_2px_rgba(96,165,250,0.35)]'
                    : geometry.isBurst
                      ? hasCustomColor
                        ? ''
                        : 'border-orange-400/60 bg-orange-500/30'
                      : geometry.isPoint
                        ? hasCustomColor
                          ? ''
                          : 'border-cyan-200/70 bg-cyan-300/50'
                        : hasCustomColor
                          ? ''
                          : 'border-cyan-300/45 bg-cyan-400/20'
          }`}
          style={{
            left: geometry.left,
            width: geometry.width,
            height,
            zIndex: geometry.isActive ? 3 : geometry.isSelected ? 2 : 1,
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
          onClick={(event) => handleSliceClick(event, geometry.id)}
          aria-hidden={geometry.isPoint}
          role={geometry.isRange ? 'presentation' : undefined}
          data-slice-id={geometry.id}
          data-slice-kind={geometry.isRange ? 'range' : 'point'}
          data-slice-origin={geometry.isBurst ? 'burst' : 'manual'}
          data-adjustment-dimmed={
            isAdjustmentDragActive && draggingSliceId !== geometry.id ? 'true' : 'false'
          }
          data-adjustment-active={draggingSliceId === geometry.id ? 'true' : 'false'}
          data-handle-hover-target={geometry.isRange ? 'true' : 'false'}
        />
        );
      })}
    </div>
  );
}
