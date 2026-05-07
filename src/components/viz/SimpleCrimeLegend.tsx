"use client";

import { useFilterStore } from '@/store/useFilterStore';
import { CrimeCategoryLegend } from './CrimeCategoryLegend';

export function SimpleCrimeLegend() {
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const toggleType = useFilterStore((state) => state.toggleType);

  return (
    <CrimeCategoryLegend
      title="Crime Types"
      description="Live categories in the current viewport"
      selectedTypes={selectedTypes}
      onToggleType={toggleType}
      compact
    />
  );
}
