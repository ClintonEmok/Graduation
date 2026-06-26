import { SketchLine, SketchPanel, SketchShell } from '../_components/SketchShell';
import { OverviewCubeSketch } from '../_components/OverviewCubeSketch';
import { OverviewMapSketch } from '../_components/OverviewMapSketch';

type FiguresOverviewPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function isScreenshotMode(searchParams?: Record<string, string | string[] | undefined>) {
  const value = searchParams?.screenshot;

  if (Array.isArray(value)) {
    return value.includes('1');
  }

  return value === '1';
}

export default function FiguresOverviewPage({ searchParams }: FiguresOverviewPageProps) {
  const screenshot = isScreenshotMode(searchParams);

  return (
    <SketchShell
      eyebrow="Dashboard sketch"
      title="Full dashboard composition"
      subtitle="A low-fidelity view of the complete dashboard: map on the left, cube on the right, overview and detail timelines underneath, and a full-height side panel."
      screenshot={screenshot}
    >
      <div className={screenshot ? 'grid min-h-[calc(100vh-2rem)] gap-0 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(12rem,0.48fr)] xl:grid-rows-[minmax(32rem,auto)_minmax(9rem,auto)_minmax(9rem,auto)]' : 'grid gap-0 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(12rem,0.48fr)] xl:grid-rows-[minmax(30rem,auto)_minmax(8rem,auto)_minmax(8rem,auto)]'}>
        <SketchPanel className="min-h-[24rem] overflow-hidden xl:col-start-1 xl:row-start-1" contentClassName="h-full p-0">
          <OverviewMapSketch />
        </SketchPanel>

        <SketchPanel className="min-h-[24rem] overflow-hidden xl:col-start-2 xl:row-start-1" contentClassName="h-full p-0">
          <OverviewCubeSketch />
        </SketchPanel>

        <SketchPanel className="min-h-[24rem] xl:row-span-3 xl:col-start-3 xl:row-start-1" contentClassName="p-2 sm:p-2">
          <div className="flex h-full flex-col gap-3">
            <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-2">
              <SketchLine className="w-28" />
              <div className="grid gap-0">
                <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-2">
              <SketchLine className="w-24" />
              <div className="grid gap-0">
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-12 rounded-xl border border-neutral-300 bg-white" />
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-dashed border-neutral-300 bg-white p-2">
              <SketchLine className="w-32" />
              <div className="grid gap-0">
                <div className="h-16 rounded-xl border border-neutral-200 bg-neutral-50" />
                <div className="h-16 rounded-xl border border-neutral-200 bg-neutral-50" />
                <div className="h-16 rounded-xl border border-neutral-200 bg-neutral-50" />
              </div>
            </div>
          </div>
        </SketchPanel>

        <SketchPanel className="min-h-[18rem] xl:col-start-1 xl:col-end-3 xl:row-start-2 xl:row-span-2" contentClassName="p-2 sm:p-2">
          <div className="flex h-full flex-col gap-0">
            <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Overview</div>
              <div className="grid gap-0">
                <SketchLine className="w-full" />
                <div className="grid grid-cols-16 gap-0 rounded-xl border border-neutral-300 bg-white p-2">
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

            <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Detail</div>
              <div className="h-20 rounded-xl border border-dashed border-neutral-300 bg-white p-2">
                <div className="flex h-full items-end gap-0.5">
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
