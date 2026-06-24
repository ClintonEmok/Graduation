import Link from 'next/link';
import { ArrowRight, Map, SquareStack, TimerReset, SlidersHorizontal } from 'lucide-react';
import { SketchChip, SketchPanel, SketchShell } from './_components/SketchShell';

const routes = [
  {
    href: '/figures/overview',
    icon: LayoutDashboardIcon,
    title: 'Dashboard overview',
    description: 'Whole-screen sketch with map, cube, timeline, and the supporting control rail.',
  },
  {
    href: '/figures/map',
    icon: Map,
    title: 'Map sketch',
    description: 'Primary geospatial surface with lightweight legends, filters, and annotations.',
  },
  {
    href: '/figures/cube',
    icon: SquareStack,
    title: 'Cube sketch',
    description: '3D space-time cube frame, selection state, and emphasis region placeholders.',
  },
  {
    href: '/figures/timeline',
    icon: TimerReset,
    title: 'Timeline sketch',
    description: 'Dual timeline composition with brush, bins, and interval hints.',
  },
  {
    href: '/figures/controls',
    icon: SlidersHorizontal,
    title: 'Controls sketch',
    description: 'Toolbar and study controls laid out as a simple, low-fidelity rail.',
  },
] as const;

function LayoutDashboardIcon() {
  return <span className="grid size-4 place-items-center rounded border border-neutral-300 text-[9px] font-bold">D</span>;
}

export default function FiguresIndexPage() {
  return (
    <SketchShell
      eyebrow="Dashboard sketches"
      title="Dashboard sketch routes"
      subtitle="Simple route family for rough dashboard compositions and focused panel studies. Use these pages as structure-first references before detail work."
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SketchPanel title="Route set" subtitle="One overview route plus focused panel studies.">
          <div className="grid gap-3 sm:grid-cols-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group rounded-2xl border border-neutral-300 bg-neutral-50 p-4 transition-colors hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-neutral-300 bg-white p-2 text-neutral-700">
                      <route.icon className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-neutral-900">{route.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-neutral-600">{route.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </SketchPanel>

        <SketchPanel title="Conventions" subtitle="What these routes are for.">
          <div className="flex flex-wrap gap-2">
            <SketchChip>low fidelity</SketchChip>
            <SketchChip>desktop-first</SketchChip>
            <SketchChip>static layout</SketchChip>
            <SketchChip>no controls</SketchChip>
            <SketchChip>sketch only</SketchChip>
          </div>

          <div className="mt-5 space-y-3 text-sm leading-6 text-neutral-600">
            <p>Use the overview route when you want to evaluate the full dashboard composition.</p>
            <p>Use the panel routes when you only need one part of the layout isolated for design decisions.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Sketch scope</div>
            <div className="grid gap-2">
              <div className="h-10 rounded-xl border border-neutral-300 bg-white" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-24 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-24 rounded-xl border border-neutral-300 bg-white" />
                <div className="h-24 rounded-xl border border-neutral-300 bg-white" />
              </div>
            </div>
          </div>
        </SketchPanel>
      </div>
    </SketchShell>
  );
}
