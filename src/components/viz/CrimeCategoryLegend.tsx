"use client";

import { useMemo } from 'react';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useCrimeData } from '@/hooks/useCrimeData';
import { buildCategoryLegendEntries } from '@/lib/category-legend';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';

interface CrimeCategoryLegendProps {
  title: string;
  description?: string;
  selectedTypes: number[];
  hoveredTypeId?: number | null;
  onHoverType?: (id: number | null) => void;
  onToggleType?: (id: number) => void;
  compact?: boolean;
}

export function CrimeCategoryLegend({
  title,
  description,
  selectedTypes,
  hoveredTypeId = null,
  onHoverType,
  onToggleType,
  compact = false,
}: CrimeCategoryLegendProps) {
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme].categoryColors;
  const startEpoch = useViewportStore((state) => state.startDate);
  const endEpoch = useViewportStore((state) => state.endDate);
  const crimeTypes = useViewportStore((state) => state.filters.crimeTypes);
  const districts = useViewportStore((state) => state.filters.districts);

  const { data: crimeRecords } = useCrimeData({
    startEpoch,
    endEpoch,
    crimeTypes: crimeTypes.length > 0 ? crimeTypes : undefined,
    districts: districts.length > 0 ? districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });

  const entries = useMemo(() => buildCategoryLegendEntries(crimeRecords ?? [], palette), [crimeRecords, palette]);
  const isAllSelected = selectedTypes.length === 0;

  return (
    <div className="rounded-md border border-border bg-background/85 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{title}</div>
      {description ? <div className="mt-1 text-[10px] text-muted-foreground/70">{description}</div> : null}
      <div className={`mt-2 grid ${compact ? 'grid-cols-1 gap-y-1' : 'grid-cols-2 gap-x-4 gap-y-1.5'}`}>
        {entries.map((entry) => {
          const isActive = isAllSelected || selectedTypes.includes(entry.typeId);
          const isHovered = hoveredTypeId === entry.typeId;
          const content = (
            <>
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'shadow-sm' : 'opacity-30'}`} style={{ backgroundColor: entry.color }} />
              <span className={isActive ? '' : 'opacity-55'}>{entry.label}</span>
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/80">{entry.count}</span>
            </>
          );

          if (!onToggleType) {
            return (
              <div key={entry.typeId} className={`flex items-center gap-2 rounded px-1 py-0.5 ${isHovered ? 'bg-muted/70 text-foreground ring-1 ring-foreground/10' : ''}`}>
                {content}
              </div>
            );
          }

          return (
            <button
              key={entry.typeId}
              type="button"
              onMouseEnter={() => onHoverType?.(entry.typeId)}
              onMouseLeave={() => onHoverType?.(null)}
              onClick={() => onToggleType(entry.typeId)}
              className={`flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors ${isHovered ? 'bg-muted/80 text-foreground ring-1 ring-foreground/10' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
