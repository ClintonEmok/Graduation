/**
 * OSM Overpass API client for POI queries.
 */

import type { GeoBounds, OSMPOIResult } from './types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Build Overpass QL query for POI categories within bounding box.
 */
const buildOverpassQuery = (bounds: GeoBounds): string => {
  const bbox = `${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon}`;
  return `
[out:json][timeout:30];
(
  node["amenity"~"restaurant|bar|cafe|fast_food|school|university|hospital|clinic|pharmacy"](${bbox});
  way["amenity"~"restaurant|bar|cafe|fast_food|school|university|hospital|clinic|pharmacy"](${bbox});
  node["leisure"~"park|playground"](${bbox});
  way["leisure"~"park|playground"](${bbox});
  node["shop"](${bbox});
  way["shop"](${bbox});
  node["railway"="station"](${bbox});
  way["railway"="station"](${bbox});
  node["public_transport"="station"](${bbox});
  way["public_transport"="station"](${bbox});
);
out center;
`.trim();
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Derive a human-readable POI category from OSM tags.
 */
export const derivePOICategory = (tags: Record<string, string>): string => {
  const amenity = tags['amenity'];
  const leisure = tags['leisure'];
  const shop = tags['shop'];
  const railway = tags['railway'];
  const publicTransport = tags['public_transport'];

  if (amenity === 'restaurant' || amenity === 'bar' || amenity === 'cafe' || amenity === 'fast_food') {
    return 'food-drink';
  }
  if (amenity === 'school' || amenity === 'university') {
    return 'education';
  }
  if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'pharmacy') {
    return 'healthcare';
  }
  if (leisure === 'park' || leisure === 'playground') {
    return 'parks';
  }
  if (shop) {
    return 'shopping';
  }
  if (railway === 'station' || publicTransport === 'station') {
    return 'transit';
  }
  return 'other';
};

/**
 * Query OSM Overpass API for POIs within a bounding box.
 */
export const queryOSMPOI = async (bounds: GeoBounds): Promise<OSMPOIResult[]> => {
  const query = buildOverpassQuery(bounds);

  let response: Response;
  try {
    response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
  } catch (err) {
    throw new Error(`Overpass API error: network failure — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(`Overpass API error: HTTP ${response.status}`);
  }

  let json: OverpassResponse;
  try {
    json = await response.json() as OverpassResponse;
  } catch (err) {
    throw new Error(`Overpass API error: invalid JSON response — ${err instanceof Error ? err.message : String(err)}`);
  }

  const results: OSMPOIResult[] = [];

  for (const element of json.elements) {
    const tags = element.tags ?? {};
    const category = derivePOICategory(tags);

    results.push({
      id: element.id,
      type: element.type as 'node' | 'way',
      lat: element.lat,
      lon: element.lon,
      centerLat: element.center?.lat,
      centerLon: element.center?.lon,
      name: tags['name'],
      amenity: tags['amenity'],
      category,
      tags,
    });
  }

  return results;
};
