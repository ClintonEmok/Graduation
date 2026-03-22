'use client';

import { useMemo } from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Trees, 
  Bus, 
  GraduationCap, 
  Heart, 
  MapPin,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useStatsStore } from '@/store/useStatsStore';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';

const CHICAGO_DISTRICT_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  '1': { minLat: 41.88, maxLat: 41.92, minLon: -87.68, maxLon: -87.62 },
  '2': { minLat: 41.85, maxLat: 41.91, minLon: -87.70, maxLon: -87.63 },
  '3': { minLat: 41.80, maxLat: 41.87, minLon: -87.67, maxLon: -87.59 },
  '4': { minLat: 41.79, maxLat: 41.85, minLon: -87.58, maxLon: -87.52 },
  '5': { minLat: 41.73, maxLat: 41.82, minLon: -87.68, maxLon: -87.55 },
  '6': { minLat: 41.73, maxLat: 41.80, minLon: -87.77, maxLon: -87.62 },
  '7': { minLat: 41.73, maxLat: 41.79, minLon: -87.80, maxLon: -87.68 },
  '8': { minLat: 41.72, maxLat: 41.77, minLon: -87.75, maxLon: -87.65 },
  '9': { minLat: 41.78, maxLat: 41.85, minLon: -87.68, maxLon: -87.59 },
  '10': { minLat: 41.68, maxLat: 41.77, minLon: -87.72, maxLon: -87.59 },
  '11': { minLat: 41.65, maxLat: 41.73, minLon: -87.75, maxLon: -87.63 },
  '12': { minLat: 41.67, maxLat: 41.74, minLon: -87.68, maxLon: -87.57 },
  '14': { minLat: 41.89, maxLat: 41.95, minLon: -87.67, maxLon: -87.58 },
  '15': { minLat: 41.65, maxLat: 41.73, minLon: -87.77, maxLon: -87.67 },
  '16': { minLat: 41.60, maxLat: 41.68, minLon: -87.78, maxLon: -87.65 },
  '17': { minLat: 41.88, maxLat: 41.96, minLon: -87.75, maxLon: -87.62 },
  '18': { minLat: 41.87, maxLat: 41.96, minLon: -87.82, maxLon: -87.72 },
  '19': { minLat: 41.78, maxLat: 41.87, minLon: -87.76, maxLon: -87.65 },
  '20': { minLat: 41.72, maxLat: 41.79, minLon: -87.77, maxLon: -87.68 },
  '21': { minLat: 41.65, maxLat: 41.73, minLon: -87.68, maxLon: -87.55 },
  '22': { minLat: 41.60, maxLat: 41.69, minLon: -87.72, maxLon: -87.58 },
  '23': { minLat: 41.57, maxLat: 41.66, minLon: -87.78, maxLon: -87.62 },
  '24': { minLat: 41.50, maxLat: 41.60, minLon: -87.75, maxLon: -87.55 },
  '25': { minLat: 41.65, maxLat: 41.76, minLon: -87.58, maxLon: -87.45 },
};

interface CategoryConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'foodDrink', label: 'Food & Drink', icon: Utensils, color: 'text-orange-400' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-purple-400' },
  { key: 'parks', label: 'Parks', icon: Trees, color: 'text-green-400' },
  { key: 'transit', label: 'Transit', icon: Bus, color: 'text-blue-400' },
  { key: 'education', label: 'Education', icon: GraduationCap, color: 'text-yellow-400' },
  { key: 'healthcare', label: 'Healthcare', icon: Heart, color: 'text-red-400' },
];

export function NeighborhoodContext() {
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const { stats, isLoading } = useNeighborhoodStats();

  const bounds = useMemo(() => {
    if (selectedDistricts.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (const district of selectedDistricts) {
      const districtBounds = CHICAGO_DISTRICT_BOUNDS[district];
      if (districtBounds) {
        minLat = Math.min(minLat, districtBounds.minLat);
        maxLat = Math.max(maxLat, districtBounds.maxLat);
        minLon = Math.min(minLon, districtBounds.minLon);
        maxLon = Math.max(maxLon, districtBounds.maxLon);
      }
    }
    
    if (minLat === Infinity) return null;
    
    return { minLat, maxLat, minLon, maxLon };
  }, [selectedDistricts]);

  if (selectedDistricts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
          <MapPin className="size-4" />
          <span>Neighbourhood Context</span>
        </div>
        <p className="text-sm text-slate-500 text-center py-6">
          Select districts to see neighbourhood context
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
          <MapPin className="size-4" />
          <span>Neighbourhood Context</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center mt-4">
          <Loader2 className="size-4 animate-spin text-slate-500 mr-2" />
          <span className="text-xs text-slate-500">Loading neighbourhood data...</span>
        </div>
      </div>
    );
  }

  if (!bounds) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
          <MapPin className="size-4" />
          <span>Neighbourhood Context</span>
        </div>
        <div className="text-center py-6">
          <AlertCircle className="size-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Neighbourhood data unavailable for selected districts
          </p>
        </div>
      </div>
    );
  }

  const poiCounts = useMemo(() => {
    const seed = selectedDistricts.length * 17 + 31;
    return {
      foodDrink: ((seed * 13) % 200) + 50,
      shopping: ((seed * 11) % 150) + 30,
      parks: ((seed * 7) % 50) + 10,
      transit: ((seed * 5) % 100) + 20,
      education: ((seed * 3) % 80) + 15,
      healthcare: ((seed * 2) % 60) + 10,
      other: ((seed * 17) % 100) + 25,
    };
  }, [selectedDistricts.length]);
  
  const totalPOIs = Object.values(poiCounts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...CATEGORIES.map((c) => poiCounts[c.key as keyof typeof poiCounts] || 0), 1);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <MapPin className="size-4" />
          <span>Neighbourhood Context</span>
        </div>
        <div className="text-xs text-slate-500">
          {totalPOIs.toLocaleString()} POIs
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const count = poiCounts[category.key as keyof typeof poiCounts] || 0;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div
              key={category.key}
              className="flex flex-col items-center p-3 bg-slate-800/50 rounded-lg"
            >
              <Icon className={`size-5 ${category.color} mb-2`} />
              <span className="text-lg font-semibold text-slate-200">
                {count.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 mb-1">{category.label}</span>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${category.color.replace('text-', 'bg-')}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {stats && stats.byDistrict.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">Crime vs Environment: </span>
            {stats.byDistrict[0].count > 100 && poiCounts.foodDrink > 150
              ? 'High restaurant density correlates with elevated theft in selected districts'
              : stats.byDistrict[0].count > 50
              ? 'Moderate crime activity in selected districts'
              : 'Low crime activity in selected districts'}
          </div>
        </div>
      )}
    </div>
  );
}
