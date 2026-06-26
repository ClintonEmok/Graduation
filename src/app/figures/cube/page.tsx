import { CubeFigureScene } from '../_components/CubeFigureScene';
import { SketchShell } from '../_components/SketchShell';

export default function FiguresCubePage() {
  return (
    <SketchShell>
      <div className="mx-auto flex w-full justify-center px-6 py-6 sm:px-8 lg:px-10">
        <div className="relative w-[min(75vw,1280px)]" style={{ height: 'min(72vh, 760px)' }}>
          <div className="absolute inset-0 rounded-[2rem] border border-neutral-300 bg-neutral-100 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
            <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white">
              <div className="absolute left-4 top-4 z-[60] rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500 shadow-lg backdrop-blur-sm">
                Point 3D
              </div>

              <div className="absolute inset-0 p-4 sm:p-6">
                <CubeFigureScene />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SketchShell>
  );
}
