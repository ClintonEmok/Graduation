/**
 * Neighbourhood data types for POI enrichment.
 * Supports OSM Overpass API and Chicago Data Portal sources.
 */

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface OSMPOIResult {
  id: number;
  type: 'node' | 'way';
  lat?: number;
  lon?: number;
  centerLat?: number;
  centerLon?: number;
  name?: string;
  amenity?: string;
  category: string;
  tags: Record<string, string>;
}

export interface ChicagoBusiness {
  id: string;
  doing_business_as_name: string;
  license_description: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ChicagoLandUse {
  id: string;
  land_use: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface POICategoryCounts {
  foodDrink: number;
  shopping: number;
  education: number;
  parks: number;
  transit: number;
  healthcare: number;
  other: number;
}

export interface NeighbourhoodSummaryAvailable {
  status: 'available';
  poiCounts: POICategoryCounts;
  totalPOIs: number;
  summary: string;
  topCategories: Array<{ category: string; count: number }>;
}

export interface NeighbourhoodSummaryMissing {
  status: 'missing';
  notice: string;
}

export type NeighbourhoodSummaryResult = NeighbourhoodSummaryAvailable | NeighbourhoodSummaryMissing;
