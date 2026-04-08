import { ColumnarData, DataPoint, FilteredPoint } from '@/lib/data/types';

export interface FilteredDataState {
  columns: ColumnarData | null;
  data: DataPoint[];
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
}

export interface FilterState {
  selectedTypes: number[];
  selectedDistricts: number[];
  selectedTimeRange: [number, number] | null;
}

export const selectFilteredData = (
  dataState: FilteredDataState,
  filterState: FilterState
): FilteredPoint[] => {
  const { columns, data, minTimestampSec, maxTimestampSec } = dataState;
  const { selectedTypes, selectedDistricts, selectedTimeRange } = filterState;

  const result: FilteredPoint[] = [];

  if (columns) {
    const { x, z, lat, lon, timestamp, type, district, block, length } = columns;

    let minT = -Infinity;
    let maxT = Infinity;
    if (selectedTimeRange && minTimestampSec !== null && maxTimestampSec !== null) {
      const span = maxTimestampSec - minTimestampSec || 1;
      minT = ((selectedTimeRange[0] - minTimestampSec) / span) * 100;
      maxT = ((selectedTimeRange[1] - minTimestampSec) / span) * 100;
    }

    for (let i = 0; i < length; i++) {
      if (selectedTypes.length > 0 && !selectedTypes.includes(type[i])) continue;
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(district[i])) continue;
      if (timestamp[i] < minT || timestamp[i] > maxT) continue;

      result.push({
        x: x[i],
        y: timestamp[i],
        z: z[i],
        lat: lat ? lat[i] : undefined,
        lon: lon ? lon[i] : undefined,
        typeId: type[i],
        districtId: district[i],
        block: block ? block[i] : undefined,
        originalIndex: i,
      });
    }
  } else if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      const p = data[i];

      result.push({
        x: p.x,
        y: p.timestamp,
        z: p.z,
        typeId: 0,
        districtId: 0,
        originalIndex: i,
      });
    }
  }

  return result;
};
