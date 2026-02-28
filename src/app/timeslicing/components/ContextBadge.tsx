"use client";

import { Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContextBadgeProps {
  crimeTypes: string[];
  isFullDataset: boolean;
  smartProfileName?: string;
}

function getCrimeTypeLabel(crimeTypes: string[]): string {
  if (crimeTypes.length === 0) {
    return 'All crimes';
  }

  if (crimeTypes.length === 1) {
    return crimeTypes[0];
  }

  return `${crimeTypes.length} types`;
}

export function ContextBadge({ crimeTypes, isFullDataset, smartProfileName }: ContextBadgeProps) {
  if (smartProfileName) {
    return (
      <Badge
        variant="outline"
        className="inline-flex h-5 items-center gap-1 border-amber-500/40 bg-amber-500/10 px-2 py-0 text-[10px] font-medium text-amber-200"
      >
        <Lightbulb className="size-3" />
        <span>{smartProfileName}</span>
        {isFullDataset ? <span className="text-amber-300/90">(full range)</span> : null}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex h-5 items-center border-slate-600/70 bg-slate-800/70 px-2 py-0 text-[10px] font-medium text-slate-300"
    >
      <span>{getCrimeTypeLabel(crimeTypes)}</span>
      {isFullDataset ? <span className="text-slate-400">(full range)</span> : null}
    </Badge>
  );
}

export type { ContextBadgeProps };
