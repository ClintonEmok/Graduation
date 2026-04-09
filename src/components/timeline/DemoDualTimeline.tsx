"use client";

import React from 'react';
import { DualTimeline } from '@/components/timeline/DualTimeline';

type DemoDualTimelineProps = React.ComponentProps<typeof DualTimeline>;

export function DemoDualTimeline({
  disableAutoBurstSlices = true,
  tickLabelStrategy = 'span-aware',
  ...props
}: DemoDualTimelineProps) {
  // Research finding: keep the shared store model intact; demo isolation stays in composition.
  return (
    <DualTimeline
      {...props}
      disableAutoBurstSlices={disableAutoBurstSlices}
      tickLabelStrategy={tickLabelStrategy}
    />
  );
}
