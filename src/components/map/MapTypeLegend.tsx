"use client";

import { CrimeCategoryLegend } from '@/components/viz/CrimeCategoryLegend';

interface MapTypeLegendProps {
  selectedTypes: number[];
  hoveredTypeId?: number | null;
  onHoverType?: (id: number | null) => void;
  onToggleType?: (id: number) => void;
}

export function MapTypeLegend({
  selectedTypes,
  hoveredTypeId,
  onHoverType,
  onToggleType
}: MapTypeLegendProps) {
  return (
    <CrimeCategoryLegend
      title="Crime Types"
      description="Quickly spot recurring patterns"
      selectedTypes={selectedTypes}
      hoveredTypeId={hoveredTypeId}
      onHoverType={onHoverType}
      onToggleType={onToggleType}
    />
  );
}
