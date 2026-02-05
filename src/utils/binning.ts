import { bin, max } from 'd3-array';

export interface Bin {
  x0: number;
  x1: number;
  length: number;
}

export function binTimeData<T>(
  data: T[],
  accessor: (d: T) => Date | number,
  domain: [number, number],
  ticks: number = 40
): Bin[] {
  if (!data || data.length === 0) return [];

  const values = data.map((d) => {
    const v = accessor(d);
    return v instanceof Date ? v.getTime() : v;
  });

  const binGenerator = bin()
    .domain(domain)
    .thresholds(ticks);

  const binned = binGenerator(values);

  return binned.map((b) => ({
    x0: b.x0 ?? 0,
    x1: b.x1 ?? 0,
    length: b.length,
  }));
}
