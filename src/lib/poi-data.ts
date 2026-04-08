/**
 * POI (Points of Interest) Data for Chicago Crime Analysis
 * 
 * Includes police stations, schools, transit stations, and parks.
 */

export type MapPoiCategory = 'police' | 'schools' | 'transit' | 'parks';

export interface PoiData {
  id: string;
  name: string;
  category: MapPoiCategory;
  latitude: number;
  longitude: number;
  address?: string;
  color: string;
  icon: string;
}

// Chicago Police Districts / Stations
// Data derived from Police_Stations_20260202.csv
const POLICE_STATIONS: PoiData[] = [
  { id: 'hq', name: 'Police Headquarters', category: 'police', latitude: 41.8307, longitude: -87.6234, address: '3510 S Michigan Ave', color: '#dc2626', icon: 'P' },
  { id: 'd1', name: '1st District - Central', category: 'police', latitude: 41.8584, longitude: -87.6274, address: '1718 S State St', color: '#dc2626', icon: '1' },
  { id: 'd2', name: '2nd District - Wentworth', category: 'police', latitude: 41.8018, longitude: -87.6306, address: '5101 S Wentworth Ave', color: '#dc2626', icon: '2' },
  { id: 'd3', name: '3rd District - Grand Crossing', category: 'police', latitude: 41.7664, longitude: -87.6057, address: '7040 S Cottage Grove Ave', color: '#dc2626', icon: '3' },
  { id: 'd4', name: '4th District - South Chicago', category: 'police', latitude: 41.7079, longitude: -87.5683, address: '2255 E 103rd St', color: '#dc2626', icon: '4' },
  { id: 'd5', name: '5th District - Calumet', category: 'police', latitude: 41.6927, longitude: -87.6045, address: '727 E 111th St', color: '#dc2626', icon: '5' },
  { id: 'd6', name: '6th District - Gresham', category: 'police', latitude: 41.7521, longitude: -87.6442, address: '7808 S Halsted St', color: '#dc2626', icon: '6' },
  { id: 'd7', name: '7th District - Englewood', category: 'police', latitude: 41.7796, longitude: -87.6609, address: '1438 W 63rd St', color: '#dc2626', icon: '7' },
  { id: 'd8', name: '8th District - Chicago Lawn', category: 'police', latitude: 41.7790, longitude: -87.7089, address: '3420 W 63rd St', color: '#dc2626', icon: '8' },
  { id: 'd9', name: '9th District - Deering', category: 'police', latitude: 41.8374, longitude: -87.6464, address: '3120 S Halsted St', color: '#dc2626', icon: '9' },
  { id: 'd10', name: '10th District - Ogden', category: 'police', latitude: 41.8567, longitude: -87.7084, address: '3315 W Ogden Ave', color: '#dc2626', icon: '10' },
  { id: 'd11', name: '11th District - Harrison', category: 'police', latitude: 41.8736, longitude: -87.7055, address: '3151 W Harrison St', color: '#dc2626', icon: '11' },
  { id: 'd12', name: '12th District - Near West', category: 'police', latitude: 41.8867, longitude: -87.6667, address: '1412 S Blue Island Ave', color: '#dc2626', icon: '12' },
  { id: 'd14', name: '14th District - Shakespeare', category: 'police', latitude: 41.9181, longitude: -87.7137, address: '2150 N California Ave', color: '#dc2626', icon: '14' },
  { id: 'd15', name: '15th District - Austin', category: 'police', latitude: 41.8700, longitude: -87.7732, address: '5708 W Lake St', color: '#dc2626', icon: '15' },
  { id: 'd16', name: '16th District - Jeffery Manor', category: 'police', latitude: 41.7219, longitude: -87.5779, address: '706 E 93rd St', color: '#dc2626', icon: '16' },
  { id: 'd17', name: '17th District - Albany Park', category: 'police', latitude: 41.9674, longitude: -87.7175, address: '4650 N Pulaski Rd', color: '#dc2626', icon: '17' },
  { id: 'd18', name: '18th District - Near North', category: 'police', latitude: 41.9032, longitude: -87.6434, address: '1160 N Larrabee St', color: '#dc2626', icon: '18' },
  { id: 'd19', name: '19th District - Town Hall', category: 'police', latitude: 41.9474, longitude: -87.6515, address: '850 W Addison St', color: '#dc2626', icon: '19' },
  { id: 'd20', name: '20th District - Lincoln', category: 'police', latitude: 41.9795, longitude: -87.6928, address: '5400 N Lincoln Ave', color: '#dc2626', icon: '20' },
  { id: 'd22', name: '22nd District - Morgan Park', category: 'police', latitude: 41.6914, longitude: -87.6685, address: '1900 W Monterey Ave', color: '#dc2626', icon: '22' },
  { id: 'd24', name: '24th District - Rogers Park', category: 'police', latitude: 41.9998, longitude: -87.6713, address: '6464 N Clark St', color: '#dc2626', icon: '24' },
  { id: 'd25', name: '25th District - Grand Central', category: 'police', latitude: 41.9186, longitude: -87.7656, address: '5555 W Grand Ave', color: '#dc2626', icon: '25' },
];

