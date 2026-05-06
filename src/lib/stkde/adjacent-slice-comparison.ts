export interface SliceComparisonInput {
  sliceId: string;
  totalCount: number;
  typeCounts: Record<string, number>;
  districtCounts: Record<string, number>;
}

export interface SliceComparisonSummary {
  sliceId: string | null;
  totalCount: number;
  dominantType: string | null;
  dominantTypeCount: number;
  dominantDistrict: string | null;
  dominantDistrictCount: number;
  typeCounts: Record<string, number>;
  districtCounts: Record<string, number>;
}

export interface AdjacentSliceComparisonResult {
  left: SliceComparisonSummary;
  right: SliceComparisonSummary;
  countDelta: number;
  densityRatio: number;
  dominantTypeShift: {
    left: string | null;
    right: string | null;
    shift: string;
  };
  districtOverlap: {
    shared: string[];
    leftOnly: string[];
    rightOnly: string[];
    ratio: number;
  };
  hotspotDelta: {
    left: string | null;
    right: string | null;
    delta: number;
  };
  isNeutral: boolean;
}

const neutralSummary = (): SliceComparisonSummary => ({
  sliceId: null,
  totalCount: 0,
  dominantType: null,
  dominantTypeCount: 0,
  dominantDistrict: null,
  dominantDistrictCount: 0,
  typeCounts: {},
  districtCounts: {},
});

function sortKeysByCount(counts: Record<string, number>): Array<[string, number]> {
  return Object.entries(counts)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function summarizeInput(input: SliceComparisonInput | null | undefined): SliceComparisonSummary {
  if (!input) {
    return neutralSummary();
  }

  const dominantTypeEntry = sortKeysByCount(input.typeCounts)[0] ?? null;
  const dominantDistrictEntry = sortKeysByCount(input.districtCounts)[0] ?? null;

  return {
    sliceId: input.sliceId,
    totalCount: Number.isFinite(input.totalCount) ? input.totalCount : 0,
    dominantType: dominantTypeEntry?.[0] ?? null,
    dominantTypeCount: dominantTypeEntry?.[1] ?? 0,
    dominantDistrict: dominantDistrictEntry?.[0] ?? null,
    dominantDistrictCount: dominantDistrictEntry?.[1] ?? 0,
    typeCounts: input.typeCounts,
    districtCounts: input.districtCounts,
  };
}

function isSameSnapshot(left: SliceComparisonInput | null | undefined, right: SliceComparisonInput | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.sliceId === right.sliceId &&
    left.totalCount === right.totalCount &&
    JSON.stringify(left.typeCounts) === JSON.stringify(right.typeCounts) &&
    JSON.stringify(left.districtCounts) === JSON.stringify(right.districtCounts)
  );
}

function buildNeutralResult(): AdjacentSliceComparisonResult {
  const neutral = neutralSummary();

  return {
    left: neutral,
    right: neutral,
    countDelta: 0,
    densityRatio: 1,
    dominantTypeShift: {
      left: null,
      right: null,
      shift: 'neutral',
    },
    districtOverlap: {
      shared: [],
      leftOnly: [],
      rightOnly: [],
      ratio: 0,
    },
    hotspotDelta: {
      left: null,
      right: null,
      delta: 0,
    },
    isNeutral: true,
  };
}

export function compareAdjacentSlices(
  leftInput: SliceComparisonInput | null | undefined,
  rightInput: SliceComparisonInput | null | undefined
): AdjacentSliceComparisonResult {
  if (!leftInput || !rightInput || isSameSnapshot(leftInput, rightInput)) {
    return buildNeutralResult();
  }

  const left = summarizeInput(leftInput);
  const right = summarizeInput(rightInput);
  const leftDistrictKeys = new Set(Object.keys(left.districtCounts).filter((key) => (left.districtCounts[key] ?? 0) > 0));
  const rightDistrictKeys = new Set(Object.keys(right.districtCounts).filter((key) => (right.districtCounts[key] ?? 0) > 0));

  const shared = Array.from(leftDistrictKeys).filter((key) => rightDistrictKeys.has(key)).sort((a, b) => a.localeCompare(b));
  const leftOnly = Array.from(leftDistrictKeys).filter((key) => !rightDistrictKeys.has(key)).sort((a, b) => a.localeCompare(b));
  const rightOnly = Array.from(rightDistrictKeys).filter((key) => !leftDistrictKeys.has(key)).sort((a, b) => a.localeCompare(b));
  const unionSize = new Set([...leftDistrictKeys, ...rightDistrictKeys]).size;
  const rightDistrictCount = right.dominantDistrictCount;
  const leftDistrictCount = left.dominantDistrictCount;

  return {
    left,
    right,
    countDelta: right.totalCount - left.totalCount,
    densityRatio: left.totalCount > 0 ? right.totalCount / left.totalCount : right.totalCount > 0 ? right.totalCount : 1,
    dominantTypeShift: {
      left: left.dominantType,
      right: right.dominantType,
      shift: left.dominantType === right.dominantType
        ? 'unchanged'
        : `${left.dominantType ?? 'none'} → ${right.dominantType ?? 'none'}`,
    },
    districtOverlap: {
      shared,
      leftOnly,
      rightOnly,
      ratio: unionSize > 0 ? shared.length / unionSize : 0,
    },
    hotspotDelta: {
      left: left.dominantDistrict,
      right: right.dominantDistrict,
      delta: rightDistrictCount - leftDistrictCount,
    },
    isNeutral: false,
  };
}
