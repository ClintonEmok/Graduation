import { SketchChip, SketchGrid, SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresMapPage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="Map panel sketch"
      subtitle="A rough map-first frame showing the primary geospatial surface, small overlays, and the minimal control strip around it."
    >
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <SketchPanel title="Map surface" subtitle="Primary spatial canvas with a simple left-to-right reading order." className="min-h-[36rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <SketchChip>region</SketchChip>
              <SketchChip>date range</SketchChip>
              <SketchChip>crime type</SketchChip>
              <SketchChip>hotspots</SketchChip>
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <SketchLine className="w-24" />
                    <SketchLine className="w-36" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full border border-neutral-300 bg-white" />
                    <div className="h-8 w-8 rounded-full border border-neutral-300 bg-white" />
                  </div>
                </div>

                <div className="mt-4 grid h-[26rem] place-items-center rounded-[1.25rem] border border-dashed border-neutral-300 bg-white">
                  <div className="grid h-[18rem] w-[18rem] place-items-center rounded-full border border-neutral-200 bg-neutral-50">
                    <div className="grid h-[13rem] w-[13rem] grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-neutral-300 bg-white" />
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

              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                  <SketchLine className="w-20" />
                  <div className="mt-3 grid gap-2">
                    <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
                    <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
                    <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-neutral-300 bg-neutral-50 p-4">
                  <SketchLine className="w-24" />
                  <div className="mt-3 grid gap-2">
                    <div className="h-24 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
                      <SketchGrid rows={2} cols={2} />
                    </div>
                    <div className="h-24 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
                      <SketchGrid rows={2} cols={3} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SketchPanel>

        <div className="grid gap-4">
          <SketchPanel title="Legend and filters" subtitle="Compact support rail for the map." className="min-h-[16rem]">
            <div className="grid gap-2">
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
            </div>
          </SketchPanel>

          <SketchPanel title="Map footer" subtitle="Bottom-aligned status and summary row." className="min-h-[10rem]">
            <div className="grid gap-3">
              <SketchLine className="w-32" />
              <div className="h-16 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50" />
            </div>
          </SketchPanel>
        </div>
      </div>
    </SketchShell>
  );
}
