"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useLayoutStore } from '@/store/useLayoutStore';

interface DashboardLayoutProps {
  mainViewport: ReactNode;
  bottomRail?: ReactNode;
  rightRail?: ReactNode;
  className?: string;
}

export default function DashboardLayout({
  mainViewport,
  bottomRail,
  rightRail,
  className = '',
}: DashboardLayoutProps) {
  const { setOuterLayout } = useLayoutStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setOuterLayout({ top: 72, bottom: bottomRail ? 28 : 0 });
  }, [bottomRail, setOuterLayout]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black text-white ${className}`} aria-label="Phase 2 map-first dashboard shell" data-phase="workflow-isolation-dashboard-handoff">
      <div className="flex h-full min-w-0 flex-col pr-80">
        <div className="min-h-0 flex-1 overflow-hidden">{mainViewport}</div>
        {bottomRail ? <div className="shrink-0 border-t border-slate-800">{bottomRail}</div> : null}
      </div>

      {rightRail ? (
        <aside className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur">
          {rightRail}
        </aside>
      ) : null}
    </div>
  );
}
