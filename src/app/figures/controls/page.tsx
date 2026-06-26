import { SketchChip, SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresControlsPage() {
  return (
    <SketchShell>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <SketchPanel title="Toolbar" subtitle="Top-level actions and status chips." className="min-h-[18rem]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SketchChip>generate</SketchChip>
              <SketchChip>review</SketchChip>
              <SketchChip>apply</SketchChip>
              <SketchChip>refine</SketchChip>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <SketchLine className="w-32" />
                <div className="mt-3 grid gap-2">
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <SketchLine className="w-24" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                </div>
              </div>
            </div>
          </div>
        </SketchPanel>

        <div className="grid gap-4">
          <SketchPanel title="Study rail" subtitle="Stacked side cards and control blocks." className="min-h-[16rem]">
            <div className="space-y-3">
              <div className="h-12 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-12 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-12 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-12 rounded-xl border border-neutral-300 bg-neutral-50" />
            </div>
          </SketchPanel>

          <SketchPanel title="Notes" subtitle="What this route is useful for." className="min-h-[12rem]">
            <div className="space-y-2 text-sm leading-6 text-neutral-600">
              <p>Use this page when you only need the action rail, filter structure, or workflow cards.</p>
              <p>It stays intentionally quiet so the control hierarchy is easy to judge.</p>
            </div>
          </SketchPanel>
        </div>
      </div>
    </SketchShell>
  );
}
