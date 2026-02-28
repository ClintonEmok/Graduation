"use client";

import { Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContextBadgeProps {
  crimeTypes: string[];
  isFullDataset: boolean;
  smartProfileName?: string;
}

function getCrimeSummary(crimeTypes: string[]): string {
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
        className="mt-1 inline-flex border-amber-600/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200"
      >
        <Lightbulb className="mr-1 size-3" />
        {smartProfileName}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="mt-1 inline-flex border-slate-600 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300"
    >
      {getCrimeSummary(crimeTypes)}
      {isFullDataset ? <span className="ml-1 text-slate-400">(full range)</span> : null}
    </Badge>
  );
}

export type { ContextBadgeProps };
