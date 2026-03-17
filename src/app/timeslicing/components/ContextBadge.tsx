"use client";

import { Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContextBadgeProps {
  crimeTypes: string[];
  isFullDataset: boolean;
  smartProfileName?: string;
  signalState?: 'strong' | 'weak-signal' | 'no-strong';
  warningLabel?: string | null;
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

export function ContextBadge({
  crimeTypes,
  isFullDataset,
  smartProfileName,
  signalState,
  warningLabel,
}: ContextBadgeProps) {
  const profileLabel = smartProfileName ?? (signalState === 'no-strong' ? 'No strong profile' : undefined);

  if (profileLabel) {
    const isWeakSignal = signalState === 'weak-signal';
    const isNoStrong = signalState === 'no-strong';
    const weakNotice = warningLabel ?? (isWeakSignal ? 'Signal is weak' : null);
    const profileClass = isNoStrong
      ? 'inline-flex h-5 items-center gap-1 border-rose-500/40 bg-rose-500/10 px-2 py-0 text-[10px] font-medium text-rose-200'
      : 'inline-flex h-5 items-center gap-1 border-amber-500/40 bg-amber-500/10 px-2 py-0 text-[10px] font-medium text-amber-200';

    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="outline" className={profileClass}>
          <Lightbulb className="size-3" />
          <span>{profileLabel}</span>
          {isFullDataset ? <span className="text-amber-300/90">(full range)</span> : null}
        </Badge>
        {weakNotice ? (
          <Badge
            variant="outline"
            className="inline-flex h-5 items-center border-amber-500/50 bg-amber-500/15 px-2 py-0 text-[10px] font-medium text-amber-100"
          >
            {weakNotice}
          </Badge>
        ) : null}
      </div>
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
