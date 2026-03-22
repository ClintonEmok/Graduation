'use client';

import { useStatsStore, ALL_DISTRICTS } from '@/store/useStatsStore';

interface DistrictBadgeProps {
  district: string;
  count?: number;
}

function DistrictBadge({ district, count }: DistrictBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs">
      {district}
      {count !== undefined && (
        <span className="ml-1 text-slate-400">({count})</span>
      )}
    </span>
  );
}

export function NeighborhoodSelector() {
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const toggleDistrict = useStatsStore((s) => s.toggleDistrict);
  const selectAllDistricts = useStatsStore((s) => s.selectAllDistricts);
  const clearDistricts = useStatsStore((s) => s.clearDistricts);

  const allSelected = selectedDistricts.length === ALL_DISTRICTS.length;
  const someSelected = selectedDistricts.length > 0 && !allSelected;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Districts</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAllDistricts}
            disabled={allSelected}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            All
          </button>
          <button
            onClick={clearDistricts}
            disabled={selectedDistricts.length === 0}
            className="text-xs text-slate-400 hover:text-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            None
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {ALL_DISTRICTS.map((district) => {
          const isSelected = selectedDistricts.includes(district);
          return (
            <button
              key={district}
              onClick={() => toggleDistrict(district)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {district}
            </button>
          );
        })}
      </div>

      {someSelected && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-700">
          <span className="text-xs text-slate-500 mr-1">Selected:</span>
          {selectedDistricts.slice(0, 10).map((d) => (
            <DistrictBadge key={d} district={d} />
          ))}
          {selectedDistricts.length > 10 && (
            <span className="text-xs text-slate-500">
              +{selectedDistricts.length - 10} more
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {selectedDistricts.length === 0
          ? 'All districts selected'
          : `${selectedDistricts.length} of ${ALL_DISTRICTS.length} districts selected`}
      </p>
    </div>
  );
}
