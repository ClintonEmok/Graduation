import { useDataStore } from '@/store/useDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { unproject } from '@/lib/projection';

export type SelectionPoint = {
  index: number;
  x: number;
  z: number;
  lat: number;
  lon: number;
  timestampSec: number | null;
};

const getTimestampSec = (
  index: number,
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
  columnsTimestamp?: Float32Array
): number | null => {
  if (columnsTimestamp) {
    const value = columnsTimestamp[index];
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      return normalizedToEpochSeconds(value, minTimestampSec, maxTimestampSec);
    }
    return value;
  }
  return null;
};

const resolveLatLon = (
  x: number,
  z: number,
  index: number,
  columns?: { lat?: Float32Array; lon?: Float32Array }
): [number, number] => {
  if (columns?.lat && columns?.lon) {
    const lat = columns.lat[index];
    const lon = columns.lon[index];
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lat, lon];
    }
  }
  return unproject(x, z);
};

export const resolvePointByIndex = (index: number): SelectionPoint | null => {
  const { columns, data, minTimestampSec, maxTimestampSec } = useDataStore.getState();

  if (columns) {
    if (index < 0 || index >= columns.length) return null;
    const x = columns.x[index];
    const z = columns.z[index];
    const timestampSec = getTimestampSec(index, minTimestampSec, maxTimestampSec, columns.timestamp);
    const [lat, lon] = resolveLatLon(x, z, index, columns);
    return { index, x, z, lat, lon, timestampSec };
  }

  if (!data || index < 0 || index >= data.length) return null;
  const point = data[index];
  const x = point.x;
  const z = point.z;
  const timestampSec = typeof point.timestamp === 'number' ? point.timestamp : null;
  const pointLat = typeof point.lat === 'number' ? point.lat : null;
  const pointLon = typeof point.lon === 'number' ? point.lon : null;
  const [lat, lon] =
    pointLat !== null && pointLon !== null ? [pointLat, pointLon] : unproject(x, z);
  return { index, x, z, lat, lon, timestampSec };
};

export const findNearestIndexByTime = (
  targetSec: number
): { index: number; distance: number; point: SelectionPoint } | null => {
  const { columns, data, minTimestampSec, maxTimestampSec } = useDataStore.getState();

  if (columns) {
    const count = columns.length;
    if (!count) return null;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < count; i += 1) {
      const timestampSec = getTimestampSec(i, minTimestampSec, maxTimestampSec, columns.timestamp);
      if (timestampSec === null) continue;
      const distance = Math.abs(timestampSec - targetSec);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    const point = resolvePointByIndex(bestIndex);
    if (!point) return null;
    return { index: bestIndex, distance: bestDistance, point };
  }

  if (!data || !data.length) return null;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < data.length; i += 1) {
    const timestamp = data[i]?.timestamp;
    if (typeof timestamp !== 'number') continue;
    const distance = Math.abs(timestamp - targetSec);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  const point = resolvePointByIndex(bestIndex);
  if (!point) return null;
  return { index: bestIndex, distance: bestDistance, point };
};

export const findNearestIndexByScenePosition = (
  x: number,
  z: number
): { index: number; distance: number; point: SelectionPoint } | null => {
  const { columns, data } = useDataStore.getState();

  if (columns) {
    const count = columns.length;
    if (!count) return null;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < count; i += 1) {
      const dx = columns.x[i] - x;
      const dz = columns.z[i] - z;
      const distance = Math.hypot(dx, dz);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    const point = resolvePointByIndex(bestIndex);
    if (!point) return null;
    return { index: bestIndex, distance: bestDistance, point };
  }

  if (!data || !data.length) return null;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < data.length; i += 1) {
    const point = data[i];
    const dx = point.x - x;
    const dz = point.z - z;
    const distance = Math.hypot(dx, dz);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  const point = resolvePointByIndex(bestIndex);
  if (!point) return null;
  return { index: bestIndex, distance: bestDistance, point };
};
