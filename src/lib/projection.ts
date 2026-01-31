import { WebMercatorViewport } from '@math.gl/web-mercator';

// Chicago Downtown
export const CENTER = {
  longitude: -87.6298,
  latitude: 41.8781
};

// Use a high zoom level for meter-like precision if needed, 
// or just standard Mercator units.
// Web Mercator unit scale is usually 512 pixels for the world at zoom 0.
const TILE_SIZE = 512;

// Create a static viewport for projection
// We use a zoom level where 1 unit is roughly 1 meter? 
// Or just use zoom 12 as per map init.
// Actually, for 3D scenes, we often want units to be meaningful.
// Let's use standard projection logic.
const viewport = new WebMercatorViewport({
  width: TILE_SIZE,
  height: TILE_SIZE,
  longitude: CENTER.longitude,
  latitude: CENTER.latitude,
  zoom: 12
});

/**
 * Projects a (lat, lon) to scene coordinates (x, z).
 * Scene origin (0, 0, 0) corresponds to the CENTER lat/lon.
 * 
 * @param lat Latitude
 * @param lon Longitude
 * @returns [x, z] in scene units (pixels at zoom 12)
 */
export function project(lat: number, lon: number): [number, number] {
  const [x, y] = viewport.projectFlat([lon, lat]);
  const [x0, y0] = viewport.projectFlat([CENTER.longitude, CENTER.latitude]);
  
  // In 3D:
  // x corresponds to longitude (East-West)
  // z corresponds to latitude (North-South)
  // WebMercator Y increases Southwards (top-left origin).
  // So larger lat (North) means smaller Y.
  // We usually want -z to be North.
  // If Y increases South, then z = y - y0 corresponds to South direction.
  
  return [x - x0, y - y0];
}

/**
 * Inverse projection from scene coordinates (x, z) to (lat, lon)
 */
export function unproject(x: number, z: number): [number, number] {
  const [x0, y0] = viewport.projectFlat([CENTER.longitude, CENTER.latitude]);
  const [lon, lat] = viewport.unprojectFlat([x + x0, z + y0]);
  return [lat, lon];
}
