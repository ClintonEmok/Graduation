'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StatsSectionLayoutProps {
  title: string;
  description?: string;
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StatsSectionLayout({
  title,
  description,
  collapsible = false,
  children,
  className = '',
}: StatsSectionLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-200">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        
        {collapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/50 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            <span className="hidden sm:inline">
              {isExpanded ? 'Less' : 'More'}
            </span>
            {isExpanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          {children}
        </div>
      )}
    </section>
  );
}
