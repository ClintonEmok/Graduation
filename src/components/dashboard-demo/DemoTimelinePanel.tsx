"use client";

import { DemoDualTimeline } from '@/components/timeline/DemoDualTimeline';

export function DemoTimelinePanel() {
  return (
    <div className="flex h-full w-full flex-col border-t border-border bg-card/70">
      <DemoDualTimeline />
    </div>
  );
}
