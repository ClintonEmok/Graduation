import { SketchChip, SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';

export default function FiguresCubePage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="3D cube sketch"
      subtitle="A low-fidelity cube frame that focuses on the spatial volume, slice stack, and supporting selection information."
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SketchPanel title="Cube volume" subtitle="Main 3D context block with a simple framing hierarchy." className="min-h-[34rem]">
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <SketchChip>height</SketchChip>
              <SketchChip>slice depth</SketchChip>
              <SketchChip>selection</SketchChip>
            </div>

            <div className="grid flex-1 place-items-center rounded-[1.25rem] border border-dashed border-neutral-300 bg-neutral-50 p-4">
              <div className="relative grid h-[24rem] w-full max-w-[26rem] place-items-center">
                <div className="absolute left-14 top-8 h-48 w-48 rounded-[2rem] border border-neutral-300 bg-white shadow-sm" />
                <div className="absolute left-24 top-16 h-48 w-48 rounded-[2rem] border border-neutral-300 bg-neutral-50 shadow-sm" />
                <div className="absolute left-34 top-24 h-48 w-48 rounded-[2rem] border border-neutral-300 bg-white shadow-sm" />
                <div className="absolute bottom-10 left-1/2 h-16 w-[18rem] -translate-x-1/2 rounded-2xl border border-neutral-300 bg-white" />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
              <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
              <div className="h-11 rounded-xl border border-neutral-300 bg-white" />
            </div>
          </div>
        </SketchPanel>

        <div className="grid gap-4">
          <SketchPanel title="Slice stack" subtitle="Contextual stack and selection state." className="min-h-[16rem]">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={`h-10 rounded-xl border ${index === 2 ? 'border-neutral-400 bg-white' : 'border-neutral-300 bg-neutral-50'}`} />
              ))}
            </div>
          </SketchPanel>

          <SketchPanel title="Inspector" subtitle="Selection details and summary lines." className="min-h-[12rem]">
            <div className="space-y-3">
              <SketchLine className="w-24" />
              <SketchLine className="w-40" />
              <div className="grid gap-2">
                <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
                <div className="h-10 rounded-xl border border-neutral-300 bg-neutral-50" />
              </div>
            </div>
          </SketchPanel>
        </div>
      </div>
    </SketchShell>
  );
}
