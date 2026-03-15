export type TimelineQaRouteRole = 'timeslicing' | 'timeslicing-algos';

export const QA_WORDING_SCOPE_NOTE =
  'QA / exploration-first wording. Dashboard/general-user adaptation is deferred to a later phase.';

export type TimelineQaModelInput = {
  routeRole: TimelineQaRouteRole;
  referenceDomainSec: [number, number];
  fetchedDomainSec: [number, number];
  detailDomainSec: [number, number];
  hasActiveSelection: boolean;
  strategyLabel?: string;
  timescaleLabel?: string;
};

export type TimelineQaModel = {
  routeRoleTitle: string;
  routeRoleDescription: string;
  referenceTimelineLabel: string;
  referenceTimelineDescription: string;
  fetchedWindowLabel: string;
  fetchedWindowDescription: string;
  selectionDetailLabel: string;
  selectionDetailDescription: string;
  referenceRangeLabel: string;
  fetchedRangeLabel: string;
  detailRangeLabel: string;
  qaScopeNote: string;
  strategyLabel?: string;
  timescaleLabel?: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const normalizeDomain = (domain: [number, number]): [number, number] => {
  const [a, b] = domain;
  return a <= b ? [a, b] : [b, a];
};

const formatEpochRange = (domain: [number, number]) => {
  const [startSec, endSec] = normalizeDomain(domain);
  return `${DATE_FORMATTER.format(new Date(startSec * 1000))} - ${DATE_FORMATTER.format(new Date(endSec * 1000))}`;
};

export const buildTimelineQaModel = ({
  routeRole,
  referenceDomainSec,
  fetchedDomainSec,
  detailDomainSec,
  hasActiveSelection,
  strategyLabel,
  timescaleLabel,
}: TimelineQaModelInput): TimelineQaModel => {
  const shared = {
    referenceTimelineLabel: 'Reference timeline',
    referenceTimelineDescription:
      'Stable context surface anchored to the route/base domain. Brushing and selection should not change this meaning.',
    fetchedWindowLabel: 'Fetched data window',
    fetchedWindowDescription:
      'Server fetch window (including buffer) used to populate context and summary chips.',
    selectionDetailLabel: 'Selection detail',
    selectionDetailDescription: hasActiveSelection
      ? 'Selection-focused detail surface. This updates when the active selection/brush changes.'
      : 'Selection-focused detail surface. With no active selection, this falls back to the viewport range.',
    referenceRangeLabel: formatEpochRange(referenceDomainSec),
    fetchedRangeLabel: formatEpochRange(fetchedDomainSec),
    detailRangeLabel: formatEpochRange(detailDomainSec),
    qaScopeNote: QA_WORDING_SCOPE_NOTE,
  };

  if (routeRole === 'timeslicing-algos') {
    return {
      ...shared,
      routeRoleTitle: 'Algorithm diagnostics',
      routeRoleDescription:
        'QA / exploration surface for comparing strategy and timescale behavior with explicit reference-versus-detail semantics.',
      strategyLabel,
      timescaleLabel,
    };
  }

  return {
    ...shared,
    routeRoleTitle: 'QA / exploration',
    routeRoleDescription:
      'Richer workflow surface for suggestion review/acceptance while keeping reference-context and selection-detail semantics explicit.',
  };
};
