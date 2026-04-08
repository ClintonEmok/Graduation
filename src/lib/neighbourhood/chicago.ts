/**
 * Chicago Data Portal SODA API client for business and land use data.
 */

import type { ChicagoBusiness, ChicagoLandUse, GeoBounds } from './types';

const CHICAGO_API_BASE = 'https://data.cityofchicago.org/resource';

const BUSINESS_ENDPOINT = `${CHICAGO_API_BASE}/6pth-rz8e.json`;
const LAND_USE_ENDPOINT = `${CHICAGO_API_BASE}/pxu2-2i9s.json`;

/**
 * Query Chicago Data Portal for business licenses within bounding box.
 */
export const queryChicagoBusinesses = async (bounds: GeoBounds): Promise<ChicagoBusiness[]> => {
  const params = new URLSearchParams({
    '$where': `latitude >= ${bounds.minLat} AND latitude <= ${bounds.maxLat} AND longitude >= ${bounds.minLon} AND longitude <= ${bounds.maxLon}`,
    '$limit': '50000',
    '$select': 'id,doing_business_as_name,license_description,address,latitude,longitude',
  });

  let response: Response;
  try {
    response = await fetch(`${BUSINESS_ENDPOINT}?${params}`);
  } catch (err) {
    throw new Error(`Chicago API error: network failure — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(`Chicago API error: HTTP ${response.status}`);
  }

  let data: ChicagoBusiness[];
  try {
    data = await response.json() as ChicagoBusiness[];
  } catch (err) {
    throw new Error(`Chicago API error: invalid JSON response — ${err instanceof Error ? err.message : String(err)}`);
  }

  return data;
};

/**
 * Query Chicago Data Portal for land use data within bounding box.
 */
export const queryChicagoLandUse = async (bounds: GeoBounds): Promise<ChicagoLandUse[]> => {
  const params = new URLSearchParams({
    '$where': `latitude >= ${bounds.minLat} AND latitude <= ${bounds.maxLat} AND longitude >= ${bounds.minLon} AND longitude <= ${bounds.maxLon}`,
    '$limit': '100000',
    '$select': 'id,land_use,address,latitude,longitude',
  });

  let response: Response;
  try {
    response = await fetch(`${LAND_USE_ENDPOINT}?${params}`);
  } catch (err) {
    throw new Error(`Chicago API error: network failure — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(`Chicago API error: HTTP ${response.status}`);
  }

  let data: ChicagoLandUse[];
  try {
    data = await response.json() as ChicagoLandUse[];
  } catch (err) {
    throw new Error(`Chicago API error: invalid JSON response — ${err instanceof Error ? err.message : String(err)}`);
  }

  return data;
};
