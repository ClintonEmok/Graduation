import { SketchChip, SketchGrid, SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresOverviewPage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="Full dashboard composition"
      subtitle="A low-fidelity view of the complete dashboard: overview surface on the left, 3D context on the top right, and the timeline rail below."
    >
      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <SketchPanel title="Overview surface" subtitle="Map-first composition with a single dominant analytical canvas." className="min-h-[34rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <SketchChip>study header</SketchChip>
              <SketchChip>dataset state</SketchChip>
              <SketchChip>brush range</SketchChip>
              <SketchChip>panel status</SketchChip>
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-[1.15fr_0.7fr]">
              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <SketchLine className="w-32" />
                    <SketchLine className="w-44" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full border border-neutral-300 bg-white" />
                    <div className="h-8 w-8 rounded-full border border-neutral-300 bg-white" />
                  </div>
                </div>

                <div className="mt-4 grid h-[22rem] place-items-center rounded-[1.25rem] border border-dashed border-neutral-300 bg-white">
                  <div className="grid w-full max-w-[28rem] gap-2 px-4">
                    <SketchLine className="w-1/2" />
                    <SketchLine className="w-3/4" />
                    <SketchLine className="w-2/3" />
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="h-12 rounded-lg border border-neutral-200 bg-neutral-50" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                  <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <SketchLine className="w-24" />
                    <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  </div>
                  <div className="grid gap-3">
                    <div className="h-28 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
                      <SketchGrid rows={2} cols={3} />
                    </div>
                    <div className="h-28 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
                      <SketchGrid rows={2} cols={2} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                  <SketchLine className="w-28" />
                  <div className="mt-3 grid gap-2">
                    <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                    <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                    <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SketchPanel>

        <div className="grid gap-4">
          <SketchPanel title="Timeline rail" subtitle="Brushes and interval bands sit below the main view." className="min-h-[14rem]">
            <div className="space-y-3">
              <SketchLine className="w-24" />
              <div className="h-20 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3">
                <div className="mt-1 grid gap-2">
                  <div className="h-3 rounded-full bg-neutral-200" />
                  <div className="h-3 rounded-full bg-neutral-200" />
                  <div className="h-3 rounded-full bg-neutral-200" />
                </div>
              </div>
            </div>
          </SketchPanel>

          <SketchPanel title="Controls rail" subtitle="Small state cards and study controls." className="min-h-[12rem]">
            <div className="grid gap-2">
              <div className="h-11 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-11 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-11 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-11 rounded-xl border border-neutral-300 bg-neutral-50" />
            </div>
          </SketchPanel>
        </div>
      </div>
    </SketchShell>
  );
}
