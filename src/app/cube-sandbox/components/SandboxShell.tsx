"use client";

import Link from "next/link";
import CubeVisualization from "@/components/viz/CubeVisualization";

export function SandboxShell() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:flex-row">
        <section className="h-[72vh] min-h-[560px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-slate-950/70">
          <CubeVisualization />
        </section>

        <aside className="w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-4 lg:max-w-sm">
          <div className="space-y-4 text-sm">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Cube Sandbox Route</p>
              <h1 className="text-lg font-semibold text-slate-100">v2.0 cube-first experimentation</h1>
            </header>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Context snapshot</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-300">
                <dt className="text-slate-500">Dataset</dt>
                <dd>Latest thesis default</dd>
                <dt className="text-slate-500">Mode</dt>
                <dd>Uniform startup</dd>
                <dt className="text-slate-500">Warp state</dt>
                <dd>Ready</dd>
              </dl>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Reserved rail slots</p>
              <ul className="space-y-1 text-xs text-slate-300">
                <li>Proposal review summary</li>
                <li>Debug telemetry snapshot</li>
                <li>One-click sandbox reset</li>
              </ul>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              This rail is reserved for sandbox diagnostics, proposal context, and reset controls in upcoming plans.
            </p>

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
