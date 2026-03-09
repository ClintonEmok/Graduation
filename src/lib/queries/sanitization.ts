const TABLE_NAME_ALLOWLIST = new Set(['crimes_sorted', 'adaptive_global_cache']);

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
