const TABLE_NAME_ALLOWLIST = new Set(['crimes_sorted', 'adaptive_global_cache']);

const ADAPTIVE_BIN_COUNT_RANGE = { min: 1, max: 5000 };
const KERNEL_WIDTH_RANGE = { min: 0, max: 200 };
const DENSITY_RESOLUTION_RANGE = { min: 1, max: 1000 };

export const sanitizeTableName = (tableName: string): string => {
  if (!TABLE_NAME_ALLOWLIST.has(tableName)) {
    throw new Error(`Unexpected table name: ${tableName}`);
  }
  return tableName;
};

export const clampPositiveInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  const normalized = Math.floor(value);
  return Math.min(max, Math.max(min, normalized));
};

export const clampAdaptiveBinCount = (value: number): number =>
  clampPositiveInt(value, ADAPTIVE_BIN_COUNT_RANGE.min, ADAPTIVE_BIN_COUNT_RANGE.max);

export const clampKernelWidth = (value: number): number =>
  clampPositiveInt(value, KERNEL_WIDTH_RANGE.min, KERNEL_WIDTH_RANGE.max);

export const clampDensityResolution = (value: number): number =>
  clampPositiveInt(value, DENSITY_RESOLUTION_RANGE.min, DENSITY_RESOLUTION_RANGE.max);
