import { SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresTimelinePage() {
  return (
    <SketchShell eyebrow="Dashboard sketch">
      <div className="grid gap-4">
        <SketchPanel className="min-h-[34rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Overview</div>
              <div className="mt-4 grid gap-3">
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-400 via-emerald-400 to-amber-300 opacity-90" />
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
