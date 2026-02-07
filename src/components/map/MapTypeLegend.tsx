"use client";

import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { getCrimeTypeId } from '@/lib/category-maps';

const ORDERED_TYPES = ['THEFT', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'VANDALISM', 'OTHER'];
const LABELS: Record<string, string> = {
  THEFT: 'Theft',
  ASSAULT: 'Assault',
  BURGLARY: 'Burglary',
  ROBBERY: 'Robbery',
  VANDALISM: 'Vandalism',
  OTHER: 'Other'
};

interface MapTypeLegendProps {
  selectedTypes: number[];
  hoveredTypeId?: number | null;
  onHoverType?: (id: number | null) => void;
  onToggleType?: (id: number) => void;
}

export function MapTypeLegend({
  selectedTypes,
  hoveredTypeId,
  onHoverType,
  onToggleType
}: MapTypeLegendProps) {
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  const isAllSelected = selectedTypes.length === 0;

  return (
    <div className="rounded-md border border-border bg-background/85 backdrop-blur px-3 py-2 text-xs text-muted-foreground shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Crime Types</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {ORDERED_TYPES.map((key) => {
          const color = palette.categoryColors[key];
          if (!color) return null;
          const id = getCrimeTypeId(LABELS[key] || key);
          const isActive = isAllSelected || selectedTypes.includes(id);
          const isHovered = hoveredTypeId === id;
          return (
            <button
              key={key}
              type="button"
              onMouseEnter={() => onHoverType?.(id)}
              onMouseLeave={() => onHoverType?.(null)}
              onClick={() => onToggleType?.(id)}
              className={`flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors ${
                isHovered ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${isActive ? '' : 'opacity-30'}`}
                style={{ backgroundColor: color }}
              />
              <span className={isActive ? '' : 'opacity-50'}>{LABELS[key] || key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