// Sample CTA Transit Stations (L stops)
const TRANSIT_STATIONS: PoiData[] = [
  { id: 'cta-red-1', name: 'Roosevelt', category: 'transit', latitude: 41.8675, longitude: -87.6355, address: 'Red Line', color: '#c60c30', icon: 'R' },
  { id: 'cta-red-2', name: 'Cermak-Chinatown', category: 'transit', latitude: 41.8522, longitude: -87.6311, address: 'Red Line', color: '#c60c30', icon: 'R' },
  { id: 'cta-red-3', name: '95th/Dan Ryan', category: 'transit', latitude: 41.7224, longitude: -87.6245, address: 'Red Line', color: '#c60c30', icon: 'R' },
  { id: 'cta-blue-1', name: 'O\'Hare', category: 'transit', latitude: 41.9778, longitude: -87.9047, address: 'Blue Line', color: '#00a7e1', icon: 'B' },
  { id: 'cta-blue-2', name: 'Clark/Lake', category: 'transit', latitude: 41.8860, longitude: -87.6308, address: 'Blue Line', color: '#00a7e1', icon: 'B' },
  { id: 'cta-green-1', name: 'Harlem/Lake', category: 'transit', latitude: 41.8869, longitude: -87.8034, address: 'Green Line', color: '#00a113', icon: 'G' },
  { id: 'cta-green-2', name: 'Ashland', category: 'transit', latitude: 41.8838, longitude: -87.6663, address: 'Green Line', color: '#00a113', icon: 'G' },
  { id: 'cta-orange-1', name: 'Midway', category: 'transit', latitude: 41.7868, longitude: -87.7422, address: 'Orange Line', color: '#f94601', icon: 'O' },
  { id: 'cta-brown-1', name: 'Kimball', category: 'transit', latitude: 41.9677, longitude: -87.7060, address: 'Brown Line', color: '#633641', icon: 'Br' },
  { id: 'cta-purple-1', name: 'Linden', category: 'transit', latitude: 42.0673, longitude: -87.7026, address: 'Purple Line', color: '#7b2d8e', icon: 'P' },
  { id: 'cta-yellow-1', name: 'Skokie', category: 'transit', latitude: 42.0321, longitude: -87.7436, address: 'Yellow Line', color: '#f9a825', icon: 'Y' },
];

// Sample Schools/Universities
const SCHOOLS: PoiData[] = [
  { id: 'edu-1', name: 'University of Chicago', category: 'schools', latitude: 41.7943, longitude: -87.5907, address: '5801 S Ellis Ave', color: '#800400', icon: 'U' },
  { id: 'edu-2', name: 'Northwestern University', category: 'schools', latitude: 42.0451, longitude: -87.6877, address: '633 Clark St', color: '#4e2228', icon: 'U' },
  { id: 'edu-3', name: 'Loyola University', category: 'schools', latitude: 41.9996, longitude: -87.6602, address: '820 N Michigan Ave', color: '#001641', icon: 'U' },
  { id: 'edu-4', name: 'DePaul University', category: 'schools', latitude: 41.9252, longitude: -87.6553, address: '1 E Jackson Blvd', color: '#001641', icon: 'U' },
  { id: 'edu-5', name: 'Chicago State University', category: 'schools', latitude: 41.7218, longitude: -87.6063, address: '9501 S King Dr', color: '#007ba4', icon: 'U' },
];

// Sample Parks
const PARKS: PoiData[] = [
  { id: 'park-1', name: 'Millennium Park', category: 'parks', latitude: 41.8827, longitude: -87.6226, address: '201 E Randolph St', color: '#22c55e', icon: 'P' },
  { id: 'park-2', name: 'Grant Park', category: 'parks', latitude: 41.8756, longitude: -87.6190, address: '337 E Randolph Dr', color: '#22c55e', icon: 'P' },
  { id: 'park-3', name: 'Lincoln Park', category: 'parks', latitude: 41.9214, longitude: -87.6483, address: '2400 N Cannon Dr', color: '#22c55e', icon: 'P' },
  { id: 'park-4', name: 'Burnham Park', category: 'parks', latitude: 41.8543, longitude: -87.6159, address: '5491 S Lake Shore Dr', color: '#22c55e', icon: 'P' },
  { id: 'park-5', name: 'Washington Park', category: 'parks', latitude: 41.7941, longitude: -87.6185, address: '5531 S Martin Luther King Dr', color: '#22c55e', icon: 'P' },
  { id: 'park-6', name: 'Jackson Park', category: 'parks', latitude: 41.7913, longitude: -87.5837, address: '6401 S Stony Island Ave', color: '#22c55e', icon: 'P' },
  { id: 'park-7', name: 'Humboldt Park', category: 'parks', latitude: 41.9072, longitude: -87.7220, address: '1400 N Sacramento Ave', color: '#22c55e', icon: 'P' },
  { id: 'park-8', name: 'Garfield Park', category: 'parks', latitude: 41.8819, longitude: -87.7309, address: '100 N Central Park Ave', color: '#22c55e', icon: 'P' },
];

// Combine all POI data
export const POI_DATA: PoiData[] = [
  ...POLICE_STATIONS,
  ...TRANSIT_STATIONS,
  ...SCHOOLS,
  ...PARKS,
];

/**
 * Get POIs by category
 */
export function getPoisByCategory(category: MapPoiCategory): PoiData[] {
  return POI_DATA.filter((poi) => poi.category === category);
}

/**
 * Get POI by ID
 */
export function getPoiById(id: string): PoiData | undefined {
  return POI_DATA.find((poi) => poi.id === id);
}

/**
 * Category colors and icons
 */
export const CATEGORY_STYLES: Record<MapPoiCategory, { color: string; icon: string; label: string }> = {
  police: { color: '#dc2626', icon: 'P', label: 'Police Stations' },
  transit: { color: '#00a7e1', icon: 'T', label: 'Transit' },
  schools: { color: '#800400', icon: 'S', label: 'Schools/Universities' },
  parks: { color: '#22c55e', icon: 'P', label: 'Parks' },
};