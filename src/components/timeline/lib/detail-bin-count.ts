export const DEFAULT_DETAIL_BIN_COUNT = 60;
export const DETAIL_BIN_CAP = 180;
export const MIN_DETAIL_BIN_COUNT = 2;
export const SECONDS_PER_DAY = 86_400;

export const resolveAdaptiveDetailBinCount = (
  spanSec: number,
  override?: number | null
): number => {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.max(1, Math.round(override));
  }

  if (!Number.isFinite(spanSec) || spanSec <= 0) {
    return MIN_DETAIL_BIN_COUNT;
  }

  const spanDays = spanSec / SECONDS_PER_DAY;
  return Math.max(MIN_DETAIL_BIN_COUNT, Math.min(DETAIL_BIN_CAP, Math.round(spanDays)));
};
