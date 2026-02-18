export const SNAP_INTERVALS = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
} as const;

export const MIN_SLICE_DURATION = 60;
export const MAX_SLICE_RATIO = 0.8;

type DurationConstraintResult = {
  start: number;
  end: number;
  isValid: boolean;
  reason?: string;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function snapToInterval(timestamp: number, interval: number, domainStart: number): number {
  if (interval <= 0) {
    return timestamp;
  }

  const offset = timestamp - domainStart;
  const snappedOffset = Math.round(offset / interval) * interval;
  return domainStart + snappedOffset;
}

export function getSnapInterval(domainStart: number, domainEnd: number): number {
  const span = Math.abs(domainEnd - domainStart);

  if (span < SNAP_INTERVALS.hours) {
    return SNAP_INTERVALS.minutes;
  }

  if (span < SNAP_INTERVALS.days) {
    return SNAP_INTERVALS.hours;
  }

  return SNAP_INTERVALS.days;
}

export function constrainDuration(
  startTime: number,
  endTime: number,
  domainStart: number,
  domainEnd: number
): DurationConstraintResult {
  const minDomain = Math.min(domainStart, domainEnd);
  const maxDomain = Math.max(domainStart, domainEnd);
  const domainSpan = Math.max(0, maxDomain - minDomain);

  let start = clamp(Math.min(startTime, endTime), minDomain, maxDomain);
  let end = clamp(Math.max(startTime, endTime), minDomain, maxDomain);

  if (end - start < MIN_SLICE_DURATION) {
    end = Math.min(maxDomain, start + MIN_SLICE_DURATION);
    if (end - start < MIN_SLICE_DURATION) {
      start = Math.max(minDomain, end - MIN_SLICE_DURATION);
    }
  }

  const maxAllowedDuration = domainSpan * MAX_SLICE_RATIO;
  if (maxAllowedDuration > 0 && end - start > maxAllowedDuration) {
    end = Math.min(maxDomain, start + maxAllowedDuration);
    if (end - start > maxAllowedDuration) {
      start = Math.max(minDomain, end - maxAllowedDuration);
    }

    return {
      start,
      end,
      isValid: false,
      reason: 'Maximum duration reached',
    };
  }

  return {
    start,
    end,
    isValid: true,
  };
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${totalMinutes}m`;
}

export function formatTimeRange(start: number, end: number, minTs: number, maxTs: number): string {
  const domainStart = Math.min(minTs, maxTs);
  const domainEnd = Math.max(minTs, maxTs);
  const domainSpan = Math.max(0, domainEnd - domainStart);

  const clampedStart = clamp(Math.min(start, end), 0, 100);
  const clampedEnd = clamp(Math.max(start, end), 0, 100);

  const startSec = domainStart + (clampedStart / 100) * domainSpan;
  const endSec = domainStart + (clampedEnd / 100) * domainSpan;

  const startDate = new Date(startSec * 1000);
  const endDate = new Date(endSec * 1000);

  const sameDay = startDate.toDateString() === endDate.toDateString();
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  if (sameDay) {
    return `${startDate.toLocaleTimeString(undefined, timeOptions)} - ${endDate.toLocaleTimeString(undefined, timeOptions)}`;
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const startLabel = `${startDate.toLocaleDateString(undefined, dateOptions)} ${startDate.toLocaleTimeString(undefined, timeOptions)}`;
  const endLabel = `${endDate.toLocaleDateString(undefined, dateOptions)} ${endDate.toLocaleTimeString(undefined, timeOptions)}`;

  return `${startLabel} - ${endLabel}`;
}
