export const CHICAGO_BOUNDS = {
  minLon: -87.9,
  maxLon: -87.5,
  minLat: 41.6,
  maxLat: 42.1,
} as const;

export const NORMALIZED_COORDINATE_RANGE = {
  min: -50,
  max: 50,
  span: 100,
} as const;

export const CHICAGO_SPANS = {
  lon: CHICAGO_BOUNDS.maxLon - CHICAGO_BOUNDS.minLon,
  lat: CHICAGO_BOUNDS.maxLat - CHICAGO_BOUNDS.minLat,
} as const;

type CoordinateAxis = 'lon' | 'lat';

const SQL_AXIS_CONFIG: Record<CoordinateAxis, { min: number; span: number }> = {
  lon: { min: CHICAGO_BOUNDS.minLon, span: CHICAGO_SPANS.lon },
  lat: { min: CHICAGO_BOUNDS.minLat, span: CHICAGO_SPANS.lat },
};

export function buildNormalizedSqlExpression(column: string, axis: CoordinateAxis): string {
  const { min, span } = SQL_AXIS_CONFIG[axis];
  const { min: normalizedMin, span: normalizedSpan } = NORMALIZED_COORDINATE_RANGE;

  return `(((${column} - ${min}) / ${span}) * ${normalizedSpan}) + ${normalizedMin}`;
}

export function lonLatToNormalized(lon: number, lat: number): { x: number; z: number } {
  const x = ((lon - CHICAGO_BOUNDS.minLon) / CHICAGO_SPANS.lon) * NORMALIZED_COORDINATE_RANGE.span + NORMALIZED_COORDINATE_RANGE.min;
  const z = ((lat - CHICAGO_BOUNDS.minLat) / CHICAGO_SPANS.lat) * NORMALIZED_COORDINATE_RANGE.span + NORMALIZED_COORDINATE_RANGE.min;

  return { x, z };
}

export function normalizedToLonLat(x: number, z: number): { lon: number; lat: number } {
  const lon = CHICAGO_BOUNDS.minLon + ((x - NORMALIZED_COORDINATE_RANGE.min) / NORMALIZED_COORDINATE_RANGE.span) * CHICAGO_SPANS.lon;
  const lat = CHICAGO_BOUNDS.minLat + ((z - NORMALIZED_COORDINATE_RANGE.min) / NORMALIZED_COORDINATE_RANGE.span) * CHICAGO_SPANS.lat;

  return { lon, lat };
}
