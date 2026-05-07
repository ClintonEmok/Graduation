import type { CrimeRecord } from '@/types/crime';
import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';

export type CategoryShape = 'sphere' | 'cube' | 'cone';

export interface CategoryShapeBucket {
  shape: CategoryShape;
  label: string;
  crimeTypeIds: number[];
  records: CrimeRecord[];
}

const SHAPE_BY_CRIME_TYPE: Record<string, CategoryShape> = {
  THEFT: 'sphere',
  BURGLARY: 'sphere',
  'MOTOR VEHICLE THEFT': 'sphere',
  'DECEPTIVE PRACTICE': 'sphere',

  BATTERY: 'cube',
  ASSAULT: 'cube',
  ROBBERY: 'cube',
  HOMICIDE: 'cube',
  KIDNAPPING: 'cube',
  'CRIMINAL DAMAGE': 'cube',
  'CRIMINAL TRESPASS': 'cube',
  'WEAPONS VIOLATION': 'cube',
  'CRIM SEXUAL ASSAULT': 'cube',
  'OFFENSE INVOLVING CHILDREN': 'cube',

  NARCOTICS: 'cone',
  'OTHER OFFENSE': 'cone',
  PROSTITUTION: 'cone',
  GAMBLING: 'cone',
  'LIQUOR LAW VIOLATION': 'cone',
  'PUBLIC PEACE VIOLATION': 'cone',
  OBSCENITY: 'cone',
  'NON-CRIMINAL': 'cone',
  'OTHER NARCOTIC VIOLATION': 'cone',
  'NON-CRIMINAL (SUBJECT SPECIFIED)': 'cone',
  RITUALISM: 'cone',
  INTIMIDATION: 'cone',
  STALKING: 'cone',
  'CONCEALED CARRY LICENSE VIOLATION': 'cone',
  'HUMAN TRAFFICKING': 'cone',
};

const SHAPE_LABELS: Record<CategoryShape, string> = {
  sphere: 'Property',
  cube: 'Violent',
  cone: 'Public order',
};

export function resolveCategoryShape(type: string | number): CategoryShape {
  const typeId = typeof type === 'number' ? type : getCrimeTypeId(type);
  const typeName = getCrimeTypeName(typeId).toUpperCase();
  return SHAPE_BY_CRIME_TYPE[typeName] || 'cone';
}

export function getCategoryShapeLabel(shape: CategoryShape): string {
  return SHAPE_LABELS[shape];
}

export function bucketCrimeRecordsByShape(records: CrimeRecord[]): Record<CategoryShape, CrimeRecord[]> {
  return records.reduce<Record<CategoryShape, CrimeRecord[]>>(
    (acc, record) => {
      const shape = resolveCategoryShape(record.type);
      acc[shape].push(record);
      return acc;
    },
    { sphere: [], cube: [], cone: [] }
  );
}
