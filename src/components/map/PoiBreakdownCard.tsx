'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PoiBreakdownCardProps {
  poi: { id: string; name: string; category: string; address?: string; color: string; icon: string };
  total: number;
  byType: { type: string; count: number }[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function PoiBreakdownCard({ poi, total, byType, loading, error, onClose }: PoiBreakdownCardProps) {
  const maxCount = byType.length > 0 ? Math.max(...byType.map((b) => b.count), 1) : 1;
  return (
    <div className="mt-2 rounded-md border border-border/70 bg-background/70 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: poi.color }}
            aria-hidden="true"
          >
            {poi.icon}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-foreground">{poi.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {poi.category}
              {poi.address ? ` · ${poi.address}` : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close POI breakdown"
          title="Close"
          className="rounded-sm"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Crimes within 500m
      </div>
      {loading ? (
        <div className="mt-1 text-xs text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="mt-1 text-xs text-red-500">Failed to load: {error}</div>
      ) : (
        <>
          <div className="mt-1 text-sm font-semibold text-foreground">{total}</div>
          {byType.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {byType.slice(0, 5).map((row) => (
                <li key={row.type} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 truncate text-muted-foreground">{row.type}</span>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right font-mono text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">No crimes in window</div>
          )}
        </>
      )}
    </div>
  );
}
