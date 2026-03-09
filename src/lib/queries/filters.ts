import type { QueryFilters, QueryFragment } from './types';

const buildInListFilter = (columnSql: string, values?: string[]): QueryFragment | null => {
  if (!values?.length) return null;
  const escaped = values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  return {
    sql: `${columnSql} IN (${escaped})`,
    params: [],
  };
};

const joinFragments = (fragments: QueryFragment[]): QueryFragment => ({
  sql: fragments.map((fragment) => fragment.sql).join(' AND '),
  params: fragments.flatMap((fragment) => fragment.params),
});

export const buildCrimeRangeFilters = (
  startEpoch: number,
  endEpoch: number,
  filters?: QueryFilters,
  requireCoordinates = true
): QueryFragment => {
  const fragments: QueryFragment[] = [{ sql: '"Date" IS NOT NULL', params: [] }];

  if (requireCoordinates) {
    fragments.push({ sql: '"Latitude" IS NOT NULL AND "Longitude" IS NOT NULL', params: [] });
  }

  fragments.push({
    sql: `EXTRACT(EPOCH FROM "Date") >= ${startEpoch} AND EXTRACT(EPOCH FROM "Date") <= ${endEpoch}`,
    params: [],
  });

  const crimeTypeFilter = buildInListFilter('"Primary Type"', filters?.crimeTypes);
  if (crimeTypeFilter) fragments.push(crimeTypeFilter);

  const districtFilter = buildInListFilter('"District"', filters?.districts);
  if (districtFilter) fragments.push(districtFilter);

  return joinFragments(fragments);
};
