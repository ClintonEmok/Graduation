import { SketchChip, SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresTimelinePage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="Timeline sketch"
      subtitle="A simplified dual-timeline composition that shows the time brush, density bands, and interval hierarchy without interaction chrome."
    >
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <SketchPanel title="Dual timeline" subtitle="Stacked time views with a dominant brush and secondary detail strip." className="min-h-[34rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <SketchChip>brush</SketchChip>
              <SketchChip>bins</SketchChip>
              <SketchChip>intervals</SketchChip>
            </div>

            <div className="grid flex-1 gap-4">
              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                  <SketchLine className="w-28" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                </div>
                <div className="mt-4 h-28 rounded-2xl border border-dashed border-neutral-300 bg-white p-3">
                  <div className="mt-8 grid gap-2">
                    <div className="h-3 rounded-full bg-neutral-200" />
                    <div className="h-3 rounded-full bg-neutral-200" />
                    <div className="h-3 rounded-full bg-neutral-200" />
                    <div className="h-3 rounded-full bg-neutral-200" />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <SketchLine className="w-24" />
                <div className="mt-4 h-32 rounded-2xl border border-dashed border-neutral-300 bg-white p-3">
                  <div className="flex h-full items-end gap-2">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-lg bg-neutral-200"
                        style={{ height: `${35 + (index % 6) * 9}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SketchPanel>

        <div className="grid gap-4">
          <SketchPanel title="Selection summary" subtitle="Current range and notes." className="min-h-[16rem]">
            <div className="space-y-2">
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
            </div>
          </SketchPanel>

          <SketchPanel title="Interval notes" subtitle="Simple annotation lane." className="min-h-[12rem]">
            <div className="space-y-3">
              <SketchLine className="w-32" />
              <div className="grid gap-2">
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
              </div>
            </div>
          </SketchPanel>
        </div>
      </div>
    </SketchShell>
  );
}
