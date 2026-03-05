"use client";

import { DualTimeline } from "@/components/timeline/DualTimeline";
import {
  buildSliceAuthoredWarpMap,
  remapSelectionPercentToDomainPercent,
} from "./lib/route-orchestration";

export default function TimelineTest3DPage() {
  void buildSliceAuthoredWarpMap;
  void remapSelectionPercentToDomainPercent;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timeline Test 3D</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Dedicated 3D route foundation with route-local orchestration helpers.
          </p>
        </header>

        <section className="rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
          <DualTimeline />
        </section>
      </div>
    </main>
  );
}
