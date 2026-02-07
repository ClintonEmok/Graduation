"use client";

import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';

const ORDERED_TYPES = ['THEFT', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'VANDALISM', 'OTHER'];
const LABELS: Record<string, string> = {
  THEFT: 'Theft',
  ASSAULT: 'Assault',
  BURGLARY: 'Burglary',
  ROBBERY: 'Robbery',
  VANDALISM: 'Vandalism',
  OTHER: 'Other'
};

export function MapTypeLegend() {
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  return (
    <div className="rounded-md border border-border bg-background/85 backdrop-blur px-3 py-2 text-xs text-muted-foreground shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Crime Types</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {ORDERED_TYPES.map((key) => {
          const color = palette.categoryColors[key];
          if (!color) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{LABELS[key] || key}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
