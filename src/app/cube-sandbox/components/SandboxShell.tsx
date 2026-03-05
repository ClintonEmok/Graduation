"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import CubeVisualization from "@/components/viz/CubeVisualization";

type SandboxShellProps = {
  contextPanel: ReactNode;
};

export function SandboxShell({ contextPanel }: SandboxShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:flex-row">
        <section className="h-[72vh] min-h-[560px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-slate-950/70">
          <CubeVisualization />
        </section>

        <aside className="w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-4 lg:max-w-sm">
          <div className="space-y-4 text-sm">
            {contextPanel}
            <Link
              href="/"
              className="inline-flex rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-400"
            >
              Back to app entry
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
