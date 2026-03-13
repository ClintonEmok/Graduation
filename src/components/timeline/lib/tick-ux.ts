import {
  utcDay,
  utcHour,
  utcMinute,
  utcMonth,
  utcYear,
  type TimeInterval,
} from 'd3-time';

export type TickLabelStrategy = 'legacy' | 'span-aware';

export type SpanAwareTickUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

export interface TickPolicyInput {
  rangeStartSec: number;
  rangeEndSec: number;
  axisWidth: number;
}

export interface SpanAwareTickSpec {
  unit: SpanAwareTickUnit;
  step: number;
  interval: TimeInterval;
  maxTicks: number;
}

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const DEFAULT_AXIS_WIDTH = 640;
const MIN_TICKS = 2;

const pickStep = (spanSeconds: number, unitSeconds: number, steps: number[], maxTicks: number): number => {
  for (const step of steps) {
    if (spanSeconds / (unitSeconds * step) <= maxTicks) {
      return step;
    }
  }
  return steps[steps.length - 1] ?? 1;
};

const getMaxTicks = (axisWidth: number): number => {
  const safeWidth = Number.isFinite(axisWidth) && axisWidth > 0 ? axisWidth : DEFAULT_AXIS_WIDTH;
  return Math.max(MIN_TICKS, Math.floor(safeWidth / 110));
};

const isCrossYearRange = (startSec: number, endSec: number): boolean => {
  return new Date(startSec * 1000).getUTCFullYear() !== new Date(endSec * 1000).getUTCFullYear();
};

const createUtcFormatter = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    ...options,
  });
};

export const resolveTickUnitByVisibleSpan = ({
  rangeStartSec,
  rangeEndSec,
  axisWidth,
}: TickPolicyInput): SpanAwareTickSpec => {
  const safeStart = Math.min(rangeStartSec, rangeEndSec);
  const safeEnd = Math.max(rangeStartSec, rangeEndSec);
  const spanSeconds = Math.max(1, safeEnd - safeStart);
  const maxTicks = getMaxTicks(axisWidth);

  if (spanSeconds <= 12 * HOUR) {
    const step = pickStep(spanSeconds, MINUTE, [5, 10, 15, 30, 60], maxTicks);
    return {
      unit: 'minute',
      step,
      interval: utcMinute.every(step) ?? utcMinute,
      maxTicks,
    };
  }

  if (spanSeconds <= 2 * DAY) {
    const step = pickStep(spanSeconds, HOUR, [1, 2, 3, 6, 12], maxTicks);
    return {
      unit: 'hour',
      step,
      interval: utcHour.every(step) ?? utcHour,
      maxTicks,
    };
  }

  if (spanSeconds <= 120 * DAY) {
    const step = pickStep(spanSeconds, DAY, [1, 2, 3, 7, 14], maxTicks);
    return {
      unit: 'day',
      step,
      interval: utcDay.every(step) ?? utcDay,
      maxTicks,
    };
  }

  if (spanSeconds <= 3 * YEAR) {
    const step = pickStep(spanSeconds, MONTH, [1, 2, 3, 6], maxTicks);
    return {
      unit: 'month',
      step,
      interval: utcMonth.every(step) ?? utcMonth,
      maxTicks,
    };
  }

  const step = pickStep(spanSeconds, YEAR, [1, 2, 5, 10], maxTicks);
  return {
    unit: 'year',
    step,
    interval: utcYear.every(step) ?? utcYear,
    maxTicks,
  };
};

export const formatSpanAwareTickLabel = (
  date: Date,
  { rangeStartSec, rangeEndSec, axisWidth }: TickPolicyInput
): string => {
  const safeStart = Math.min(rangeStartSec, rangeEndSec);
  const safeEnd = Math.max(rangeStartSec, rangeEndSec);
  const spanSeconds = Math.max(1, safeEnd - safeStart);
  const spec = resolveTickUnitByVisibleSpan({ rangeStartSec: safeStart, rangeEndSec: safeEnd, axisWidth });
  const includeYear = isCrossYearRange(safeStart, safeEnd) || spanSeconds >= 90 * DAY;

  switch (spec.unit) {
    case 'minute':
    case 'hour':
      return createUtcFormatter({
        month: 'short',
        day: 'numeric',
        ...(includeYear ? { year: 'numeric' } : {}),
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    case 'day':
      return createUtcFormatter({
        month: 'short',
        day: 'numeric',
        ...(includeYear ? { year: 'numeric' } : {}),
      }).format(date);
    case 'month':
      return createUtcFormatter({ month: 'short', year: 'numeric' }).format(date);
    case 'year':
      return createUtcFormatter({ year: 'numeric' }).format(date);
    default:
      return createUtcFormatter({ month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }
};

export const buildSpanAwareTicks = (
  scale: { ticks: (interval: TimeInterval) => Date[] },
  input: TickPolicyInput
): Date[] => {
  const spec = resolveTickUnitByVisibleSpan(input);
  return scale.ticks(spec.interval);
};
