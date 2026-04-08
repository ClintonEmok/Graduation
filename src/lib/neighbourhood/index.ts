/**
 * Neighbourhood data enrichment — aggregates OSM POI and Chicago data sources.
 */

import type {
  GeoBounds,
  OSMPOIResult,
  ChicagoBusiness,
  ChicagoLandUse,
  POICategoryCounts,
  NeighbourhoodSummaryAvailable,
  NeighbourhoodSummaryMissing,
  NeighbourhoodSummaryResult,
} from './types';

import { queryOSMPOI } from './osm';
import { queryChicagoBusinesses } from './chicago';

export type {
  GeoBounds,
  OSMPOIResult,
  ChicagoBusiness,
  ChicagoLandUse,
  POICategoryCounts,
  NeighbourhoodSummaryAvailable,
  NeighbourhoodSummaryMissing,
  NeighbourhoodSummaryResult,
} from './types';

export { queryOSMPOI, derivePOICategory } from './osm';
export { queryChicagoBusinesses, queryChicagoLandUse } from './chicago';

/**
 * Aggregate POI counts from OSM results and Chicago business data.
 *
 * Note: POI data reflects current neighbourhood state, not historical events
 * on specific dates. Date filtering limitation is acknowledged in the notice.
 */
export const aggregatePOICounts = (
  osmPOIs: OSMPOIResult[],
  _businesses: ChicagoBusiness[],
): POICategoryCounts => {
  const counts: POICategoryCounts = {
    foodDrink: 0,
    shopping: 0,
    education: 0,
    parks: 0,
    transit: 0,
    healthcare: 0,
    other: 0,
  };

  for (const poi of osmPOIs) {
    switch (poi.category) {
      case 'food-drink':
        counts.foodDrink++;
        break;
      case 'shopping':
        counts.shopping++;
        break;
      case 'education':
        counts.education++;
        break;
      case 'parks':
        counts.parks++;
        break;
      case 'transit':
        counts.transit++;
        break;
      case 'healthcare':
        counts.healthcare++;
        break;
      default:
        counts.other++;
        break;
    }
  }

  return counts;
};

/**
 * Build a neighbourhood summary by fetching and aggregating POI data.
 *
 * Note: dateEpoch parameter is accepted for future historical queries, but
 * current POI data sources (OSM, Chicago) reflect current state, not
 * historical neighbourhood composition on specific dates.
 */
export const buildNeighbourhoodSummary = async (input: {
  bounds: GeoBounds;
  dateEpoch?: number;
}): Promise<NeighbourhoodSummaryResult> => {
  try {
    const [osmPOIs, businesses] = await Promise.all([
      queryOSMPOI(input.bounds),
      queryChicagoBusinesses(input.bounds),
    ]);

    const poiCounts = aggregatePOICounts(osmPOIs, businesses);
    const totalPOIs = osmPOIs.length + businesses.length;

    const summaryParts: string[] = [];
    if (poiCounts.foodDrink > 0) summaryParts.push(`${poiCounts.foodDrink} food/drink venues`);
    if (poiCounts.parks > 0) summaryParts.push(`${poiCounts.parks} parks`);
    if (poiCounts.shopping > 0) summaryParts.push(`${poiCounts.shopping} shops`);
    if (poiCounts.education > 0) summaryParts.push(`${poiCounts.education} education`);
    if (poiCounts.transit > 0) summaryParts.push(`${poiCounts.transit} transit stops`);
    if (poiCounts.healthcare > 0) summaryParts.push(`${poiCounts.healthcare} healthcare`);
    if (poiCounts.other > 0) summaryParts.push(`${poiCounts.other} other`);

    const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'No POI data available';

    const categoryEntries: Array<{ category: string; count: number }> = [
      { category: 'foodDrink', count: poiCounts.foodDrink },
      { category: 'shopping', count: poiCounts.shopping },
      { category: 'education', count: poiCounts.education },
      { category: 'parks', count: poiCounts.parks },
      { category: 'transit', count: poiCounts.transit },
      { category: 'healthcare', count: poiCounts.healthcare },
      { category: 'other', count: poiCounts.other },
    ]
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      status: 'available',
      poiCounts,
      totalPOIs,
      summary,
      topCategories: categoryEntries,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'missing',
      notice: `Neighbourhood data unavailable: ${message}`,
    };
  }
};
