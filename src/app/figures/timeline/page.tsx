import { SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresTimelinePage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="Timeline sketch"
      subtitle="A standalone dual-timeline sketch that matches the overview timeline layout."
    >
      <div className="grid gap-4">
        <SketchPanel title="Dual timeline" subtitle="Overview lane above, detail lane below." className="min-h-[34rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Overview</div>
              <div className="mt-4 grid gap-3">
                <SketchLine className="w-full" />
                <div className="grid grid-cols-16 gap-1.5 rounded-2xl border border-neutral-300 bg-white p-3">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <div
                      key={index}
                      className="min-h-16 self-end rounded-t-lg bg-neutral-200"
                      style={{ height: `${36 + ((index + 2) % 5) * 10}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Detail</div>
              <div className="mt-4 h-20 rounded-2xl border border-dashed border-neutral-300 bg-white p-3">
                <div className="flex h-full items-end gap-2">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-lg bg-neutral-200"
                      style={{ height: `${40 + (index % 5) * 10}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SketchPanel>
      </div>
    </SketchShell>
  );
}
