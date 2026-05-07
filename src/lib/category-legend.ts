import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';
import type { CrimeRecord } from '@/types/crime';

export interface CategoryLegendEntry {
  typeId: number;
  label: string;
  count: number;
  color: string;
}

const resolveLegendColor = (label: string, categoryColors: Record<string, string>): string => {
  const key = label.toUpperCase();
  return categoryColors[key] || categoryColors[label] || categoryColors.OTHER || '#FFFFFF';
};

export function buildCategoryLegendEntries(
  records: CrimeRecord[],
  categoryColors: Record<string, string>
): CategoryLegendEntry[] {
  if (records.length === 0) return [];

  const counts = new Map<number, CategoryLegendEntry>();

  for (const record of records) {
    const typeId = getCrimeTypeId(record.type);
    if (typeId <= 0) continue;

    const label = getCrimeTypeName(typeId);
    const existing = counts.get(typeId);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(typeId, {
      typeId,
      label,
      count: 1,
      color: resolveLegendColor(label, categoryColors),
    });
  }

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    const labelCompare = left.label.localeCompare(right.label);
    if (labelCompare !== 0) return labelCompare;
    return left.typeId - right.typeId;
  });
}
