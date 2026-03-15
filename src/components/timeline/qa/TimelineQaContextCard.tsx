import type { TimelineQaModel } from './timeline-qa-model';

type TimelineQaContextCardProps = {
  model: TimelineQaModel;
  className?: string;
};

const pillClassName =
  'inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300';

export function TimelineQaContextCard({ model, className }: TimelineQaContextCardProps) {
  return (
    <section
      className={[
        'rounded-xl border border-slate-700/60 bg-slate-900/65 p-4',
        className ?? '',
      ]
        .join(' ')
        .trim()}
      data-testid="timeline-qa-context-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-500/40 bg-cyan-900/30 px-2 py-0.5 text-[11px] font-medium text-cyan-100">
          {model.routeRoleTitle}
        </span>
        {model.strategyLabel ? <span className={pillClassName}>Strategy: {model.strategyLabel}</span> : null}
        {model.timescaleLabel ? <span className={pillClassName}>Timescale: {model.timescaleLabel}</span> : null}
      </div>

      <p className="mt-2 text-xs text-slate-300">{model.routeRoleDescription}</p>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-md border border-slate-700/70 bg-slate-950/50 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            {model.referenceTimelineLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{model.referenceTimelineDescription}</p>
          <p className="mt-1 text-[11px] text-slate-300">{model.referenceRangeLabel}</p>
        </div>

        <div className="rounded-md border border-slate-700/70 bg-slate-950/50 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            {model.fetchedWindowLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{model.fetchedWindowDescription}</p>
          <p className="mt-1 text-[11px] text-slate-300">{model.fetchedRangeLabel}</p>
        </div>

        <div className="rounded-md border border-slate-700/70 bg-slate-950/50 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            {model.selectionDetailLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{model.selectionDetailDescription}</p>
          <p className="mt-1 text-[11px] text-slate-300">{model.detailRangeLabel}</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">{model.qaScopeNote}</p>
    </section>
  );
}
